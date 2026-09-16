import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Building2, Plus, X } from 'lucide-react';
import api, { getErrorMessage } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Card, Button, Input, Textarea, LoadingState, EmptyState } from '../components/ui/Primitives';

const FACILITY_OPTIONS = ['WIFI', 'PROJECTOR', 'CATERING', 'PARKING', 'AV_SYSTEM', 'STAGE'];

function CreateVenueModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', address: '', city: '', totalCapacity: 500, pricePerDay: 50000, facilities: [], rating: 4 });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function toggle(f) {
    setForm((prev) => ({ ...prev, facilities: prev.facilities.includes(f) ? prev.facilities.filter((x) => x !== f) : [...prev.facilities, f] }));
  }

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await api.post('/venues', form);
      toast.success('Venue added');
      onCreated(res.data.venue);
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
            <h2 className="font-display font-semibold text-lg text-[var(--color-text)]">Add venue</h2>
            <button onClick={onClose}><X size={18} className="text-[var(--color-text-dim)]" /></button>
          </div>
          <form onSubmit={submit} className="space-y-3">
            <Input label="Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Textarea label="Address" required rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            <Input label="City" required value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Total capacity" type="number" required value={form.totalCapacity} onChange={(e) => setForm({ ...form, totalCapacity: Number(e.target.value) })} />
              <Input label="Price/day (₹)" type="number" required value={form.pricePerDay} onChange={(e) => setForm({ ...form, pricePerDay: Number(e.target.value) })} />
            </div>
            <div>
              <span className="block text-xs font-mono text-[var(--color-text-dim)] mb-1.5 uppercase">Facilities</span>
              <div className="flex flex-wrap gap-2">
                {FACILITY_OPTIONS.map((f) => (
                  <button type="button" key={f} onClick={() => toggle(f)} className={`text-xs font-mono px-2.5 py-1 rounded-full border ${form.facilities.includes(f) ? 'bg-[var(--color-amber)] text-[#1A1200] border-[var(--color-amber)]' : 'bg-[var(--color-surface-2)] text-[var(--color-text-dim)] border-[var(--color-border-bright)]'}`}>{f}</button>
                ))}
              </div>
            </div>
            {error && <p className="text-sm text-[var(--color-rose)]">{error}</p>}
            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={saving} className="flex-1">{saving ? 'Saving…' : 'Add venue'}</Button>
              <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}

export default function VenuesPage() {
  const { user } = useAuth();
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const canManage = user?.role === 'ADMIN' || user?.role === 'ORGANIZER';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/venues');
      setVenues(res.data.venues);
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
          <h1 className="font-display text-2xl font-semibold text-[var(--color-text)]">Venues</h1>
          <p className="text-sm text-[var(--color-text-dim)] mt-1">{venues.length} venues in the platform directory.</p>
        </div>
        {canManage && <Button onClick={() => setShowCreate(true)}><Plus size={15} /> Add venue</Button>}
      </div>

      {loading ? <LoadingState /> : venues.length === 0 ? (
        <EmptyState icon={Building2} title="No venues yet" />
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {venues.map((v) => (
            <Card key={v._id} className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Building2 size={15} className="text-[var(--color-text-dim)]" />
                <span className="font-medium text-sm text-[var(--color-text)]">{v.name}</span>
              </div>
              <p className="text-xs text-[var(--color-text-dim)] mb-1">{v.city} · Capacity {v.totalCapacity}</p>
              <p className="text-xs text-[var(--color-text-faint)] mb-3">₹{v.pricePerDay.toLocaleString()}/day · Rating {v.rating}/5</p>
              <div className="flex flex-wrap gap-1">
                {v.facilities.map((f) => <span key={f} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--color-surface-3)] text-[var(--color-text-faint)]">{f}</span>)}
              </div>
            </Card>
          ))}
        </div>
      )}

      {showCreate && <CreateVenueModal onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); load(); }} />}
    </div>
  );
}
