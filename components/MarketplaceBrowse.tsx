'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
// Removed lucide-react imports
import { AddListingModal, AuthModal, EditListingModal, MpUser } from './Marketplace';
import { useAuth } from './AuthProvider';
import { format } from 'date-fns';

interface Listing {
  id: string;
  crop: string;
  quantity_kg: number;
  price_per_kg: number;
  currency: string;
  description: string;
  category: string;
  seller_name: string;
  seller_id: string;
  seller_district: string;
  is_promoted: number;
  created_at: string;
  image_url?: string;
  seller_phone?: string | null;
}

interface Trade {
  id: string;
  crop: string;
  quantity_kg: number;
  agreed_price_per_kg: number;
  total_value: number;
  currency: string;
  status: string;
  payment_status: 'unpaid' | 'pending' | 'paid';
  payment_method: string | null;
  payment_phone: string | null;
  created_at: string;
  seller_name: string;
  seller_phone: string | null;
  seller_district: string;
  buyer_name: string;
  buyer_phone: string | null;
  buyer_district: string;
  seller_id: string;
  buyer_id: string;
  image_url?: string;
}

const CATEGORIES = [
  { name: 'All' },
  { name: 'Grains' },
  { name: 'Vegetables' },
  { name: 'Fruits' },
  { name: 'Roots' },
  { name: 'Inputs' },
  { name: 'Livestock' }
];

const exportToCsv = (filename: string, rows: any[]) => {
  if (!rows || !rows.length) return;
  const separator = ',';
  const keys = Object.keys(rows[0]);
  const csvContent =
    keys.join(separator) +
    '\n' +
    rows.map(row => {
      return keys.map(k => {
        let cell = row[k] === null || row[k] === undefined ? '' : row[k];
        cell = cell instanceof Date ? cell.toLocaleString() : cell.toString().replace(/"/g, '""');
        if (cell.search(/("|,|\n)/g) >= 0) {
          cell = `"${cell}"`;
        }
        return cell;
      }).join(separator);
    }).join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

export default function MarketplaceBrowse({
  viewMode = 'buyer',
  onPostListing,
  onLogout
}: {
  viewMode?: 'buyer' | 'seller';
  onPostListing?: () => void;
  onLogout?: () => void;
}) {
  const { user: appUser } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [mpUser, setMpUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadingTrades, setLoadingTrades] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [page, setPage] = useState(1);
  const [activeLocation, setActiveLocation] = useState<string>('All');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showAddListingModal, setShowAddListingModal] = useState(false);
  const [editingListing, setEditingListing] = useState<Listing | null>(null);

  const [catalogSearch, setCatalogSearch] = useState('');
  const [ordersReceivedSearch, setOrdersReceivedSearch] = useState('');
  const [purchaseHistorySearch, setPurchaseHistorySearch] = useState('');

  // Date Filter & Export
  const [catalogStart, setCatalogStart] = useState('');
  const [catalogEnd, setCatalogEnd] = useState('');
  const [ordersReceivedStart, setOrdersReceivedStart] = useState('');
  const [ordersReceivedEnd, setOrdersReceivedEnd] = useState('');
  const [purchaseHistoryStart, setPurchaseHistoryStart] = useState('');
  const [purchaseHistoryEnd, setPurchaseHistoryEnd] = useState('');

  const filterByDateRange = (data: any[], dateField: string, startVal: string, endVal: string) => {
    return data.filter((item) => {
      if (!startVal && !endVal) return true;
      const itemDate = new Date(item[dateField]);
      if (isNaN(itemDate.getTime())) return true;

      const start = startVal ? new Date(startVal) : null;
      if (start) start.setHours(0, 0, 0, 0);
      const end = endVal ? new Date(endVal) : null;
      if (end) end.setHours(23, 59, 59, 999);

      if (start && end) return itemDate >= start && itemDate <= end;
      if (start) return itemDate >= start;
      if (end) return itemDate <= end;
      return true;
    });
  };

  // Direct Payment checkout modal state
  const [checkoutListing, setCheckoutListing] = useState<Listing | null>(null);
  const [checkoutQty, setCheckoutQty] = useState<string>('1');
  const [checkoutPhone, setCheckoutPhone] = useState('');
  const [paymentStep, setPaymentStep] = useState<'form' | 'initiating' | 'pin_prompt' | 'verifying' | 'completed' | 'error'>('form');
  const [paymentError, setPaymentError] = useState('');
  const [simulatedPin, setSimulatedPin] = useState('');

  const fetchSession = useCallback(async () => {
    try {
      const res = await fetch('/api/marketplace/auth/session');
      const data = await res.json();
      setMpUser(data.user);
    } catch (e) { }
  }, []);

  const fetchTrades = useCallback(async () => {
    if (!mpUser) return;
    setLoadingTrades(true);
    try {
      const res = await fetch('/api/marketplace/trades');
      if (res.ok) {
        const data = await res.json();
        setTrades(data.trades || []);
      }
    } catch (e) {
      console.error('Failed to fetch trades', e);
    } finally {
      setLoadingTrades(false);
    }
  }, [mpUser]);

  const fetchListings = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('crop', searchQuery);
      if (activeCategory !== 'All') params.append('category', activeCategory);
      if (viewMode === 'seller' && mpUser) {
        params.append('seller_id', mpUser.id);
      }

      const res = await fetch(`/api/marketplace/listings?${params.toString()}`);
      const data = await res.json();
      setListings(data.listings || []);
      setTotalCount(data.totalCount || 0);
    } catch (err) {
      console.error('Failed to fetch listings', err);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, activeCategory, viewMode, mpUser]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  useEffect(() => {
    if (mpUser) {
      fetchTrades();
    }
  }, [mpUser, fetchTrades]);

  const getCropEmoji = (crop: string) => {
    return '';
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
    return 'https://images.unsplash.com/photo-1595841696677-6489ff3f8cd1?auto=format&fit=crop&q=80&w=800'; // Default farm/crops image
  };

  const handleOrderClick = (listing: Listing) => {
    if (!mpUser || mpUser.role !== 'buyer') {
      setShowAuthModal(true);
      return;
    }
    setCheckoutListing(listing);
    setCheckoutQty(Math.min(listing.quantity_kg, 10).toString());
    setPaymentStep('form');
    setPaymentError('');
  };

  const deleteListing = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this listing?')) return;
    try {
      const res = await fetch('/api/marketplace/listings', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      if (res.ok) {
        fetchListings();
      }
    } catch (err) { }
  };

  const handleUpdateStatus = async (tradeId: string, newStatus: string) => {
    try {
      const res = await fetch('/api/marketplace/trades', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: tradeId, status: newStatus }),
      });
      if (res.ok) {
        fetchTrades();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update status');
      }
    } catch (err) {
      alert('Network error');
    }
  };

  const processPayment = async () => {
    if (!checkoutListing) return;
    const qty = parseFloat(checkoutQty);
    if (isNaN(qty) || qty <= 0 || qty > checkoutListing.quantity_kg) {
      setPaymentError(`Please enter a valid quantity between 0.1 and ${checkoutListing.quantity_kg} kg.`);
      return;
    }
    if (!checkoutPhone) {
      setPaymentError('Please enter your Mobile Money phone number.');
      return;
    }

    setPaymentError('');

    // Step 1: Initiating
    setPaymentStep('initiating');
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Step 2: PIN Prompt (Waiting for physical phone)
    setPaymentStep('pin_prompt');

    try {
      const res = await fetch('/api/marketplace/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingId: checkoutListing.id,
          quantity: qty,
          phone: checkoutPhone
        })
      });
      const data = await res.json();

      if (res.ok) {
        setPaymentStep('completed');
        // Refresh data
        fetchListings();
        fetchTrades();
      } else {
        setPaymentError(data.error || 'Transaction failed. Please try again.');
        setPaymentStep('error');
      }
    } catch (err) {
      setPaymentError('Network response error. Please try again.');
      setPaymentStep('error');
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/marketplace/auth/session', { method: 'DELETE' });
      setMpUser(null);
      if (onLogout) onLogout();
    } catch (e) {
      console.error('Logout failed', e);
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'bg-orange-50 text-orange-600 border-orange-100';
      case 'in-transit':
        return 'bg-blue-50 text-blue-600 border-blue-100';
      case 'completed':
      case 'delivered':
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

  // Filter listings for buyers to exclude their own products
  const buyerListings = listings.filter(l => !mpUser || l.seller_id !== mpUser.id);

  const uniqueDistricts = Array.from(new Set(buyerListings.map(l => l.seller_district || 'Unknown'))).filter(Boolean).sort();

  const filteredByLocationListings = activeLocation === 'All'
    ? buyerListings
    : buyerListings.filter(l => (l.seller_district || 'Unknown') === activeLocation);

  const sortedBuyerListings = [...filteredByLocationListings];
  // Buyer's purchases
  const buyerTrades = trades.filter(t => mpUser && t.buyer_id === mpUser.id);
  // Seller's received orders
  const sellerTrades = trades.filter(t => mpUser && t.seller_id === mpUser.id);

  const filteredCatalog = filterByDateRange(listings.filter(l => l.crop.toLowerCase().includes(catalogSearch.toLowerCase())), 'created_at', catalogStart, catalogEnd);
  const filteredOrdersReceived = filterByDateRange(sellerTrades.filter(t => t.crop.toLowerCase().includes(ordersReceivedSearch.toLowerCase()) || t.buyer_name.toLowerCase().includes(ordersReceivedSearch.toLowerCase())), 'created_at', ordersReceivedStart, ordersReceivedEnd);
  const filteredPurchaseHistory = filterByDateRange(buyerTrades.filter(t => t.crop.toLowerCase().includes(purchaseHistorySearch.toLowerCase()) || t.seller_name.toLowerCase().includes(purchaseHistorySearch.toLowerCase())), 'created_at', purchaseHistoryStart, purchaseHistoryEnd);

  const DateRangeExport = ({ data, filename, start, end, onStartChange, onEndChange }: { data: any[], filename: string, start: string, end: string, onStartChange: (v: string) => void, onEndChange: (v: string) => void }) => (
    <div className="flex items-center gap-2 shrink-0">
      <input type="date" value={start} onChange={(e) => onStartChange(e.target.value)} className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all text-slate-600" title="Start Date" />
      <span className="text-slate-400 font-bold text-xs">to</span>
      <input type="date" value={end} onChange={(e) => onEndChange(e.target.value)} className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all text-slate-600" title="End Date" />
      <button onClick={() => exportToCsv(filename, data)} className="px-4 py-1.5 bg-emerald-600 text-white hover:bg-emerald-700 text-[10px] font-black capitalize tracking-widest rounded-full transition-all shadow-sm shrink-0">
        Export CSV
      </button>
    </div>
  );

  return (
    <div className="space-y-8 pb-10">

      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            {viewMode === 'seller' ? (
              <>My Listings and Received Orders</>
            ) : (
              <>Browse and Buy Crops</>
            )}
          </h2>
          <p className="text-slate-500 text-sm font-medium">
            {viewMode === 'seller'
              ? 'List crops for sale and view incoming purchases from buyers.'
              : 'Browse fresh agricultural output from local farmers and order instantly.'}
          </p>
        </div>

        {viewMode === 'seller' ? (
          <button
            onClick={() => setShowAddListingModal(true)}
            className="bg-emerald-600 text-white px-6 py-3.5 rounded-2xl font-black capitalize text-[10px] tracking-widest hover:bg-emerald-700 transition-all active:scale-95 flex items-center gap-2"
          >
            Add a Crop
          </button>
        ) : null}
      </div>

      {/* ─── SELLER VIEW MODE ─── */}
      {viewMode === 'seller' && (
        <div className="space-y-12">
          {/* Listings Table */}
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b border-slate-50 pb-4">
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-bold text-slate-900 tracking-tight">Your Crops Catalog</h3>
                  <span className="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-md text-[10px] font-black capitalize tracking-widest border border-emerald-100 shrink-0 whitespace-nowrap">
                    {filteredCatalog.length} Active Crops
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-bold capitalize tracking-wider mt-0.5">Crops you currently offer on the marketplace</p>
              </div>
              <div className="flex items-center gap-3">
                <DateRangeExport data={filteredCatalog} filename="crops_catalog.csv" start={catalogStart} end={catalogEnd} onStartChange={setCatalogStart} onEndChange={setCatalogEnd} />
                <input
                  type="text"
                  placeholder="Search catalog..."
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  className="min-w-[160px] px-4 py-2 bg-slate-50 border border-emerald-200 focus:border-emerald-400 rounded-none text-xs font-bold focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all placeholder:text-slate-400"
                />
              </div>
            </div>

            {loading ? (
              <div className="py-20 flex justify-center items-center">
                <span className="text-emerald-600 font-black capitalize tracking-widest text-[10px] animate-pulse">Loading...</span>
              </div>
            ) : listings.length === 0 ? (
              <div className="py-20 text-center space-y-4">
                <div>
                  <p className="text-base font-black text-slate-900 capitalize">Catalog is empty</p>
                  <p className="text-xs text-slate-400 font-medium mt-1">Start adding crops to make your produce visible to buyers.</p>
                </div>
                <button
                  onClick={() => setShowAddListingModal(true)}
                  className="bg-emerald-600 text-white px-6 py-3 rounded-xl text-[10px] font-black capitalize tracking-widest hover:bg-emerald-700 transition-all"
                >
                  List your first crop
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto bg-white rounded-none shadow-[0_8px_30px_rgb(0,0,0,0.12)] border-0">
                <table className="w-full min-w-[800px] text-left">
                  <thead className="bg-[#8B4513] text-white/90">
                    <tr>
                      <th className="px-6 py-4 text-[10px] font-black capitalize tracking-widest">Crop Name</th>
                      <th className="px-6 py-4 text-[10px] font-black capitalize tracking-widest">Category</th>
                      <th className="px-6 py-4 text-[10px] font-black capitalize tracking-widest">Stock (KG)</th>
                      <th className="px-6 py-4 text-[10px] font-black capitalize tracking-widest">Price / KG</th>
                      <th className="px-6 py-4 text-[10px] font-black capitalize tracking-widest">Promotion</th>
                      <th className="px-6 py-4 text-[10px] font-black capitalize tracking-widest">Created Date</th>
                      <th className="px-6 py-4 text-[10px] font-black capitalize tracking-widest text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-sm font-semibold text-slate-700">
                    {filteredCatalog.map((l) => (
                      <tr key={l.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-6 py-4 font-black text-slate-950 flex items-center gap-3">
                          {l.image_url ? (
                            <img src={l.image_url} alt={l.crop} className="w-8 h-8 rounded-full object-cover border border-slate-200 flex-shrink-0" />
                          ) : (
                            <span className="text-2xl flex-shrink-0">{getCropEmoji(l.crop)}</span>
                          )}
                          <span className="capitalize tracking-tight">{l.crop}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg text-[9px] font-black capitalize tracking-wider">
                            {l.category || 'Grains'}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-black">
                          {l.quantity_kg.toLocaleString()} KG
                        </td>
                        <td className="px-6 py-4 font-black text-emerald-600 capitalize">
                          {l.currency} {l.price_per_kg.toLocaleString()}
                        </td>
                        <td className="px-6 py-4">
                          {l.is_promoted === 1 ? (
                            <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md text-[8px] font-black capitalize tracking-widest border border-amber-200">Featured</span>
                          ) : (
                            <span className="text-slate-400 text-[10px] capitalize font-bold">Standard</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-500 font-bold">
                          {format(new Date(l.created_at), 'MMM d, yyyy')}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2 items-center">
                            <button
                              onClick={() => setEditingListing(l)}
                              className="p-2 text-slate-500 hover:text-emerald-600 transition-colors shrink-0"
                              title="Edit Listing"
                            >
                              <span className="text-[10px] font-black capitalize tracking-widest">Edit</span>
                            </button>
                            <button
                              onClick={() => deleteListing(l.id)}
                              className="p-2 text-red-500 hover:text-red-700 transition-colors shrink-0"
                              title="Cancel Listing"
                            >
                              <span className="text-[10px] font-black capitalize tracking-widest">Delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Orders Received Table */}
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b border-slate-50 pb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900 tracking-tight">Orders Received from Buyers</h3>
                <p className="text-xs text-slate-400 font-bold capitalize tracking-wider mt-0.5">Purchases initiated and paid by buyers for your crops</p>
              </div>
              <div className="flex items-center gap-3">
                <DateRangeExport data={filteredOrdersReceived} filename="orders_received.csv" start={ordersReceivedStart} end={ordersReceivedEnd} onStartChange={setOrdersReceivedStart} onEndChange={setOrdersReceivedEnd} />
                <input
                  type="text"
                  placeholder="Search orders..."
                  value={ordersReceivedSearch}
                  onChange={(e) => setOrdersReceivedSearch(e.target.value)}
                  className="min-w-[160px] px-4 py-2 bg-slate-50 border border-emerald-200 focus:border-emerald-400 rounded-none text-xs font-bold focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all placeholder:text-slate-400"
                />
              </div>
            </div>

            {loadingTrades ? (
              <div className="py-20 flex justify-center items-center">
                <span className="text-emerald-600 font-black capitalize tracking-widest text-[10px] animate-pulse">Loading...</span>
              </div>
            ) : sellerTrades.length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <p className="text-[10px] font-black capitalize tracking-widest">No Incoming Orders Yet</p>
                <p className="text-xs text-slate-400 font-medium">When buyers purchase your crops directly, they will show up here.</p>
              </div>
            ) : (
              <div className="overflow-x-auto bg-white rounded-none shadow-[0_8px_30px_rgb(0,0,0,0.12)] border-0">
                <table className="w-full min-w-[800px] text-left">
                  <thead className="bg-[#8B4513] text-white/90">
                    <tr>
                      <th className="px-6 py-4 text-[10px] font-black capitalize tracking-widest">Order ID</th>
                      <th className="px-6 py-4 text-[10px] font-black capitalize tracking-widest">Crop</th>
                      <th className="px-6 py-4 text-[10px] font-black capitalize tracking-widest">Buyer</th>
                      <th className="px-6 py-4 text-[10px] font-black capitalize tracking-widest">Quantity</th>
                      <th className="px-6 py-4 text-[10px] font-black capitalize tracking-widest">Amount</th>
                      <th className="px-6 py-4 text-[10px] font-black capitalize tracking-widest">Status</th>
                      <th className="px-6 py-4 text-[10px] font-black capitalize tracking-widest">Date</th>
                      <th className="px-6 py-4 text-[10px] font-black capitalize tracking-widest text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-sm font-semibold text-slate-700">
                    {filteredOrdersReceived.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-6 py-4 font-black text-slate-950 capitalize">
                          #{t.id.split('-').pop()}
                        </td>
                        <td className="px-6 py-4 font-black text-slate-950 flex items-center gap-3">
                          {t.image_url ? (
                            <img src={t.image_url} alt={t.crop} className="w-8 h-8 rounded-full object-cover border border-slate-200 flex-shrink-0" />
                          ) : (
                            <span className="text-2xl flex-shrink-0">{getCropEmoji(t.crop)}</span>
                          )}
                          <span className="capitalize tracking-tight">{t.crop}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-slate-900">{t.buyer_name}</span>
                            <span className="text-[10px] text-slate-500">{t.buyer_phone || 'No phone'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-black">
                          {t.quantity_kg.toLocaleString()} KG
                        </td>
                        <td className="px-6 py-4 font-black text-emerald-600 capitalize">
                          {t.currency} {t.total_value.toLocaleString()}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-none text-[9px] font-black capitalize tracking-widest border ${getStatusStyle(t.status)}`}>
                            {t.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-500 font-bold">
                          {format(new Date(t.created_at), 'MMM d, yyyy')}
                        </td>
                        <td className="px-6 py-4 text-right">
                          {t.status === 'pending' ? (
                            <button
                              onClick={() => handleUpdateStatus(t.id, 'in-transit')}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-none text-[9px] font-black capitalize tracking-widest transition-colors shadow-sm"
                            >
                              Ship Order
                            </button>
                          ) : (
                            <span className="text-slate-400 text-[9px] capitalize font-black tracking-widest">
                              {t.status === 'in-transit' ? 'In Transit' : 'Completed'}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── BUYER VIEW MODE ─── */}
      {viewMode === 'buyer' && (
        <div className="space-y-12">
          {/* Search & Main Filters */}
          <div className="p-2 flex flex-wrap lg:flex-nowrap items-center gap-2">
            <div className="flex-1 min-w-[300px] relative group">
              <input
                type="text"
                placeholder="Search products, crops, farmers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-14 bg-slate-50/50 border-2 border-emerald-200 rounded-2xl px-6 text-sm font-bold focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all placeholder:text-slate-400"
              />
            </div>

            <div className="flex items-center gap-2 px-2">
              <select
                value={activeLocation}
                onChange={(e) => setActiveLocation(e.target.value)}
                className="h-14 bg-emerald-600 text-white outline-none text-[10px] font-black capitalize tracking-widest cursor-pointer px-6 rounded-2xl hover:bg-emerald-700 transition-all"
              >
                <option value="All" className="bg-white text-slate-900">Location</option>
                {uniqueDistricts.map(district => (
                  <option key={district} value={district} className="bg-white text-slate-900">{district}</option>
                ))}
              </select>
            </div>

          </div>

          {/* Category Chips */}
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.name}
                onClick={() => setActiveCategory(cat.name)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-[11px] font-black capitalize tracking-widest transition-all border ${activeCategory === cat.name
                  ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                  : 'bg-white border-slate-100 text-slate-500 hover:border-emerald-200 hover:text-emerald-600'
                  }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Grid of Browse Listings */}
          <div className="space-y-6">
            <div className="flex justify-between items-center px-2">
              <h3 className="text-xl font-bold text-slate-900 tracking-tight">Available Crops for Purchase</h3>
              <p className="text-[11px] font-black text-slate-400 capitalize tracking-widest">
                Showing {sortedBuyerListings.length} of {totalCount} listings
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-[450px] animate-pulse overflow-hidden">
                    <div className="h-48 bg-slate-50" />
                    <div className="p-8 space-y-4">
                      <div className="h-6 bg-slate-50 w-3/4 rounded-full" />
                      <div className="h-4 bg-slate-50 w-1/2 rounded-full" />
                      <div className="h-20 bg-slate-50 rounded-2xl" />
                    </div>
                  </div>
                ))
              ) : sortedBuyerListings.length === 0 ? (
                <div className="col-span-full py-20 text-center space-y-4">
                  <div className="space-y-1">
                    <p className="text-lg font-black text-slate-900 capitalize tracking-tight">No crops available</p>
                    <p className="text-slate-400 text-sm font-medium">There are currently no active crop offers listed by other sellers.</p>
                  </div>
                </div>
              ) : (
                sortedBuyerListings.map((listing) => (
                  <motion.div
                    key={listing.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white border border-slate-100 rounded-3xl shadow-lg hover:shadow-xl transition-all overflow-hidden group flex flex-col h-full"
                  >
                    {/* Card Top / Image Area */}
                    <div
                      className="h-48 bg-slate-50/50 flex items-center justify-center relative bg-cover bg-center"
                      style={{ backgroundImage: `url(${listing.image_url || getCropImage(listing.crop)})` }}
                    >
                      <div className="absolute inset-0 bg-slate-900/20 group-hover:bg-transparent transition-all"></div>
                      {listing.is_promoted === 1 && (
                        <div className="absolute top-6 left-6 z-10">
                          <span className="bg-amber-100 text-amber-700 text-[8px] font-black px-2 py-1 rounded-lg capitalize tracking-widest border border-amber-200">Featured</span>
                        </div>
                      )}
                    </div>

                    {/* Card Content */}
                    <div className="p-8 flex-1 flex flex-col space-y-4">
                      <div className="flex justify-between items-start gap-4">
                        <h3 className="text-lg font-black text-slate-900 capitalize tracking-tighter leading-tight group-hover:text-emerald-700 transition-colors">
                          {listing.crop}
                        </h3>
                        {listing.quantity_kg > 100 ? (
                          <span className="px-2.5 py-1 bg-green-50 text-green-700 text-[9px] font-black rounded-lg capitalize tracking-widest border border-green-100 flex-shrink-0">
                            In Stock
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 bg-orange-50 text-orange-700 text-[9px] font-black rounded-lg capitalize tracking-widest border border-orange-100 flex-shrink-0">
                            Low Stock
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 capitalize tracking-widest">
                        {listing.seller_district || 'Unknown Location'}
                      </div>

                      <p className="text-sm text-slate-500 font-medium line-clamp-2 leading-relaxed">
                        {listing.description || `Freshly harvested ${listing.crop} available in bulk. Direct from farm to market.`}
                      </p>

                      <div className="pt-4 flex items-end justify-between border-t border-slate-50">
                        <div className="space-y-1">
                          <p className="text-[9px] font-black text-slate-400 capitalize tracking-widest">Unit Price</p>
                          <p className="text-xl font-black text-emerald-600 tracking-tight">
                            {listing.currency} {listing.price_per_kg.toLocaleString()}
                            <span className="text-xs text-slate-400 font-bold"> /kg</span>
                          </p>
                        </div>
                        <div className="text-right space-y-1">
                          <p className="text-[9px] font-black text-slate-400 capitalize tracking-widest">Availability</p>
                          <p className="text-sm font-black text-slate-900">{listing.quantity_kg.toLocaleString()} KG</p>
                        </div>
                      </div>

                      <div className="pt-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 font-black text-[10px]">
                            {listing.seller_name?.[0] || 'U'}
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-slate-900 leading-none">{listing.seller_name}</p>
                            {listing.seller_phone && (
                              <div className="flex items-center gap-1 mt-0.5">
                                <span className="text-[9px] font-bold text-slate-400">{listing.seller_phone}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Footer Buttons */}
                      <div className="pt-6 flex gap-2">
                        <button
                          onClick={() => handleOrderClick(listing)}
                          className="flex-1 bg-emerald-700 text-white py-4 rounded-2xl font-black capitalize text-[10px] tracking-widest hover:bg-emerald-800 transition-all active:scale-[0.98]"
                        >
                          Order Now
                        </button>
                        {mpUser?.role === 'admin' && (
                          <button
                            onClick={() => deleteListing(listing.id)}
                            className="bg-red-50 text-red-600 px-4 py-4 rounded-2xl font-black capitalize text-[10px] tracking-widest hover:bg-red-100 transition-all active:scale-[0.98]"
                            title="Delete Listing (Admin)"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>

          {/* Orders Made / Purchase History Table */}
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b border-slate-50 pb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900 tracking-tight">Your Purchase History</h3>
                <p className="text-xs text-slate-400 font-bold capitalize tracking-wider mt-0.5">Orders you have placed and paid over time</p>
              </div>
              <div className="flex items-center gap-3">
                <DateRangeExport data={filteredPurchaseHistory} filename="purchase_history.csv" start={purchaseHistoryStart} end={purchaseHistoryEnd} onStartChange={setPurchaseHistoryStart} onEndChange={setPurchaseHistoryEnd} />
                <input
                  type="text"
                  placeholder="Search history..."
                  value={purchaseHistorySearch}
                  onChange={(e) => setPurchaseHistorySearch(e.target.value)}
                  className="min-w-[160px] px-4 py-2 bg-slate-50 border border-emerald-200 focus:border-emerald-400 rounded-none text-xs font-bold focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all placeholder:text-slate-400"
                />
              </div>
            </div>

            {loadingTrades ? (
              <div className="py-20 flex justify-center items-center">
                <span className="text-emerald-600 font-black capitalize tracking-widest text-[10px] animate-pulse">Loading...</span>
              </div>
            ) : buyerTrades.length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <p className="text-[10px] font-black capitalize tracking-widest">No Purchases Made Yet</p>
                <p className="text-xs text-slate-400 font-medium">Use the "Order Now" button on crop listings to place orders.</p>
              </div>
            ) : (
              <div className="overflow-x-auto bg-white rounded-none shadow-[0_8px_30px_rgb(0,0,0,0.12)] border-0">
                <table className="w-full min-w-[800px] text-left">
                  <thead className="bg-[#8B4513] text-white/90">
                    <tr>
                      <th className="px-6 py-4 text-[10px] font-black capitalize tracking-widest">Order ID</th>
                      <th className="px-6 py-4 text-[10px] font-black capitalize tracking-widest">Crop</th>
                      <th className="px-6 py-4 text-[10px] font-black capitalize tracking-widest">Seller</th>
                      <th className="px-6 py-4 text-[10px] font-black capitalize tracking-widest">Quantity</th>
                      <th className="px-6 py-4 text-[10px] font-black capitalize tracking-widest">Amount</th>
                      <th className="px-6 py-4 text-[10px] font-black capitalize tracking-widest">Status</th>
                      <th className="px-6 py-4 text-[10px] font-black capitalize tracking-widest">Date</th>
                      <th className="px-6 py-4 text-[10px] font-black capitalize tracking-widest text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-sm font-semibold text-slate-700">
                    {filteredPurchaseHistory.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-6 py-4 font-black text-slate-950 capitalize">
                          #{t.id.split('-').pop()}
                        </td>
                        <td className="px-6 py-4 font-black text-slate-950 flex items-center gap-3">
                          {t.image_url ? (
                            <img src={t.image_url} alt={t.crop} className="w-8 h-8 rounded-full object-cover border border-slate-200 flex-shrink-0" />
                          ) : (
                            <span className="text-2xl flex-shrink-0">{getCropEmoji(t.crop)}</span>
                          )}
                          <span className="capitalize tracking-tight">{t.crop}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-slate-900">{t.seller_name}</span>
                            <span className="text-[10px] text-slate-500">{t.seller_phone || 'No phone'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-black">
                          {t.quantity_kg.toLocaleString()} KG
                        </td>
                        <td className="px-6 py-4 font-black text-emerald-600 capitalize">
                          {t.currency} {t.total_value.toLocaleString()}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-none text-[9px] font-black capitalize tracking-widest border ${getStatusStyle(t.status)}`}>
                            {t.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-500 font-bold">
                          {format(new Date(t.created_at), 'MMM d, yyyy')}
                        </td>
                        <td className="px-6 py-4 text-right">
                          {t.status === 'in-transit' ? (
                            <button
                              onClick={() => handleUpdateStatus(t.id, 'completed')}
                              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-none text-[9px] font-black capitalize tracking-widest transition-colors shadow-sm"
                            >
                              Confirm Delivery
                            </button>
                          ) : (
                            <span className="text-slate-400 text-[9px] capitalize font-black tracking-widest">
                              {t.status === 'pending' ? 'Pending Shipping' : 'Completed'}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Pagination (Only for Buyer browse page) */}
      {viewMode === 'buyer' && buyerListings.length > 0 && (
        <div className="flex justify-center items-center gap-2 pt-10">
          <button className="w-10 h-10 flex items-center justify-center rounded-xl border border-slate-100 hover:bg-white hover:shadow-md transition-all text-slate-400 text-[10px] font-black capitalize tracking-widest">
            Prev
          </button>
          {[1, 2, 3].map(p => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`w-10 h-10 flex items-center justify-center rounded-xl font-black text-[11px] transition-all ${page === p ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'bg-white border border-slate-100 text-slate-400 hover:border-emerald-200'
                }`}
            >
              {p}
            </button>
          ))}
          <button className="w-10 h-10 flex items-center justify-center rounded-xl border border-slate-100 hover:bg-white hover:shadow-md transition-all text-slate-400 text-[10px] font-black capitalize tracking-widest">
            Next
          </button>
        </div>
      )}

      {/* Modals & Popups */}
      <AnimatePresence>
        {showAuthModal && (
          <AuthModal
            onClose={() => setShowAuthModal(false)}
            onSuccess={(user: MpUser) => {
              setMpUser(user);
              setShowAuthModal(false);
            }}
            defaultRole={viewMode === 'seller' ? 'seller' : 'buyer'}
          />
        )}

        {showAddListingModal && (
          <AddListingModal
            onClose={() => setShowAddListingModal(false)}
            onSuccess={() => {
              setShowAddListingModal(false);
              fetchListings();
            }}
          />
        )}

        {editingListing && (
          <EditListingModal
            listing={editingListing}
            onClose={() => setEditingListing(null)}
            onSuccess={() => {
              setEditingListing(null);
              fetchListings();
            }}
          />
        )}

        {/* Step-by-Step Mobile Money Payment Checkout Modal */}
        {checkoutListing && (
          <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl"
            >
              <div className="bg-[#2d6a4f] p-8 text-white">
                <span className="bg-white/20 text-white text-[8px] font-black px-2 py-1 rounded-md capitalize tracking-widest">Secure Checkout</span>
                <h3 className="text-2xl font-black capitalize tracking-tighter mt-2">Mobile Money Payment</h3>
                <p className="text-emerald-100 text-[10px] font-bold capitalize tracking-widest mt-1">Simulated Carrier Billing Engine</p>
              </div>

              <div className="p-8 space-y-6">
                {/* Flow Step 1: Form Input */}
                {paymentStep === 'form' && (
                  <div className="space-y-4">
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-1.5">
                      <p className="text-[9px] font-black text-slate-400 capitalize tracking-widest">Product Summary</p>
                      <div className="flex justify-between items-center text-sm">
                        <span className="font-black text-slate-800 capitalize tracking-tight">{checkoutListing.crop} ({checkoutListing.category})</span>
                        <span className="text-slate-400 text-xs font-bold">Seller: {checkoutListing.seller_name}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-200/50 mt-1">
                        <span className="font-bold text-slate-500">Unit Price</span>
                        <span className="font-black text-slate-950">{checkoutListing.currency} {checkoutListing.price_per_kg.toLocaleString()} / kg</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-500">Total Stock</span>
                        <span className="font-black text-slate-950">{checkoutListing.quantity_kg.toLocaleString()} KG</span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 capitalize tracking-widest mb-1.5">Quantity to Buy (KG)</label>
                        <input
                          type="number"
                          min="0.1"
                          max={checkoutListing.quantity_kg}
                          step="0.1"
                          value={checkoutQty}
                          onChange={(e) => {
                            setCheckoutQty(e.target.value);
                            setPaymentError('');
                          }}
                          className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-bold focus:border-[#2d6a4f] outline-none transition-all"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-black text-slate-400 capitalize tracking-widest mb-1.5">Your Mobile Money Number</label>
                        <div className="relative">
                          <input
                            type="tel"
                            placeholder="e.g. 0770000000"
                            value={checkoutPhone}
                            onChange={(e) => {
                              setCheckoutPhone(e.target.value);
                              setPaymentError('');
                            }}
                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl pl-12 pr-4 py-3 text-sm font-bold focus:border-[#2d6a4f] outline-none transition-all"
                          />
                        </div>
                        <p className="text-[9px] text-slate-400 mt-1 capitalize font-black tracking-wider pl-1">Supports MTN and Airtel billing systems</p>
                      </div>
                    </div>

                    {paymentError && (
                      <div className="p-3.5 bg-red-50 text-red-600 text-[10px] font-black capitalize tracking-wider rounded-xl flex gap-2 items-center">
                        <span className="font-black text-[12px] flex-shrink-0">!</span>
                        <span>{paymentError}</span>
                      </div>
                    )}

                    <div className="pt-2 border-t border-slate-100 flex justify-between items-center mb-2">
                      <div>
                        <p className="text-[9px] font-black text-slate-400 capitalize tracking-widest">Total Payable</p>
                        <p className="text-xl font-black text-emerald-600 capitalize tracking-tight">
                          {checkoutListing.currency} {((parseFloat(checkoutQty) || 0) * checkoutListing.price_per_kg).toLocaleString()}
                        </p>
                      </div>
                      <button
                        onClick={processPayment}
                        className="bg-emerald-600 text-white px-6 py-4 rounded-xl font-black capitalize text-[10px] tracking-widest hover:bg-emerald-700 transition-all shadow-md shadow-emerald-600/10 active:scale-95"
                      >
                        Pay & Place Order
                      </button>
                    </div>

                    <button
                      onClick={() => setCheckoutListing(null)}
                      className="w-full text-center text-[10px] font-black capitalize tracking-widest text-slate-400 hover:text-slate-600 transition-colors pt-2"
                    >
                      Cancel Purchase
                    </button>
                  </div>
                )}

                {/* Flow Step 2: Initiating */}
                {paymentStep === 'initiating' && (
                  <div className="py-8 text-center space-y-4">
                    <div className="text-emerald-600 font-black capitalize tracking-widest text-[10px] animate-pulse">Loading...</div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black capitalize tracking-[0.25em] text-emerald-600">Step 1 of 4</p>
                      <h4 className="text-base font-black text-slate-900 capitalize">Initiating Payment Gateway</h4>
                      <p className="text-xs text-slate-400 font-medium px-4">Contacting the telecom carrier billing API endpoint at {checkoutPhone}...</p>
                    </div>
                  </div>
                )}

                {/* Flow Step 3: PIN Prompt */}
                {paymentStep === 'pin_prompt' && (
                  <div className="py-8 text-center space-y-6">
                    <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center text-3xl mx-auto border border-amber-100 animate-bounce">
                      📲
                    </div>
                    <div className="space-y-4">
                      <p className="text-[10px] font-black capitalize tracking-[0.25em] text-amber-600">Action Required</p>
                      <h4 className="text-lg font-black text-slate-900 capitalize">Check Your Phone</h4>
                      <p className="text-xs text-slate-500 font-bold leading-relaxed px-6">
                        A real USSD prompt has been sent to <span className="text-slate-900 font-black">{checkoutPhone}</span>.
                      </p>
                      <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 inline-block text-amber-800 mt-2">
                        <div className="text-amber-600 font-black capitalize tracking-widest text-[10px] animate-pulse mb-2">Loading...</div>
                        <p className="text-xs font-medium">Please enter your Mobile Money PIN on your physical device to authorize.</p>
                        <p className="text-[10px] font-black capitalize mt-2 opacity-70">Awaiting carrier confirmation...</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Flow Step 4: Verifying */}
                {paymentStep === 'verifying' && (
                  <div className="py-8 text-center space-y-4">
                    <div className="text-emerald-600 font-black capitalize tracking-widest text-[10px] animate-pulse">Loading...</div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black capitalize tracking-[0.25em] text-blue-600">Step 3 of 4</p>
                      <h4 className="text-base font-black text-slate-900 capitalize">Verifying Clearance</h4>
                      <p className="text-xs text-slate-400 font-medium px-4">Awaiting response from carrier system. Querying confirmation token...</p>
                    </div>
                  </div>
                )}

                {/* Flow Step 5: Completed */}
                {paymentStep === 'completed' && (
                  <div className="py-8 text-center space-y-6">
                    <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center text-3xl mx-auto border border-emerald-100">
                      ✅
                    </div>
                    <div className="space-y-2">
                      <p className="text-[10px] font-black capitalize tracking-[0.25em] text-emerald-600">Step 4 of 4: Completed</p>
                      <h4 className="text-lg font-black text-slate-900 capitalize">Payment Clearance Successful</h4>
                      <p className="text-xs text-slate-500 font-bold px-4">
                        Fund transfer complete. The payment of <span className="font-black text-emerald-600">{checkoutListing.currency} {((parseFloat(checkoutQty) || 0) * checkoutListing.price_per_kg).toLocaleString()}</span> has been credited immediately to <span className="font-black text-slate-800">{checkoutListing.seller_name}</span>.
                      </p>
                    </div>
                    <div className="pt-4 border-t border-slate-100">
                      <button
                        onClick={() => setCheckoutListing(null)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-xl font-black capitalize text-[10px] tracking-widest transition-all"
                      >
                        Done
                      </button>
                    </div>
                  </div>
                )}

                {/* Flow Step 6: Error */}
                {paymentStep === 'error' && (
                  <div className="py-8 text-center space-y-6">
                    <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center text-3xl mx-auto border border-red-100">
                      ❌
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-lg font-black text-slate-900 capitalize">Payment Processing Failed</h4>
                      <p className="text-xs text-red-500 font-bold px-6">{paymentError}</p>
                    </div>
                    <div className="pt-4 border-t border-slate-100 flex gap-2 justify-center">
                      <button
                        onClick={() => setPaymentStep('form')}
                        className="bg-slate-950 text-white px-6 py-3 rounded-xl font-black capitalize text-[10px] tracking-widest hover:bg-slate-800 transition-all"
                      >
                        Try Again
                      </button>
                      <button
                        onClick={() => setCheckoutListing(null)}
                        className="bg-white border border-slate-200 text-slate-500 px-6 py-3 rounded-xl font-black capitalize text-[10px] tracking-widest hover:bg-slate-50 transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
