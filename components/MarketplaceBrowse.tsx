'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  MapPin, 
  Tag, 
  Plus, 
  ChevronLeft, 
  ChevronRight,
  ChevronDown,
  Filter,
  CheckCircle2,
  AlertCircle,
  Clock,
  Truck,
  Trash2,
  RefreshCw,
  ShoppingBag,
  CreditCard,
  Phone
} from 'lucide-react';
import { AddListingModal, AuthModal } from './Marketplace';
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
}

const CATEGORIES = [
  { name: 'All', icon: '✨' },
  { name: 'Grains', icon: '🌾' },
  { name: 'Vegetables', icon: '🥬' },
  { name: 'Fruits', icon: '🍎' },
  { name: 'Herbs', icon: '🌿' },
  { name: 'Inputs', icon: '🧪' },
  { name: 'Livestock', icon: '🐄' }
];

export default function MarketplaceBrowse({ 
  viewMode = 'buyer', 
  onPostListing 
}: { 
  viewMode?: 'buyer' | 'seller';
  onPostListing?: () => void;
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
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showAddListingModal, setShowAddListingModal] = useState(false);
  
  // Direct Payment checkout modal state
  const [checkoutListing, setCheckoutListing] = useState<Listing | null>(null);
  const [checkoutQty, setCheckoutQty] = useState('10');
  const [checkoutPhone, setCheckoutPhone] = useState('');
  const [paymentStep, setPaymentStep] = useState<'form' | 'initiating' | 'pin_prompt' | 'verifying' | 'completed' | 'error'>('form');
  const [paymentError, setPaymentError] = useState('');

  const fetchSession = useCallback(async () => {
    try {
      const res = await fetch('/api/marketplace/auth/session');
      const data = await res.json();
      setMpUser(data.user);
      if (data.user?.phone) {
        setCheckoutPhone(data.user.phone);
      }
    } catch (e) {}
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
      await fetchSession();
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
  }, [searchQuery, activeCategory, viewMode, mpUser, fetchSession]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  useEffect(() => {
    if (mpUser) {
      fetchTrades();
    }
  }, [mpUser, fetchTrades]);

  const getCropEmoji = (crop: string) => {
    const c = crop.toLowerCase();
    if (c.includes('maize') || c.includes('corn')) return '🌽';
    if (c.includes('tomato')) return '🍅';
    if (c.includes('bean')) return '🫘';
    if (c.includes('rice')) return '🌾';
    if (c.includes('banana') || c.includes('matooke')) return '🍌';
    if (c.includes('onion')) return '🧅';
    if (c.includes('cabbage')) return '🥬';
    if (c.includes('pepper')) return '🫑';
    if (c.includes('moringa')) return '🌿';
    if (c.includes('cow') || c.includes('beef')) return '🐄';
    if (c.includes('chicken')) return '🐔';
    return '📦';
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
    } catch (err) {}
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
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Step 2: PIN Prompt
    setPaymentStep('pin_prompt');
    await new Promise((resolve) => setTimeout(resolve, 3500));

    // Step 3: Verifying
    setPaymentStep('verifying');
    
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
    switch (status.toLowerCase()) {
      case 'pending':
        return <Clock className="w-3 h-3" />;
      case 'in-transit':
        return <Truck className="w-3 h-3" />;
      case 'completed':
      case 'delivered':
        return <CheckCircle2 className="w-3 h-3" />;
      case 'disputed':
        return <AlertCircle className="w-3 h-3" />;
      default:
        return null;
    }
  };

  // Filter listings for buyers to exclude their own products
  const buyerListings = listings.filter(l => !mpUser || l.seller_id !== mpUser.id);
  // Buyer's purchases
  const buyerTrades = trades.filter(t => mpUser && t.buyer_id === mpUser.id);
  // Seller's received orders
  const sellerTrades = trades.filter(t => mpUser && t.seller_id === mpUser.id);

  return (
    <div className="space-y-8 pb-10">
      {/* Top Badge & Header */}
      <div className="flex justify-between items-start">
        <div className="space-y-3">
          <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-[0.2em] border border-emerald-100">
            {viewMode === 'seller' ? 'Seller Portal' : 'Marketplace'}
          </span>
          <div className="space-y-1">
            <h2 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              {viewMode === 'seller' ? (
                <><span>🚜</span> My Listings & Received Orders</>
              ) : (
                <><span>🛒</span> Browse & Buy Crops</>
              )}
            </h2>
            <p className="text-slate-500 text-sm font-medium">
              {viewMode === 'seller' 
                ? 'List crops for sale and view incoming purchases from buyers.' 
                : 'Browse fresh agricultural output from local farmers and order instantly.'}
            </p>
          </div>
        </div>

        {viewMode === 'seller' ? (
          <button 
            onClick={() => setShowAddListingModal(true)}
            className="bg-emerald-600 text-white px-6 py-3.5 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-700/20 active:scale-95 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add a Crop
          </button>
        ) : null}
      </div>

      {/* ─── SELLER VIEW MODE ─── */}
      {viewMode === 'seller' && (
        <div className="space-y-12">
          {/* Listings Table */}
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/30 p-8 space-y-6">
            <div className="flex justify-between items-center border-b border-slate-50 pb-4">
              <div>
                <h3 className="text-lg font-black text-slate-950 uppercase tracking-tighter">Your Crops Catalog</h3>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-0.5">Crops you currently offer on the marketplace</p>
              </div>
              <span className="bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border border-emerald-100">
                {listings.length} crops active
              </span>
            </div>

            {loading ? (
              <div className="py-20 flex justify-center items-center">
                <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
              </div>
            ) : listings.length === 0 ? (
              <div className="py-20 text-center space-y-4">
                <div className="text-5xl opacity-30">🌾</div>
                <div>
                  <p className="text-base font-black text-slate-900 uppercase">Catalog is empty</p>
                  <p className="text-xs text-slate-400 font-medium mt-1">Start adding crops to make your produce visible to buyers.</p>
                </div>
                <button
                  onClick={() => setShowAddListingModal(true)}
                  className="bg-emerald-600 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all"
                >
                  List your first crop
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-3">
                      <th className="pb-3 pl-2">Crop Name</th>
                      <th className="pb-3">Category</th>
                      <th className="pb-3">Stock (KG)</th>
                      <th className="pb-3">Price / KG</th>
                      <th className="pb-3">Promotion</th>
                      <th className="pb-3">Created Date</th>
                      <th className="pb-3 text-right pr-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-sm font-semibold text-slate-700">
                    {listings.map((l) => (
                      <tr key={l.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 pl-2 font-black text-slate-950 flex items-center gap-3">
                          <span className="text-2xl">{getCropEmoji(l.crop)}</span>
                          <span className="uppercase tracking-tight">{l.crop}</span>
                        </td>
                        <td className="py-4">
                          <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider">
                            {l.category || 'Grains'}
                          </span>
                        </td>
                        <td className="py-4 font-black">
                          {l.quantity_kg.toLocaleString()} KG
                        </td>
                        <td className="py-4 font-black text-emerald-600 uppercase">
                          {l.currency} {l.price_per_kg.toLocaleString()}
                        </td>
                        <td className="py-4">
                          {l.is_promoted === 1 ? (
                            <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border border-amber-200">Featured</span>
                          ) : (
                            <span className="text-slate-400 text-[10px] uppercase font-bold">Standard</span>
                          )}
                        </td>
                        <td className="py-4 text-xs text-slate-500 font-bold">
                          {format(new Date(l.created_at), 'MMM d, yyyy')}
                        </td>
                        <td className="py-4 text-right pr-2">
                          <button
                            onClick={() => deleteListing(l.id)}
                            className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors"
                            title="Cancel Listing"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Orders Received Table */}
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/30 p-8 space-y-6">
            <div>
              <h3 className="text-lg font-black text-slate-950 uppercase tracking-tighter">Orders Received from Buyers</h3>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-0.5">Purchases initiated and paid by buyers for your crops</p>
            </div>

            {loadingTrades ? (
              <div className="py-20 flex justify-center items-center">
                <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
              </div>
            ) : sellerTrades.length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <div className="text-4xl opacity-30">📥</div>
                <p className="text-[10px] font-black uppercase tracking-widest">No Incoming Orders Yet</p>
                <p className="text-xs text-slate-400 font-medium">When buyers purchase your crops directly, they will show up here.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-3">
                      <th className="pb-3 pl-2">Ordered Crop</th>
                      <th className="pb-3">Buyer Details</th>
                      <th className="pb-3">Quantity</th>
                      <th className="pb-3">Total Paid</th>
                      <th className="pb-3">Payment Phone</th>
                      <th className="pb-3 text-center">Shipping Status</th>
                      <th className="pb-3">Order Date</th>
                      <th className="pb-3 text-right pr-2">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-sm font-semibold text-slate-700">
                    {sellerTrades.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 pl-2 font-black text-slate-950">
                          <div className="flex items-center gap-2">
                            <span>{getCropEmoji(t.crop)}</span>
                            <span className="uppercase tracking-tight">{t.crop}</span>
                          </div>
                        </td>
                        <td className="py-4">
                          <div className="leading-tight">
                            <p className="font-bold text-slate-900">{t.buyer_name}</p>
                            <p className="text-[10px] text-slate-400 font-bold mt-0.5">{t.buyer_phone || 'No phone'}</p>
                          </div>
                        </td>
                        <td className="py-4 font-black">
                          {t.quantity_kg.toLocaleString()} KG
                        </td>
                        <td className="py-4 font-black text-emerald-600 uppercase">
                          {t.currency} {t.total_value.toLocaleString()}
                        </td>
                        <td className="py-4 text-xs font-bold text-slate-600">
                          {t.payment_phone || 'Direct'}
                        </td>
                        <td className="py-4 text-center">
                          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full border text-[9px] font-black uppercase tracking-widest ${getStatusStyle(t.status)}`}>
                            {getStatusIcon(t.status)}
                            {t.status}
                          </span>
                        </td>
                        <td className="py-4 text-xs text-slate-500 font-bold">
                          {format(new Date(t.created_at), 'MMM d, yyyy')}
                        </td>
                        <td className="py-4 text-right pr-2">
                          {t.status === 'pending' ? (
                            <button
                              onClick={() => handleUpdateStatus(t.id, 'in-transit')}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-colors shadow-sm"
                            >
                              Ship Order
                            </button>
                          ) : (
                            <span className="text-slate-400 text-[9px] uppercase font-black tracking-widest">
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
          <div className="bg-white p-2 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/50 flex flex-wrap lg:flex-nowrap items-center gap-2">
            <div className="flex-1 min-w-[300px] relative group">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-emerald-500 transition-colors" />
              <input 
                type="text" 
                placeholder="Search products, crops, farmers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50/50 border-none rounded-[1.5rem] pl-16 pr-6 py-4 text-sm font-bold focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all placeholder:text-slate-400"
              />
            </div>
            
            <div className="flex items-center gap-2 px-2">
              <button className="flex items-center gap-2 px-5 py-3 rounded-xl hover:bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-600 transition-all">
                <MapPin className="w-4 h-4 text-emerald-500" />
                Location
                <ChevronDown className="w-3 h-3 ml-1" />
              </button>
              <div className="w-[1px] h-6 bg-slate-100" />
              <button className="flex items-center gap-2 px-5 py-3 rounded-xl hover:bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-600 transition-all">
                <Tag className="w-4 h-4 text-blue-500" />
                Category
                <ChevronDown className="w-3 h-3 ml-1" />
              </button>
              <div className="w-[1px] h-6 bg-slate-100" />
              <button className="flex items-center gap-2 px-5 py-3 rounded-xl hover:bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-600 transition-all">
                <Filter className="w-4 h-4 text-orange-500" />
                Price
                <ChevronDown className="w-3 h-3 ml-1" />
              </button>
            </div>

            <button className="bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] hover:bg-emerald-700 transition-all active:scale-95">
              Search
            </button>
          </div>

          {/* Category Chips */}
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.name}
                onClick={() => setActiveCategory(cat.name)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-[11px] font-black uppercase tracking-widest transition-all border ${
                  activeCategory === cat.name 
                    ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-600/20' 
                    : 'bg-white border-slate-100 text-slate-500 hover:border-emerald-200 hover:text-emerald-600'
                }`}
              >
                <span className="text-sm leading-none">{cat.icon}</span>
                {cat.name}
              </button>
            ))}
          </div>

          {/* Grid of Browse Listings */}
          <div className="space-y-6">
            <div className="flex justify-between items-center px-2">
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter">Available Crops for Purchase</h3>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                Showing {buyerListings.length} of {totalCount} listings
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-[2.5rem] border border-slate-100 h-[450px] animate-pulse overflow-hidden">
                    <div className="h-48 bg-slate-50" />
                    <div className="p-8 space-y-4">
                      <div className="h-6 bg-slate-50 w-3/4 rounded-full" />
                      <div className="h-4 bg-slate-50 w-1/2 rounded-full" />
                      <div className="h-20 bg-slate-50 rounded-2xl" />
                    </div>
                  </div>
                ))
              ) : buyerListings.length === 0 ? (
                <div className="col-span-full py-20 text-center space-y-4 bg-white rounded-[3rem] border-2 border-dashed border-slate-100">
                  <div className="text-6xl grayscale opacity-20">🚜</div>
                  <div className="space-y-1">
                    <p className="text-lg font-black text-slate-900 uppercase tracking-tight">No crops available</p>
                    <p className="text-slate-400 text-sm font-medium">There are currently no active crop offers listed by other sellers.</p>
                  </div>
                </div>
              ) : (
                buyerListings.map((listing) => (
                  <motion.div
                    key={listing.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 overflow-hidden group flex flex-col h-full"
                  >
                    {/* Card Top / Image Area */}
                    <div className="h-48 bg-emerald-50/50 flex items-center justify-center relative">
                      <div className="text-7xl group-hover:scale-110 transition-transform duration-500">
                        {getCropEmoji(listing.crop)}
                      </div>
                      {listing.is_promoted === 1 && (
                        <div className="absolute top-6 left-6">
                          <span className="bg-amber-100 text-amber-700 text-[8px] font-black px-2 py-1 rounded-lg uppercase tracking-widest border border-amber-200">Featured</span>
                        </div>
                      )}
                    </div>

                    {/* Card Content */}
                    <div className="p-8 flex-1 flex flex-col space-y-4">
                      <div className="flex justify-between items-start gap-4">
                        <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter leading-tight group-hover:text-emerald-700 transition-colors">
                          {listing.crop}
                        </h3>
                        {listing.quantity_kg > 100 ? (
                          <span className="px-2.5 py-1 bg-green-50 text-green-700 text-[9px] font-black rounded-lg uppercase tracking-widest border border-green-100 flex-shrink-0">
                            In Stock
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 bg-orange-50 text-orange-700 text-[9px] font-black rounded-lg uppercase tracking-widest border border-orange-100 flex-shrink-0">
                            Low Stock
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        <MapPin className="w-3.5 h-3.5 text-orange-400" />
                        {listing.seller_district || 'Unknown Location'}
                      </div>

                      <p className="text-sm text-slate-500 font-medium line-clamp-2 leading-relaxed">
                        {listing.description || `Freshly harvested ${listing.crop} available in bulk. Direct from farm to market.`}
                      </p>

                      <div className="pt-4 flex items-end justify-between border-t border-slate-50">
                        <div className="space-y-1">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Unit Price</p>
                          <p className="text-xl font-black text-emerald-600 tracking-tight">
                            {listing.currency} {listing.price_per_kg.toLocaleString()}
                            <span className="text-xs text-slate-400 font-bold"> /kg</span>
                          </p>
                        </div>
                        <div className="text-right space-y-1">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Availability</p>
                          <p className="text-sm font-black text-slate-900">{listing.quantity_kg.toLocaleString()} KG</p>
                        </div>
                      </div>

                      <div className="pt-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 font-black text-[10px]">
                            {listing.seller_name[0]}
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-slate-900 leading-none">{listing.seller_name}</p>
                            <div className="flex items-center gap-1 mt-0.5">
                              <span className="text-orange-400 text-[10px]">★</span>
                              <span className="text-[9px] font-bold text-slate-400">4.8</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Footer Buttons */}
                      <div className="pt-6 flex gap-2">
                        <button 
                          onClick={() => handleOrderClick(listing)}
                          className="flex-1 bg-emerald-700 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-emerald-800 transition-all active:scale-[0.98]"
                        >
                          Order Now
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>

          {/* Orders Made / Purchase History Table */}
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/30 p-8 space-y-6">
            <div>
              <h3 className="text-lg font-black text-slate-950 uppercase tracking-tighter">Your Purchase History</h3>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-0.5">Orders you have placed and paid over time</p>
            </div>

            {loadingTrades ? (
              <div className="py-20 flex justify-center items-center">
                <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
              </div>
            ) : buyerTrades.length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <div className="text-4xl opacity-30">🛍️</div>
                <p className="text-[10px] font-black uppercase tracking-widest">No Purchases Made Yet</p>
                <p className="text-xs text-slate-400 font-medium">Use the "Order Now" button on crop listings to place orders.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-3">
                      <th className="pb-3 pl-2">Ordered Crop</th>
                      <th className="pb-3">Seller Details</th>
                      <th className="pb-3">Quantity</th>
                      <th className="pb-3">Total Paid</th>
                      <th className="pb-3">Paid Via Phone</th>
                      <th className="pb-3 text-center">Shipping Status</th>
                      <th className="pb-3">Order Date</th>
                      <th className="pb-3 text-right pr-2">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-sm font-semibold text-slate-700">
                    {buyerTrades.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 pl-2 font-black text-slate-950">
                          <div className="flex items-center gap-2">
                            <span>{getCropEmoji(t.crop)}</span>
                            <span className="uppercase tracking-tight">{t.crop}</span>
                          </div>
                        </td>
                        <td className="py-4">
                          <div className="leading-tight">
                            <p className="font-bold text-slate-900">{t.seller_name}</p>
                            <p className="text-[10px] text-slate-400 font-bold mt-0.5">{t.seller_phone || 'No phone'}</p>
                          </div>
                        </td>
                        <td className="py-4 font-black">
                          {t.quantity_kg.toLocaleString()} KG
                        </td>
                        <td className="py-4 font-black text-emerald-600 uppercase">
                          {t.currency} {t.total_value.toLocaleString()}
                        </td>
                        <td className="py-4 text-xs font-bold text-slate-600">
                          {t.payment_phone || 'N/A'}
                        </td>
                        <td className="py-4 text-center">
                          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full border text-[9px] font-black uppercase tracking-widest ${getStatusStyle(t.status)}`}>
                            {getStatusIcon(t.status)}
                            {t.status}
                          </span>
                        </td>
                        <td className="py-4 text-xs text-slate-500 font-bold">
                          {format(new Date(t.created_at), 'MMM d, yyyy')}
                        </td>
                        <td className="py-4 text-right pr-2">
                          {t.status === 'in-transit' ? (
                            <button
                              onClick={() => handleUpdateStatus(t.id, 'completed')}
                              className="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-colors shadow-sm"
                            >
                              Confirm Delivery
                            </button>
                          ) : (
                            <span className="text-slate-400 text-[9px] uppercase font-black tracking-widest">
                              {t.status === 'pending' ? 'Awaiting Shipment' : 'Completed'}
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
          <button className="w-10 h-10 flex items-center justify-center rounded-xl border border-slate-100 hover:bg-white hover:shadow-md transition-all text-slate-400">
            <ChevronLeft className="w-5 h-5" />
          </button>
          {[1, 2, 3].map(p => (
            <button 
              key={p}
              onClick={() => setPage(p)}
              className={`w-10 h-10 flex items-center justify-center rounded-xl font-black text-[11px] transition-all ${
                page === p ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'bg-white border border-slate-100 text-slate-400 hover:border-emerald-200'
              }`}
            >
              {p}
            </button>
          ))}
          <button className="w-10 h-10 flex items-center justify-center rounded-xl border border-slate-100 hover:bg-white hover:shadow-md transition-all text-slate-400">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Modals & Popups */}
      <AnimatePresence>
        {showAuthModal && (
          <AuthModal 
            onClose={() => setShowAuthModal(false)}
            onSuccess={(user) => {
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
                <span className="bg-white/20 text-white text-[8px] font-black px-2 py-1 rounded-md uppercase tracking-widest">Secure Checkout</span>
                <h3 className="text-2xl font-black uppercase tracking-tighter mt-2">Mobile Money Payment</h3>
                <p className="text-emerald-100 text-[10px] font-bold uppercase tracking-widest mt-1">Simulated Carrier Billing Engine</p>
              </div>

              <div className="p-8 space-y-6">
                {/* Flow Step 1: Form Input */}
                {paymentStep === 'form' && (
                  <div className="space-y-4">
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-1.5">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Product Summary</p>
                      <div className="flex justify-between items-center text-sm">
                        <span className="font-black text-slate-800 uppercase tracking-tight">{checkoutListing.crop} ({checkoutListing.category})</span>
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
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Quantity to Buy (KG)</label>
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
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Your Mobile Money Number</label>
                        <div className="relative">
                          <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
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
                        <p className="text-[9px] text-slate-400 mt-1 uppercase font-black tracking-wider pl-1">Supports MTN and Airtel billing systems</p>
                      </div>
                    </div>

                    {paymentError && (
                      <div className="p-3.5 bg-red-50 text-red-600 text-[10px] font-black uppercase tracking-wider rounded-xl flex gap-2 items-center">
                        <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                        <span>{paymentError}</span>
                      </div>
                    )}

                    <div className="pt-2 border-t border-slate-100 flex justify-between items-center mb-2">
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Payable</p>
                        <p className="text-xl font-black text-emerald-600 uppercase tracking-tight">
                          {checkoutListing.currency} {((parseFloat(checkoutQty) || 0) * checkoutListing.price_per_kg).toLocaleString()}
                        </p>
                      </div>
                      <button 
                        onClick={processPayment}
                        className="bg-emerald-600 text-white px-6 py-4 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-emerald-700 transition-all shadow-md shadow-emerald-600/10 active:scale-95"
                      >
                        Pay & Place Order
                      </button>
                    </div>

                    <button 
                      onClick={() => setCheckoutListing(null)}
                      className="w-full text-center text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors pt-2"
                    >
                      Cancel Purchase
                    </button>
                  </div>
                )}

                {/* Flow Step 2: Initiating */}
                {paymentStep === 'initiating' && (
                  <div className="py-8 text-center space-y-4">
                    <RefreshCw className="w-10 h-10 text-emerald-600 animate-spin mx-auto" />
                    <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-600">Step 1 of 4</p>
                      <h4 className="text-base font-black text-slate-900 uppercase">Initiating Payment Gateway</h4>
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
                    <div className="space-y-2">
                      <p className="text-[10px] font-black uppercase tracking-[0.25em] text-amber-600">Step 2 of 4</p>
                      <h4 className="text-lg font-black text-slate-900 uppercase">Authorize Transaction</h4>
                      <p className="text-xs text-slate-500 font-bold leading-relaxed px-6">
                        A prompt has been sent to your phone <span className="text-slate-900 font-black">{checkoutPhone}</span>.
                      </p>
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 inline-block text-slate-600 mt-2">
                        <p className="text-xs font-medium">Please enter your <strong className="text-slate-900">Mobile Money PIN</strong> on your mobile device to authorize transfer of:</p>
                        <p className="text-base font-black text-slate-950 uppercase mt-1">
                          {checkoutListing.currency} {((parseFloat(checkoutQty) || 0) * checkoutListing.price_per_kg).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Flow Step 4: Verifying */}
                {paymentStep === 'verifying' && (
                  <div className="py-8 text-center space-y-4">
                    <RefreshCw className="w-10 h-10 text-emerald-600 animate-spin mx-auto" />
                    <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-[0.25em] text-blue-600">Step 3 of 4</p>
                      <h4 className="text-base font-black text-slate-900 uppercase">Verifying Clearance</h4>
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
                      <p className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-600">Step 4 of 4: Completed</p>
                      <h4 className="text-lg font-black text-slate-900 uppercase">Payment Clearance Successful</h4>
                      <p className="text-xs text-slate-500 font-bold px-4">
                        Fund transfer complete. The payment of <span className="font-black text-emerald-600">{checkoutListing.currency} {((parseFloat(checkoutQty) || 0) * checkoutListing.price_per_kg).toLocaleString()}</span> has been credited immediately to <span className="font-black text-slate-800">{checkoutListing.seller_name}</span>.
                      </p>
                    </div>
                    <div className="pt-4 border-t border-slate-100">
                      <button 
                        onClick={() => setCheckoutListing(null)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all"
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
                      <h4 className="text-lg font-black text-slate-900 uppercase">Payment Processing Failed</h4>
                      <p className="text-xs text-red-500 font-bold px-6">{paymentError}</p>
                    </div>
                    <div className="pt-4 border-t border-slate-100 flex gap-2 justify-center">
                      <button 
                        onClick={() => setPaymentStep('form')}
                        className="bg-slate-950 text-white px-6 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-800 transition-all"
                      >
                        Try Again
                      </button>
                      <button 
                        onClick={() => setCheckoutListing(null)}
                        className="bg-white border border-slate-200 text-slate-500 px-6 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-50 transition-all"
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
