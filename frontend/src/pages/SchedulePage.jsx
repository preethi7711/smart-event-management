import { useState, useEffect } from 'react';
import EventPicker from '../components/ui/EventPicker';
import ScheduleTab from '../components/events/ScheduleTab';
import { EmptyState } from '../components/ui/Primitives';
import api from '../services/api';

export default function SchedulePage() {
  const [eventId, setEventId] = useState(localStorage.getItem('lastEventId') || '');
  const [event, setEvent] = useState(null);

  useEffect(() => {
    if (!eventId) { setEvent(null); return; }
    api.get(`/events/${eventId}`).then((res) => setEvent(res.data.event)).catch(() => setEvent(null));
  }, [eventId]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-semibold text-[var(--color-text)]">Schedule</h1>
        <p className="text-sm text-[var(--color-text-dim)] mt-1">Run the deterministic scheduling agent to detect conflicts before publishing.</p>
      </div>
      <div className="max-w-xs">
        <EventPicker value={eventId} onChange={(id) => { setEventId(id); localStorage.setItem('lastEventId', id); }} />
      </div>
      {!eventId && <EmptyState title="Select an event" description="Choose an event above to check its schedule." />}
      {eventId && event && <ScheduleTab event={event} />}
    </div>
  );
}
