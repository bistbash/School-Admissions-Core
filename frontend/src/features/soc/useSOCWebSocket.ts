import { useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

export interface SecurityEvent {
  type: 'INCIDENT' | 'ALERT' | 'ANOMALY' | 'BREACH';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  data: any;
  timestamp: Date;
}

export interface AuditLogUpdate {
  id: number;
  [key: string]: any;
}

export interface IncidentUpdate {
  id: number;
  [key: string]: any;
}

export function useSOCWebSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const [auditLogUpdates, setAuditLogUpdates] = useState<AuditLogUpdate[]>([]);
  const [incidentUpdates, setIncidentUpdates] = useState<IncidentUpdate[]>([]);

  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const newSocket = io(apiUrl, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: Infinity, // Keep trying to reconnect
      timeout: 20000,
      forceNew: false,
    });

    newSocket.on('connect', () => {
      setConnected(true);
      console.log('Connected to SOC WebSocket');
      
      // Join SOC monitoring room
      newSocket.emit('join-room', 'soc-monitoring');
    });

    newSocket.on('connect_error', (error) => {
      console.warn('SOC WebSocket connection error:', error);
      setConnected(false);
    });

    newSocket.on('disconnect', (reason) => {
      setConnected(false);
      console.log('Disconnected from SOC WebSocket:', reason);
      
      // Auto-reconnect on unexpected disconnects
      if (reason === 'io server disconnect') {
        // Server disconnected, reconnect manually
        newSocket.connect();
      }
    });

    newSocket.on('connected', (data: { socketId: string; timestamp: Date }) => {
      console.log('SOC WebSocket connection confirmed:', data);
    });

    newSocket.on('security-event', (event: SecurityEvent) => {
      setEvents(prev => [event, ...prev].slice(0, 100)); // Keep last 100 events
      
      // Show notification for critical/high severity events
      if (event.severity === 'CRITICAL' || event.severity === 'HIGH') {
        // You can use a notification library here (e.g., react-toastify)
        console.warn('🚨 Security Alert:', event);
        
        // Show browser notification if permission granted
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(`Security Alert: ${event.type}`, {
            body: event.data?.anomaly?.reason || event.data?.event?.action || 'Security event detected',
            icon: '/favicon.ico',
            tag: `security-${event.type}-${Date.now()}`,
            requireInteraction: event.severity === 'CRITICAL'
          });
        }
      }
    });

    newSocket.on('audit-log-update', (log: AuditLogUpdate) => {
      setAuditLogUpdates(prev => [log, ...prev].slice(0, 50)); // Keep last 50 updates
      console.log('Audit log update received:', log);
    });

    newSocket.on('incident-update', (incident: IncidentUpdate) => {
      setIncidentUpdates(prev => [incident, ...prev].slice(0, 50)); // Keep last 50 updates
      console.log('Incident update received:', incident);
    });

    newSocket.on('error', (error: Error) => {
      console.error('SOC WebSocket error:', error);
    });

    setSocket(newSocket);

    // Request notification permission on mount
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        console.log('Notification permission:', permission);
      });
    }

    return () => {
      newSocket.close();
    };
  }, []);

  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  const clearAuditLogUpdates = useCallback(() => {
    setAuditLogUpdates([]);
  }, []);

  const clearIncidentUpdates = useCallback(() => {
    setIncidentUpdates([]);
  }, []);

  return {
    socket,
    events,
    connected,
    auditLogUpdates,
    incidentUpdates,
    clearEvents,
    clearAuditLogUpdates,
    clearIncidentUpdates
  };
}
