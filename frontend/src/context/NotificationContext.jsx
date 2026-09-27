import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { createNotificationStream, dashboardAPI } from '../api/apiClient';
import toast from 'react-hot-toast';

const NotificationContext = createContext(null);

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used inside NotificationProvider');
  return ctx;
};

const SEVERITY_COLORS = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#3b82f6',
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [alerts, setAlerts] = useState({ counts: { total: 0 } });
  const eventSourceRef = useRef(null);

  // Load initial alerts from API
  const loadAlerts = useCallback(async () => {
    try {
      const res = await dashboardAPI.getAlerts();
      if (res.success) {
        setAlerts(res.data);
        
        // Populate the Notification bell with these active alerts without firing loud toasts on page load
        if (res.data.alerts && res.data.alerts.length > 0) {
          const formattedAlerts = res.data.alerts.map((notif, index) => ({
            id: `hist-${Date.now()}-${index}`,
            ...notif,
            timestamp: new Date().toISOString(),
            read: false,
          }));
          
          setNotifications(formattedAlerts.slice(0, 50));
          setUnreadCount(formattedAlerts.length);
        } else {
          setNotifications([]);
          setUnreadCount(0);
        }
      }
    } catch {}
  }, []);

  // Push a new notification to the list
  const pushNotification = useCallback((notif) => {
    if (notif.type === 'connected' || notif.type === 'heartbeat') return;

    const entry = {
      id: Date.now() + Math.random(),
      ...notif,
      timestamp: notif.timestamp || new Date().toISOString(),
      read: false,
    };

    setNotifications((prev) => [entry, ...prev].slice(0, 50)); // keep last 50
    setUnreadCount((c) => c + 1);

    // Show toast based on severity
    const toastMsg = `${notif.title}`;
    if (notif.severity === 'critical') {
      toast.error(toastMsg, { duration: 8000, icon: '🚨' });
    } else if (notif.severity === 'high') {
      toast.error(toastMsg, { duration: 5000, icon: '⚠️' });
    } else if (notif.severity === 'medium') {
      toast(`toastMsg`, { duration: 4000, icon: '📦' });
    }
  }, []);

  // Connect SSE
  useEffect(() => {
    loadAlerts();

    const source = createNotificationStream(pushNotification);
    eventSourceRef.current = source;

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [pushNotification, loadAlerts]);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  }, []);

  const markRead = useCallback((id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  const refreshAlerts = useCallback(() => {
    loadAlerts();
  }, [loadAlerts]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        alerts,
        markAllRead,
        markRead,
        clearAll,
        refreshAlerts,
        pushNotification,
        SEVERITY_COLORS,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationProvider;
