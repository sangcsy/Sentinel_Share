'use client';

import { useEffect, useState } from 'react';
import type { DashboardConfig } from '@/types';

export function EnvironmentStatus() {
  const [config, setConfig] = useState<DashboardConfig | null>(null);

  useEffect(() => {
    fetch('/api/config')
      .then((r) => r.json())
      .then(setConfig)
      .catch(() => {});
  }, []);

  if (!config) {
    return (
      <div className="border-b border-slate-800 bg-[#0d1117] px-6 py-3">
        <div className="max-w-6xl mx-auto flex gap-6 text-xs text-slate-600 font-mono">
          <span>환경 정보 로딩 중...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="border-b border-slate-800 bg-[#0d1117] px-6 py-3">
      <div className="max-w-6xl mx-auto flex flex-wrap gap-6 items-center text-xs font-mono">
        {/* 취약 환경 */}
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-slate-500">취약 환경</span>
          <span className="text-red-400 font-semibold">{config.vulnerable.url}</span>
          <span className="px-1.5 py-0.5 rounded text-[10px] bg-red-950 text-red-400 border border-red-900">
            LOCAL / NO PROTECTION
          </span>
        </div>

        <span className="text-slate-700">|</span>

        {/* AWS 환경 */}
        <div className="flex items-center gap-2">
          {config.aws.configured ? (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-slate-500">AWS 환경</span>
              <span className="text-emerald-400 font-semibold truncate max-w-xs">
                {config.aws.url}
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-900">
                WAF + CloudFront
              </span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-slate-700" />
              <span className="text-slate-600">AWS 환경</span>
              <span className="text-slate-600">미설정</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-500 border border-slate-700">
                .env.local에 AWS_API_URL 추가
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
