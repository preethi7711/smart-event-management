import { Card } from './Primitives';

/**
 * KPI card showing a metric value pulled from real API data (never hardcoded).
 * `trend` optional: { direction: 'up'|'down', label: '+12%' }
 */
export default function KPICard({ icon: Icon, label, value, sublabel, trend, accent = 'amber' }) {
  const accentColors = {
    amber: 'text-[var(--color-amber)]',
    teal: 'text-[var(--color-teal)]',
    rose: 'text-[var(--color-rose)]',
    violet: 'text-[var(--color-violet)]',
    blue: 'text-[var(--color-blue)]',
  };
  return (
    <Card className="p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono uppercase tracking-wide text-[var(--color-text-dim)]">{label}</span>
        {Icon && <Icon size={16} className={accentColors[accent]} />}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-display font-semibold text-[var(--color-text)]">{value}</span>
        {trend && (
          <span className={`text-xs font-mono ${trend.direction === 'up' ? 'text-[var(--color-teal)]' : 'text-[var(--color-rose)]'}`}>
            {trend.label}
          </span>
        )}
      </div>
      {sublabel && <span className="text-xs text-[var(--color-text-faint)]">{sublabel}</span>}
    </Card>
  );
}
