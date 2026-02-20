import { useState, useEffect } from "react";

interface Notification {
  id: string;
  vehicleName: string;
  timestamp: string;
  reconstructionError: number;
  rowIndex: number;
  alertMessage: string;
  read: boolean;
}

export default function Notifications({ onUnreadCountChange }: { onUnreadCountChange?: (count: number) => void }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem("jwt");
      const res = await fetch("/api/carrier/notifications", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const sorted = (data.data as Notification[]).sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      setNotifications(sorted);
      const unread = sorted.filter((n) => !n.read).length;
      onUnreadCountChange?.(unread);
    } catch (e) {
      console.error("Error fetching notifications:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, []);

  const markAsRead = async (id: string) => {
    try {
      const token = localStorage.getItem("jwt");
      await fetch(`/api/carrier/notifications/read/${id}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      const unread = notifications.filter((n) => !n.read && n.id !== id).length;
      onUnreadCountChange?.(unread);
    } catch (e) {
      console.error("Error marking as read:", e);
    }
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter((n) => !n.read);
    await Promise.all(unread.map((n) => markAsRead(n.id)));
  };

  const filtered = notifications.filter((n) => {
    if (filter === "unread") return !n.read;
    if (filter === "read") return n.read;
    return true;
  });

  const formatTimestamp = (ts: string) => {
    const date = new Date(ts);
    return date.toLocaleString("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Notifications
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {unreadCount > 0
              ? `${unreadCount} unread alert${unreadCount > 1 ? "s" : ""}`
              : "All caught up"}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="px-4 py-2 text-sm font-medium text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-950/30 rounded-lg transition-colors border border-primary-200 dark:border-primary-800"
          >
            Mark all as read
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-6 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg w-fit">
        {(["all", "unread", "read"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors capitalize ${
              filter === f
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            {f}
            {f === "unread" && unreadCount > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-red-500 text-white rounded-full">
                {unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Notifications list */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <svg className="w-12 h-12 mb-3 opacity-40" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
          </svg>
          <p className="text-sm">No notifications</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((notification) => (
            <div
              key={notification.id}
              className={`relative p-4 rounded-xl border transition-all ${
                !notification.read
                  ? "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800/50"
                  : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800"
              }`}
            >
              {/* Unread indicator */}
              {!notification.read && (
                <span className="absolute top-4 right-4 w-2 h-2 rounded-full bg-red-500" />
              )}

              <div className="flex items-start gap-4">
                {/* Icon */}
                <div
                  className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
                    !notification.read
                      ? "bg-red-100 dark:bg-red-900/40"
                      : "bg-gray-100 dark:bg-gray-800"
                  }`}
                >
                  <svg
                    className={`w-5 h-5 ${!notification.read ? "text-red-500" : "text-gray-400"}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.8}
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                  </svg>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      {notification.vehicleName}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 font-mono">
                      row {notification.rowIndex}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                    {notification.alertMessage}
                  </p>
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {formatTimestamp(notification.timestamp)}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">
                      error: {notification.reconstructionError.toFixed(6)}
                    </span>
                  </div>
                </div>

                {/* Mark as read button */}
                {!notification.read && (
                  <button
                    onClick={() => markAsRead(notification.id)}
                    className="flex-shrink-0 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    Mark read
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}