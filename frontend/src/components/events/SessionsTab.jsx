import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Plus, Mic2, Clock, X } from 'lucide-react';
import api, { getErrorMessage } from '../../services/api';
import { Card, Badge, statusTone, Button, Input, Select, LoadingState, EmptyState } from '../ui/Primitives';
import AIRecommendationCard from '../ui/AIRecommendationCard';

function CreateSessionModal({ eventId, rooms, onClose, onCreated }) {
  const [form, setForm] = useState({ title: '', description: '', topic: '', room: rooms[0]?._id || '', startTime: '', endTime: '', capacity: 50, sessionType: 'TALK' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const res = await api.post('/sessions', { ...form, event: eventId });
      toast.success('Session created');
      onCreated(res.data.session);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold text-lg text-[var(--color-text)]">New session</h2>
            <button onClick={onClose} className="text-[var(--color-text-dim)] hover:text-[var(--color-text)]"><X size={18} /></button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-3">
            <Input label="Title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <Input label="Topic (used for AI speaker matching)" required value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} placeholder="e.g. AI, Cloud Computing" />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Start time" type="datetime-local" required value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
              <Input label="End time" type="datetime-local" required value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Capacity" type="number" min={1} required value={form.capacity} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} />
              <Select label="Type" value={form.sessionType} onChange={(e) => setForm({ ...form, sessionType: e.target.value })}>
                <option value="TALK">Talk</option>
                <option value="KEYNOTE">Keynote</option>
                <option value="WORKSHOP">Workshop</option>
                <option value="PANEL">Panel</option>
                <option value="BREAK">Break</option>
              </Select>
            </div>
            {rooms.length > 0 && (
              <Select label="Room" value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })}>
                {rooms.map((r) => <option key={r._id} value={r._id}>{r.name} (cap {r.capacity})</option>)}
              </Select>
            )}
            {error && <p className="text-sm text-[var(--color-rose)]">{error}</p>}
            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={saving} className="flex-1">{saving ? 'Creating…' : 'Create session'}</Button>
              <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}

function SpeakerRecommendation({ session, onAssigned }) {
  const [rec, setRec] = useState(null);
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);

  async function loadRec() {
    setLoading(true);
    try {
      const res = await api.get(`/speakers/recommend/${session._id}`);
      setRec(res.data);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleAssign(speakerId) {
    setAssigning(true);
    try {
      const res = await api.post(`/speakers/assign/${session._id}`, { speakerId });
      toast.success('Speaker assigned');
      onAssigned(res.data.session);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setAssigning(false);
    }
  }

  if (!rec) {
    return (
      <Button size="sm" variant="secondary" disabled={loading} onClick={loadRec}>
        <Mic2 size={12} /> {loading ? 'Analyzing…' : 'AI recommend speaker'}
      </Button>
    );
  }

  return (
    <AIRecommendationCard
      title="AI Speaker Recommendation"
      recommendation={rec.recommendation}
      score={rec.score}
      reasons={rec.reasons}
      source={rec.source}
      onAccept={() => handleAssign(rec.speakerId)}
      acceptLabel={assigning ? 'Assigning…' : 'Assign this speaker'}
    />
  );
}

export default function SessionsTab({ event }) {
  const [sessions, setSessions] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sessRes, roomsRes] = await Promise.all([
        api.get(`/sessions/event/${event._id}`),
        event.venue ? api.get(`/venues/${event.venue._id}/rooms`) : Promise.resolve({ data: { rooms: [] } }),
      ]);
      setSessions(sessRes.data.sessions);
      setRooms(roomsRes.data.rooms);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [event._id, event.venue]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingState label="Loading sessions…" />;

  if (!event.venue) {
    return <EmptyState icon={Clock} title="Book a venue first" description="Sessions need a room to be created. Book a venue in the Venue tab." />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-semibold text-[var(--color-text)]">Sessions ({sessions.length})</h3>
        <Button size="sm" onClick={() => setShowCreate(true)}><Plus size={14} /> New session</Button>
      </div>

      {sessions.length === 0 ? (
        <EmptyState icon={Clock} title="No sessions yet" description="Create sessions, then use AI to recommend and assign speakers." />
      ) : (
        <div className="space-y-3">
          {sessions.map((s) => (
            <Card key={s._id} className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm text-[var(--color-text)]">{s.title}</span>
                    <Badge tone={statusTone(s.status)}>{s.status}</Badge>
                  </div>
                  <p className="text-xs text-[var(--color-text-dim)] font-mono">
                    {new Date(s.startTime).toLocaleString()} → {new Date(s.endTime).toLocaleTimeString()} · {s.room?.name || 'No room'} · Cap {s.capacity}
                  </p>
                  {s.conflictReason && <p className="text-xs text-[var(--color-rose)] mt-1">{s.conflictReason}</p>}
                </div>
                {s.speaker && <Badge tone="violet"><Mic2 size={11} /> {s.speaker.name}</Badge>}
              </div>
              {!s.speaker && <SpeakerRecommendation session={s} onAssigned={load} />}
            </Card>
          ))}
        </div>
      )}

      {showCreate && (
        <CreateSessionModal
          eventId={event._id}
          rooms={rooms}
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); load(); }}
        />
      )}
    </div>
  );
}
