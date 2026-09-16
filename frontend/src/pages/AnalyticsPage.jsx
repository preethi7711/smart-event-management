import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api, { getErrorMessage } from '../services/api';
import { useSocket } from '../context/SocketContext';
import KPICard from '../components/ui/KPICard';
import { Card, LoadingState, EmptyState } from '../components/ui/Primitives';
import EventPicker from '../components/ui/EventPicker';
import { Users, CheckCircle2, Star, TrendingUp } from 'lucide-react';

const CHART_COLORS = ['#F5A623', '#2DD4BF', '#FB7185', '#A78BFA', '#60A5FA'];

export default function AnalyticsPage() {
  const [searchParams] = useSearchParams();
  const [eventId, setEventId] = useState(searchParams.get('event') || localStorage.getItem('lastEventId') || '');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const { on } = useSocket();

  const load = useCallback(async () => {
    if (!eventId) return;
    setLoading(true);
    try {
      const res = await api.get(`/analytics/event/${eventId}`);
      setStats(res.data.stats);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const offs = ['registration.created', 'checkin.created', 'feedback.created', 'analytics.updated'].map((e) => on(e, load));
    return () => offs.forEach((off) => off());
  }, [on, load]);

  const sentimentData = stats ? [
    { name: 'Positive', value: stats.feedback.positive },
    { name: 'Neutral', value: stats.feedback.neutral },
    { name: 'Negative', value: stats.feedback.negative },
  ].filter((d) => d.value > 0) : [];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-semibold text-[var(--color-text)]">Overall Analytics & Event Intelligence</h1>
        <p className="text-sm text-[var(--color-text-dim)] mt-1">Complete organization/event-level view and intelligence.</p>
      </div>

      <div className="max-w-xs">
        <EventPicker value={eventId} onChange={(id) => { setEventId(id); localStorage.setItem('lastEventId', id); }} />
      </div>

      {!eventId && <EmptyState title="Select an event" description="Choose an event above to view its analytics." />}
      {loading && <LoadingState label="Crunching numbers…" />}

      {stats && !loading && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KPICard icon={Users} label="Registrations" value={stats.registrations} sublabel={`${stats.approvalRate}% approval rate`} accent="amber" />
            <KPICard icon={CheckCircle2} label="Attendance Rate" value={`${stats.attendanceRate}%`} sublabel={`${stats.checkedIn} checked in`} accent="teal" />
            <KPICard icon={Star} label="Avg Session Rating" value={stats.avgSessionRating} sublabel="Out of 5.0" accent="violet" />
            <KPICard icon={TrendingUp} label="Venue Utilization" value={`${stats.venueUtilization}%`} sublabel="Of booked capacity" accent="blue" />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <Card className="p-5">
              <h3 className="font-display font-semibold text-sm text-[var(--color-text)] mb-4">Registration trend</h3>
              {stats.registrationTrend.length === 0 ? <EmptyState title="No data yet" /> : (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={stats.registrationTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2A3350" />
                    <XAxis dataKey="date" tick={{ fill: '#8A93B2', fontSize: 10 }} />
                    <YAxis tick={{ fill: '#8A93B2', fontSize: 10 }} />
                    <Tooltip contentStyle={{ background: '#1B2338', border: '1px solid #2A3350', borderRadius: 8, fontSize: 12 }} />
                    <Line type="monotone" dataKey="count" stroke="#F5A623" strokeWidth={2} dot={{ fill: '#F5A623', r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </Card>

            <Card className="p-5">
              <h3 className="font-display font-semibold text-sm text-[var(--color-text)] mb-4">Session popularity (check-ins)</h3>
              {stats.sessions.length === 0 ? <EmptyState title="No sessions yet" /> : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={stats.sessions.slice(0, 8)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2A3350" />
                    <XAxis dataKey="title" tick={{ fill: '#8A93B2', fontSize: 9 }} interval={0} angle={-20} textAnchor="end" height={60} />
                    <YAxis tick={{ fill: '#8A93B2', fontSize: 10 }} />
                    <Tooltip contentStyle={{ background: '#1B2338', border: '1px solid #2A3350', borderRadius: 8, fontSize: 12 }} />
                    <Bar dataKey="checkIns" fill="#2DD4BF" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>

            <Card className="p-5">
              <h3 className="font-display font-semibold text-sm text-[var(--color-text)] mb-4">Feedback sentiment</h3>
              {sentimentData.length === 0 ? <EmptyState title="No feedback yet" /> : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={sentimentData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                      {sentimentData.map((entry, i) => <Cell key={entry.name} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#1B2338', border: '1px solid #2A3350', borderRadius: 8, fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </Card>

            <Card className="p-5">
              <h3 className="font-display font-semibold text-sm text-[var(--color-text)] mb-4">Speaker ratings</h3>
              {stats.sessions.filter((s) => s.speaker).length === 0 ? <EmptyState title="No rated sessions yet" /> : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={stats.sessions.filter((s) => s.speaker).slice(0, 8)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#2A3350" />
                    <XAxis type="number" domain={[0, 5]} tick={{ fill: '#8A93B2', fontSize: 10 }} />
                    <YAxis type="category" dataKey="speaker" tick={{ fill: '#8A93B2', fontSize: 10 }} width={100} />
                    <Tooltip contentStyle={{ background: '#1B2338', border: '1px solid #2A3350', borderRadius: 8, fontSize: 12 }} />
                    <Bar dataKey="avgRating" fill="#A78BFA" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>
          </div>

          <div className="grid md:grid-cols-3 gap-4 mt-6">
             <Card className="p-5">
               <h3 className="font-display font-semibold text-sm text-[var(--color-text)] mb-4 flex items-center gap-2">
                 <CheckCircle2 size={16} className="text-teal-500" /> Venue Intelligence
               </h3>
               <div className="space-y-2 text-sm">
                 <p className="text-[var(--color-text-dim)]">Capacity Utilization: <span className="font-mono text-white">{stats.capacityUtilization}%</span></p>
                 <p className="text-[var(--color-text-dim)]">Room Utilization: <span className="font-mono text-white">{stats.venueUtilization}%</span></p>
                 {stats.capacityUtilization > 90 && (
                    <div className="text-red-400 mt-2 text-xs">⚠️ Over-capacity risk detected. Consider waitlist.</div>
                 )}
               </div>
             </Card>

             <Card className="p-5">
               <h3 className="font-display font-semibold text-sm text-[var(--color-text)] mb-4 flex items-center gap-2">
                 <CheckCircle2 size={16} className="text-amber-500" /> Sponsor & Incident Intelligence
               </h3>
               <div className="space-y-2 text-sm">
                 <EmptyState title="Insufficient data" description="No active incidents or sponsor deliverables logged for this event." />
               </div>
             </Card>

             <Card className="p-5 bg-[var(--color-surface-2)] border-amber-500/30">
               <h3 className="font-display font-semibold text-sm text-amber-500 mb-4 flex items-center gap-2">
                 <TrendingUp size={16} /> Cross-Agent Insights
               </h3>
               <div className="space-y-3 text-xs">
                  <div>
                    <span className="block font-semibold text-[var(--color-text-dim)]">What is happening:</span>
                    <span>Event health is {stats.intelligence?.healthStatus || 'GOOD'} ({stats.intelligence?.healthScore}/100)</span>
                  </div>
                  <div>
                    <span className="block font-semibold text-[var(--color-text-dim)]">Risk Evidence:</span>
                    {stats.intelligence?.risks?.length > 0 ? (
                       <ul className="list-disc pl-4 text-red-400">
                         {stats.intelligence.risks.map((r, i) => <li key={i}>{r.message}</li>)}
                       </ul>
                    ) : <span>No critical risks detected.</span>}
                  </div>
                  <div>
                    <span className="block font-semibold text-[var(--color-text-dim)]">Recommended Action:</span>
                    <span className="text-teal-400">Maintain current engagement strategy. Monitor walk-ins.</span>
                  </div>
               </div>
             </Card>
          </div>
        </>
      )}
    </div>
  );
}
