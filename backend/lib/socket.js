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
