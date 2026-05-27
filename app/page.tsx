'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import ChatInterface from '@/components/ChatInterface';
import WeatherWidget from '@/components/WeatherWidget';
import MarketPrices from '@/components/MarketPrices';
import Marketplace, { InlineAuth } from '@/components/Marketplace';
import AuthModal from '@/components/AuthModal';
import IoTDashboard from '@/components/IoTDashboard';
import CropRecommendation from '@/components/CropRecommendation';
import SmartCropCalendar from '@/components/SmartCropCalendar';
import ResourceLibrary from '@/components/ResourceLibrary';
import NotificationBell from '@/components/NotificationBell';
import AboutPage from '@/components/AboutPage';
import OrdersDashboard from '@/components/OrdersDashboard';
import MarketplaceBrowse from '@/components/MarketplaceBrowse';
import { useAuth } from '@/components/AuthProvider';
import { motion, AnimatePresence } from 'motion/react';

interface LocationState {
  lat: number;
  lon: number;
  name: string;
}

export default function Page() {
  const { user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [marketplaceUser, setMarketplaceUser] = useState<any>(null);
  const [checkingMarketplace, setCheckingMarketplace] = useState(true);
  const [showMpAuth, setShowMpAuth] = useState(false);
  const [mpAuthRole, setMpAuthRole] = useState<'buyer' | 'seller'>('buyer');
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup'>('login');
  const [activeView, setActiveView] = useState<string>('about');
  const [location, setLocation] = useState<LocationState | null>(null);

  // Sub-menu states
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({
    advisory: true,
    crops: true
  });

  useEffect(() => {
    const fetchMarketplaceSession = async () => {
      try {
        const res = await fetch('/api/marketplace/auth/session');
        const data = await res.json();
        setMarketplaceUser(data.user || null);
      } catch (e) {} finally {
        setCheckingMarketplace(false);
      }
    };
    fetchMarketplaceSession();
  }, [user]);

  // Access control: Redirect to 'about' if on a restricted view while not logged in
  useEffect(() => {
    const restrictedViews = ['recommendation', 'calendar', 'iot'];
    if (!user && restrictedViews.includes(activeView)) {
      setActiveView('about');
    }
  }, [user, activeView]);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          let locationName = 'detected location';

          try {
            const geoRes = await fetch(`/api/geocode?lat=${latitude}&lon=${longitude}`);
            if (geoRes.ok) {
              const geoData = await geoRes.json();
              locationName = geoData.address?.city || geoData.address?.country || 'current area';
            }
          } catch (e) {
            console.error("Geocoding failed", e);
          }

          setLocation({ lat: latitude, lon: longitude, name: locationName });
        },
        (error) => {
          console.warn("Geolocation access denied. App will work with restricted context.", error);
        }
      );
    }
  }, []);

  const switchView = (viewId: string) => {
    if (viewId === 'orders' && (!marketplaceUser || marketplaceUser.role !== 'buyer')) {
      setMpAuthRole('buyer');
      setShowMpAuth(true);
      return;
    }
    if ((viewId === 'listings' || viewId === 'advertising') && (!marketplaceUser || marketplaceUser.role !== 'seller')) {
      setMpAuthRole('seller');
      setShowMpAuth(true);
      return;
    }
    setActiveView(viewId);
    setIsMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleMenu = (menuId: string) => {
    setExpandedMenus(prev => ({ ...prev, [menuId]: !prev[menuId] }));
  };

  const openAuthModal = (mode: 'login' | 'signup') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
    setIsMobileMenuOpen(false);
  };

  return (
    <main className="min-h-screen bg-white text-slate-900 font-sans lg:pl-72">
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialMode={authModalMode}
      />

      {/* Desktop Sidebar */}
      <nav className="fixed left-0 top-0 bottom-0 w-72 bg-[#0B1223] p-8 hidden lg:flex flex-col z-50 overflow-y-auto custom-scrollbar shadow-2xl">
        <div
          className="flex flex-col mb-12 cursor-pointer"
          onClick={() => switchView('about')}
        >
          <span className="text-[1.3rem] font-bold text-white leading-[1.2] tracking-tight">Agriculture</span>
          <span className="text-[1.3rem] font-bold text-emerald-400 leading-[1.2] tracking-tight">Management System</span>
        </div>

        <div className="flex-1 space-y-4">
          <button
            onClick={() => switchView('about')}
            className={`w-full text-left px-6 py-4 rounded-2xl text-[14px] font-black transition-all duration-300 flex items-center gap-3 ${activeView === 'about'
              ? 'bg-emerald-500 text-white shadow-xl shadow-emerald-500/30'
              : 'text-slate-400 bg-white/5 hover:bg-white/10 hover:text-white'
              }`}
          >
            About
          </button>

          {/* Advisory Menu */}
          <div className="space-y-1">
            <button
              onClick={() => toggleMenu('advisory')}
              className="w-full text-left px-6 py-2 text-[11px] font-black capitalize tracking-widest text-slate-500 flex items-center justify-between hover:text-slate-300"
            >
              Advisory
              <span>{expandedMenus.advisory ? '−' : '+'}</span>
            </button>
            {expandedMenus.advisory && (
              <div className="space-y-1 pl-4">
                <button
                  onClick={() => switchView('chatbot')}
                  className={`w-full text-left px-4 py-3 rounded-xl text-[13px] font-bold transition-all ${activeView === 'chatbot' ? 'text-emerald-400 bg-emerald-400/10' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                >
                  Chatbot
                </button>
                {user && (
                  <>
                    <button
                      onClick={() => switchView('recommendation')}
                      className={`w-full text-left px-4 py-3 rounded-xl text-[13px] font-bold transition-all ${activeView === 'recommendation' ? 'text-emerald-400 bg-emerald-400/10' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                    >
                      Crop Recommendation
                    </button>
                    <button
                      onClick={() => switchView('calendar')}
                      className={`w-full text-left px-4 py-3 rounded-xl text-[13px] font-bold transition-all ${activeView === 'calendar' ? 'text-emerald-400 bg-emerald-400/10' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                    >
                      Smart Crop Calendar
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Crops Menu */}
          {user && (
            <div className="space-y-1">
              <button
                onClick={() => toggleMenu('crops')}
                className="w-full text-left px-6 py-2 text-[11px] font-black capitalize tracking-widest text-slate-500 flex items-center justify-between hover:text-slate-300"
              >
                Crops
                <span>{expandedMenus.crops ? '−' : '+'}</span>
              </button>
              {expandedMenus.crops && (
                <div className="space-y-1 pl-4">
                  <div className="px-4 py-2 text-[10px] font-black text-slate-600 capitalize tracking-widest">Marketplace</div>
                  <button
                    onClick={() => switchView('orders')}
                    className={`w-full text-left px-4 py-2.5 rounded-xl text-[13px] font-bold transition-all ${activeView === 'orders' ? 'text-blue-400 bg-blue-400/10' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                  >
                    Orders
                  </button>
                  <button
                    onClick={() => switchView('listings')}
                    className={`w-full text-left px-4 py-2.5 rounded-xl text-[13px] font-bold transition-all ${activeView === 'listings' ? 'text-emerald-400 bg-emerald-400/10' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                  >
                    Listings
                  </button>
                  <button
                    onClick={() => switchView('advertising')}
                    className={`w-full text-left px-4 py-2.5 rounded-xl text-[13px] font-bold transition-all ${activeView === 'advertising' ? 'text-amber-400 bg-amber-400/10' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                  >
                    Advertising
                  </button>
                </div>
              )}
            </div>
          )}

          <button
            onClick={() => switchView('weather')}
            className={`w-full text-left px-6 py-4 rounded-2xl text-[14px] font-black transition-all duration-300 flex items-center gap-3 ${activeView === 'weather'
              ? 'bg-emerald-500 text-white shadow-xl shadow-emerald-500/30'
              : 'text-slate-400 bg-white/5 hover:bg-white/10 hover:text-white'
              }`}
          >
            Weather
          </button>


          {user && (
            <button
              onClick={() => switchView('iot')}
              className={`w-full text-left px-6 py-4 rounded-2xl text-[14px] font-black transition-all duration-300 flex items-center gap-3 ${activeView === 'iot'
                ? 'bg-emerald-500 text-white shadow-xl shadow-emerald-500/30'
                : 'text-slate-400 bg-white/5 hover:bg-white/10 hover:text-white'
                }`}
            >
              Field Metrics
            </button>
          )}
        </div>

        {!user && (
          <div className="mt-auto pt-8 space-y-3">
            <button
              onClick={() => openAuthModal('login')}
              className="px-4 py-3 rounded-xl text-[10px] font-black capitalize tracking-widest text-slate-300 bg-white/5 w-full hover:bg-white/10"
            >
              Sign In
            </button>
            <button
              onClick={() => openAuthModal('signup')}
              className="px-4 py-3 rounded-xl text-[10px] font-black capitalize tracking-widest text-white bg-emerald-600 w-full hover:bg-emerald-500"
            >
              Register
            </button>
          </div>
        )}
      </nav>

      {/* Desktop Top Header */}
      <div className="hidden lg:flex fixed top-0 right-0 left-72 h-24 items-center justify-between px-12 z-40 bg-white/80 backdrop-blur-md border-b border-slate-100 shadow-sm">
        <h1 className="flex flex-col leading-none">
          <span className="text-3xl font-black text-emerald-950 tracking-tighter">
            Smart Farming <span className="text-emerald-600">Intelligence</span>
          </span>
        </h1>
        {user && (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-4 py-1.5 px-4 rounded-full bg-white/50 backdrop-blur-sm shadow-sm">
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-black text-xs shadow-sm shrink-0">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex flex-col pr-2">
                <p className="text-sm font-black text-emerald-950 leading-none tracking-tight">{user.name}</p>
                <p className="text-[10px] font-bold text-slate-950 mt-1 lowercase">{user.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => logout()}
                className="px-6 py-2.5 bg-pink-500 shadow-xl shadow-pink-500/20 text-white rounded-full text-[10px] font-black capitalize tracking-[0.3em] hover:bg-pink-600 transition-all flex items-center gap-2"
              >
                Sign Out
              </button>
              <div className="bg-white shadow-sm hover:shadow-md transition-shadow p-1.5 rounded-full">
                <NotificationBell />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Header */}
      <header className="lg:hidden sticky top-0 z-50 bg-white/80 backdrop-blur-md px-6 py-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex flex-col" onClick={() => switchView('about')}>
            <span className="text-sm font-black tracking-tight text-emerald-900 leading-[1.1]">Agriculture</span>
            <span className="text-sm font-black tracking-tight text-emerald-900 leading-[1.1]">Management System</span>
          </div>

          <div className="flex items-center gap-3">
            {user && <NotificationBell />}
            <button
              className="px-3 py-1.5 text-[10px] font-black text-slate-600 bg-slate-50 rounded-xl capitalize tracking-widest"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? 'Close' : 'Menu'}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 overflow-hidden"
            >
              <div className="flex flex-col gap-2 py-4">
                <button onClick={() => switchView('about')} className={`w-full text-left px-5 py-3 rounded-xl text-sm font-black ${activeView === 'about' ? 'bg-emerald-600 text-white' : 'bg-slate-50'}`}>About</button>
                <div className="px-5 py-2 text-[10px] font-black text-slate-400 capitalize tracking-widest">Advisory</div>
                <button onClick={() => switchView('chatbot')} className={`w-full text-left px-8 py-2.5 rounded-xl text-sm font-bold ${activeView === 'chatbot' ? 'text-emerald-600' : ''}`}>Chatbot</button>
                {user && (
                  <>
                    <button onClick={() => switchView('recommendation')} className={`w-full text-left px-8 py-2.5 rounded-xl text-sm font-bold ${activeView === 'recommendation' ? 'text-emerald-600' : ''}`}>Recommendation</button>
                    <button onClick={() => switchView('calendar')} className={`w-full text-left px-8 py-2.5 rounded-xl text-sm font-bold ${activeView === 'calendar' ? 'text-emerald-600' : ''}`}>Calendar</button>

                    <div className="px-5 py-2 text-[10px] font-black text-slate-400 capitalize tracking-widest">Crops</div>
                    <button onClick={() => switchView('orders')} className={`w-full text-left px-8 py-2.5 rounded-xl text-sm font-bold ${activeView === 'orders' ? 'text-emerald-600' : ''}`}>Orders</button>
                    <button onClick={() => switchView('listings')} className={`w-full text-left px-8 py-2.5 rounded-xl text-sm font-bold ${activeView === 'listings' ? 'text-emerald-600' : ''}`}>Listings</button>
                    <button onClick={() => switchView('advertising')} className={`w-full text-left px-8 py-2.5 rounded-xl text-sm font-bold ${activeView === 'advertising' ? 'text-emerald-600' : ''}`}>Advertising</button>
                  </>
                )}

                <button onClick={() => switchView('weather')} className={`w-full text-left px-5 py-3 rounded-xl text-sm font-black mt-2 ${activeView === 'weather' ? 'bg-emerald-600 text-white' : 'bg-slate-50'}`}>Weather</button>

                {user ? (
                  <button onClick={() => logout()} className="px-5 py-3 text-sm font-black text-red-600 capitalize tracking-widest mt-4">Sign Out</button>
                ) : (
                  <div className="grid grid-cols-2 gap-2 mt-4">
                    <button onClick={() => openAuthModal('login')} className="px-4 py-3 rounded-xl text-[10px] font-black capitalize tracking-widest bg-slate-50">Sign In</button>
                    <button onClick={() => openAuthModal('signup')} className="px-4 py-3 rounded-xl text-[10px] font-black capitalize tracking-widest text-white bg-emerald-600">Register</button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-12 lg:pt-36 lg:pb-16">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeView}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            {activeView === 'about' && <AboutPage onGetStarted={() => user ? switchView('chatbot') : openAuthModal('signup')} />}

            {activeView === 'chatbot' && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2">AI Farm Advisory</h2>
                  <p className="text-slate-500 text-lg">Real-time expert guidance for your agricultural journey.</p>
                </div>
                <ChatInterface location={location} />
              </div>
            )}

            {activeView === 'recommendation' && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Crop Strategy</h2>
                  <p className="text-slate-500 text-lg">AI-powered variety selection based on your soil profile.</p>
                </div>
                <CropRecommendation location={location} />
              </div>
            )}

            {activeView === 'calendar' && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Seasonal Matrix</h2>
                  <p className="text-slate-500 text-lg">Precision scheduling for your entire agricultural cycle.</p>
                </div>
                <SmartCropCalendar />
              </div>
            )}

             {activeView === 'orders' && (
               <div className="space-y-8">
                 {marketplaceUser && marketplaceUser.role === 'buyer' ? (
                    <MarketplaceBrowse viewMode="buyer" onPostListing={() => switchView('listings')} onLogout={() => setMarketplaceUser(null)} />
                 ) : checkingMarketplace ? (
                    <div className="py-20 text-center animate-pulse text-slate-400 font-black capitalize text-[10px] tracking-widest">Verifying Marketplace Access...</div>
                 ) : (
                    <div className="space-y-8 max-w-2xl mx-auto text-center">
                      <div className="space-y-2 mb-8">
                        <h2 className="text-3xl font-black text-slate-900 capitalize tracking-tighter">Marketplace Entry</h2>
                        <p className="text-slate-500 font-medium">Join our community of buyers to access fresh agricultural output.</p>
                      </div>
                      <InlineAuth onSuccess={(u) => setMarketplaceUser(u)} defaultRole="buyer" />
                    </div>
                 )}
               </div>
             )}

             {activeView === 'listings' && (
               <div className="space-y-8">
                 {marketplaceUser && marketplaceUser.role === 'seller' ? (
                    <MarketplaceBrowse viewMode="seller" onPostListing={() => switchView('listings')} onLogout={() => setMarketplaceUser(null)} />
                 ) : checkingMarketplace ? (
                    <div className="py-20 text-center animate-pulse text-slate-400 font-black capitalize text-[10px] tracking-widest">Verifying Marketplace Access...</div>
                 ) : (
                    <div className="space-y-8 max-w-2xl mx-auto text-center">
                       <div className="space-y-2 mb-8">
                         <h2 className="text-3xl font-black text-slate-900 capitalize tracking-tighter">Seller Entry</h2>
                         <p className="text-slate-500 font-medium">Log in as a seller to catalog and manage your crop offers.</p>
                       </div>
                       <InlineAuth onSuccess={(u) => setMarketplaceUser(u)} defaultRole="seller" />
                     </div>
                 )}
               </div>
             )}

             {activeView === 'advertising' && (
               <div className="space-y-8">
                 {marketplaceUser && marketplaceUser.role === 'seller' ? (
                    <Marketplace forcedTab="advertising" onLogout={() => setMarketplaceUser(null)} />
                 ) : checkingMarketplace ? (
                    <div className="py-20 text-center animate-pulse text-slate-400 font-black capitalize text-[10px] tracking-widest">Verifying Marketplace Access...</div>
                 ) : (
                    <div className="space-y-8 max-w-2xl mx-auto text-center">
                      <div className="space-y-2 mb-8">
                        <h2 className="text-3xl font-black text-slate-900 capitalize tracking-tighter">Advertising Hub</h2>
                        <p className="text-slate-500 font-medium">Sign in as a Seller to promote your products and track market performance.</p>
                      </div>
                      <InlineAuth onSuccess={(u) => setMarketplaceUser(u)} defaultRole="seller" />
                    </div>
                 )}
               </div>
             )}

            {activeView === 'dashboard' && (
              <div className="space-y-8">
                {user ? (
                   <OrdersDashboard />
                ) : (
                  <div className="bg-white rounded-[3rem] p-20 text-center border border-slate-100 shadow-xl space-y-8 max-w-2xl mx-auto">
                    <div className="w-24 h-24 bg-orange-50 rounded-[2rem] flex items-center justify-center mx-auto text-4xl">📊</div>
                    <div className="space-y-2">
                      <h2 className="text-3xl font-black text-slate-900 capitalize tracking-tighter">Dashboard Access</h2>
                      <p className="text-slate-500 font-medium">Sign in to track your trade history and marketplace statistics.</p>
                    </div>
                    <button onClick={() => openAuthModal('login')} className="bg-orange-600 text-white px-10 py-4 rounded-2xl font-black capitalize text-xs tracking-widest hover:bg-orange-700 transition-all">Sign In to View</button>
                  </div>
                )}
              </div>
            )}

            {activeView === 'weather' && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-3xl font-black text-slate-900 tracking-tighter mb-2 capitalize">Climate Dynamics</h2>
                  <p className="text-slate-500 text-xs capitalize tracking-widest font-bold">Hyper-local weather awareness for strategic planning</p>
                </div>
                <WeatherWidget />
              </div>
            )}


            {activeView === 'iot' && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-3xl font-black text-slate-900 tracking-tighter mb-2 flex items-center gap-3 capitalize">
                    Field Intelligence
                  </h2>
                  <p className="text-slate-500 text-xs capitalize tracking-widest font-bold">Live telemetry from your smart agricultural nodes</p>
                </div>
                <IoTDashboard location={location} />
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
       <AnimatePresence>
         {showMpAuth && (
           <MarketplaceAuthModal
             onClose={() => setShowMpAuth(false)}
             onSuccess={(u) => {
               setMarketplaceUser(u);
               setShowMpAuth(false);
               // After success, complete the navigation
               if (mpAuthRole === 'buyer') setActiveView('orders');
               else if (activeView === 'listings' || activeView === 'advertising') {} // already on the way or handled by parent
               else setActiveView('listings');
             }}
             defaultRole={mpAuthRole}
           />
         )}
       </AnimatePresence>
    </main>
  );
}

import { AuthModal as MarketplaceAuthModal } from '@/components/Marketplace';
