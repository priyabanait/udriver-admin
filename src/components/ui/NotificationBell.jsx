import { useState } from 'react';
import { Bell, Check } from 'lucide-react';
import useNotifications from '../../hooks/useNotifications';

export default function NotificationBell() {
  const { notifications, unreadCount, markAsRead } = useNotifications();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="p-2 rounded-md hover:bg-gray-100 relative"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5 text-gray-600" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-600 text-white text-xs rounded-full px-1.5 py-0.5">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <div className="py-2">
            <div className="px-4 py-2 text-sm font-medium text-gray-700 border-b">Notifications</div>
            <div className="max-h-72 overflow-auto">
              {notifications.length === 0 && (
                <div className="p-4 text-sm text-gray-500">No notifications</div>
              )}
              {notifications.map((n) => (
                <div key={n._id || n.id} className={`flex items-start px-4 py-3 hover:bg-gray-50 ${n.read ? 'opacity-70' : ''}`}>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-800">{n.title}</div>
                    <div className="text-xs text-gray-500 mt-1">{n.message}</div>
                    <div className="text-xs text-gray-400 mt-1">{new Date(n.createdAt).toLocaleString()}</div>
                  </div>
                  <div className="ml-2">
                    {!n.read && (
                      <button
                        onClick={() => markAsRead(n._id || n.id)}
                        className="p-2 rounded-full hover:bg-gray-100"
                        title="Mark as read"
                      >
                        <Check className="h-4 w-4 text-green-600" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="p-2 text-center text-xs text-gray-500">Powered by real-time socket notifications</div>
          </div>
        </div>
      )}
    </div>
  );
}
