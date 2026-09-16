import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { MessageSquareText, Sparkles } from 'lucide-react';
import api, { getErrorMessage } from '../services/api';
import { Card, Badge, LoadingState, EmptyState, Select, Button } from '../components/ui/Primitives';
import EventPicker from '../components/ui/EventPicker';

const sentimentTone = { POSITIVE: 'teal', NEUTRAL: 'amber', NEGATIVE: 'rose' };

export default function FeedbackPage() {
  const [eventId, setEventId] = useState(localStorage.getItem('lastEventId') || '');
  const [feedback, setFeedback] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [sessionId, setSessionId] = useState('');
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(false);
  const [insightsLoading, setInsightsLoading] = useState(false);

  const load = useCallback(async () => {
    if (!eventId) return;
    setLoading(true);
    try {
      const [fbRes, sessRes] = await Promise.all([
        api.get(`/feedback/event/${eventId}`),
        api.get(`/sessions/event/${eventId}`),
      ]);
      setFeedback(fbRes.data.feedback);
      setSessions(sessRes.data.sessions);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => { load(); }, [load]);

  async function loadSessionInsights() {
    if (!sessionId) { toast.error('Select a session first.'); return; }
    setInsightsLoading(true);
    try {
      const res = await api.get(`/feedback/session/${sessionId}/insights`);
      setInsights(res.data);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setInsightsLoading(false);
    }
  }

  const positivePct = feedback.length ? Math.round((feedback.filter((f) => f.sentiment === 'POSITIVE').length / feedback.length) * 100) : 0;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-semibold text-[var(--color-text)]">Feedback</h1>
        <p className="text-sm text-[var(--color-text-dim)] mt-1">Sentiment-analyzed attendee feedback with AI session insights.</p>
      </div>

      <div className="max-w-xs">
        <EventPicker value={eventId} onChange={(id) => { setEventId(id); localStorage.setItem('lastEventId', id); }} />
      </div>

      {!eventId && <EmptyState title="Select an event" description="Choose an event above to view feedback." />}

      {eventId && (
        <>
          <div className="flex flex-wrap items-end gap-3">
            <Select label="Session for AI insights" value={sessionId} onChange={(e) => setSessionId(e.target.value)} className="w-64">
              <option value="">Select a session…</option>
              {sessions.map((s) => <option key={s._id} value={s._id}>{s.title}</option>)}
            </Select>
            <Button variant="secondary" onClick={loadSessionInsights} disabled={insightsLoading}>
              <Sparkles size={14} /> {insightsLoading ? 'Analyzing…' : 'Generate AI insight'}
            </Button>
            {feedback.length > 0 && (
              <span className="text-xs font-mono text-[var(--color-text-dim)] ml-auto">{positivePct}% positive overall ({feedback.length} comments)</span>
            )}
          </div>

          {insights && (
            <Card className="p-4 border-[var(--color-amber)]/20">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={14} className="text-[var(--color-amber)]" />
                <span className="text-xs font-mono uppercase text-[var(--color-text-dim)]">
                  {insights.overallSentiment} · avg rating {insights.avgRating}/5 · {insights.source === 'LLM' ? 'AI-generated' : 'rule-based'}
                </span>
              </div>
              {insights.strengths?.length > 0 && (
                <div className="mb-2">
                  <p className="text-xs font-mono text-[var(--color-teal)] uppercase mb-1">Strengths</p>
                  {insights.strengths.map((s, i) => <p key={i} className="text-sm text-[var(--color-text)]">• {s}</p>)}
                </div>
              )}
              {insights.problems?.length > 0 && (
                <div className="mb-2">
                  <p className="text-xs font-mono text-[var(--color-rose)] uppercase mb-1">Problems</p>
                  {insights.problems.map((s, i) => <p key={i} className="text-sm text-[var(--color-text)]">• {s}</p>)}
                </div>
              )}
              <div>
                <p className="text-xs font-mono text-[var(--color-amber)] uppercase mb-1">Recommendation</p>
                <p className="text-sm text-[var(--color-text)]">{insights.recommendation}</p>
              </div>
            </Card>
          )}

          {loading ? <LoadingState /> : feedback.length === 0 ? (
            <EmptyState icon={MessageSquareText} title="No feedback yet" />
          ) : (
            <div className="space-y-2">
              {feedback.map((f) => (
                <Card key={f._id} className="p-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-[var(--color-text)]">{f.comment}</p>
                    <p className="text-xs text-[var(--color-text-faint)] mt-1">{f.attendee?.name} {f.session ? `· ${f.session.title}` : ''}</p>
                  </div>
                  <Badge tone={sentimentTone[f.sentiment]}>{f.sentiment}</Badge>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
