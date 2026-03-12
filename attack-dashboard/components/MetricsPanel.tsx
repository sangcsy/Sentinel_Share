'use client';

import type { AttackResult, AttackPhase, Environment } from '@/types';

interface Props {
  results: AttackResult[];
  phase: AttackPhase;
  env: Environment;
  totalPlanned: number;
}

export function MetricsPanel({ results, phase, env, totalPlanned }: Props) {
  const total = results.length;
  const blocked = results.filter((r) => r.blocked).length;
  const reached = total - blocked;
  const blockRate = total > 0 ? Math.round((blocked / total) * 100) : 0;
  const reachRate = total > 0 ? Math.round((reached / total) * 100) : 0;
  const avgLatency =
    total > 0
      ? Math.round(results.reduce((sum, r) => sum + r.latency, 0) / total)
      : 0;
  const firstBlocked = results.find((r) => r.blocked)?.attempt ?? null;
  const progress = totalPlanned > 0 ? (total / totalPlanned) * 100 : 0;

  const isVuln = env === 'vulnerable';

  return (
    <div className="space-y-3 pt-3 border-t border-slate-800">
      {/* 진행 바 */}
      <div>
        <div className="flex justify-between text-xs text-slate-500 mb-1 font-mono">
          <span>{total} / {totalPlanned} 요청</span>
          <span>
            {phase === 'running' && (
              <span className="inline-flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-pulse-fast" />
                진행 중
              </span>
            )}
            {phase === 'complete' && <span className="text-slate-400">완료</span>}
            {phase === 'idle' && <span className="text-slate-600">대기</span>}
          </span>
        </div>
        <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              isVuln ? 'bg-red-600' : 'bg-emerald-600'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* 지표 그리드 */}
      <div className="grid grid-cols-2 gap-2">
        {/* 차단됨 */}
        <div
          className={`rounded-lg p-3 border ${
            blocked > 0
              ? 'bg-emerald-950/40 border-emerald-800'
              : 'bg-slate-900 border-slate-800'
          }`}
        >
          <div className="text-xs text-slate-500 mb-1">차단</div>
          <div className={`text-2xl font-bold font-mono ${blocked > 0 ? 'text-emerald-400' : 'text-slate-500'}`}>
            {blocked}
          </div>
          <div className="text-xs text-slate-600">{blockRate}%</div>
        </div>

        {/* 통과됨 */}
        <div
          className={`rounded-lg p-3 border ${
            reached > 0 && isVuln
              ? 'bg-red-950/40 border-red-900'
              : 'bg-slate-900 border-slate-800'
          }`}
        >
          <div className="text-xs text-slate-500 mb-1">서버 도달</div>
          <div
            className={`text-2xl font-bold font-mono ${
              reached > 0 && isVuln ? 'text-red-400' : 'text-slate-400'
            }`}
          >
            {reached}
          </div>
          <div className="text-xs text-slate-600">{reachRate}%</div>
        </div>
      </div>

      {/* 부가 정보 */}
      <div className="grid grid-cols-2 gap-x-4 text-xs font-mono">
        <div className="flex justify-between py-1 border-b border-slate-800/60">
          <span className="text-slate-600">평균 응답</span>
          <span className="text-slate-400">{avgLatency > 0 ? `${avgLatency}ms` : '—'}</span>
        </div>
        <div className="flex justify-between py-1 border-b border-slate-800/60">
          <span className="text-slate-600">최초 차단</span>
          <span className={firstBlocked !== null ? 'text-emerald-400' : 'text-slate-600'}>
            {firstBlocked !== null ? `#${firstBlocked}` : '없음'}
          </span>
        </div>
      </div>

      {/* 요약 메시지 */}
      {phase === 'complete' && (
        <div
          className={`rounded-lg px-3 py-2 text-xs font-mono border ${
            isVuln
              ? reached > 0
                ? 'bg-red-950/50 border-red-800 text-red-300'
                : 'bg-emerald-950/50 border-emerald-800 text-emerald-300'
              : blocked > 0
              ? 'bg-emerald-950/50 border-emerald-800 text-emerald-300'
              : 'bg-yellow-950/50 border-yellow-800 text-yellow-300'
          }`}
        >
          {isVuln
            ? reached > 0
              ? `⚠ ${reached}개 요청이 서버에 도달했습니다 — 보호 미흡`
              : `✓ 앱 레벨 rate limit이 동작했습니다`
            : blocked > 0
            ? `✓ AWS 인프라가 ${blocked}개 요청을 차단했습니다`
            : 'AWS URL이 설정되지 않았습니다'}
        </div>
      )}
    </div>
  );
}
