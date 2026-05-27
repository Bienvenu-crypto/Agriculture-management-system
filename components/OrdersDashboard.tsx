'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
// Removed lucide-react imports

interface Trade {
  id: string;
  crop: string;
  quantity_kg: number;
  total_value: number;
  currency: string;
  status: string;
  created_at: string;
  seller_name: string;
  buyer_name: string;
  seller_id: string;
  buyer_id: string;
}

interface MpUser {
  id: string;
  name: string;
  role: string;
}

export default function OrdersDashboard() {
  const [activeTab, setActiveTab] = useState<'all' | 'buying' | 'selling' | 'disputes'>('all');
  const [trades, setTrades] = useState<Trade[]>([]);
  const [mpUser, setMpUser] = useState<MpUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchSession = useCallback(async () => {
    try {
      const res = await fetch('/api/marketplace/auth/session');
      const d = await res.json();
      setMpUser(d.user);
    } catch (e) {
      console.error('Session fetch failed', e);
    }
  }, []);

  const fetchTrades = useCallback(async () => {
    try {
      const res = await fetch('/api/marketplace/trades');
      if (res.ok) {
        const data = await res.json();
        setTrades(data.trades || []);
      }
    } catch (error) {
      console.error("Failed to fetch trades:", error);
    }
  }, []);

  const refreshData = useCallback(async () => {
    await Promise.all([fetchSession(), fetchTrades()]);
  }, [fetchSession, fetchTrades]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await refreshData();
      setLoading(false);
    };
    init();
  }, [refreshData]);

  const handleUpdateStatus = async (tradeId: string, newStatus: string) => {
    setUpdatingId(tradeId);
    try {
      const res = await fetch('/api/marketplace/trades', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: tradeId, status: newStatus }),
      });
      if (res.ok) {
        await fetchTrades();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update status');
      }
    } catch (err) {
      alert('Network error');
    } finally {
      setUpdatingId(null);
    }
  };

  // Calculate real statistics from database
  const stats = {
    total: trades.length,
    pending: trades.filter(t => t.status === 'pending').length,
    inTransit: trades.filter(t => t.status === 'in-transit').length,
    delivered: trades.filter(t => t.status === 'completed' || t.status === 'delivered').length
  };

  // Filter trades based on active tab and user identity
  const filteredTrades = trades.filter(t => {
    if (activeTab === 'disputes') return t.status === 'disputed';
    if (activeTab === 'buying') return mpUser && t.buyer_id === mpUser.id;
    if (activeTab === 'selling') return mpUser && t.seller_id === mpUser.id;
    return true; // 'all'
  });

  const getStatusStyle = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'bg-orange-50 text-orange-600 border-orange-100';
      case 'in-transit':
      case 'in transit':
        return 'bg-blue-50 text-blue-600 border-blue-100';
      case 'delivered':
      case 'completed':
        return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'disputed':
        return 'bg-red-50 text-red-600 border-red-100';
      default:
        return 'bg-slate-50 text-slate-600 border-slate-100';
    }
  };

  const getStatusIcon = (status: string) => {
    return null;
  };

  const getCropImage = (crop: string) => {
    const images: Record<string, string> = {
      'maize': 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?auto=format&fit=crop&q=80&w=800',
      'coffee': 'https://images.unsplash.com/photo-1511920170033-f8396924c348?auto=format&fit=crop&q=80&w=800',
      'beans': 'https://images.unsplash.com/photo-1551462147-37885acc36f1?auto=format&fit=crop&q=80&w=800',
      'tomatoes': 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&q=80&w=800',
      'tomato': 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&q=80&w=800',
      'cassava': 'https://images.unsplash.com/photo-1621245053096-74fc21d3f947?auto=format&fit=crop&q=80&w=800',
      'bananas': 'https://images.unsplash.com/photo-1528825871115-3581a5387919?auto=format&fit=crop&q=80&w=800',
      'matooke': 'https://images.unsplash.com/photo-1528825871115-3581a5387919?auto=format&fit=crop&q=80&w=800',
      'rice': 'https://images.unsplash.com/photo-1586201375761-83865001e8ac?auto=format&fit=crop&q=80&w=800',
      'wheat': 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&q=80&w=800',
      'potatoes': 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&q=80&w=800',
      'soybeans': 'https://images.unsplash.com/photo-1589304044569-b7b514c6e1c2?auto=format&fit=crop&q=80&w=800',
      'sorghum': 'https://images.unsplash.com/photo-1590740623351-404fb85514de?auto=format&fit=crop&q=80&w=800',
      'millet': 'https://images.pexels.com/photos/4016550/pexels-photo-4016550.jpeg?auto=compress&cs=tinysrgb&w=800',
      'cabbage': 'https://images.unsplash.com/photo-1518977956812-cd3dbadaaf31?auto=format&fit=crop&q=80&w=800'
    };
    const key = crop.toLowerCase();
    for (const k in images) {
      if (key.includes(k)) return images[k];
    }
    return 'https://images.unsplash.com/photo-1595841696677-6489ff3f8cd1?auto=format&fit=crop&q=80&w=800';
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <span className="text-emerald-600 font-black capitalize tracking-widest text-[10px] animate-pulse">Loading...</span>
          <p className="text-[10px] font-black capitalize tracking-[0.4em] text-slate-400">Synchronizing Data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      {/* Header Badge */}
      <div className="flex justify-between items-start">
        <div className="space-y-4">
          <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black capitalize tracking-widest">
            Orders
          </span>
          <div className="flex items-center gap-3">
            <div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">My Orders</h2>
              <p className="text-slate-500 text-sm font-medium">Track your purchases and sales from the marketplace</p>
            </div>
          </div>
        </div>
        <button 
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 border-b-2 border-transparent text-[10px] font-black capitalize tracking-widest text-slate-600 hover:border-slate-300 transition-all"
        >
          Download Report
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Orders', value: stats.total, color: 'text-emerald-600' },
          { label: 'Pending', value: stats.pending, color: 'text-orange-500' },
          { label: 'In Transit', value: stats.inTransit, color: 'text-blue-500' },
          { label: 'Delivered', value: stats.delivered, color: 'text-emerald-500' }
        ].map((stat, idx) => (
          <div key={idx} className="text-center space-y-1">
            <p className={`text-3xl font-black ${stat.color}`}>{stat.value}</p>
            <p className="text-[10px] font-black text-slate-400 capitalize tracking-widest">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <div className="flex gap-8">
          {[
            { id: 'all', label: 'All Orders' },
            { id: 'buying', label: 'Buying' },
            { id: 'selling', label: 'Selling' },
            { id: 'disputes', label: 'Disputes' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`pb-4 text-[13px] font-black capitalize tracking-widest transition-all relative ${
                activeTab === tab.id ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-600 rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Cards Section */}
      <div className="bg-transparent overflow-hidden">
        {filteredTrades.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-[10px] font-black capitalize tracking-widest text-slate-400 mb-1">No Orders Found</p>
            <p className="text-sm font-bold text-slate-600">Your order history for this category is currently empty.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
              {filteredTrades.map((trade, idx) => {
                const isSeller = mpUser?.id === trade.seller_id;
                const isUpdating = updatingId === trade.id;
                
                return (
                  <motion.div
                    key={trade.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="bg-white border border-slate-100 rounded-[1.25rem] p-6 shadow-lg hover:shadow-xl transition-all flex flex-col group relative"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <p className="text-xl font-black text-slate-700 tracking-tight leading-none mb-1">{trade.crop}</p>
                        <p className="text-[10px] text-slate-400 font-bold capitalize tracking-widest">
                          Order #{trade.id.split('-').pop()}
                        </p>
                      </div>
                      <span className={`px-3 py-1.5 rounded-xl border text-[9px] font-black capitalize tracking-widest ${getStatusStyle(trade.status)}`}>
                        {trade.status}
                      </span>
                    </div>

                    <div className="space-y-4 flex-1">
                      <div className="flex justify-between items-center py-3 border-b border-slate-50">
                        <span className="text-[10px] font-black capitalize tracking-widest text-slate-400">Role</span>
                        <span className="text-xs font-bold text-slate-600 bg-slate-50 px-2 py-1 rounded-md">{isSeller ? 'Selling' : 'Buying'}</span>
                      </div>
                      
                      <div className="flex justify-between items-center py-3 border-b border-slate-50">
                        <span className="text-[10px] font-black capitalize tracking-widest text-slate-400">{isSeller ? 'Buyer' : 'Seller'}</span>
                        <span className="text-xs font-bold text-slate-600">{isSeller ? trade.buyer_name : trade.seller_name}</span>
                      </div>

                      <div className="flex justify-between items-center py-3 border-b border-slate-50">
                        <span className="text-[10px] font-black capitalize tracking-widest text-slate-400">Amount</span>
                        <span className="text-sm font-black text-emerald-600 capitalize tracking-tight">
                          {trade.currency} {trade.total_value.toLocaleString()}
                        </span>
                      </div>

                      <div className="flex justify-between items-center py-3">
                        <span className="text-[10px] font-black capitalize tracking-widest text-slate-400">Date</span>
                        <span className="text-xs font-bold text-slate-600">
                          {format(new Date(trade.created_at), 'MMM d, yyyy')}
                        </span>
                      </div>
                    </div>

                    <div className="pt-6 mt-4 flex justify-end gap-3 border-t border-slate-50">
                      <AnimatePresence mode="wait">
                        {isUpdating ? (
                          <span className="text-[10px] font-black capitalize tracking-widest text-slate-600 animate-pulse py-2">Updating...</span>
                        ) : (
                          <>
                            <button className="px-4 py-2 bg-slate-50 text-slate-500 rounded-xl text-[10px] font-black capitalize tracking-widest hover:bg-slate-100 hover:text-slate-700 transition-colors flex-1 text-center border border-slate-200">
                              Details
                            </button>
                            {trade.status === 'pending' && isSeller && (
                              <button 
                                onClick={() => handleUpdateStatus(trade.id, 'in-transit')}
                                className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-[10px] font-black capitalize tracking-widest hover:bg-emerald-700 transition-colors shadow-sm flex-1 text-center"
                              >
                                Ship Order
                              </button>
                            )}
                            {trade.status === 'in-transit' && !isSeller && (
                              <button 
                                onClick={() => handleUpdateStatus(trade.id, 'completed')}
                                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black capitalize tracking-widest hover:bg-blue-700 transition-colors shadow-sm flex-1 text-center"
                              >
                                Confirm
                              </button>
                            )}
                          </>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
