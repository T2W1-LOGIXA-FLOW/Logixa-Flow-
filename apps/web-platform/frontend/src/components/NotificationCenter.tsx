"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useCallback } from "react";

export interface Notification {
  id: string;
  type: "info" | "success" | "warning" | "error";
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

const betaPreviewNotifications: Notification[] = [
  {
    id: "1",
    type: "success",
    title: "Beta Preview: Article Published",
    message: "Sample notification. Connect a backend notification feed before production.",
    timestamp: new Date(Date.now() - 1000 * 60 * 5),
    read: false,
  },
  {
    id: "2",
    type: "info",
    title: "Beta Preview: New Comment",
    message: "Sample notification. This is local UI data only.",
    timestamp: new Date(Date.now() - 1000 * 60 * 30),
    read: true,
  },
];

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>(betaPreviewNotifications);
  const [isOpen, setIsOpen] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const deleteNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const getIcon = (type: Notification["type"]) => {
    switch (type) {
      case "success":
        return "✓";
      case "error":
        return "✕";
      case "warning":
        return "!";
      default:
        return "ℹ";
    }
  };

  const getColor = (type: Notification["type"]) => {
    switch (type) {
      case "success":
        return "from-green-500 to-green-600";
      case "error":
        return "from-red-500 to-red-600";
      case "warning":
        return "from-yellow-500 to-yellow-600";
      default:
        return "from-cyan-500 to-cyan-600";
    }
  };

  return (
    <div className="relative">
      {/* Bell Icon */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-slate-800 transition-colors"
      >
        🔔
        {unreadCount > 0 && (
          <motion.span
            className="absolute top-0 right-0 w-5 h-5 bg-red-500 rounded-full text-xs flex items-center justify-center text-white font-bold"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            {unreadCount}
          </motion.span>
        )}
      </motion.button>

      {/* Notification Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="absolute top-12 right-0 w-96 max-h-96 overflow-y-auto logixa-card p-0 z-50"
          >
            {/* Header */}
            <div className="sticky top-0 p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800">
              <h3 className="font-semibold text-white">Notifications</h3>
              {notifications.length > 0 && (
                <button
                  onClick={clearAll}
                  className="text-xs text-slate-400 hover:text-white transition-colors"
                >
                  Clear All
                </button>
              )}
            </div>

            {/* Notifications List */}
            {notifications.length > 0 ? (
              <div className="divide-y divide-slate-700">
                {notifications.map((notification) => (
                  <motion.div
                    key={notification.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className={`p-4 cursor-pointer transition-colors ${
                      notification.read ? "bg-slate-900/50" : "bg-slate-800/70"
                    } hover:bg-slate-800`}
                    onClick={() => markAsRead(notification.id)}
                  >
                    <div className="flex gap-3">
                      <div
                        className={`flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br ${getColor(
                          notification.type
                        )} flex items-center justify-center text-white font-bold`}
                      >
                        {getIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <h4 className="font-semibold text-white truncate">{notification.title}</h4>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotification(notification.id);
                            }}
                            className="text-slate-400 hover:text-red-400 transition-colors"
                          >
                            ✕
                          </button>
                        </div>
                        <p className="text-sm text-slate-400 mt-1">{notification.message}</p>
                        <span className="text-xs text-slate-500 mt-2 block">
                          {notification.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400">
                <p>No notifications yet</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
