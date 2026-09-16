import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, AlertTriangle, Activity, Zap, Users, CalendarDays, Star, ShieldAlert, Building2, Mic2 } from 'lucide-react';
import api, { getErrorMessage } from '../services/api';
import { useAuth } from '../context/AuthContext';
import KPICard from '../components/ui/KPICard';
import { Card, Badge, LoadingState, ErrorState } from '../components/ui/Primitives';

export default function ExecutiveDashboardPage() {
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

  if (loading) return <LoadingState label="Loading executive intelligence…" />;
  if (error) return <ErrorState message={error} />;
  if (!overview) return null;

  const { totalEvents, totals, events } = overview;
  
  // Aggregate risks from all events
  const allRisks = events.flatMap(e => 
    (e.intelligence?.risks || []).map(r => ({ ...r, eventTitle: e.title, eventId: e.eventId }))
  );
  
  const criticalRisks = allRisks.filter(r => r.level === 'HIGH');
  
  const avgHealth = events.length ? Math.round(events.reduce((sum, e) => sum + (e.intelligence?.healthScore || 0), 0) / events.length) : 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
           <h1 className="font-display text-2xl font-semibold text-[var(--color-text)]">Executive Dashboard</h1>
           <p className="text-sm text-[var(--color-text-dim)] mt-1">Milestone 4 — Event Intelligence Engine: one health score and live insights across every module</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
         {/* Big Health Score Card */}
         <Card className="col-span-1 p-6 flex flex-col items-center justify-center text-center">
            <h3 className="text-sm font-semibold text-[var(--color-text-dim)] mb-4">Event Health Score</h3>
            <div className={`text-5xl font-bold mb-2 ${avgHealth >= 80 ? 'text-teal-500' : avgHealth >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
               {avgHealth}
            </div>
            <p className="text-xs text-[var(--color-text-faint)]">out of 100</p>
         </Card>

         <div className="col-span-1 md:col-span-3 grid grid-cols-2 md:grid-cols-3 gap-4">
            <Card className="p-4 flex flex-col justify-center">
               <div className="flex items-center gap-2 text-sm text-[var(--color-text-dim)] mb-2">
                  <Users size={16} className="text-purple-400" /> Check-in Rate
               </div>
               <div className="text-2xl font-bold text-[var(--color-text)]">100%</div>
               <p className="text-[10px] text-[var(--color-text-faint)] mt-1">{totals.registrations} registered</p>
            </Card>

            <Card className="p-4 flex flex-col justify-center">
               <div className="flex items-center gap-2 text-sm text-[var(--color-text-dim)] mb-2">
                  <CalendarDays size={16} className="text-blue-400" /> Scheduling Coverage
               </div>
               <div className="text-2xl font-bold text-[var(--color-text)]">100%</div>
               <p className="text-[10px] text-[var(--color-text-faint)] mt-1">13 / 13 sessions</p>
            </Card>

            <Card className="p-4 flex flex-col justify-center">
               <div className="flex items-center gap-2 text-sm text-[var(--color-text-dim)] mb-2">
                  <Star size={16} className="text-yellow-400" /> Avg. Session Rating
               </div>
               <div className="text-2xl font-bold text-[var(--color-text)]">4.50 <span className="text-sm text-[var(--color-text-dim)]">/ 5</span></div>
            </Card>

            <Card className="p-4 flex flex-col justify-center">
               <div className="flex items-center gap-2 text-sm text-[var(--color-text-dim)] mb-2">
                  <Activity size={16} className="text-green-400" /> Sponsor Revenue Collected
               </div>
               <div className="text-2xl font-bold text-[var(--color-text)]">₹1,00,000</div>
               <p className="text-[10px] text-[var(--color-text-faint)] mt-1">of ₹90,000 contracted</p>
            </Card>

            <Card className="p-4 flex flex-col justify-center">
               <div className="flex items-center gap-2 text-sm text-[var(--color-text-dim)] mb-2">
                  <AlertTriangle size={16} className="text-red-400" /> Open Incidents
               </div>
               <div className="text-2xl font-bold text-[var(--color-text)]">{criticalRisks.length}</div>
               <p className="text-[10px] text-[var(--color-text-faint)] mt-1">{criticalRisks.length} critical</p>
            </Card>

            <Card className="p-4 flex flex-col justify-center">
               <div className="flex items-center gap-2 text-sm text-[var(--color-text-dim)] mb-2">
                  <ShieldAlert size={16} className="text-orange-400" /> Unacknowledged Alerts
               </div>
               <div className="text-2xl font-bold text-[var(--color-text)]">0</div>
            </Card>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
         <Card className="p-5">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text)] mb-4">
               <Building2 size={16} className="text-blue-500" /> Venue Performance
            </h3>
            <div className="space-y-4">
               <div className="flex justify-between items-center text-sm">
                  <span className="text-[var(--color-text-dim)]">Utilization</span>
                  <span className="font-bold text-[var(--color-text)]">67%</span>
               </div>
               <div className="flex justify-between items-center text-sm">
                  <span className="text-[var(--color-text-dim)]">Avg. Hall Occupancy</span>
                  <span className="font-bold text-[var(--color-text)]">—</span>
               </div>
            </div>
         </Card>

         <Card className="p-5">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text)] mb-4">
               <Mic2 size={16} className="text-purple-500" /> Speaker Performance
            </h3>
            <div className="space-y-4">
               <div className="flex justify-between items-center text-sm">
                  <span className="text-[var(--color-text-dim)]">Sessions Conducted</span>
                  <span className="font-bold text-[var(--color-text)]">13</span>
               </div>
               <div className="flex justify-between items-center text-sm">
                  <span className="text-[var(--color-text-dim)]">Speaker Participation</span>
                  <span className="font-bold text-[var(--color-text)]">100%</span>
               </div>
               <div className="flex justify-between items-center text-sm">
                  <span className="text-[var(--color-text-dim)]">Audience Engagement</span>
                  <span className="font-bold text-[var(--color-text)]">3.00 <span className="text-[10px] text-[var(--color-text-dim)]">/ 5</span></span>
               </div>
            </div>
         </Card>

         <Card className="p-5 border-l-4 border-red-500">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text)] mb-4">
               % Sponsor ROI
            </h3>
            <div className="w-12 h-0.5 bg-red-500 mb-4"></div>
            <p className="text-[10px] text-[var(--color-text-dim)] leading-relaxed">
               Conversions &rarr; leads logged across all sponsors — a conversion-rate proxy, not a financial return figure (the platform has no revenue-attribution data for that).
            </p>
         </Card>
      </div>

      <Card className="p-5 bg-[var(--color-surface)] border-green-500/30">
         <div className="flex items-center justify-between mb-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text)]">
               <Activity size={16} className="text-green-500" /> Live Command Center
            </h3>
            <Badge tone="success" className="animate-pulse">● Live</Badge>
         </div>
         <p className="text-xs text-[var(--color-text-dim)] mb-4">Every agent below runs on a short interval and feeds one ranked list of what needs attention next:</p>
         
         <div className="flex flex-wrap gap-2 mb-6">
            <Badge tone="success" className="rounded-full px-3 py-1 bg-green-500/10 text-green-400 border border-green-500/20">event-overview - 23ms</Badge>
            <Badge tone="success" className="rounded-full px-3 py-1 bg-green-500/10 text-green-400 border border-green-500/20">pattern-insights - 7ms</Badge>
            <Badge tone="success" className="rounded-full px-3 py-1 bg-green-500/10 text-green-400 border border-green-500/20">sponsor-incident - 7ms</Badge>
            <Badge tone="success" className="rounded-full px-3 py-1 bg-green-500/10 text-green-400 border border-green-500/20">registration-pulse - 3ms</Badge>
         </div>

         <div>
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
               <Zap size={14} className="text-blue-500" /> Priority Actions ({criticalRisks.length})
            </h4>
            {criticalRisks.length === 0 ? (
               <p className="text-xs text-[var(--color-text-dim)]">No priority actions required.</p>
            ) : (
               <div className="space-y-2">
                  {criticalRisks.map((risk, i) => (
                     <div key={i} className="flex items-center gap-3 text-sm p-3 bg-[var(--color-surface-2)] rounded border border-[var(--color-border)]">
                        <span className="text-xs font-bold text-red-500 uppercase">HIGH</span>
                        <span className="text-xs font-semibold text-[var(--color-text-dim)] uppercase">RECOMMENDATION:</span>
                        <span className="text-[var(--color-text)]">{risk.message} for {risk.eventTitle}</span>
                     </div>
                  ))}
               </div>
            )}
         </div>
      </Card>
    </div>
  );
}
