import React, { useState, useRef, useEffect } from 'react';
import { Bell, X, CheckCheck, Trash2, AlertCircle, Package, FileText, ShieldAlert } from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';

const ICON_MAP = {
  expiry: Package,
  expired: ShieldAlert,
  lowStock: Package,
  overdue: FileText,
  connected: Bell,
};

const SEVERITY_BG = {
  critical: 'bg-red-50 border-red-200',
  high: 'bg-orange-50 border-orange-200',
  medium: 'bg-yellow-50 border-yellow-200',
  low: 'bg-blue-50 border-blue-200',
};

const SEVERITY_DOT = {
  critical: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-yellow-500',
  low: 'bg-blue-500',
};

const NotificationBell = () => {
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);
  const { notifications, unreadCount, markAllRead, clearAll, markRead } = useNotifications();

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleOpen = () => {
    setOpen((v) => !v);
    if (!open && unreadCount > 0) {
      markAllRead();
    }
  };

  const timeAgo = (iso) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell Button */}
      <button
        onClick={handleOpen}
        className="relative flex items-center justify-center h-9 w-9 rounded-xl border border-sky-200/80 bg-white/90 text-slate-600 hover:bg-sky-50 hover:text-sky-600 shadow-xs transition-all active:scale-95"
        title="Notifications"
        id="notification-bell-btn"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-black text-white shadow-md animate-bounce">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Panel */}
      {open && (
        <div className="absolute right-0 top-11 z-[200] w-80 sm:w-96 rounded-2xl border border-sky-100 bg-white shadow-2xl shadow-sky-500/15 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-sky-100 bg-sky-50/60 px-4 py-3">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-sky-600" />
              <h3 className="text-sm font-black text-slate-900">Notifications</h3>
              {notifications.length > 0 && (
                <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-700">
                  {notifications.length}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              {notifications.length > 0 && (
                <>
                  <button
                    onClick={markAllRead}
                    title="Mark all read"
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-sky-100 hover:text-sky-600 transition-colors"
                  >
                    <CheckCheck className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={clearAll}
                    title="Clear all"
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </>
              )}
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Notification List */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                <Bell className="h-8 w-8 mb-2 opacity-40" />
                <p className="text-xs font-medium">No notifications yet</p>
                <p className="text-[10px] mt-0.5">System alerts will appear here</p>
              </div>
            ) : (
              <div className="divide-y divide-sky-50">
                {notifications.map((notif) => {
                  const Icon = ICON_MAP[notif.type] || AlertCircle;
                  return (
                    <div
                      key={notif.id}
                      onClick={() => markRead(notif.id)}
                      className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-sky-50/50 ${
                        !notif.read ? 'bg-sky-50/30' : ''
                      }`}
                    >
                      <div
                        className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl border ${
                          SEVERITY_BG[notif.severity] || 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <Icon className="h-4 w-4 text-slate-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={`h-2 w-2 rounded-full flex-shrink-0 ${
                              SEVERITY_DOT[notif.severity] || 'bg-slate-400'
                            }`}
                          />
                          <p className="text-xs font-bold text-slate-900 truncate">{notif.title}</p>
                        </div>
                        {notif.message && (
                          <p className="text-[10.5px] text-slate-500 mt-0.5 line-clamp-2">{notif.message}</p>
                        )}
                        <p className="text-[10px] text-slate-400 mt-1">{timeAgo(notif.timestamp)}</p>
                      </div>
                      {!notif.read && (
                        <span className="h-2 w-2 rounded-full bg-sky-500 flex-shrink-0 mt-1" />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-sky-100 px-4 py-2.5 bg-sky-50/40 text-center">
            <p className="text-[10px] text-slate-400 font-medium">
              Real-time alerts via Server-Sent Events
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
