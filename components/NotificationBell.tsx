'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { Bell } from 'lucide-react';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  is_read: number | boolean;
  timestamp: string;
}

const isRead = (n: Notification) => n.is_read === 1 || n.is_read === true;

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  // Track IDs the user has read this session — survives re-fetches
  const localReadIds = useRef<Set<string>>(new Set());

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications');
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.notifications)) {
        // Merge server response with local read set so read items never flip back to unread
        const merged: Notification[] = data.notifications.map((n: Notification) =>
          localReadIds.current.has(n.id) ? { ...n, is_read: 1 } : n
        );
        setNotifications(merged);
        setUnreadCount(merged.filter((n) => !isRead(n)).length);
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

  // Refresh when panel opens
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
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const markAsRead = async (id: string) => {
    // Record in local set immediately
    localReadIds.current.add(id);

    // Optimistic UI update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: 1 } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
    } catch {
      // Network error — local set still protects the UI state
    }
  };

  const markAllAsRead = async () => {
    if (unreadCount === 0) return;

    // Add all IDs to local set
    notifications.forEach((n) => localReadIds.current.add(n.id));

    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
    setUnreadCount(0);

    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ readAll: true }),
      });
    } catch {
      // Local set keeps the UI correct even if the request fails
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

  const formatLocalTime = (timestamp: string) => {
    if (!timestamp) return '';
    try {
      const utcString = /Z$|[+-]\d{2}:\d{2}$/.test(timestamp)
        ? timestamp
        : `${timestamp}Z`;
      const date = new Date(utcString);
      if (isNaN(date.getTime())) return '';

      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfYesterday = new Date(startOfToday.getTime() - 86400000);

      if (date >= startOfToday) return format(date, 'HH:mm');
      if (date >= startOfYesterday) return `Yesterday ${format(date, 'HH:mm')}`;
      return format(date, 'd MMM, HH:mm');
    } catch {
      return '';
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative cursor-pointer p-2 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors group"
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
      >
        <Bell
          strokeWidth={2}
          className={`w-6 h-6 transition-colors ${isOpen ? 'text-red-500' : 'text-slate-700 group-hover:text-slate-900'}`}
        />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 translate-x-1/3 -translate-y-1/3 min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-red-600 text-white rounded-full text-[10px] font-black leading-none shadow-md">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-[100] flex flex-col"
          >
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="font-black text-slate-900 text-sm">Notifications</h3>
                {notifications.length > 0 && (
                  <span className="text-[9px] font-black bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">
                    {notifications.length}
                  </span>
                )}
                {unreadCount > 0 && (
                  <span className="text-[9px] font-black bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">
                    {unreadCount} unread
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-[10px] font-black text-emerald-600 hover:text-emerald-700 tracking-wide transition-colors"
                  >
                    Mark all read
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-[10px] font-black text-slate-400 hover:text-slate-600 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="overflow-y-auto max-h-[420px]">
              {notifications.length > 0 ? (
                <div className="divide-y divide-slate-50">
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => !isRead(n) && markAsRead(n.id)}
                      className={`px-4 py-3 transition-colors ${!isRead(n)
                          ? 'bg-red-50/40 hover:bg-red-50/70 cursor-pointer'
                          : 'bg-white hover:bg-slate-50'
                        }`}
                    >
                      <div className="flex items-start gap-2">
                        <div className="mt-1.5 flex-shrink-0">
                          {!isRead(n) ? (
                            <span className="block w-2 h-2 rounded-full bg-red-500" />
                          ) : (
                            <span className="block w-2 h-2 rounded-full bg-transparent" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-0.5">
                            <span className={`text-[10px] font-black tracking-wide ${getTypeLabelColor(n.type)}`}>
                              {getTypeLabel(n.type)}
                            </span>
                            <span className="text-[10px] text-slate-400 whitespace-nowrap flex-shrink-0">
                              {formatLocalTime(n.timestamp)}
                            </span>
                          </div>
                          <p className={`text-xs leading-snug ${!isRead(n) ? 'font-bold text-slate-900' : 'text-slate-500'}`}>
                            {n.title}
                          </p>
                          <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5 line-clamp-2">
                            {n.message}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center">
                  <Bell className="w-7 h-7 text-slate-200 mx-auto mb-2" />
                  <p className="text-slate-400 text-xs font-bold">All caught up</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}