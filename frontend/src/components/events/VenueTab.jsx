import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Building2, Lock, CheckCircle2 } from 'lucide-react';
import api, { getErrorMessage } from '../../services/api';
import { Card, Badge, Button, LoadingState } from '../ui/Primitives';
import AIRecommendationCard from '../ui/AIRecommendationCard';

export default function VenueTab({ event, onEventUpdated }) {
  const [venues, setVenues] = useState([]);
  const [recommendation, setRecommendation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busyVenueId, setBusyVenueId] = useState(null);
  const [rooms, setRooms] = useState({}); // venueId -> rooms[]

  const loadRecommendation = useCallback(async () => {
    setLoading(true);
    try {
      const [recRes, venuesRes] = await Promise.all([
        api.get(`/venues/recommend/${event._id}`),
        api.get('/venues'),
      ]);
      setRecommendation(recRes.data);
      setVenues(venuesRes.data.venues);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [event._id]);

  useEffect(() => { loadRecommendation(); }, [loadRecommendation]);

  async function loadRooms(venueId) {
    if (rooms[venueId]) return rooms[venueId];
    const res = await api.get(`/venues/${venueId}/rooms`);
    setRooms((prev) => ({ ...prev, [venueId]: res.data.rooms }));
    return res.data.rooms;
  }

  async function handleBook(venueId) {
    setBusyVenueId(venueId);
    try {
      const venueRooms = await loadRooms(venueId);
      const suitableRoom = venueRooms.find((r) => r.capacity >= (event.requiredCapacity || 0)) || venueRooms[0];
      if (!suitableRoom) {
        toast.error('No rooms found at this venue.');
        return;
      }

      // Lock first, then book, to demonstrate real-time locking + prevent double-booking
      await api.post('/venues/lock', { roomId: suitableRoom._id, eventId: event._id });
      toast.success('Room locked for 5 minutes. Confirming booking…');

      const bookRes = await api.post('/venues/book', { eventId: event._id, venueId, roomId: suitableRoom._id });
      toast.success('Venue booked successfully!');
      onEventUpdated(bookRes.data.event);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusyVenueId(null);
    }
  }

  if (loading) return <LoadingState label="Running AI venue recommendation…" />;

  return (
    <div className="space-y-5">
      {event.venue && (
        <Card className="p-4 flex items-center gap-3 border-[var(--color-teal)]/30">
          <CheckCircle2 size={18} className="text-[var(--color-teal)]" />
          <div>
            <p className="text-sm font-medium text-[var(--color-text)]">Venue booked: {event.venue.name}</p>
            <p className="text-xs text-[var(--color-text-dim)]">{event.venue.city}</p>
          </div>
        </Card>
      )}

      {recommendation && recommendation.venueId && (
        <AIRecommendationCard
          title="AI Venue Recommendation"
          recommendation={recommendation.recommendation}
          score={recommendation.score}
          reasons={recommendation.reasons}
          source={recommendation.source}
          onAccept={!event.venue ? () => handleBook(recommendation.venueId) : undefined}
          acceptLabel="Lock & book this venue"
        />
      )}

      <div>
        <h3 className="font-display font-semibold text-[var(--color-text)] mb-3">All venues ({venues.length})</h3>
        <div className="grid md:grid-cols-2 gap-3">
          {venues.map((v) => {
            const fullRankInfo = recommendation?.fullRanking?.find((r) => r.venueId === v._id);
            return (
              <Card key={v._id} className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Building2 size={15} className="text-[var(--color-text-dim)]" />
                    <span className="font-medium text-sm text-[var(--color-text)]">{v.name}</span>
                  </div>
                  {fullRankInfo && <Badge tone={fullRankInfo.score >= 70 ? 'teal' : fullRankInfo.score >= 40 ? 'amber' : 'rose'}>{fullRankInfo.score}/100</Badge>}
                </div>
                <p className="text-xs text-[var(--color-text-dim)] mb-1">{v.city} · Capacity {v.totalCapacity} · ₹{v.pricePerDay.toLocaleString()}/day</p>
                <div className="flex flex-wrap gap-1 mb-3">
                  {v.facilities.slice(0, 4).map((f) => <span key={f} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--color-surface-3)] text-[var(--color-text-faint)]">{f}</span>)}
                </div>
                {event.venue?._id === v._id ? (
                  <Badge tone="teal"><CheckCircle2 size={11} /> Booked</Badge>
                ) : (
                  <Button size="sm" variant="secondary" disabled={busyVenueId === v._id || !!event.venue} onClick={() => handleBook(v._id)}>
                    <Lock size={12} /> {busyVenueId === v._id ? 'Booking…' : 'Lock & book'}
                  </Button>
                )}
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
