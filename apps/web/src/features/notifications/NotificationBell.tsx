import { useState, useRef, useEffect } from 'react';
import { Bell, CheckCheck, Clock } from 'lucide-react';
import {
  useNotifications,
  useMarkAsRead,
  useMarkAllAsRead,
} from './notifications.queries';

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: notifications = [] } = useNotifications();
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();

  const unreadCount = notifications.filter((n) => !n.readAt).length;

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
        className="relative p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
        title="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-indigo-500 ring-2 ring-slate-900" />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl z-50 overflow-hidden">
          {/* Header */}
          <div className="p-3.5 px-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-semibold text-slate-100">Notifications</h4>
              {unreadCount > 0 && (
                <span className="text-[10px] bg-indigo-500/20 text-indigo-400 font-semibold px-2 py-0.5 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllAsRead.mutate()}
                className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/60">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                No notifications yet.
              </div>
            ) : (
              notifications.map((notif) => {
                const isUnread = !notif.readAt;

                return (
                  <div
                    key={notif.id}
                    onClick={() => {
                      if (isUnread) markAsRead.mutate(notif.id);
                    }}
                    className={`p-3.5 hover:bg-slate-800/40 cursor-pointer transition-colors flex gap-3 ${
                      isUnread ? 'bg-indigo-950/20' : ''
                    }`}
                  >
                    <div className="mt-0.5">
                      <div
                        className={`h-2 w-2 rounded-full ${
                          isUnread ? 'bg-indigo-500' : 'bg-transparent'
                        }`}
                      />
                    </div>

                    <div className="flex-1 space-y-1">
                      <p className="text-xs text-slate-200 leading-snug">
                        <span className="font-semibold text-indigo-400 font-mono mr-1">
                          {notif.payload?.taskKey}
                        </span>
                        {notif.payload?.summary || notif.type.replace('_', ' ').toLowerCase()}
                      </p>
                      {notif.payload?.taskTitle && (
                        <p className="text-[11px] text-slate-400 truncate">
                          "{notif.payload.taskTitle}"
                        </p>
                      )}
                      <span className="text-[10px] text-slate-500 flex items-center gap-1">
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
