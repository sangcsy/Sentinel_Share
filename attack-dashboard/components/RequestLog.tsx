'use client';

import { useEffect, useRef } from 'react';
import type { AttackResult, Environment } from '@/types';

interface Props {
  results: AttackResult[];
  env: Environment;
}

function statusColor(status: number, blocked: boolean): string {
  if (blocked) return 'text-emerald-400';
  if (status === 200) return 'text-yellow-400';
  if (status === 401) return 'text-orange-400';
  if (status === 403) return 'text-emerald-400';
  if (status === 429) return 'text-emerald-400';
  if (status <= 0) return 'text-slate-500';
  return 'text-slate-400';
}

function rowBg(blocked: boolean, env: Environment): string {
  if (blocked) return 'bg-emerald-950/30 border-l-2 border-emerald-600';
  if (env === 'vulnerable') return 'bg-red-950/20 border-l-2 border-red-900';
  return 'bg-slate-900/30 border-l-2 border-slate-700';
}

export function RequestLog({ results, env }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // 새 항목이 들어오면 자동 스크롤
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [results.length]);

  if (results.length === 0) {
    return (
      <div className="h-52 flex items-center justify-center text-slate-600 font-mono text-sm">
        공격 대기 중...
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      className="h-52 overflow-y-auto space-y-0.5 pr-1"
    >
      {results.map((r, idx) => (
        <div
          key={idx}
          className={`flex items-center gap-2 px-2 py-[3px] rounded-sm text-xs font-mono ${rowBg(r.blocked, env)}`}
        >
          {/* 상태 표시등 */}
          <span
            className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
              r.blocked ? 'bg-emerald-500' : env === 'vulnerable' ? 'bg-red-500' : 'bg-slate-500'
            }`}
          />

          {/* 시도 번호 */}
          <span className="text-slate-600 w-8 text-right flex-shrink-0">
            #{r.attempt}
          </span>

          {/* HTTP 상태 코드 */}
          <span className={`w-10 font-bold flex-shrink-0 ${statusColor(r.status, r.blocked)}`}>
            {r.status > 0 ? r.status : 'ERR'}
          </span>

          {/* 레이턴시 */}
          <span className="text-slate-600 w-14 flex-shrink-0">
            {r.latency > 0 ? `${r.latency}ms` : '—'}
          </span>

          {/* 경로 (S3 공격) 또는 레이블 */}
          <span
            className={`truncate flex-1 ${
              r.blocked
                ? 'text-emerald-400 font-semibold'
                : env === 'vulnerable'
                ? 'text-red-400'
                : 'text-slate-500'
            }`}
          >
            {r.label || '—'}
          </span>
        </div>
      ))}
    </div>
  );
}
