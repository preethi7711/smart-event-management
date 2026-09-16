import { useState } from 'react';
import toast from 'react-hot-toast';
import { CalendarClock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import api, { getErrorMessage } from '../../services/api';
import { Card, Badge, Button } from '../ui/Primitives';

export default function ScheduleTab({ event }) {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  async function generate() {
    setLoading(true);
    try {
      const res = await api.post(`/sessions/schedule/${event._id}/generate`);
      setResult(res.data);
      if (res.data.conflicts > 0) toast.error(`${res.data.conflicts} conflict(s) found`);
      else toast.success('Schedule is conflict-free!');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display font-semibold text-[var(--color-text)]">Scheduling Agent</h3>
          <p className="text-xs text-[var(--color-text-dim)] mt-1">Deterministic conflict detection across speakers, rooms, capacity, and time overlaps.</p>
        </div>
        <Button onClick={generate} disabled={loading}><CalendarClock size={14} /> {loading ? 'Analyzing…' : 'Run schedule check'}</Button>
      </div>

      {result && (
        <>
          <Card className={`p-4 flex items-center gap-3 ${result.conflicts > 0 ? 'border-[var(--color-rose)]/30' : 'border-[var(--color-teal)]/30'}`}>
            {result.conflicts > 0 ? <AlertTriangle size={20} className="text-[var(--color-rose)]" /> : <CheckCircle2 size={20} className="text-[var(--color-teal)]" />}
            <div>
              <p className="text-sm font-medium text-[var(--color-text)]">
                {result.scheduled} of {result.totalSessions} sessions scheduled conflict-free
              </p>
              <p className="text-xs text-[var(--color-text-dim)]">
                {result.conflicts > 0 ? `${result.conflicts} conflict(s) require attention before publishing.` : 'Ready to publish.'}
              </p>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Badge tone={result.source === 'LLM' ? 'violet' : 'neutral'}>{result.source === 'LLM' ? 'AI explained' : 'Rule engine'}</Badge>
            </div>
            <p className="text-sm text-[var(--color-text)]">{result.aiExplanation}</p>
          </Card>

          {result.conflictDetails?.length > 0 && (
            <Card className="p-4">
              <h4 className="text-xs font-mono uppercase text-[var(--color-text-dim)] mb-2">Conflict details</h4>
              <ul className="space-y-1.5">
                {result.conflictDetails.map((c, i) => (
                  <li key={i} className="text-xs text-[var(--color-rose)] flex gap-2">
                    <span>›</span><span>{c.message}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
