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
      const res = await fetch("http://localhost:8081/api/carrier/notifications", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const sorted = (data.body as Notification[]).sort(
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
      await fetch(`http://localhost:8081/api/carrier/notifications/read/${id}`, {
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

  const formatDate = (ts: string) => {
    return new Date(ts).toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatTime = (ts: string) => {
    return new Date(ts).toLocaleTimeString("it-IT", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-950/50 flex items-center justify-center">
            <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Notifications</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {unreadCount > 0
                ? `${unreadCount} unread alert${unreadCount > 1 ? "s" : ""}`
                : "All caught up"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Filter tabs */}
          <div className="flex gap-1 p-1 bg-gray-200 dark:bg-gray-800 rounded-lg">
            {(["all", "unread", "read"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors capitalize ${
                  filter === f
                    ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                }`}
              >
                {f}
                {f === "unread" && unreadCount > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 text-[10px] bg-red-500 text-white rounded-full">
                    {unreadCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Mark all as read */}
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="px-4 py-1.5 text-xs font-medium text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-950/30 rounded-lg transition-colors border-2 border-primary-400 dark:border-primary-800"
            >
              Mark all as read
            </button>
          )}
        </div>
      </div>

      {/* Content */}
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
        <div className="bg-white dark:bg-gray-900 rounded-2xl border-2 border-gray-500 dark:border-gray-600 overflow-hidden">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-400 dark:border-gray-600/60">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-10">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Vehicle</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Time</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Alert</th>
                  <th className="px-6 py-4 w-24"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-300 dark:divide-gray-600/40">
                {filtered.map((n) => (
                  <tr
                    key={n.id}
                    className={`transition-colors ${
                      !n.read
                        ? "bg-red-50/50 dark:bg-red-950/10 hover:bg-red-50 dark:hover:bg-red-950/20"
                        : "hover:bg-gray-50 dark:hover:bg-gray-800/40"
                    }`}
                  >
                    <td className="px-6 py-4">
                      {!n.read ? (
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-red-100 dark:bg-red-900/40">
                          <span className="w-2 h-2 rounded-full bg-red-500" />
                        </span>
                      ) : (
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800">
                          <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                          </svg>
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-sm font-semibold ${!n.read ? "text-gray-900 dark:text-white" : "text-gray-600 dark:text-gray-400"}`}>
                        {n.vehicleName}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-sm font-mono tabular-nums ${!n.read ? "text-gray-900 dark:text-white font-medium" : "text-gray-600 dark:text-gray-400"}`}>
                        {formatDate(n.timestamp)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-sm font-mono tabular-nums ${!n.read ? "text-gray-900 dark:text-white font-bold" : "text-gray-600 dark:text-gray-400"}`}>
                        {formatTime(n.timestamp)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-sm ${!n.read ? "text-gray-800 dark:text-gray-200" : "text-gray-500 dark:text-gray-500"}`}>
                        {n.alertMessage}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {!n.read && (
                        <button
                          onClick={() => markAsRead(n.id)}
                          className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                        >
                          Mark read
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden divide-y divide-gray-300 dark:divide-gray-600/60">
            {filtered.map((n) => (
              <div
                key={n.id}
                className={`p-4 ${
                  !n.read
                    ? "bg-red-50/50 dark:bg-red-950/10"
                    : ""
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    {!n.read && <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />}
                    <span className={`text-sm font-semibold ${!n.read ? "text-gray-900 dark:text-white" : "text-gray-600 dark:text-gray-400"}`}>
                      {n.vehicleName}
                    </span>
                  </div>
                  {!n.read && (
                    <button
                      onClick={() => markAsRead(n.id)}
                      className="px-2.5 py-1 text-[10px] font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors flex-shrink-0"
                    >
                      Mark read
                    </button>
                  )}
                </div>
                <p className={`text-sm mb-2 ${!n.read ? "text-gray-800 dark:text-gray-200" : "text-gray-500 dark:text-gray-500"}`}>
                  {n.alertMessage}
                </p>
                <div className="flex items-center gap-2">
                  <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                  <span className={`text-xs font-mono tabular-nums ${!n.read ? "font-medium text-gray-700 dark:text-gray-300" : "text-gray-400 dark:text-gray-500"}`}>
                    {formatDate(n.timestamp)} · {formatTime(n.timestamp)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}