import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, Rocket, Users, BarChart3 } from 'lucide-react';
import api, { getErrorMessage } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { Card, Badge, statusTone, Button, LoadingState, ErrorState } from '../components/ui/Primitives';
import VenueTab from '../components/events/VenueTab';
import SessionsTab from '../components/events/SessionsTab';
import ScheduleTab from '../components/events/ScheduleTab';
import AttendeeView from '../components/events/AttendeeView';

const TABS = ['Overview', 'Venue', 'Sessions & Speakers', 'Schedule'];

export default function EventDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { joinEvent, leaveEvent, on } = useSocket();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('Overview');
  const [publishing, setPublishing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/events/${id}`);
      setEvent(res.data.event);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    joinEvent(id);
    const off = on('schedule.updated', () => load());
    return () => { leaveEvent(id); off(); };
  }, [id, joinEvent, leaveEvent, on, load]);

  async function handlePublish() {
    setPublishing(true);
    try {
      const res = await api.post(`/events/${id}/publish`);
      setEvent(res.data.event);
      toast.success('Event published!');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setPublishing(false);
    }
  }

  if (loading) return <LoadingState label="Loading event…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!event) return null;

  const canManage = user?.role === 'ADMIN' || (user?.role === 'ORGANIZER' && event.organizer?._id === user._id) || (user?.role === 'ORGANIZER' && event.organizer === user._id);

  return (
    <div className="space-y-6">
      <button onClick={() => navigate('/events')} className="flex items-center gap-1.5 text-xs font-mono text-[var(--color-text-dim)] hover:text-[var(--color-text)]">
        <ArrowLeft size={13} /> Back to events
      </button>

      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge tone={statusTone(event.status)}>{event.status}</Badge>
            <span className="text-xs font-mono text-[var(--color-text-faint)]">{event.category}</span>
          </div>
          <h1 className="font-display text-2xl font-semibold text-[var(--color-text)]">{event.title}</h1>
          <p className="text-sm text-[var(--color-text-dim)] mt-1 max-w-2xl">{event.description}</p>
        </div>

        {canManage && (
          <div className="flex gap-2">
            <Link to={`/analytics?event=${event._id}`}>
              <Button variant="secondary" size="sm"><BarChart3 size={14} /> Analytics</Button>
            </Link>
            <Link to={`/registrations?event=${event._id}`}>
              <Button variant="secondary" size="sm"><Users size={14} /> Registrations</Button>
            </Link>
            {event.status !== 'PUBLISHED' && event.status !== 'ONGOING' && event.status !== 'COMPLETED' && (
              <Button onClick={handlePublish} disabled={publishing}><Rocket size={14} /> {publishing ? 'Publishing…' : 'Publish event'}</Button>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3">
          <p className="text-[10px] font-mono uppercase text-[var(--color-text-faint)]">Dates</p>
          <p className="text-sm font-medium text-[var(--color-text)]">{new Date(event.startDate).toLocaleDateString()} – {new Date(event.endDate).toLocaleDateString()}</p>
        </Card>
        <Card className="p-3">
          <p className="text-[10px] font-mono uppercase text-[var(--color-text-faint)]">Expected attendance</p>
          <p className="text-sm font-medium text-[var(--color-text)]">{event.expectedAttendance}</p>
        </Card>
        <Card className="p-3">
          <p className="text-[10px] font-mono uppercase text-[var(--color-text-faint)]">Budget</p>
          <p className="text-sm font-medium text-[var(--color-text)]">₹{event.budget?.toLocaleString()}</p>
        </Card>
        <Card className="p-3">
          <p className="text-[10px] font-mono uppercase text-[var(--color-text-faint)]">Venue</p>
          <p className="text-sm font-medium text-[var(--color-text)] truncate">{event.venue?.name || 'Not booked'}</p>
        </Card>
      </div>

      {canManage ? (
        <>
          <div className="flex gap-1 border-b border-[var(--color-border)]">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  tab === t ? 'border-[var(--color-amber)] text-[var(--color-amber)]' : 'border-transparent text-[var(--color-text-dim)] hover:text-[var(--color-text)]'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <div>
            {tab === 'Overview' && (
              <Card className="p-5">
                <p className="text-sm text-[var(--color-text-dim)]">
                  Use the tabs above to run the AI Venue Agent, assign speakers with the AI Speaker Agent, and check for scheduling conflicts before publishing.
                </p>
              </Card>
            )}
            {tab === 'Venue' && <VenueTab event={event} onEventUpdated={setEvent} />}
            {tab === 'Sessions & Speakers' && <SessionsTab event={event} />}
            {tab === 'Schedule' && <ScheduleTab event={event} />}
          </div>
        </>
      ) : (
        <AttendeeView event={event} />
      )}
    </div>
  );
}
