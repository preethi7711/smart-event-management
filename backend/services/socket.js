let ioInstance = null;

function initSocket(server) {
  const { Server } = require('socket.io');
  ioInstance = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      credentials: true,
    },
  });

  ioInstance.on('connection', (socket) => {
    // Clients join an event-specific room so updates are scoped and efficient
    socket.on('join:event', (eventId) => {
      if (eventId) socket.join(`event:${eventId}`);
    });
    socket.on('leave:event', (eventId) => {
      if (eventId) socket.leave(`event:${eventId}`);
    });
  });

  return ioInstance;
}

/** Emits an event both globally and scoped to a specific event room (if eventId given). */
function emitEvent(eventName, payload, eventId = null) {
  if (!ioInstance) return;
  ioInstance.emit(eventName, payload);
  if (eventId) ioInstance.to(`event:${eventId}`).emit(eventName, payload);
}

function getIO() {
  return ioInstance;
}

module.exports = { initSocket, emitEvent, getIO };
