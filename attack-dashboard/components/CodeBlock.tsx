'use client';

import { useState } from 'react';

interface Props {
  code: string;
  language?: string;
  filename?: string;
}

export function CodeBlock({ code, language = 'bash', filename }: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code.trim());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard API not available
    }
  };

  return (
    <div className="rounded-lg border border-slate-800 overflow-hidden">
      {/* 상단 바 */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-slate-600">{filename ?? language}</span>
        </div>
        <button
          onClick={handleCopy}
          className={`text-xs font-mono px-2 py-1 rounded transition-colors ${
            copied
              ? 'text-emerald-400 bg-emerald-950 border border-emerald-900'
              : 'text-slate-500 hover:text-slate-300 border border-slate-700 hover:border-slate-600'
          }`}
        >
          {copied ? '✓ 복사됨' : '복사'}
        </button>
      </div>

      {/* 코드 */}
      <pre className="bg-[#080c14] p-4 overflow-x-auto text-sm font-mono text-slate-300 leading-relaxed">
        <code>{code.trim()}</code>
      </pre>
    </div>
  );
}
