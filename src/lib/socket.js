import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';

let io;

// Chaque socket rejoint une room "user:<id>" (messages directs et projet) et,
// pour le staff, une room partagée "staff" (un message d'apprenante notifie tout admin/mentor connecté).
export function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: true, methods: ['GET', 'POST'], credentials: true },
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Token manquant'));
      socket.user = jwt.verify(token, process.env.JWT_SECRET);
      next();
    } catch {
      next(new Error('Token invalide'));
    }
  });

  io.on('connection', (socket) => {
    socket.join(`user:${socket.user.id}`);
    if (socket.user.role === 'admin' || socket.user.role === 'mentor') socket.join('staff');
  });

  return io;
}

export function getIO() {
  return io;
}
