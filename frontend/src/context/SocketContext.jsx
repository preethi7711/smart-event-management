import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [feed, setFeed] = useState([]); // recent real-time events, newest first

  useEffect(() => {
    const socket = io('/', { path: '/socket.io', transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    const trackedEvents = [
      'registration.created', 'registration.approved', 'registration.rejected',
      'checkin.created', 'venue.locked', 'venue.released', 'venue.booked',
      'speaker.assigned', 'schedule.updated', 'feedback.created', 'analytics.updated',
      'event.published',
    ];

    trackedEvents.forEach((evt) => {
      socket.on(evt, (payload) => {
        setFeed((prev) => [{ type: evt, payload, at: new Date().toISOString(), id: `${evt}-${Date.now()}-${Math.random()}` }, ...prev].slice(0, 50));
      });
    });

    return () => socket.disconnect();
  }, []);

  const joinEvent = useCallback((eventId) => {
    if (socketRef.current && eventId) socketRef.current.emit('join:event', eventId);
  }, []);

  const leaveEvent = useCallback((eventId) => {
    if (socketRef.current && eventId) socketRef.current.emit('leave:event', eventId);
  }, []);

  const on = useCallback((eventName, handler) => {
    if (!socketRef.current) return () => {};
    socketRef.current.on(eventName, handler);
    return () => socketRef.current.off(eventName, handler);
  }, []);

  return (
    <SocketContext.Provider value={{ connected, feed, joinEvent, leaveEvent, on }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used within SocketProvider');
  return ctx;
}
