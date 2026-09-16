import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { QrCode, CheckCircle2 } from 'lucide-react';
import api, { getErrorMessage } from '../services/api';
import { useSocket } from '../context/SocketContext';
import { Card, Button, Input, Select, LoadingState } from '../components/ui/Primitives';
import EventPicker from '../components/ui/EventPicker';

export default function CheckInPage() {
  const [eventId, setEventId] = useState(localStorage.getItem('lastEventId') || '');
  const [sessions, setSessions] = useState([]);
  const [sessionId, setSessionId] = useState('');
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [recentCheckIns, setRecentCheckIns] = useState([]);
  const { on } = useSocket();

  useEffect(() => {
    if (!eventId) { setSessions([]); return; }
    api.get(`/sessions/event/${eventId}`).then((res) => setSessions(res.data.sessions)).catch(() => {});
  }, [eventId]);

  const loadRecent = useCallback(async () => {
    if (!eventId) return;
    try {
      const res = await api.get(`/checkin/event/${eventId}`);
      setRecentCheckIns(res.data.checkIns.slice(0, 15));
    } catch (err) { /* org-only endpoint, ignore for attendee role */ }
  }, [eventId]);

  useEffect(() => { loadRecent(); }, [loadRecent]);
  useEffect(() => {
    const off = on('checkin.created', loadRecent);
    return off;
  }, [on, loadRecent]);

  async function handleCheckIn(e) {
    e.preventDefault();
    setSubmitting(true);
    setLastResult(null);
    try {
      const res = await api.post('/checkin', { checkInCode: code.trim(), sessionId: sessionId || null });
      setLastResult({ success: true, ...res.data });
      toast.success('Checked in!');
      setCode('');
      loadRecent();
    } catch (err) {
      setLastResult({ success: false, message: getErrorMessage(err) });
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h1 className="font-display text-2xl font-semibold text-[var(--color-text)]">Check-In</h1>
        <p className="text-sm text-[var(--color-text-dim)] mt-1">Scan or enter a check-in code. Duplicate check-ins are automatically prevented.</p>
      </div>

      <EventPicker value={eventId} onChange={(id) => { setEventId(id); localStorage.setItem('lastEventId', id); }} />

      {eventId && (
        <>
          <Card className="p-5">
            <form onSubmit={handleCheckIn} className="space-y-3">
              <Select label="Session (optional — leave blank for event-level check-in)" value={sessionId} onChange={(e) => setSessionId(e.target.value)}>
                <option value="">Event check-in (no specific session)</option>
                {sessions.map((s) => <option key={s._id} value={s._id}>{s.title}</option>)}
              </Select>
              <Input label="Check-in code" required value={code} onChange={(e) => setCode(e.target.value)} placeholder="Paste QR code value or check-in code" />
              <Button type="submit" disabled={submitting} className="w-full"><QrCode size={15} /> {submitting ? 'Checking in…' : 'Check in'}</Button>
            </form>

            {lastResult && (
              <div className={`mt-4 p-3 rounded-lg text-sm ${lastResult.success ? 'bg-[var(--color-teal)]/10 text-[var(--color-teal)]' : 'bg-[var(--color-rose)]/10 text-[var(--color-rose)]'}`}>
                {lastResult.success ? (
                  <span className="flex items-center gap-2"><CheckCircle2 size={15} /> {lastResult.attendee?.name} checked in{lastResult.session ? ` for "${lastResult.session.title}"` : ''}.</span>
                ) : lastResult.message}
              </div>
            )}
          </Card>

          <Card className="p-4">
            <h3 className="text-xs font-mono uppercase text-[var(--color-text-dim)] mb-3">Recent check-ins</h3>
            {recentCheckIns.length === 0 ? (
              <p className="text-sm text-[var(--color-text-faint)]">No check-ins yet.</p>
            ) : (
              <ul className="space-y-2">
                {recentCheckIns.map((c) => (
                  <li key={c._id} className="flex items-center justify-between text-sm">
                    <span className="text-[var(--color-text)]">{c.attendee?.name}</span>
                    <span className="text-xs font-mono text-[var(--color-text-faint)]">{c.session?.title || 'Event'} · {new Date(c.checkedInAt).toLocaleTimeString()}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
