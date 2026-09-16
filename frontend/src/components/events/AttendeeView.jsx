import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { UserCheck, Star, MessageSquareText, Clock } from 'lucide-react';
import api, { getErrorMessage } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Card, Badge, Button, Input, Textarea, LoadingState } from '../ui/Primitives';

export default function AttendeeView({ event }) {
  const { user } = useAuth();
  const [form, setForm] = useState({ name: user?.name || '', email: user?.email || '', phone: '', organization: user?.organization || '', jobTitle: user?.jobTitle || '' });
  const [registering, setRegistering] = useState(false);
  const [registeredCode, setRegisteredCode] = useState(localStorage.getItem(`checkInCode:${event._id}`) || '');
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ratingSession, setRatingSession] = useState(null);
  const [ratingValue, setRatingValue] = useState(5);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSessionId, setFeedbackSessionId] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/sessions/event/${event._id}`);
      setSessions(res.data.sessions);
    } catch (err) {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [event._id]);

  useEffect(() => { load(); }, [load]);

  async function handleRegister(e) {
    e.preventDefault();
    setRegistering(true);
    try {
      const res = await api.post(`/registrations/${event._id}/register`, form);
      const code = res.data.registration.checkInCode;
      setRegisteredCode(code);
      localStorage.setItem(`checkInCode:${event._id}`, code);
      toast.success('Registered! Check your email (or dev-emails.log) for confirmation.');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setRegistering(false);
    }
  }

  async function submitRating(sessionId) {
    try {
      await api.post(`/feedback/session/${sessionId}/rate`, { score: ratingValue, checkInCode: registeredCode });
      toast.success('Rating submitted');
      setRatingSession(null);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  async function submitFeedback(e) {
    e.preventDefault();
    try {
      await api.post(`/feedback/${event._id}`, { comment: feedbackText, sessionId: feedbackSessionId || undefined, checkInCode: registeredCode });
      toast.success('Feedback submitted');
      setFeedbackText('');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  return (
    <div className="space-y-5">
      {!registeredCode ? (
        <Card className="p-5">
          <h3 className="font-display font-semibold text-[var(--color-text)] mb-1 flex items-center gap-2"><UserCheck size={16} /> Register for this event</h3>
          <p className="text-xs text-[var(--color-text-dim)] mb-4">{event.requiresApproval ? 'Registration requires organizer approval.' : 'Instant approval — no review needed.'}</p>
          <form onSubmit={handleRegister} className="grid md:grid-cols-2 gap-3">
            <Input label="Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input label="Email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <Input label="Organization" value={form.organization} onChange={(e) => setForm({ ...form, organization: e.target.value })} />
            <Input label="Job title" value={form.jobTitle} onChange={(e) => setForm({ ...form, jobTitle: e.target.value })} />
            <Button type="submit" disabled={registering} className="md:col-span-2">{registering ? 'Registering…' : 'Register'}</Button>
          </form>
        </Card>
      ) : (
        <Card className="p-4 border-[var(--color-teal)]/30">
          <p className="text-sm text-[var(--color-text)]">You're registered! Your check-in code: <span className="font-mono text-[var(--color-teal)]">{registeredCode}</span></p>
          <p className="text-xs text-[var(--color-text-dim)] mt-1">Use this code at the Check-In desk, and to rate sessions or leave feedback below.</p>
        </Card>
      )}

      <div>
        <h3 className="font-display font-semibold text-[var(--color-text)] mb-3">Schedule</h3>
        {loading ? <LoadingState /> : sessions.length === 0 ? (
          <p className="text-sm text-[var(--color-text-faint)]">No sessions published yet.</p>
        ) : (
          <div className="space-y-2">
            {sessions.map((s) => (
              <Card key={s._id} className="p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--color-text)]">{s.title}</p>
                  <p className="text-xs text-[var(--color-text-faint)] font-mono flex items-center gap-1"><Clock size={11} /> {new Date(s.startTime).toLocaleString()} · {s.speaker?.name || 'TBA'}</p>
                </div>
                {registeredCode && (
                  ratingSession === s._id ? (
                    <div className="flex items-center gap-2">
                      <select value={ratingValue} onChange={(e) => setRatingValue(Number(e.target.value))} className="bg-[var(--color-surface-2)] border border-[var(--color-border-bright)] rounded px-2 py-1 text-xs">
                        {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} ★</option>)}
                      </select>
                      <Button size="sm" onClick={() => submitRating(s._id)}>Submit</Button>
                    </div>
                  ) : (
                    <Button size="sm" variant="secondary" onClick={() => setRatingSession(s._id)}><Star size={12} /> Rate</Button>
                  )
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      {registeredCode && (
        <Card className="p-5">
          <h3 className="font-display font-semibold text-sm text-[var(--color-text)] mb-3 flex items-center gap-2"><MessageSquareText size={15} /> Leave feedback</h3>
          <form onSubmit={submitFeedback} className="space-y-3">
            <select value={feedbackSessionId} onChange={(e) => setFeedbackSessionId(e.target.value)} className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border-bright)] rounded-lg px-3 py-2 text-sm text-[var(--color-text)]">
              <option value="">General event feedback</option>
              {sessions.map((s) => <option key={s._id} value={s._id}>{s.title}</option>)}
            </select>
            <Textarea required rows={3} placeholder="Share your thoughts…" value={feedbackText} onChange={(e) => setFeedbackText(e.target.value)} />
            <Button type="submit">Submit feedback</Button>
          </form>
        </Card>
      )}
    </div>
  );
}
