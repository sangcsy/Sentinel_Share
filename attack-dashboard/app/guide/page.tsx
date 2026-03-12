import Link from 'next/link';

const phases = [
  {
    number: 1,
    href: '/guide/vulnerable',
    label: '취약 환경 구성',
    subtitle: 'Vulnerable Environment',
    description: 'WAF 없음, S3 퍼블릭, Security Group 전체 개방. 공격이 아무 제약 없이 통과하는 환경.',
    color: 'red',
    items: ['ECR + ECS 클러스터', 'RDS PostgreSQL', 'S3 (Block Public Access OFF)', 'Secrets Manager', 'Security Group 0.0.0.0/0'],
  },
  {
    number: 2,
    href: '/guide/secure',
    label: '보안 환경 구성',
    subtitle: 'Secure Environment',
    description: 'CloudFront + WAF, S3 프라이빗, Security Group CloudFront IP 제한. 동일 코드, 다른 인프라.',
    color: 'emerald',
    items: ['S3 (Block Public Access ON + 버킷 정책)', 'WAF Web ACL (Rate-based + Managed Rules)', 'CloudFront 배포 + WAF 연결', 'ECS Security Group (pl-3b927c52)', 'Secrets Manager'],
  },
];

export default function GuidePage() {
  return (
    <div className="max-w-6xl mx-auto w-full px-4 py-8 space-y-8">

      {/* 타이틀 */}
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Infrastructure Guide</h1>
        <p className="text-slate-500 mt-1 text-sm">
          동일한 앱 코드를 취약/보안 두 AWS 환경에 수동으로 구성하는 단계별 가이드
        </p>
      </div>

      {/* 아키텍처 개요 */}
      <div className="rounded-xl border border-slate-800 bg-[#0d1117] p-6">
        <h2 className="text-slate-300 font-semibold mb-4 flex items-center gap-2">
          <span className="text-slate-600">◆</span>
          전체 아키텍처 개요
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 취약 */}
          <div className="rounded-lg border border-red-900/40 bg-red-950/10 p-4">
            <div className="text-xs font-mono text-red-400 uppercase tracking-widest mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              취약 환경 (Vulnerable)
            </div>
            <pre className="text-xs font-mono text-slate-500 leading-relaxed">
{`[브라우저 / 공격자]
       ↓ 직접 연결 (차단 없음)
  [ECS Fargate :3000]
  Security Group: 0.0.0.0/0
       ↓              ↓
  [RDS PostgreSQL]  [S3 Public]
                    직접 접근 가능`}
            </pre>
          </div>

          {/* 보안 */}
          <div className="rounded-lg border border-emerald-900/40 bg-emerald-950/10 p-4">
            <div className="text-xs font-mono text-emerald-400 uppercase tracking-widest mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              보안 환경 (Secure)
            </div>
            <pre className="text-xs font-mono text-slate-500 leading-relaxed">
{`[브라우저 / 공격자]
       ↓
  [CloudFront + WAF]  ← 차단
  Rate-based + Managed Rules
       ↓ (정상 트래픽만)
  [ECS Fargate :3000]
  Security Group: CF IP only
       ↓              ↓
  [RDS PostgreSQL]  [S3 Private]
                    presigned URL`}
            </pre>
          </div>
        </div>

        {/* 핵심 포인트 */}
        <div className="mt-4 pt-4 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="text-slate-500">
            <span className="text-slate-300 font-medium block mb-1">동일 코드</span>
            앱 코드는 완전히 동일. 차이는 인프라 설정뿐.
          </div>
          <div className="text-slate-500">
            <span className="text-slate-300 font-medium block mb-1">No App-level Rate Limit</span>
            authLimiter 제거 — WAF가 인프라 레벨에서 담당.
          </div>
          <div className="text-slate-500">
            <span className="text-slate-300 font-medium block mb-1">Presigned URL Only</span>
            백엔드는 파일 바이트를 프록시하지 않음. 권한 검사 후 5분 TTL URL 발급.
          </div>
        </div>
      </div>

      {/* 사전 준비 */}
      <div className="rounded-xl border border-slate-800 bg-[#0d1117] p-6">
        <h2 className="text-slate-300 font-semibold mb-4 flex items-center gap-2">
          <span className="text-slate-600">◆</span>
          사전 준비
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { name: 'AWS CLI', desc: 'aws configure 완료', cmd: 'aws sts get-caller-identity' },
            { name: 'Docker', desc: 'Docker Desktop 실행 중', cmd: 'docker --version' },
            { name: 'Node.js 20+', desc: '백엔드/프론트엔드 빌드', cmd: 'node --version' },
            { name: 'psql', desc: 'DB 마이그레이션 실행', cmd: 'psql --version' },
          ].map((item) => (
            <div key={item.name} className="rounded-lg border border-slate-800 bg-slate-900/50 p-3 space-y-1">
              <div className="text-slate-200 font-medium text-sm">{item.name}</div>
              <div className="text-slate-500 text-xs">{item.desc}</div>
              <div className="text-emerald-500 text-xs font-mono bg-slate-900 rounded px-2 py-1 mt-2">
                $ {item.cmd}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 구성 단계 카드 */}
      <div>
        <h2 className="text-slate-300 font-semibold mb-4">구성 단계</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {phases.map((phase) => {
            const colorStyles = {
              red: {
                border: 'border-red-900/40',
                bg: 'bg-red-950/10',
                badge: 'bg-red-950 text-red-400 border-red-900',
                dot: 'bg-red-500',
                text: 'text-red-400',
                hover: 'hover:border-red-700/60',
                bullet: 'text-red-600',
              },
              emerald: {
                border: 'border-emerald-900/40',
                bg: 'bg-emerald-950/10',
                badge: 'bg-emerald-950 text-emerald-400 border-emerald-900',
                dot: 'bg-emerald-500',
                text: 'text-emerald-400',
                hover: 'hover:border-emerald-700/60',
                bullet: 'text-emerald-600',
              },
            } as const;
            const colorMap = colorStyles[phase.color as keyof typeof colorStyles];

            return (
              <Link
                key={phase.href}
                href={phase.href}
                className={`block rounded-xl border ${colorMap.border} ${colorMap.bg} ${colorMap.hover} p-6 transition-colors group`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className={`w-8 h-8 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-sm font-mono font-bold ${colorMap.text}`}>
                      {phase.number}
                    </span>
                    <div>
                      <div className={`font-semibold ${colorMap.text}`}>{phase.label}</div>
                      <div className="text-xs text-slate-600 font-mono">{phase.subtitle}</div>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded border font-mono ${colorMap.badge}`}>
                    GUIDE →
                  </span>
                </div>

                <p className="text-slate-500 text-sm mb-4">{phase.description}</p>

                <ul className="space-y-1">
                  {phase.items.map((item) => (
                    <li key={item} className="flex items-center gap-2 text-xs text-slate-500">
                      <span className={`${colorMap.bullet} text-[10px]`}>▸</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </Link>
            );
          })}
        </div>
      </div>

      {/* 공통 리소스 */}
      <div className="rounded-xl border border-slate-800 bg-[#0d1117] p-6">
        <h2 className="text-slate-300 font-semibold mb-3 flex items-center gap-2">
          <span className="text-slate-600">◆</span>
          공통 AWS 리소스 (양쪽 환경에서 공유)
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
          {[
            { label: 'ECR Repository', value: 'sentinelshare-backend', note: '두 환경이 동일 이미지 사용' },
            { label: 'AWS Region', value: 'ap-northeast-2', note: '서울 리전' },
            { label: 'GitHub Actions', value: 'deploy-backend.yml', note: '빌드 1회 → 두 환경 배포' },
          ].map((item) => (
            <div key={item.label} className="rounded-lg border border-slate-800 bg-slate-900/50 p-3">
              <div className="text-slate-400 text-xs mb-1">{item.label}</div>
              <div className="text-slate-200 font-mono text-sm">{item.value}</div>
              <div className="text-slate-600 text-xs mt-1">{item.note}</div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
