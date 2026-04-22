import { Server as HttpServer } from 'http';
import { Server as SocketServer, Socket } from 'socket.io';
import { config } from './env';
import { logger } from '../shared/utils/logger';

let io: SocketServer | null = null;

export const initSocket = (httpServer: HttpServer): SocketServer => {
  io = new SocketServer(httpServer, {
    cors: {
      origin: config.frontendUrls,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  io.on('connection', (socket: Socket) => {
    logger.info(`Socket connected: ${socket.id}`);

    // Join a claim room to receive real-time updates for that claim
    socket.on('join:claim', (claimId: string) => {
      socket.join(`claim:${claimId}`);
    });

    socket.on('leave:claim', (claimId: string) => {
      socket.leave(`claim:${claimId}`);
    });

    // Join user room for personal notifications
    socket.on('join:user', (userId: string) => {
      socket.join(`user:${userId}`);
    });

    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: ${socket.id}`);
    });
  });

  logger.info('✅ Socket.io initialized');
  return io;
};

export const getIO = (): SocketServer => {
  if (!io) throw new Error('Socket.io not initialized. Call initSocket first.');
  return io;
};

// ─── Emit Helpers ─────────────────────────────────────────────────────────────

export const emitToClaimRoom = (claimId: string, event: string, data: unknown): void => {
  getIO().to(`claim:${claimId}`).emit(event, data);
};

export const emitToUser = (userId: string, event: string, data: unknown): void => {
  getIO().to(`user:${userId}`).emit(event, data);
};

export const emitToAll = (event: string, data: unknown): void => {
  getIO().emit(event, data);
};
