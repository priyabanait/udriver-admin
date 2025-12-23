import { Server } from 'socket.io';

let io;

export function initSocket(server) {
  if (io) return io;
  io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
      credentials: false,
    },
  });

  io.on('connection', (socket) => {
    console.log('Socket connected:', socket.id);
    // Allow clients to join recipient-specific rooms, e.g., 'investor:abc' or 'driver:123'
    socket.on('join', ({ room }) => {
      if (room) {
        socket.join(room);
        console.log(`Socket ${socket.id} joined room`, room);
      }
    });
    socket.on('leave', ({ room }) => {
      if (room) {
        socket.leave(room);
        console.log(`Socket ${socket.id} left room`, room);
      }
    });
    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', socket.id, reason);
    });
  });

  return io;
}

export function getIO() {
  if (!io) throw new Error('Socket not initialized. Call initSocket(server) first.');
  return io;
}
