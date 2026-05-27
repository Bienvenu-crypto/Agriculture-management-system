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

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications');
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
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Click Outside logic
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

  const markAsRead = async (id?: string) => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, readAll: !id }),
      });
      fetchNotifications();
    } catch (err) {
      console.error('Failed to mark as read');
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

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="cursor-pointer px-5 py-2.5 flex items-center gap-3 hover:bg-slate-50 transition-all rounded-full group"
      >
        <span className="text-[10px] font-black text-slate-900 capitalize tracking-[0.3em]">Notify</span>
        {unreadCount > 0 && (
          <span className="w-5 h-5 flex items-center justify-center bg-cyan-500 text-white rounded-full text-[9px] font-black shadow-lg shadow-cyan-500/20 group-hover:scale-110 transition-transform">
            {unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute right-0 mt-3 w-80 max-h-[80vh] bg-white rounded-3xl shadow-2xl overflow-hidden z-[100] flex flex-col pointer-events-auto"
          >
            <div className="p-5 bg-slate-50/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="font-black text-slate-900 text-sm tracking-tight">Notifications</h3>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-[10px] font-black text-slate-400 hover:text-slate-600 capitalize tracking-widest"
              >
                Close
              </button>
            </div>

            <div className="flex-1 overflow-y-auto max-h-[400px]">
              {notifications.length > 0 ? (
                <div className="divide-y divide-slate-50">
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => markAsRead(n.id)}
                      className={`p-4 hover:bg-slate-50 transition-colors cursor-pointer group ${n.is_read === 0 ? 'bg-emerald-50/30' : ''}`}
                    >
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black text-emerald-600 tracking-tighter">
                            {getTypeLabel(n.type)}
                          </span>
                          <span className="text-[9px] font-bold text-slate-400">
                            {format(new Date(n.timestamp), 'HH:mm')}
                          </span>
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
                  <p className="text-slate-400 text-xs font-bold italic tracking-tight capitalize">Clear</p>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50/50 text-center">
              <button className="text-[10px] font-bold text-slate-400 capitalize tracking-widest">
                View Full Inbox
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
