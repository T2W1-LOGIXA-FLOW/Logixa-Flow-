'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import Footer from '@/components/Footer';
import PageBackground from '@/components/PageBackground';

interface Notification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  type: 'info' | 'success' | 'warning' | 'error';
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Load notifications from localStorage
    const saved = localStorage.getItem('notifications');
    if (saved) {
      setNotifications(JSON.parse(saved));
    } else {
      // Initialize beta preview notifications until a backend notification feed is connected.
      const betaSampleNotifications: Notification[] = [
        {
          id: '1',
          title: 'Beta Preview: Welcome to Logixa Flow',
          message: 'Welcome to the supply chain intelligence platform. Explore your dashboard and connect your data sources.',
          timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
          read: false,
          type: 'success',
        },
        {
          id: '2',
          title: 'Beta Preview: New Feature Available',
          message: 'Real-time analytics dashboard is now live. Check your analytics page to view performance metrics.',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          read: false,
          type: 'info',
        },
        {
          id: '3',
          title: 'Beta Preview: Preferences Updated',
          message: 'Your notification preferences have been saved successfully.',
          timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          read: true,
          type: 'success',
        },
        {
          id: '4',
          title: 'Beta Preview: System Maintenance',
          message: 'Scheduled maintenance will occur on Friday from 2-4 AM UTC.',
          timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          read: true,
          type: 'warning',
        },
      ];
      setNotifications(betaSampleNotifications);
      localStorage.setItem('notifications', JSON.stringify(betaSampleNotifications));
    }
  }, []);

  const handleMarkAsRead = (id: string) => {
    const updated = notifications.map(n =>
      n.id === id ? { ...n, read: true } : n
    );
    setNotifications(updated);
    localStorage.setItem('notifications', JSON.stringify(updated));
  };

  const handleDelete = (id: string) => {
    const updated = notifications.filter(n => n.id !== id);
    setNotifications(updated);
    localStorage.setItem('notifications', JSON.stringify(updated));
    toast.success('Notification deleted');
  };

  const handleClearAll = () => {
    setNotifications([]);
    localStorage.setItem('notifications', JSON.stringify([]));
    toast.success('All notifications cleared');
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return '✓';
      case 'error':
        return '✕';
      case 'warning':
        return '⚠';
      case 'info':
      default:
        return 'ℹ';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'border-green-500/30 bg-green-500/5';
      case 'error':
        return 'border-red-500/30 bg-red-500/5';
      case 'warning':
        return 'border-yellow-500/30 bg-yellow-500/5';
      case 'info':
      default:
        return 'border-cyan-500/30 bg-cyan-500/5';
    }
  };

  if (!mounted) return null;

  return (
    <PageBackground overlayOpacity={0.15}>
      <main className="min-h-screen py-20">
      <div className="mx-auto max-w-3xl px-4 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex items-center justify-between"
        >
          <div>
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-cyan-400 to-orange-400 bg-clip-text text-transparent">
              Notifications
            </h1>
            <p className="text-slate-400 mt-2">You have {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}</p>
            <p className="text-yellow-300 text-sm mt-2">Beta preview: notifications are stored locally in this browser.</p>
          </div>
        </motion.div>

        {/* Filter & Actions */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          className="flex gap-2 mb-6"
        >
          {notifications.length > 0 && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleClearAll}
              className="px-4 py-2 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg hover:bg-red-500/20 transition text-sm"
            >
              Clear All
            </motion.button>
          )}
        </motion.div>

        {/* Notifications List */}
        {notifications.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            className="logixa-card border border-slate-700 rounded-lg p-12 text-center"
          >
            <div className="text-5xl mb-4">📭</div>
            <h2 className="text-xl font-semibold mb-2">No Notifications</h2>
            <p className="text-slate-400">You&apos;re all caught up! Check back later for updates.</p>
          </motion.div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {notifications.map((notification, index) => (
                <motion.div
                  key={notification.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => handleMarkAsRead(notification.id)}
                  className={`logixa-card border rounded-lg p-4 cursor-pointer transition ${
                    getNotificationColor(notification.type)
                  } ${!notification.read ? 'ring-1 ring-cyan-500/50' : ''}`}
                >
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className="flex-shrink-0">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                        notification.type === 'success' ? 'bg-green-500/20 text-green-400' :
                        notification.type === 'error' ? 'bg-red-500/20 text-red-400' :
                        notification.type === 'warning' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-cyan-500/20 text-cyan-400'
                      }`}>
                        {getNotificationIcon(notification.type)}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-semibold text-slate-100 flex items-center gap-2">
                            {notification.title}
                            {!notification.read && (
                              <span className="w-2 h-2 bg-cyan-400 rounded-full"></span>
                            )}
                          </h3>
                          <p className="text-sm text-slate-400 mt-1">{notification.message}</p>
                        </div>
                      </div>

                      {/* Timestamp */}
                      <p className="text-xs text-slate-500 mt-2">
                        {new Date(notification.timestamp).toLocaleString()}
                      </p>
                    </div>

                    {/* Delete Button */}
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(notification.id);
                      }}
                      className="flex-shrink-0 text-slate-500 hover:text-red-400 transition"
                    >
                      ✕
                    </motion.button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            </div>
          )}
      </div>
    </main>
    <Footer />
    </PageBackground>
  );
}
