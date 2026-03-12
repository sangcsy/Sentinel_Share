'use client';

import { useState, useRef, useCallback } from 'react';
import type { AttackResult, AttackEvent, AttackPhase } from '@/types';
import { RequestLog } from './RequestLog';
import { MetricsPanel } from './MetricsPanel';

interface Props {
  index: number;
  title: string;
  description: string;
  endpoint: string;          // 'bruteforce' | 's3-access' | 'ratelimit'
  totalRequests: number;     // 예상 요청 수
  attackParams?: string;     // query string (예: "count=30")
  vulnNote: string;          // 취약 환경 설명
  awsNote: string;           // AWS 환경 설명
}

export function AttackCard({
  index,
  title,
  description,
  endpoint,
  totalRequests,
  attackParams = '',
  vulnNote,
  awsNote,
}: Props) {
  const [phase, setPhase] = useState<AttackPhase>('idle');
  const [vulnResults, setVulnResults] = useState<AttackResult[]>([]);
  const [awsResults, setAwsResults] = useState<AttackResult[]>([]);
  const esRef = useRef<EventSource | null>(null);

  const startAttack = useCallback(() => {
    if (phase === 'running') return;

    // 이전 결과 초기화
    setPhase('running');
    setVulnResults([]);
    setAwsResults([]);

    const query = attackParams ? `?${attackParams}` : '';
    const es = new EventSource(`/api/attack/${endpoint}${query}`);
    esRef.current = es;

    es.onmessage = (e) => {
      let event: AttackEvent;
      try {
        event = JSON.parse(e.data);
      } catch {
        return;
      }

      if (event.type === 'result') {
        const result: AttackResult = {
          attempt: event.attempt,
          status: event.status,
          latency: event.latency,
          blocked: event.blocked,
          label: event.label,
          error: event.error,
        };
        if (event.env === 'vulnerable') {
          setVulnResults((prev) => [...prev, result]);
        } else {
          setAwsResults((prev) => [...prev, result]);
        }
      } else if (event.type === 'complete') {
        setPhase('complete');
        es.close();
      } else if (event.type === 'error') {
        setPhase('error');
        es.close();
      }
    };

    es.onerror = () => {
      setPhase('complete');
      es.close();
    };
  }, [phase, endpoint, attackParams]);

  const reset = useCallback(() => {
    esRef.current?.close();
    setPhase('idle');
    setVulnResults([]);
    setAwsResults([]);
  }, []);

  // 공격 상태에 따른 버튼 스타일
  const buttonClass =
    phase === 'idle'
      ? 'bg-red-700 hover:bg-red-600 border-red-600 text-white cursor-pointer'
      : phase === 'running'
      ? 'bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed'
      : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300 cursor-pointer';

  return (
    <div className="rounded-xl border border-slate-800 bg-[#0d1117] overflow-hidden">
      {/* 카드 헤더 */}
      <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <span className="flex-shrink-0 w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-mono text-slate-400">
            {index}
          </span>
          <div>
            <h2 className="text-slate-100 font-semibold tracking-wide">{title}</h2>
            <p className="text-slate-500 text-sm mt-0.5">{description}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {phase !== 'idle' && (
            <button
              onClick={reset}
              className="px-3 py-1.5 rounded-lg text-xs border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600 transition-colors"
            >
              초기화
            </button>
          )}
          <button
            onClick={startAttack}
            disabled={phase === 'running'}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${buttonClass}`}
          >
            {phase === 'idle' && '▶ 공격 시작'}
            {phase === 'running' && (
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-pulse-fast" />
                공격 중...
              </span>
            )}
            {phase === 'complete' && '✓ 완료'}
            {phase === 'error' && '✗ 오류'}
          </button>
        </div>
      </div>

      {/* 비교 패널 (2열) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-800">
        {/* 취약 환경 */}
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-xs font-semibold text-red-400 uppercase tracking-wider">
              취약 환경
            </span>
            <span className="text-xs text-slate-600 font-mono ml-1">— No Protection</span>
          </div>
          <p className="text-xs text-slate-500">{vulnNote}</p>
          <RequestLog results={vulnResults} env="vulnerable" />
          <MetricsPanel
            results={vulnResults}
            phase={phase}
            env="vulnerable"
            totalPlanned={totalRequests}
          />
        </div>

        {/* AWS 보안 환경 */}
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
              AWS 보안 환경
            </span>
            <span className="text-xs text-slate-600 font-mono ml-1">— WAF + CloudFront</span>
          </div>
          <p className="text-xs text-slate-500">{awsNote}</p>
          <RequestLog results={awsResults} env="aws" />
          <MetricsPanel
            results={awsResults}
            phase={phase}
            env="aws"
            totalPlanned={totalRequests}
          />
        </div>
      </div>
    </div>
  );
}
