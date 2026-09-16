import { useState } from 'react';
import EventPicker from '../components/ui/EventPicker';
import SessionsTab from '../components/events/SessionsTab';
import { EmptyState } from '../components/ui/Primitives';
import api from '../services/api';
import { useEffect } from 'react';

export default function SessionsPage() {
  const [eventId, setEventId] = useState(localStorage.getItem('lastEventId') || '');
  const [event, setEvent] = useState(null);

  useEffect(() => {
    if (!eventId) { setEvent(null); return; }
    api.get(`/events/${eventId}`).then((res) => setEvent(res.data.event)).catch(() => setEvent(null));
  }, [eventId]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-semibold text-[var(--color-text)]">Sessions</h1>
        <p className="text-sm text-[var(--color-text-dim)] mt-1">Manage sessions and AI speaker assignment for an event.</p>
      </div>
      <div className="max-w-xs">
        <EventPicker value={eventId} onChange={(id) => { setEventId(id); localStorage.setItem('lastEventId', id); }} />
      </div>
      {!eventId && <EmptyState title="Select an event" description="Choose an event above to manage its sessions." />}
      {eventId && event && <SessionsTab event={event} />}
    </div>
  );
}
