import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

export function useEvents(params = {}) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/events', { params: { limit: 100, ...params } });
      setEvents(res.data.events);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load events.');
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(params)]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  return { events, loading, error, refetch: fetchEvents };
}
