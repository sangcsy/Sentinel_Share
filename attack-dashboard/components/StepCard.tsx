interface Props {
  step: number;
  title: string;
  children: React.ReactNode;
  warning?: string;
  note?: string;
  done?: boolean;
}

export function StepCard({ step, title, children, warning, note }: Props) {
  return (
    <div className="rounded-xl border border-slate-800 bg-[#0d1117] overflow-hidden">
      {/* 스텝 헤더 */}
      <div className="flex items-center gap-4 px-6 py-4 border-b border-slate-800 bg-slate-900/30">
        <span className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-sm font-mono font-bold text-slate-300">
          {step}
        </span>
        <h3 className="text-slate-100 font-semibold">{title}</h3>
      </div>

      {/* 본문 */}
      <div className="px-6 py-5 space-y-4">
        {warning && (
          <div className="flex items-start gap-2 rounded-lg border border-yellow-900/50 bg-yellow-950/20 px-4 py-3 text-sm text-yellow-300/80">
            <span className="flex-shrink-0 mt-0.5">⚠</span>
            <span>{warning}</span>
          </div>
        )}

        {children}

        {note && (
          <div className="flex items-start gap-2 rounded-lg border border-slate-700/50 bg-slate-800/30 px-4 py-3 text-sm text-slate-400">
            <span className="flex-shrink-0 mt-0.5 text-slate-500">ℹ</span>
            <span>{note}</span>
          </div>
        )}
      </div>
    </div>
  );
}
