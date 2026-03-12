export const dynamic = 'force-dynamic';

export async function GET() {
  return Response.json({
    vulnerable: {
      url: process.env.VULNERABLE_API_URL || 'http://localhost:3000',
      s3Url: process.env.LOCALSTACK_URL || 'http://localhost:4566',
      s3Bucket: process.env.VULNERABLE_S3_BUCKET || 'sentinelshare-local',
      configured: true,
    },
    aws: {
      url: process.env.AWS_API_URL || '',
      s3Bucket: process.env.AWS_S3_BUCKET || '',
      region: process.env.AWS_REGION || 'ap-northeast-2',
      configured: !!(process.env.AWS_API_URL),
    },
  });
}
