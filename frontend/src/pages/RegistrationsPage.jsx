import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Check, X, Sparkles, Search } from 'lucide-react';
import api, { getErrorMessage } from '../services/api';
import { useSocket } from '../context/SocketContext';
import { Card, Badge, statusTone, Button, Input, Select, LoadingState, EmptyState } from '../components/ui/Primitives';
import EventPicker from '../components/ui/EventPicker';

export default function RegistrationsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [eventId, setEventId] = useState(searchParams.get('event') || localStorage.getItem('lastEventId') || '');
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [insights, setInsights] = useState(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const { on } = useSocket();

  const load = useCallback(async () => {
    if (!eventId) return;
    setLoading(true);
    try {
      const res = await api.get(`/registrations/${eventId}`, { params: { status: statusFilter || undefined, search: search || undefined, limit: 100 } });
      setRegistrations(res.data.registrations);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [eventId, statusFilter, search]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const offs = ['registration.created', 'registration.approved', 'registration.rejected'].map((evt) => on(evt, load));
    return () => offs.forEach((off) => off());
  }, [on, load]);

  function selectEvent(id) {
    setEventId(id);
    setSearchParams({ event: id });
    setInsights(null);
  }

  async function review(id, decision) {
    try {
      await api.put(`/registrations/review/${id}`, { decision });
      toast.success(`Registration ${decision.toLowerCase()}`);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  async function loadInsights() {
    setInsightsLoading(true);
    try {
      const res = await api.get(`/registrations/${eventId}/insights`);
      setInsights(res.data);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setInsightsLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-semibold text-[var(--color-text)]">Registrations</h1>
        <p className="text-sm text-[var(--color-text-dim)] mt-1">Review, approve, and analyze attendee registrations.</p>
      </div>

      <div className="max-w-xs">
        <EventPicker value={eventId} onChange={selectEvent} />
      </div>

      {!eventId && <EmptyState title="Select an event" description="Choose an event above to view its registrations." />}

      {eventId && (
        <>
          <div className="flex flex-wrap items-end gap-3">
            <Select label="Status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-40">
              <option value="">All</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </Select>
            <Input label="Search" placeholder="Name or email…" value={search} onChange={(e) => setSearch(e.target.value)} className="w-56" />
            <Button variant="secondary" onClick={loadInsights} disabled={insightsLoading}>
              <Sparkles size={14} /> {insightsLoading ? 'Analyzing…' : 'AI insights'}
            </Button>
          </div>

          {insights && (
            <Card className="p-4 border-[var(--color-amber)]/20">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={14} className="text-[var(--color-amber)]" />
                <span className="text-xs font-mono uppercase text-[var(--color-text-dim)]">Registration insights ({insights.source === 'LLM' ? 'AI-generated' : 'rule-based'})</span>
              </div>
              <ul className="space-y-1">
                {insights.insights.map((ins, i) => <li key={i} className="text-sm text-[var(--color-text)]">• {ins}</li>)}
              </ul>
            </Card>
          )}

          {loading ? (
            <LoadingState label="Loading registrations…" />
          ) : registrations.length === 0 ? (
            <EmptyState icon={Search} title="No registrations found" description="Try a different filter or check back once attendees register." />
          ) : (
            <Card className="overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)] text-left">
                    <th className="p-3 text-xs font-mono uppercase text-[var(--color-text-faint)]">Attendee</th>
                    <th className="p-3 text-xs font-mono uppercase text-[var(--color-text-faint)]">Category</th>
                    <th className="p-3 text-xs font-mono uppercase text-[var(--color-text-faint)]">Status</th>
                    <th className="p-3 text-xs font-mono uppercase text-[var(--color-text-faint)]">Registered</th>
                    <th className="p-3 text-xs font-mono uppercase text-[var(--color-text-faint)]"></th>
                  </tr>
                </thead>
                <tbody>
                  {registrations.map((r) => (
                    <tr key={r._id} className="border-b border-[var(--color-border)] last:border-0">
                      <td className="p-3">
                        <p className="text-[var(--color-text)] font-medium">{r.attendee?.name}</p>
                        <p className="text-xs text-[var(--color-text-faint)]">{r.attendee?.email}</p>
                      </td>
                      <td className="p-3"><Badge>{r.category}</Badge></td>
                      <td className="p-3"><Badge tone={statusTone(r.status)}>{r.status}</Badge></td>
                      <td className="p-3 text-xs font-mono text-[var(--color-text-faint)]">{new Date(r.createdAt).toLocaleDateString()}</td>
                      <td className="p-3">
                        {r.status === 'PENDING' && (
                          <div className="flex gap-1.5">
                            <button onClick={() => review(r._id, 'APPROVED')} className="p-1.5 rounded-md bg-[var(--color-teal)]/10 text-[var(--color-teal)] hover:bg-[var(--color-teal)]/20"><Check size={14} /></button>
                            <button onClick={() => review(r._id, 'REJECTED')} className="p-1.5 rounded-md bg-[var(--color-rose)]/10 text-[var(--color-rose)] hover:bg-[var(--color-rose)]/20"><X size={14} /></button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
