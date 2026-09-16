import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, Users, CheckCircle2, Star, TrendingUp, ArrowRight } from 'lucide-react';
import api, { getErrorMessage } from '../services/api';
import { useAuth } from '../context/AuthContext';
import KPICard from '../components/ui/KPICard';
import { Card, Badge, statusTone, LoadingState, ErrorState, EmptyState } from '../components/ui/Primitives';

export default function DashboardPage() {
  const { user } = useAuth();
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    api.get('/analytics/overview')
      .then((res) => { if (mounted) setOverview(res.data); })
      .catch((err) => { if (mounted) setError(getErrorMessage(err)); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  if (loading) return <LoadingState label="Loading platform overview…" />;
  if (error) return <ErrorState message={error} />;
  if (!overview) return null;

  const { totalEvents, published, ongoing, totals, events } = overview;
  const avgRating = events.length
    ? (events.reduce((s, e) => s + (e.avgSessionRating || 0), 0) / events.length).toFixed(1)
    : '0.0';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-[var(--color-text)]">Welcome back, {user?.name?.split(' ')[0]}</h1>
        <p className="text-sm text-[var(--color-text-dim)] mt-1">Real-time overview across all your events.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard icon={CalendarDays} label="Total Events" value={totalEvents} sublabel={`${published} published · ${ongoing} ongoing`} accent="amber" />
        <KPICard icon={Users} label="Registrations" value={totals.registrations} sublabel="Across all events" accent="blue" />
        <KPICard icon={CheckCircle2} label="Check-Ins" value={totals.checkedIn} sublabel="Verified attendance" accent="teal" />
        <KPICard icon={Star} label="Avg Session Rating" value={avgRating} sublabel="Out of 5.0" accent="violet" />
      </div>

      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-semibold text-[var(--color-text)]">Your events</h2>
          <Link to="/events" className="text-xs font-mono text-[var(--color-amber)] flex items-center gap-1 hover:underline">
            View all <ArrowRight size={12} />
          </Link>
        </div>

        {events.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="No events yet"
            description="Create your first event to start using AI venue and speaker recommendations."
            action={<Link to="/events" className="text-sm text-[var(--color-amber)] hover:underline mt-2">Create an event →</Link>}
          />
        ) : (
          <div className="space-y-2">
            {events.slice(0, 6).map((e) => (
              <Link
                key={e.eventId}
                to={`/events/${e.eventId}`}
                className="flex items-center justify-between p-3 rounded-lg bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)] transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Badge tone={statusTone(e.status)}>{e.status}</Badge>
                  <span className="text-sm text-[var(--color-text)] truncate">{e.title}</span>
                </div>
                <div className="flex items-center gap-4 text-xs font-mono text-[var(--color-text-dim)] shrink-0">
                  <span className="flex items-center gap-1">
                     <span className={`w-2 h-2 rounded-full ${e.intelligence?.healthStatus === 'GOOD' ? 'bg-[var(--color-teal)]' : e.intelligence?.healthStatus === 'WARNING' ? 'bg-[var(--color-amber)]' : 'bg-red-500'}`}></span>
                     Health: {e.intelligence?.healthScore || 'N/A'}
                  </span>
                  {e.intelligence?.risks?.length > 0 && (
                     <span className="text-red-400">{e.intelligence.risks.length} Risks</span>
                  )}
                  <span>{e.registrations} regs</span>
                  <span>{e.capacityUtilization || 0}% cap</span>
                  <span>{e.attendanceRate}% attend</span>
                  <span className="flex items-center gap-1">
                    <TrendingUp size={12} className="text-[var(--color-teal)]" />
                    Eng: {e.intelligence?.engagementScore || 0}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
