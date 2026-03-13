'use client';

import { createContext, useContext, useState } from 'react';

type Method = 'cli' | 'console';

const MethodContext = createContext<{
  method: Method;
  setMethod: (m: Method) => void;
}>({ method: 'cli', setMethod: () => {} });

export function MethodProvider({ children }: { children: React.ReactNode }) {
  const [method, setMethod] = useState<Method>('cli');
  return (
    <MethodContext.Provider value={{ method, setMethod }}>
      {children}
    </MethodContext.Provider>
  );
}

export function MethodToggle() {
  const { method, setMethod } = useContext(MethodContext);
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-slate-600 font-mono">가이드 방식</span>
      <div className="flex items-center gap-0.5 p-1 rounded-lg bg-slate-900 border border-slate-800">
        {(['cli', 'console'] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMethod(m)}
            className={`px-4 py-1.5 rounded-md text-sm font-mono transition-colors ${
              method === m
                ? 'bg-slate-700 text-slate-100'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {m === 'cli' ? 'CLI' : 'AWS Console'}
          </button>
        ))}
      </div>
    </div>
  );
}

export function CliContent({ children }: { children: React.ReactNode }) {
  const { method } = useContext(MethodContext);
  if (method !== 'cli') return null;
  return <>{children}</>;
}

export function ConsoleContent({ children }: { children?: React.ReactNode }) {
  const { method } = useContext(MethodContext);
  if (method !== 'console') return null;
  return children ? (
    <>{children}</>
  ) : (
    <div className="rounded-lg border border-dashed border-slate-700 px-5 py-4 text-sm text-slate-600 italic">
      AWS Console 가이드 작성 예정 — 콘솔에서 직접 세팅한 후 이 부분을 업데이트해주세요.
    </div>
  );
}
