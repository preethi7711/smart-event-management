import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, CalendarDays, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { getErrorMessage } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useEvents } from '../hooks/useEvents';
import { Card, Badge, statusTone, Button, Input, Textarea, LoadingState, ErrorState, EmptyState } from '../components/ui/Primitives';

function CreateEventModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    title: '', description: '', category: 'Technology', startDate: '', endDate: '',
    expectedAttendance: 100, budget: 50000, requiredCapacity: 100, registrationDeadline: '',
    requiresApproval: true, requiredFacilities: [],
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const facilityOptions = ['WIFI', 'PROJECTOR', 'CATERING', 'PARKING', 'AV_SYSTEM', 'STAGE'];

  function toggleFacility(f) {
    setForm((prev) => ({
      ...prev,
      requiredFacilities: prev.requiredFacilities.includes(f)
        ? prev.requiredFacilities.filter((x) => x !== f)
        : [...prev.requiredFacilities, f],
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const res = await api.post('/events', form);
      toast.success('Event created');
      onCreated(res.data.event);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold text-lg text-[var(--color-text)]">Create event</h2>
            <button onClick={onClose} className="text-[var(--color-text-dim)] hover:text-[var(--color-text)]"><X size={18} /></button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="Title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <Textarea label="Description" required rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Start date" type="date" required value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
              <Input label="End date" type="date" required value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Input label="Expected attendance" type="number" min={1} value={form.expectedAttendance} onChange={(e) => setForm({ ...form, expectedAttendance: Number(e.target.value) })} />
              <Input label="Required capacity" type="number" min={1} value={form.requiredCapacity} onChange={(e) => setForm({ ...form, requiredCapacity: Number(e.target.value) })} />
              <Input label="Budget (₹/day)" type="number" min={0} value={form.budget} onChange={(e) => setForm({ ...form, budget: Number(e.target.value) })} />
            </div>
            <Input label="Registration deadline" type="date" value={form.registrationDeadline} onChange={(e) => setForm({ ...form, registrationDeadline: e.target.value })} />
            <div>
              <span className="block text-xs font-mono text-[var(--color-text-dim)] mb-1.5 uppercase tracking-wide">Required facilities</span>
              <div className="flex flex-wrap gap-2">
                {facilityOptions.map((f) => (
                  <button
                    type="button"
                    key={f}
                    onClick={() => toggleFacility(f)}
                    className={`text-xs font-mono px-2.5 py-1 rounded-full border transition-colors ${
                      form.requiredFacilities.includes(f)
                        ? 'bg-[var(--color-amber)] text-[#1A1200] border-[var(--color-amber)]'
                        : 'bg-[var(--color-surface-2)] text-[var(--color-text-dim)] border-[var(--color-border-bright)]'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-[var(--color-text-dim)]">
              <input type="checkbox" checked={form.requiresApproval} onChange={(e) => setForm({ ...form, requiresApproval: e.target.checked })} />
              Require organizer approval for registrations
            </label>
            {error && <p className="text-sm text-[var(--color-rose)]">{error}</p>}
            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={saving} className="flex-1">{saving ? 'Creating…' : 'Create event'}</Button>
              <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}

export default function EventsPage() {
  const { user } = useAuth();
  const { events, loading, error, refetch } = useEvents();
  const [showCreate, setShowCreate] = useState(false);
  const canCreate = user?.role === 'ADMIN' || user?.role === 'ORGANIZER';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-[var(--color-text)]">Events</h1>
          <p className="text-sm text-[var(--color-text-dim)] mt-1">Manage events end-to-end: venue, speakers, schedule, and publishing.</p>
        </div>
        {canCreate && (
          <Button onClick={() => setShowCreate(true)}><Plus size={15} /> New event</Button>
        )}
      </div>

      {loading && <LoadingState label="Loading events…" />}
      {error && <ErrorState message={error} onRetry={refetch} />}

      {!loading && !error && events.length === 0 && (
        <EmptyState icon={CalendarDays} title="No events yet" description="Create your first event to get started." />
      )}

      {!loading && !error && events.length > 0 && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {events.map((ev) => (
            <Link key={ev._id} to={`/events/${ev._id}`}>
              <Card className="p-5 h-full hover:border-[var(--color-border-bright)] transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <Badge tone={statusTone(ev.status)}>{ev.status}</Badge>
                  <span className="text-xs font-mono text-[var(--color-text-faint)]">{ev.category}</span>
                </div>
                <h3 className="font-display font-semibold text-[var(--color-text)] mb-1">{ev.title}</h3>
                <p className="text-xs text-[var(--color-text-dim)] line-clamp-2 mb-3">{ev.description}</p>
                <div className="flex items-center justify-between text-xs font-mono text-[var(--color-text-faint)]">
                  <span>{new Date(ev.startDate).toLocaleDateString()}</span>
                  <span>{ev.venue ? ev.venue.name : 'No venue booked'}</span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {showCreate && (
        <CreateEventModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); refetch(); }}
        />
      )}
    </div>
  );
}
