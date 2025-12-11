import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { logger } from '../utils/logger';

let io: SocketIOServer | null = null;

export interface SecurityEvent {
  type: 'INCIDENT' | 'ALERT' | 'ANOMALY' | 'BREACH';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  data: any;
  timestamp: Date;
}

/**
 * Initialize WebSocket server for real-time SOC monitoring
 */
export function initializeSOCWebSocket(server: HTTPServer): SocketIOServer {
  if (io) {
    logger.warn('WebSocket server already initialized');
    return io;
  }

  io = new SocketIOServer(server, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:5173",
      methods: ["GET", "POST"],
      credentials: true
    },
    path: '/socket.io',
    transports: ['websocket', 'polling']
  });

  io.on('connection', (socket) => {
    logger.info({ socketId: socket.id }, 'SOC client connected');

    // Join SOC room for real-time updates
    socket.join('soc-monitoring');

    // Handle client joining specific rooms
    socket.on('join-room', (room: string) => {
      socket.join(room);
      logger.info({ socketId: socket.id, room }, 'Client joined room');
    });

    socket.on('leave-room', (room: string) => {
      socket.leave(room);
      logger.info({ socketId: socket.id, room }, 'Client left room');
    });

    socket.on('disconnect', () => {
      logger.info({ socketId: socket.id }, 'SOC client disconnected');
    });

    // Send initial connection confirmation
    socket.emit('connected', {
      socketId: socket.id,
      timestamp: new Date()
    });
  });

  logger.info('SOC WebSocket server initialized');
  return io;
}

/**
 * Emit security event to all connected SOC clients
 */
export function emitSecurityEvent(event: SecurityEvent): void {
  if (!io) {
    logger.warn('WebSocket server not initialized, cannot emit security event');
    return;
  }

  io.to('soc-monitoring').emit('security-event', {
    ...event,
    timestamp: event.timestamp || new Date()
  });

  logger.info({ 
    type: event.type, 
    severity: event.severity 
  }, 'Emitted security event to SOC clients');
}

/**
 * Emit audit log update to all connected SOC clients
 */
export function emitAuditLogUpdate(log: any): void {
  if (!io) {
    return;
  }

  io.to('soc-monitoring').emit('audit-log-update', {
    ...log,
    timestamp: new Date()
  });
}

/**
 * Emit incident update to all connected SOC clients
 */
export function emitIncidentUpdate(incident: any): void {
  if (!io) {
    return;
  }

  io.to('soc-monitoring').emit('incident-update', {
    ...incident,
    timestamp: new Date()
  });
}

/**
 * Get number of connected SOC clients
 */
export function getConnectedClientsCount(): number {
  if (!io) {
    return 0;
  }
  return io.sockets.sockets.size;
}

/**
 * Close WebSocket server
 */
export function closeSOCWebSocket(): void {
  if (io) {
    io.close();
    io = null;
    logger.info('SOC WebSocket server closed');
  }
}
