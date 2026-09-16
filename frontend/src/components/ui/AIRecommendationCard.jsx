import { Sparkles, Bot, Cpu } from 'lucide-react';
import { Card } from './Primitives';

/**
 * Displays an AI agent's structured recommendation: { recommendation, score, reasons, source }
 * Styled as a "flight strip" — a signature element of the mission-control aesthetic.
 */
export default function AIRecommendationCard({ title, recommendation, score, reasons = [], source = 'RULE_ENGINE', onAccept, acceptLabel = 'Accept recommendation' }) {
  const edgeColor = score >= 80 ? 'var(--color-teal)' : score >= 50 ? 'var(--color-amber)' : 'var(--color-rose)';
  return (
    <Card className="overflow-hidden" style={{ borderLeftWidth: 4, borderLeftColor: edgeColor }}>
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Sparkles size={15} className="text-[var(--color-amber)]" />
            <span className="text-xs font-mono uppercase tracking-wide text-[var(--color-text-dim)]">{title}</span>
          </div>
          <span className="flex items-center gap-1 text-[10px] font-mono uppercase tracking-wide text-[var(--color-text-faint)]">
            {source === 'LLM' ? <Bot size={12} /> : <Cpu size={12} />}
            {source === 'LLM' ? 'LLM-explained' : 'Rule engine'}
          </span>
        </div>

        {typeof score === 'number' && (
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl font-display font-bold" style={{ color: edgeColor }}>{score}</span>
            <span className="text-xs text-[var(--color-text-faint)] font-mono">/ 100 match</span>
          </div>
        )}

        <p className="text-sm text-[var(--color-text)] mb-3">{recommendation}</p>

        {reasons.length > 0 && (
          <ul className="space-y-1 mb-3">
            {reasons.slice(0, 5).map((r, i) => (
              <li key={i} className="text-xs text-[var(--color-text-dim)] flex gap-2">
                <span className="text-[var(--color-text-faint)]">›</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        )}

        {onAccept && (
          <button
            onClick={onAccept}
            className="text-xs font-mono font-medium px-3 py-1.5 rounded-md bg-[var(--color-amber)] text-[#1A1200] hover:brightness-110 transition"
          >
            {acceptLabel}
          </button>
        )}
      </div>
    </Card>
  );
}
