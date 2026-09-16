import { useSocket } from '../../context/SocketContext';

const LABELS = {
  'registration.created': 'New registration',
  'registration.approved': 'Registration approved',
  'registration.rejected': 'Registration rejected',
  'checkin.created': 'Attendee checked in',
  'venue.locked': 'Room locked',
  'venue.released': 'Room lock released',
  'venue.booked': 'Venue booked',
  'speaker.assigned': 'Speaker assigned',
  'schedule.updated': 'Schedule updated',
  'feedback.created': 'New feedback',
  'analytics.updated': 'Analytics refreshed',
  'event.published': 'Event published',
};

export default function SignalStrip() {
  const { connected, feed } = useSocket();
  const items = feed.slice(0, 12);

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-[var(--color-surface)] border-b border-[var(--color-border)] overflow-hidden">
      <span className="flex items-center gap-1.5 shrink-0 font-mono text-[10px] uppercase tracking-wide text-[var(--color-text-faint)]">
        <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-[var(--color-teal)] live-dot' : 'bg-[var(--color-rose)]'}`} />
        {connected ? 'Live' : 'Offline'}
      </span>
      <div className="flex-1 overflow-hidden">
        {items.length === 0 ? (
          <span className="text-xs text-[var(--color-text-faint)] font-mono">Waiting for activity…</span>
        ) : (
          <div className="flex gap-6 whitespace-nowrap">
            {items.map((item) => (
              <span key={item.id} className="text-xs font-mono text-[var(--color-text-dim)] shrink-0">
                <span className="text-[var(--color-amber)]">●</span> {LABELS[item.type] || item.type}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
