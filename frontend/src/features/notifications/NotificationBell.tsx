import { useState, useRef, useEffect } from 'react';
import { Bell, CheckCheck, Clock } from 'lucide-react';
import {
  type InAppNotification,
  useNotifications,
  useMarkAsRead,
  useMarkAllAsRead,
} from './notifications.queries';

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: rawNotifications = [] } = useNotifications();
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();

  const notifications: InAppNotification[] = Array.isArray(rawNotifications)
    ? rawNotifications
    : Array.isArray((rawNotifications as any)?.data)
      ? (rawNotifications as any).data
      : [];

  const unreadCount = notifications.filter((n: InAppNotification) => !n.readAt).length;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg text-text-3 hover:text-text hover:bg-surface-2 transition-colors border border-transparent hover:border-border"
        title="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-accent ring-2 ring-surface-1" />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl bg-surface-1 border border-border shadow-card z-50 overflow-hidden text-text">
          {/* Header */}
          <div className="p-3.5 px-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-semibold text-text">Notifications</h4>
              {unreadCount > 0 && (
                <span className="text-[10px] bg-accent-subtle text-accent border border-accent/20 font-semibold px-2 py-0.5 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllAsRead.mutate()}
                className="text-xs text-text-3 hover:text-text flex items-center gap-1 transition-colors"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-border/60 scrollbar-thin">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-xs text-text-3">No notifications yet.</div>
            ) : (
              notifications.map((notif) => {
                const isUnread = !notif.readAt;

                return (
                  <div
                    key={notif.id}
                    onClick={() => {
                      if (isUnread) markAsRead.mutate(notif.id);
                    }}
                    className={`p-3.5 hover:bg-surface-2/60 cursor-pointer transition-colors flex gap-3 ${
                      isUnread ? 'bg-surface-2/40' : ''
                    }`}
                  >
                    <div className="mt-0.5">
                      <div
                        className={`h-2 w-2 rounded-full ${
                          isUnread ? 'bg-accent' : 'bg-transparent'
                        }`}
                      />
                    </div>

                    <div className="flex-1 space-y-1">
                      <p className="text-xs text-text leading-snug">
                        <span className="font-semibold text-accent font-mono mr-1">
                          {notif.payload?.taskKey}
                        </span>
                        {notif.payload?.summary || notif.type.replace('_', ' ').toLowerCase()}
                      </p>
                      {notif.payload?.taskTitle && (
                        <p className="text-[11px] text-text-2 truncate">
                          "{notif.payload.taskTitle}"
                        </p>
                      )}
                      <span className="text-[10px] text-text-3 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(notif.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
export default NotificationBell;
