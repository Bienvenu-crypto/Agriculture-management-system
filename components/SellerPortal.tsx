'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus,
  TrendingUp,
  ShieldCheck,
  CreditCard,
  Trash2,
  Pencil,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { AddListingModal, EditListingModal } from './Marketplace';

interface MpUser {
  id: string;
  name: string;
  role: string;
  is_subscribed: number;
  district: string;
}

interface Listing {
  id: string;
  crop: string;
  quantity_kg: number;
  price_per_kg: number;
  currency: string;
  status: string;
  created_at: string;
  category?: string;
  description?: string | null;
}

export default function SellerPortal() {
  const [mpUser, setMpUser] = useState<MpUser | null>(null);
  const [myListings, setMyListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddListing, setShowAddListing] = useState(false);
  const [editingListing, setEditingListing] = useState<Listing | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [momoNumber, setMomoNumber] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const sessionRes = await fetch('/api/marketplace/auth/session');
      const sessionData = await sessionRes.json();
      const user = sessionData.user;
      setMpUser(user);

      if (user && (user.role === 'seller' || user.role === 'admin')) {
        const url = user.role === 'admin' ? '/api/marketplace/listings' : `/api/marketplace/listings?seller_id=${user.id}`;
        const listingsRes = await fetch(url);
        const listingsData = await listingsRes.json();
        setMyListings(listingsData.listings || []);
      }
    } catch (err) {
      console.error('Failed to fetch seller data', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handlePayment = async () => {
    if (!momoNumber) return;
    setIsPaying(true);
    try {
      const res = await fetch('/api/marketplace/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: momoNumber })
      });
      if (res.ok) {
        setMpUser((prev: any) => prev ? { ...prev, is_subscribed: true } : prev);
        setShowPaymentModal(false);
        fetchData();
      } else {
        alert('Payment failed');
      }
    } catch (err) {
      alert('Network error');
    } finally {
      setIsPaying(false);
    }
  };

  const deleteListing = async (id: string) => {
    if (!confirm('Are you sure you want to remove this listing?')) return;
    try {
      await fetch('/api/marketplace/listings', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      fetchData();
    } catch (err) { }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="w-10 h-10 text-emerald-600 animate-spin" />
        <p className="text-[10px] font-black capitalize tracking-[0.3em] text-slate-400">Loading Seller Dashboard</p>
      </div>
    );
  }

  if (!mpUser || (mpUser.role !== 'seller' && mpUser.role !== 'admin')) {
    return (
      <div className="max-w-4xl mx-auto py-12">
        <div className="bg-white rounded-[3rem] p-12 text-center border border-slate-100 shadow-xl space-y-8">
          <div className="w-24 h-24 bg-emerald-50 rounded-[2rem] flex items-center justify-center mx-auto text-4xl">
            👨‍🌾
          </div>
          <div className="space-y-2">
            <h2 className="text-3xl font-black text-slate-900 capitalize tracking-tighter">Seller Hub Access</h2>
            <p className="text-slate-500 font-medium">Please sign in as a Seller to manage your products and commercial output.</p>
          </div>
          <div className="pt-4 flex justify-center">
            <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl font-black text-[10px] capitalize tracking-widest border border-emerald-100 animate-pulse">
              Open the Marketplace tab to Login
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!mpUser.is_subscribed && mpUser.role !== 'admin') {
    return (
      <div className="max-w-3xl mx-auto py-12 space-y-8">
        <div className="bg-emerald-600 rounded-[3rem] p-12 text-white overflow-hidden relative">
          <div className="relative z-10 space-y-6">
            <div className="space-y-2">
              <span className="px-3 py-1 bg-white/20 rounded-full text-[10px] font-black capitalize tracking-widest">Action Required</span>
              <h2 className="text-4xl font-black capitalize tracking-tighter">Activate Your Seller Store</h2>
              <p className="text-emerald-100 font-medium max-w-md">Start listing your agricultural products on the marketplace. A one-time activation fee is required to verify your store and enable commercial trading.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[
                'Unlimited Product Listings',
                'Priority Market Placement',
                'Direct Buyer Inquiries',
                'Trading Analytics'
              ].map((feature, i) => (
                <div key={i} className="flex items-center gap-3 text-xs font-bold">
                  <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center text-[10px]">✓</div>
                  {feature}
                </div>
              ))}
            </div>

            <div className="pt-6">
              <button
                onClick={() => setShowPaymentModal(true)}
                className="bg-white text-emerald-700 px-10 py-5 rounded-2xl font-black capitalize text-xs tracking-widest hover:bg-emerald-50 transition-all shadow-2xl shadow-black/20 active:scale-95"
              >
                Pay 100,000 UGX to Start
              </button>
            </div>
          </div>
          <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
        </div>

        <AnimatePresence>
          {showPaymentModal && (
            <div className="fixed inset-0 z-[500] flex items-center justify-center p-6 bg-slate-950/60 backdrop-blur-md">
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-white w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl"
              >
                <div className="bg-emerald-600 p-8 text-white">
                  <h3 className="text-2xl font-black capitalize tracking-tighter mb-1">Store Activation</h3>
                  <p className="text-emerald-100 text-[10px] font-black capitalize tracking-widest">Mobile Money Secure Checkout</p>
                </div>
                <div className="p-8 space-y-6">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 capitalize tracking-widest mb-3">Your Mobile Number</label>
                    <input
                      type="tel"
                      placeholder="+256 7xx xxx xxx"
                      value={momoNumber}
                      onChange={(e) => setMomoNumber(e.target.value)}
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold focus:border-emerald-500 outline-none transition-all"
                    />
                  </div>
                  <button
                    onClick={handlePayment}
                    disabled={isPaying || !momoNumber}
                    className="w-full bg-emerald-600 text-white py-5 rounded-2xl font-black capitalize text-xs tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50"
                  >
                    {isPaying ? 'Processing...' : 'Confirm & Pay 100,000 UGX'}
                  </button>
                  <button onClick={() => setShowPaymentModal(false)} className="w-full text-[10px] font-black capitalize tracking-widest text-slate-400 hover:text-slate-600 transition-colors">Cancel</button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div className="space-y-4">
          <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black capitalize tracking-widest">
            Seller Hub
          </span>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white rounded-2xl border border-slate-100 shadow-sm flex items-center justify-center text-3xl">
              🏪
            </div>
            <div>
              <h2 className="text-3xl font-black text-slate-900 capitalize tracking-tighter">My Store</h2>
              <p className="text-slate-500 text-sm font-medium">Manage your products and track store performance</p>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <div className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-400 capitalize tracking-widest leading-none mb-1">Status</p>
              <p className="text-xs font-black text-slate-900 capitalize tracking-tight">Active Seller</p>
            </div>
          </div>
          <button
            onClick={() => setShowAddListing(true)}
            className="bg-emerald-700 text-white px-8 py-4 rounded-2xl font-black capitalize text-xs tracking-widest hover:bg-emerald-800 transition-all shadow-xl shadow-emerald-700/20 active:scale-95 flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Post New Listing
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-12 gap-8">
        {/* Listings List */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          <div className="flex justify-between items-center px-2">
            <h3 className="text-lg font-black text-slate-900 capitalize tracking-tighter">Your Active Listings</h3>
            <span className="text-[10px] font-black text-slate-400 capitalize tracking-widest">{myListings.length} Items Total</span>
          </div>

          {myListings.length === 0 ? (
            <div className="bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200 p-20 text-center space-y-4">
              <div className="text-5xl opacity-20">📦</div>
              <div className="space-y-1">
                <p className="text-sm font-black text-slate-900 capitalize">No products listed yet</p>
                <p className="text-xs text-slate-400 font-medium">Start selling your agricultural output to reach local buyers.</p>
              </div>
              <button
                onClick={() => setShowAddListing(true)}
                className="text-emerald-600 font-black text-[10px] capitalize tracking-widest hover:underline pt-4"
              >
                Post Your First Crop
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {myListings.map((listing) => (
                <div key={listing.id} className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-all flex items-center gap-4 group">
                  <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-2xl group-hover:bg-emerald-50 transition-colors">
                    {listing.crop[0]}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-black text-slate-900 capitalize tracking-tight">{listing.crop}</h4>
                      <span className={`px-2 py-0.5 rounded-lg text-[7px] font-black capitalize tracking-widest ${listing.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        {listing.status}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-bold capitalize tracking-widest">
                      {listing.quantity_kg.toLocaleString()} KG · {listing.currency} {listing.price_per_kg.toLocaleString()} / kg
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditingListing(listing)}
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-amber-400 hover:text-amber-600 hover:bg-amber-50 transition-all"
                      title="Edit listing"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteListing(listing.id)}
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 transition-all"
                      title="Delete listing"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-300 hover:text-emerald-600 hover:bg-emerald-50 transition-all">
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar / Tools */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden">
            <div className="relative z-10 space-y-6">
              <div className="space-y-1">
                <h3 className="text-xl font-black capitalize tracking-tighter">Store Health</h3>
                <p className="text-slate-400 text-[10px] font-bold capitalize tracking-widest">Verified Seller Account</p>
              </div>

              <div className="space-y-4 pt-4 border-t border-white/10">
                <div className="flex justify-between items-center">
                  <p className="text-[10px] font-black text-slate-400 capitalize tracking-widest">Visibility</p>
                  <p className="text-xs font-black text-emerald-400">Excellent</p>
                </div>
                <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                  <div className="w-4/5 h-full bg-emerald-500 rounded-full" />
                </div>
              </div>

              <div className="pt-4 space-y-3">
                <div className="p-4 bg-white/5 rounded-2xl flex items-center gap-4">
                  <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 capitalize tracking-widest leading-none mb-1">Protection</p>
                    <p className="text-xs font-black">Trade Secure Enabled</p>
                  </div>
                </div>
                <div className="p-4 bg-white/5 rounded-2xl flex items-center gap-4">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center text-blue-400">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 capitalize tracking-widest leading-none mb-1">Revenue</p>
                    <p className="text-xs font-black">Daily Payouts Active</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute -left-10 -top-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl" />
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showAddListing && (
          <AddListingModal
            onClose={() => setShowAddListing(false)}
            onSuccess={() => { setShowAddListing(false); fetchData(); }}
          />
        )}
        {editingListing && (
          <EditListingModal
            listing={editingListing}
            onClose={() => setEditingListing(null)}
            onSuccess={() => { setEditingListing(null); fetchData(); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
