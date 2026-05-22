'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  MapPin, 
  Tag, 
  ArrowRight, 
  MessageCircle, 
  Plus, 
  ChevronLeft, 
  ChevronRight,
  ChevronDown,
  Filter
} from 'lucide-react';
import { AddBuyOrderModal, AuthModal } from './Marketplace';
import { useAuth } from './AuthProvider';

interface Listing {
  id: string;
  crop: string;
  quantity_kg: number;
  price_per_kg: number;
  currency: string;
  description: string;
  category: string;
  seller_name: string;
  seller_district: string;
  is_promoted: number;
  created_at: string;
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

export default function MarketplaceBrowse({ onPostListing }: { onPostListing?: () => void }) {
  const { user: appUser } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [mpUser, setMpUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [page, setPage] = useState(1);
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [pendingListing, setPendingListing] = useState<Listing | null>(null);

  const fetchSession = useCallback(async () => {
    try {
      const res = await fetch('/api/marketplace/auth/session');
      const data = await res.json();
      setMpUser(data.user);
    } catch (e) {}
  }, []);

  const fetchListings = useCallback(async () => {
    try {
      await fetchSession();
      const params = new URLSearchParams();
      if (searchQuery) params.append('crop', searchQuery);
      if (activeCategory !== 'All') params.append('category', activeCategory);
      
      const res = await fetch(`/api/marketplace/listings?${params.toString()}`);
      const data = await res.json();
      setListings(data.listings || []);
      setTotalCount(data.totalCount || 0);
    } catch (err) {
      console.error('Failed to fetch listings', err);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, activeCategory]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

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

  const handleOrderClick = (listing?: Listing) => {
    if (!mpUser || mpUser.role !== 'buyer') {
      setShowAuthModal(true);
      setPendingListing(listing || null);
      return;
    }
    setSelectedListing(listing || null);
    setShowBuyModal(true);
  };

  return (
    <div className="space-y-8 pb-10">
      {/* Top Badge & Header */}
      <div className="flex justify-between items-start">
        <div className="space-y-3">
          <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-[0.2em] border border-emerald-100">
            Marketplace
          </span>
          <div className="space-y-1">
            <h2 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              <span className="text-3xl">🛒</span> Listings
            </h2>
            <p className="text-slate-500 text-sm font-medium">Browse and buy fresh agricultural products directly from farmers</p>
          </div>
        </div>
        <button 
          onClick={() => handleOrderClick()}
          className="bg-[#2d6a4f] text-white px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-[#1b4332] transition-all shadow-lg shadow-emerald-700/20 active:scale-95 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Order Now
        </button>
      </div>

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

      {/* Stats & Sort */}
      <div className="flex justify-between items-center px-2">
        <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
          Showing {listings.length} of {totalCount} listings
        </p>
        <button className="flex items-center gap-2 text-[11px] font-black text-slate-600 uppercase tracking-widest hover:text-emerald-600">
          Sort by: <span className="text-slate-900">Latest</span>
          <ChevronDown className="w-3 h-3" />
        </button>
      </div>

      {/* Grid */}
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
        ) : listings.length === 0 ? (
          <div className="col-span-full py-20 text-center space-y-4 bg-white rounded-[3rem] border-2 border-dashed border-slate-100">
            <div className="text-6xl grayscale opacity-20">🚜</div>
            <div className="space-y-1">
              <p className="text-lg font-black text-slate-900 uppercase tracking-tight">No match found</p>
              <p className="text-slate-400 text-sm font-medium">Try adjusting your filters or search terms</p>
            </div>
          </div>
        ) : (
          listings.map((listing) => (
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
                  <button className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all border border-transparent hover:border-emerald-100">
                    <MessageCircle className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Pagination */}
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

      <AnimatePresence>
        {showAuthModal && (
          <AuthModal 
            onClose={() => setShowAuthModal(false)}
            onSuccess={(user) => {
              setMpUser(user);
              setShowAuthModal(false);
              // Small delay to ensure state update is processed before showing next modal
              setTimeout(() => {
                setSelectedListing(pendingListing);
                setShowBuyModal(true);
              }, 100);
            }}
            defaultRole="buyer"
          />
        )}

        {showBuyModal && (
          <AddBuyOrderModal
            onClose={() => setShowBuyModal(false)}
            prefillCrop={selectedListing?.crop}
            prefillCurrency={selectedListing?.currency}
            initialUser={mpUser}
            onSuccess={() => {
              setShowBuyModal(false);
              fetchListings();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
