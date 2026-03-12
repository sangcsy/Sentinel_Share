import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

// 취약 환경: Block Public Access OFF, 버킷 정책 없음 → 직접 접근 가능
const VULNERABLE_S3_BUCKET = process.env.VULNERABLE_S3_BUCKET || '';
// 보안 환경: Block Public Access ON, presigned URL만 허용 → 직접 접근 403
const AWS_S3_BUCKET = process.env.AWS_S3_BUCKET || '';
const AWS_REGION = process.env.AWS_REGION || 'ap-northeast-2';

// 공격자가 시도할 경로 목록 (버킷 열거 + 실제 파일 접근)
const ATTACK_PATHS = [
  '',                              // 버킷 루트 — 목록 열거 시도
  'uploads/',                      // 업로드 디렉터리 열거
  'uploads/test-document.pdf',     // 실제 업로드된 파일 접근 시도
  'uploads/private-report.pdf',
  'uploads/user-data.zip',
];

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function tryS3Access(bucketUrl: string, path: string, attempt: number) {
  const fullUrl = `${bucketUrl}/${path}`;
  const start = Date.now();
  try {
    const res = await fetch(fullUrl, {
      method: 'GET',
      signal: AbortSignal.timeout(6000),
    });
    const latency = Date.now() - start;
    const accessible = res.status === 200;
    const blocked = res.status === 403;
    const label = accessible
      ? path === '' ? 'BUCKET LISTED' : 'FILE ACCESSIBLE'
      : res.status === 403
      ? 'ACCESS DENIED'
      : res.status === 404
      ? 'NOT FOUND'
      : `HTTP ${res.status}`;
    return { attempt, status: res.status, latency, blocked, label, path: path || '(bucket root)' };
  } catch {
    return {
      attempt,
      status: 0,
      latency: Date.now() - start,
      blocked: false,
      label: 'CONNECTION ERROR',
      path: path || '(bucket root)',
      error: 'timeout_or_refused',
    };
  }
}

function buildS3Url(bucket: string): string {
  return `https://${bucket}.s3.${AWS_REGION}.amazonaws.com`;
}

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();

  const send = async (data: object) => {
    try {
      await writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
    } catch {
      // 클라이언트 연결 끊김
    }
  };

  (async () => {
    try {
      await send({ type: 'start' });

      const vulnUrl = VULNERABLE_S3_BUCKET ? buildS3Url(VULNERABLE_S3_BUCKET) : null;
      const awsUrl = AWS_S3_BUCKET ? buildS3Url(AWS_S3_BUCKET) : null;

      for (let i = 0; i < ATTACK_PATHS.length; i++) {
        const path = ATTACK_PATHS[i];

        const [vulnResult, awsResult] = await Promise.all([
          vulnUrl
            ? tryS3Access(vulnUrl, path, i + 1)
            : Promise.resolve({
                attempt: i + 1, status: -1, latency: 0, blocked: false,
                label: 'VULNERABLE_S3_BUCKET 미설정', path: path || '(bucket root)',
              }),
          awsUrl
            ? tryS3Access(awsUrl, path, i + 1)
            : Promise.resolve({
                attempt: i + 1, status: -1, latency: 0, blocked: false,
                label: 'AWS_S3_BUCKET 미설정', path: path || '(bucket root)',
              }),
        ]);

        await send({ type: 'result', env: 'vulnerable', ...vulnResult });
        await send({ type: 'result', env: 'aws', ...awsResult });

        await sleep(600);
      }

      await send({ type: 'complete' });
    } catch (e) {
      await send({ type: 'error', message: String(e) });
    } finally {
      writer.close();
    }
  })();

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
