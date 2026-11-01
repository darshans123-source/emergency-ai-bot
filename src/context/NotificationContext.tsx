import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Notification } from '../types';
import { api } from '../services/api';
import { useAuth } from './AuthContext';
import { readSession } from '../services/localProfile';

export type WsStatus = 'connected' | 'reconnecting' | 'unavailable';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  isConnected: boolean;
  wsStatus: WsStatus;
  wsAttempts: number;
  retryConnection: () => void;
  refreshNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  latestEvent: { type: string; data: any; timestamp: string } | null;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [wsStatus, setWsStatus] = useState<WsStatus>('reconnecting');
  const [wsAttempts, setWsAttempts] = useState(0);
  const [wsRetryTick, setWsRetryTick] = useState(0);
  const retryConnection = () => setWsRetryTick((t) => t + 1);
  const [latestEvent, setLatestEvent] = useState<{ type: string; data: any; timestamp: string } | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const refreshNotifications = useCallback(async () => {
    if (!user || !readSession()) {
      setNotifications([]);
      return;
    }
    try {
      const data = await api.getNotifications();
      setNotifications(data);
    } catch {
      // ignore
    }
  }, [user]);

  useEffect(() => {
    refreshNotifications();
    const timer = setInterval(refreshNotifications, 15000);
    return () => clearInterval(timer);
  }, [refreshNotifications]);

  // WebSocket Connection — capped, so a dead /ws endpoint (for example on
  // Vercel, where /ws rewrites to /api) can never leave the UI stuck on
  // "Reconnecting..." forever. After 5 attempts it reports "unavailable"
  // and waits for a manual retry instead of reconnecting in the background.
  useEffect(() => {
    if (!user || !readSession()) {
      if (wsRef.current) {
        wsRef.current.close();
      }
      setWsStatus('reconnecting');
      return;
    }

    let socket: WebSocket | null = null;
    let reconnectTimeout: any;
    let stopped = false;
    let attempt = 0;
    const MAX_ATTEMPTS = 5;

    function connect() {
      if (stopped) return;
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;

      try {
        socket = new WebSocket(wsUrl);
        wsRef.current = socket;

        socket.onopen = () => {
          setIsConnected(true);
          setWsStatus('connected');
          setWsAttempts(0);
          attempt = 0;
        };

        socket.onmessage = (event) => {
          try {
            const parsed = JSON.parse(event.data);
            setLatestEvent(parsed);
            if (
              parsed.type === 'INCIDENT_CREATED' ||
              parsed.type === 'AGENT_COMPLETED' ||
              parsed.type === 'ASSIGNMENT_UPDATED' ||
              parsed.type === 'DATA_RESET'
            ) {
              refreshNotifications();
            }
          } catch {
            // non-json message
          }
        };

        socket.onclose = () => {
          setIsConnected(false);
          attempt++;
          setWsAttempts(attempt);
          if (attempt >= MAX_ATTEMPTS) {
            setWsStatus('unavailable');
            return;
          }
          setWsStatus('reconnecting');
          const delay = Math.min(3000 * Math.pow(1.5, Math.min(attempt, 6)), 30000);
          reconnectTimeout = setTimeout(connect, delay);
        };

        socket.onerror = () => {
          setIsConnected(false);
        };
      } catch {
        setIsConnected(false);
        attempt++;
        setWsAttempts(attempt);
        if (attempt >= MAX_ATTEMPTS) {
          setWsStatus('unavailable');
          return;
        }
        setWsStatus('reconnecting');
        const delay = Math.min(3000 * Math.pow(1.5, Math.min(attempt, 6)), 30000);
        reconnectTimeout = setTimeout(connect, delay);
      }
    }

    connect();

    return () => {
      stopped = true;
      clearTimeout(reconnectTimeout);
      if (socket) socket.close();
    };
  }, [user, refreshNotifications, wsRetryTick]);

  const markAsRead = async (id: string) => {
    try {
      await api.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        isConnected,
        wsStatus,
        wsAttempts,
        retryConnection,
        refreshNotifications,
        markAsRead,
        markAllAsRead,
        latestEvent
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
