import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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
  const retryConnection = () => { /* no-op: local mode has no live link to retry */ };
  const [latestEvent, setLatestEvent] = useState<{ type: string; data: any; timestamp: string } | null>(null);

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
    // Single load only. Previously this polled the backend every 15s and the
    // WebSocket below retried a dead /ws endpoint, which produced the
    // repeated "Reconnecting…" / "Live link unavailable" surfaces. The app
    // now runs on the local engine, so no live polling or socket is needed.
    refreshNotifications();
  }, [refreshNotifications]);

  // Local mode: no WebSocket connection. The previous implementation opened
  // /ws on every login and, on Vercel where /ws rewrites to an HTTP function,
  // closed and retried up to 5 times with backoff, then reported "unavailable".
  // That loop is removed entirely. Notifications, when present, are local.
  // wsStatus is kept for compatibility with existing consumers but is no
  // longer shown as a live-link indicator in the header.
  useEffect(() => {
    setWsStatus('unavailable');
    setIsConnected(false);
    setWsAttempts(0);
  }, [user]);

  const markAsRead = async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    try { await api.markNotificationRead(id); } catch { /* local state already updated; backend optional */ }
  };

  const markAllAsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    try { await api.markAllNotificationsRead(); } catch { /* local state already updated; backend optional */ }
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
