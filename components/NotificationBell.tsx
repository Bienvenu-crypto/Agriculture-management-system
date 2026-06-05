'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  is_read: number;
  timestamp: string;
}

import { Bell } from 'lucide-react';

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications');
      if (!res.ok) return;
      const data = await res.json();
      if (data.notifications) {
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (err: any) {
      console.error('Failed to fetch notifications:', err.message);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Refresh immediately whenever the panel opens
  useEffect(() => {
    if (isOpen) fetchNotifications();
  }, [isOpen, fetchNotifications]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const markAsRead = async (id: string) => {
    // Optimistic UI update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: 1 } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    try {
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        // Revert on failure
        fetchNotifications();
      }
    } catch {
      fetchNotifications();
    }
  };

  const markAllAsRead = async () => {
    if (unreadCount === 0) return;

    // Optimistic UI update
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
    setUnreadCount(0);

    try {
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ readAll: true }),
      });
      if (!res.ok) {
        fetchNotifications();
      }
    } catch {
      fetchNotifications();
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'trade_match': return 'TRADE';
      case 'alert': return 'ALERT';
      case 'success': return 'DONE';
      default: return 'INFO';
    }
  };

  const getTypeLabelColor = (type: string) => {
    switch (type) {
      case 'trade_match': return 'text-blue-600';
      case 'alert': return 'text-orange-500';
      case 'success': return 'text-emerald-600';
      default: return 'text-slate-500';
    }
  };

  // Ensure database timestamps are treated as UTC so they display in local time correctly
  const formatLocalTime = (timestamp: string) => {
    try {
      const utcString = timestamp.endsWith('Z') ? timestamp : `${timestamp}Z`;
      return format(new Date(utcString), 'HH:mm');
    } catch {
      return '';
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="cursor-pointer p-2 flex items-center justify-center hover:bg-slate-50 transition-all rounded-full group relative"
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
      >
        <Bell className={`w-5 h-5 transition-colors ${isOpen ? 'text-emerald-600' : 'text-slate-700 group-hover:text-emerald-600'}`} />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 translate-x-1/4 -translate-y-1/4 min-w-[16px] h-4 px-0.5 flex items-center justify-center bg-cyan-500 text-white rounded-full text-[8px] font-black shadow-lg shadow-cyan-500/20 group-hover:scale-110 transition-transform">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-3 w-80 max-h-[80vh] bg-white rounded-3xl shadow-2xl overflow-hidden z-[100] flex flex-col pointer-events-auto"
          >
            {/* Header */}
            <div className="p-5 bg-slate-50/50 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <h3 className="font-black text-slate-900 text-sm tracking-tight">Notifications</h3>
                {unreadCount > 0 && (
                  <span className="text-[9px] font-black bg-cyan-100 text-cyan-700 px-1.5 py-0.5 rounded-full">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-[10px] font-black text-emerald-600 hover:text-emerald-700 capitalize tracking-widest transition-colors"
                  >
                    Mark all read
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-[10px] font-black text-slate-400 hover:text-slate-600 capitalize tracking-widest transition-colors"
                >
                  Close
                </button>
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto max-h-[400px]">
              {notifications.length > 0 ? (
                <div className="divide-y divide-slate-50">
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => n.is_read === 0 && markAsRead(n.id)}
                      className={`p-4 transition-colors group ${n.is_read === 0
                          ? 'bg-emerald-50/40 hover:bg-emerald-50/70 cursor-pointer'
                          : 'hover:bg-slate-50'
                        }`}
                    >
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center justify-between">
                          <span className={`text-[10px] font-black tracking-tighter ${getTypeLabelColor(n.type)}`}>
                            {getTypeLabel(n.type)}
                          </span>
                          <div className="flex items-center gap-2">
                            {n.is_read === 0 && (
                              <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 flex-shrink-0" />
                            )}
                            <span className="text-[9px] font-bold text-slate-400">
                              {formatLocalTime(n.timestamp)}
                            </span>
                          </div>
                        </div>
                        <p className={`text-xs truncate ${n.is_read === 0 ? 'font-black text-slate-900' : 'font-bold text-slate-500'}`}>
                          {n.title}
                        </p>
                        <p className="text-[11px] text-slate-600 leading-relaxed line-clamp-2">
                          {n.message}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-12 text-center">
                  <Bell className="w-6 h-6 text-slate-200 mx-auto mb-3" />
                  <p className="text-slate-400 text-xs font-bold italic tracking-tight capitalize">All clear</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
