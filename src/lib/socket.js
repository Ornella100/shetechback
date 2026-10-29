import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';

let io;
const connectedUsers = new Map();

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
    const userId = Number(socket.user.id);
    socket.join(`user:${userId}`);
    if (socket.user.role === 'admin' || socket.user.role === 'mentor') socket.join('staff');
    if (socket.user.role === 'admin') socket.join('admin-presence');

    const sockets = connectedUsers.get(userId) || new Set();
    const firstConnection = sockets.size === 0;
    sockets.add(socket.id);
    connectedUsers.set(userId, sockets);
    if (firstConnection) io.to('admin-presence').emit('presence:update', { userId, isOnline: true });
    if (socket.user.role === 'admin') {
      socket.emit('presence:snapshot', [...connectedUsers.keys()]);
      socket.on('presence:request', () => socket.emit('presence:snapshot', [...connectedUsers.keys()]));
    }

    socket.on('disconnect', () => {
      const activeSockets = connectedUsers.get(userId);
      if (!activeSockets) return;
      activeSockets.delete(socket.id);
      if (activeSockets.size === 0) {
        connectedUsers.delete(userId);
        io.to('admin-presence').emit('presence:update', { userId, isOnline: false });
      }
    });
  });

  return io;
}

export function getIO() {
  return io;
}

export function getOnlineUserIds() {
  return [...connectedUsers.keys()];
}
