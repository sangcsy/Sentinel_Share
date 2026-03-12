import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // standalone 출력: Docker 이미지 크기 최적화 (node_modules 불필요)
  output: 'standalone',
};

export default nextConfig;
