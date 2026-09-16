import { Select } from './Primitives';
import { useEvents } from '../../hooks/useEvents';

/**
 * Controlled event picker. Persists last-selected event in localStorage so
 * navigating between event-scoped pages (Registrations, Sessions, Analytics...)
 * keeps context.
 */
export default function EventPicker({ value, onChange, label = 'Event' }) {
  const { events, loading } = useEvents();

  function handleChange(e) {
    const id = e.target.value;
    onChange(id);
    if (id) localStorage.setItem('lastEventId', id);
  }

  return (
    <Select label={label} value={value || ''} onChange={handleChange} disabled={loading}>
      <option value="">{loading ? 'Loading events…' : 'Select an event…'}</option>
      {events.map((ev) => (
        <option key={ev._id} value={ev._id}>{ev.title} ({ev.status})</option>
      ))}
    </Select>
  );
}
