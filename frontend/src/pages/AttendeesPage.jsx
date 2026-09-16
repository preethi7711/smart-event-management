import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { UserPlus, Users } from 'lucide-react';
import api, { getErrorMessage } from '../services/api';
import { Card, Badge, Button, Input, LoadingState, EmptyState } from '../components/ui/Primitives';
import EventPicker from '../components/ui/EventPicker';

export default function AttendeesPage() {
  const [eventId, setEventId] = useState(localStorage.getItem('lastEventId') || '');
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', organization: '', jobTitle: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!eventId) return;
    setLoading(true);
    try {
      const res = await api.get(`/registrations/${eventId}`, { params: { limit: 100 } });
      setRegistrations(res.data.registrations);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => { load(); }, [load]);

  async function handleAdd(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post(`/registrations/${eventId}/organizer-create`, form);
      toast.success('Attendee added');
      setForm({ name: '', email: '', phone: '', organization: '', jobTitle: '' });
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-semibold text-[var(--color-text)]">Attendees</h1>
        <p className="text-sm text-[var(--color-text-dim)] mt-1">Organizer-managed attendee directory per event.</p>
      </div>

      <div className="max-w-xs">
        <EventPicker value={eventId} onChange={(id) => { setEventId(id); localStorage.setItem('lastEventId', id); }} />
      </div>

      {!eventId && <EmptyState title="Select an event" description="Choose an event above to manage its attendees." />}

      {eventId && (
        <>
          <Card className="p-4">
            <h3 className="font-display font-semibold text-sm text-[var(--color-text)] mb-3 flex items-center gap-2">
              <UserPlus size={15} /> Add attendee manually
            </h3>
            <form onSubmit={handleAdd} className="grid md:grid-cols-5 gap-2 items-end">
              <Input placeholder="Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <Input placeholder="Email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              <Input placeholder="Organization" value={form.organization} onChange={(e) => setForm({ ...form, organization: e.target.value })} />
              <Input placeholder="Job title" value={form.jobTitle} onChange={(e) => setForm({ ...form, jobTitle: e.target.value })} />
              <Button type="submit" disabled={saving}>{saving ? 'Adding…' : 'Add'}</Button>
            </form>
          </Card>

          {loading ? (
            <LoadingState label="Loading attendees…" />
          ) : registrations.length === 0 ? (
            <EmptyState icon={Users} title="No attendees yet" />
          ) : (
            <Card className="overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)] text-left">
                    <th className="p-3 text-xs font-mono uppercase text-[var(--color-text-faint)]">Name</th>
                    <th className="p-3 text-xs font-mono uppercase text-[var(--color-text-faint)]">Organization</th>
                    <th className="p-3 text-xs font-mono uppercase text-[var(--color-text-faint)]">Source</th>
                    <th className="p-3 text-xs font-mono uppercase text-[var(--color-text-faint)]">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {registrations.map((r) => (
                    <tr key={r._id} className="border-b border-[var(--color-border)] last:border-0">
                      <td className="p-3 text-[var(--color-text)]">{r.attendee?.name}<br /><span className="text-xs text-[var(--color-text-faint)]">{r.attendee?.email}</span></td>
                      <td className="p-3 text-[var(--color-text-dim)]">{r.attendee?.organization || '—'}</td>
                      <td className="p-3"><Badge>{r.attendee?.source}</Badge></td>
                      <td className="p-3"><Badge tone={r.status === 'APPROVED' ? 'teal' : r.status === 'REJECTED' ? 'rose' : 'amber'}>{r.status}</Badge></td>
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
