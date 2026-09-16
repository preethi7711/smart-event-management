import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Mic2, Plus, Star, X } from 'lucide-react';
import api, { getErrorMessage } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Card, Badge, Button, Input, Textarea, LoadingState, EmptyState } from '../components/ui/Primitives';

function CreateSpeakerModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', email: '', bio: '', expertise: '', yearsExperience: 5, fee: 10000 });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await api.post('/speakers', { ...form, expertise: form.expertise.split(',').map((s) => s.trim()).filter(Boolean) });
      toast.success('Speaker added');
      onCreated(res.data.speaker);
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
            <h2 className="font-display font-semibold text-lg text-[var(--color-text)]">Add speaker</h2>
            <button onClick={onClose}><X size={18} className="text-[var(--color-text-dim)]" /></button>
          </div>
          <form onSubmit={submit} className="space-y-3">
            <Input label="Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input label="Email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <Textarea label="Bio" rows={2} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
            <Input label="Expertise (comma-separated)" required placeholder="AI, Cloud Computing" value={form.expertise} onChange={(e) => setForm({ ...form, expertise: e.target.value })} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Years experience" type="number" value={form.yearsExperience} onChange={(e) => setForm({ ...form, yearsExperience: Number(e.target.value) })} />
              <Input label="Fee (₹)" type="number" value={form.fee} onChange={(e) => setForm({ ...form, fee: Number(e.target.value) })} />
            </div>
            {error && <p className="text-sm text-[var(--color-rose)]">{error}</p>}
            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={saving} className="flex-1">{saving ? 'Saving…' : 'Add speaker'}</Button>
              <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}

export default function SpeakersPage() {
  const { user } = useAuth();
  const [speakers, setSpeakers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const canManage = user?.role === 'ADMIN' || user?.role === 'ORGANIZER';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/speakers');
      setSpeakers(res.data.speakers);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-[var(--color-text)]">Speakers</h1>
          <p className="text-sm text-[var(--color-text-dim)] mt-1">{speakers.length} speakers in the platform directory.</p>
        </div>
        {canManage && <Button onClick={() => setShowCreate(true)}><Plus size={15} /> Add speaker</Button>}
      </div>

      {loading ? <LoadingState /> : speakers.length === 0 ? (
        <EmptyState icon={Mic2} title="No speakers yet" />
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {speakers.map((s) => (
            <Card key={s._id} className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Mic2 size={15} className="text-[var(--color-text-dim)]" />
                  <span className="font-medium text-sm text-[var(--color-text)]">{s.name}</span>
                </div>
                <span className="flex items-center gap-1 text-xs font-mono text-[var(--color-amber)]"><Star size={11} fill="currentColor" /> {s.averageRating}</span>
              </div>
              <p className="text-xs text-[var(--color-text-dim)] mb-2 line-clamp-2">{s.bio}</p>
              <div className="flex flex-wrap gap-1 mb-2">
                {s.expertise.map((e) => <Badge key={e} tone="violet">{e}</Badge>)}
              </div>
              <p className="text-xs text-[var(--color-text-faint)] font-mono">{s.yearsExperience} yrs · {s.totalSessions} sessions</p>
            </Card>
          ))}
        </div>
      )}

      {showCreate && <CreateSpeakerModal onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); load(); }} />}
    </div>
  );
}
