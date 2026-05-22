'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';

type Tab = 'overview' | 'marketplace' | 'chats' | 'users' | 'listings' | 'orders' | 'trades';

export default function AdminDashboard() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // All Data state
  const [adminData, setAdminData] = useState<{
    appUsers: any[],
    marketplaceUsers: any[],
    chats: any[],
    listings: any[],
    orders: any[],
    trades: any[]
  }>({ appUsers: [], marketplaceUsers: [], chats: [], listings: [], orders: [], trades: [] });
  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState('');

  // Edit State
  const [editingItem, setEditingItem] = useState<{ type: string, item: any } | null>(null);
  const [editLoading, setEditLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'agrobot-admin-2026') {
      setIsAuthenticated(true);
      setError('');
    } else {
      setError('Invalid admin password');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setPassword('');
    router.push('/');
  };

  const fetchAllData = async () => {
    setDataLoading(true);
    try {
      const res = await fetch(`/api/admin/data?secret=agrobot-admin-2026`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setAdminData(data);
      setError('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchAllData();
    }
  }, [isAuthenticated]);

  const handleDelete = async (type: string, id: string) => {
    if (!window.confirm(`Delete this ${type}? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/admin/data?secret=agrobot-admin-2026`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Delete failed');
      fetchAllData();
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
      console.error('Delete error:', err);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    setEditLoading(true);
    try {
      const res = await fetch(`/api/admin/data?secret=agrobot-admin-2026`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: editingItem.type,
          id: editingItem.item.id,
          data: editingItem.item
        }),
      });
      if (res.ok) {
        setEditingItem(null);
        fetchAllData();
      }
    } catch (err) {
      alert('Update failed');
    } finally {
      setEditLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute top-[-10%] left-[-5%] w-96 h-96 bg-cyan-500/20 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-5%] w-96 h-96 bg-emerald-500/20 rounded-full blur-[120px]"></div>

        <Link href="/" className="absolute top-12 left-12 text-[10px] font-black text-slate-500 hover:text-white uppercase tracking-[0.4em] transition-all z-10 px-6 py-2.5 rounded-full hover:bg-white/5 bg-white/5 backdrop-blur-md">
          Return
        </Link>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white/5 backdrop-blur-3xl p-12 rounded-[3.5rem] w-full max-w-md relative z-10 shadow-3xl"
        >
          <div className="flex justify-center mb-10">
            <div className="bg-cyan-500/10 px-6 py-2 rounded-full text-cyan-400 font-black text-[10px] uppercase tracking-[0.5em]">
              Admin Vault
            </div>
          </div>
          <h1 className="text-4xl font-black text-center text-white mb-3 uppercase tracking-tighter">Console</h1>
          <p className="text-[10px] font-bold text-slate-500 text-center mb-12 px-4 uppercase tracking-[0.2em] leading-loose opacity-60">Authorize Secure Portal Access</p>

          <form onSubmit={handleLogin} className="space-y-6" autoComplete="off">
            <div className="relative group">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="ACCESS TOKEN"
                autoComplete="new-password"
                className="w-full px-8 py-5 rounded-2xl bg-white/5 text-white focus:ring-4 focus:ring-cyan-500/20 focus:border-cyan-500/50 outline-none transition-all font-black text-[12px] uppercase tracking-[0.3em] placeholder:text-slate-700"
              />
            </div>
            {error && <p className="text-red-400 text-[10px] font-black uppercase tracking-widest text-center">ERROR: {error}</p>}
            <button
              type="submit"
              className="w-full bg-cyan-500 text-slate-950 py-5 rounded-2xl font-black text-[11px] uppercase tracking-[0.4em] hover:bg-cyan-400 active:scale-[0.98] transition-all shadow-2xl shadow-cyan-500/20"
            >
              Sign In
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  const TabButton = ({ id, label }: { id: Tab, label: string }) => (
    <button
      onClick={() => {
        setActiveTab(id);
        setIsMobileMenuOpen(false);
      }}
      className={`w-full text-left px-5 py-3.5 rounded-xl font-bold text-sm transition-all relative flex items-center gap-3 ${activeTab === id
        ? 'bg-cyan-50 text-cyan-600'
        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
        }`}
    >
      {activeTab === id && <div className="w-1 h-5 bg-cyan-600 rounded-full mr-2" />}
      <span className="flex-1">{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1A1C1E] font-sans">
      <aside className="fixed left-0 top-0 bottom-0 w-72 bg-white p-6 hidden lg:flex flex-col z-50 border-r border-slate-100">
        <div className="flex items-center gap-2 mb-10 px-2">
          <div className="w-2.5 h-2.5 bg-cyan-500 rounded-full" />
          <span className="text-lg font-bold text-[#1A1C1E]">AMS Portal</span>
        </div>

        <nav className="flex-1 space-y-1">
          <TabButton id="overview" label="Dashboard Overview" />
          <TabButton id="marketplace" label="Marketplace Manager" />
          <TabButton id="listings" label="Active Listings" />
          <TabButton id="orders" label="Buy Orders" />
          <TabButton id="trades" label="Transaction Ledger" />
          <TabButton id="chats" label="Service Logs" />
          <TabButton id="users" label="Farmer Manager" />
        </nav>

        <div className="mt-auto pt-6 flex flex-col gap-2">
          <Link href="/" className="px-5 py-3 text-sm font-bold text-slate-500 hover:text-cyan-600 transition-colors">
            Exit to Application
          </Link>
          <button onClick={handleLogout} className="w-full text-left px-5 py-3 text-sm font-bold text-red-500 hover:bg-red-50 rounded-xl transition-all">
            Signed Termination
          </button>
        </div>
      </aside>

      <div className="lg:pl-72 flex flex-col min-h-screen">
        <header className="px-10 py-10 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-3 bg-white rounded-xl lg:hidden text-slate-600 shadow-sm"
            >
              Menu
            </button>
            <h2 className="text-3xl font-extrabold text-[#1A1C1E] tracking-tight">
              {activeTab === 'overview' ? 'Dashboard Overview'
                : activeTab === 'marketplace' ? 'Marketplace Manager'
                  : activeTab === 'listings' ? 'Active Listings'
                    : activeTab === 'orders' ? 'Buy Orders'
                      : activeTab === 'trades' ? 'Transaction Ledger'
                        : activeTab === 'chats' ? 'Service Logs'
                          : 'Farmer Manager'}
            </h2>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={fetchAllData}
              disabled={dataLoading}
              className="px-6 py-2.5 bg-white rounded-full text-xs font-bold text-slate-500 hover:text-cyan-500 transition-all shadow-sm"
            >
              {dataLoading ? 'Syncing...' : 'Reload Data'}
            </button>
            <div className="hidden sm:flex items-center gap-2 bg-emerald-50 px-4 py-2 rounded-full">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest">Active</span>
            </div>
          </div>
        </header>

        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ x: -300 }} animate={{ x: 0 }} exit={{ x: -300 }}
              className="fixed inset-0 z-50 bg-slate-900 p-8 lg:hidden flex flex-col"
            >
              <div className="flex items-center justify-between mb-12">
                <span className="text-xl font-black text-white uppercase tracking-tighter leading-none">Management</span>
                <button onClick={() => setIsMobileMenuOpen(false)} className="text-slate-400 font-black text-[10px] uppercase tracking-widest">Close</button>
              </div>
              <nav className="space-y-2 mb-12">
                <TabButton id="overview" label="Overview" />
                <TabButton id="marketplace" label="Marketplace" />
                <TabButton id="listings" label="Active Listings" />
                <TabButton id="orders" label="Buy Orders" />
                <TabButton id="trades" label="Transaction Ledger" />
                <TabButton id="chats" label="Chat Logs" />
                <TabButton id="users" label="User Manager" />
              </nav>
              <button onClick={handleLogout} className="mt-auto block text-red-500 font-black text-[10px] uppercase tracking-widest">
                Log Termination
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <main className="p-10 lg:p-16 flex-1 overflow-x-hidden">
          {dataLoading && adminData.chats.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 space-y-4">
              <div className="px-10 py-5 bg-slate-950 rounded-full text-cyan-400 font-black text-[10px] uppercase tracking-[0.5em] animate-pulse">
                Analyzing
              </div>
              <p className="text-slate-400 font-bold uppercase text-[9px] tracking-[0.3em]">Extracting Strategic Database Layers...</p>
            </div>
          ) : (
            <div className="space-y-16">

              {activeTab === 'overview' && (
                <div className="space-y-10">
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    <StatCard label="Total Interactions" val={adminData.chats.length} grow="2 new" type="LOGS" color="emerald" />
                    <StatCard label="Active Matches" val={adminData.trades.length} grow="1 new" type="TRADES" color="blue" />
                    <StatCard label="Market Listings" val={adminData.listings.length} grow="3 active" type="LISTINGS" color="amber" />
                    <StatCard label="Farmer Directory" val={adminData.appUsers.length} grow="Verified" type="MEMBERS" color="purple" />
                    <StatCard label="Global Users" val={adminData.marketplaceUsers.length} grow="Live" type="USERS" color="cyan" />
                    <StatCard label="Critical Alerts" val={adminData.trades.filter((t: any) => t.status === 'pending').length} grow="Pending" type="ALERTS" color="red" />
                  </div>

                  <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                    <div className="xl:col-span-2 py-10">
                      <div className="flex items-center justify-between mb-12">
                        <h3 className="text-base font-black tracking-[0.4em] flex items-center gap-4 uppercase text-slate-950">
                          <div className="w-1.5 h-6 bg-cyan-500 rounded-full"></div>
                          Interaction Flow
                        </h3>
                        <button onClick={() => setActiveTab('chats')} className="text-[10px] font-black text-cyan-600 hover:tracking-[0.2em] transition-all flex items-center gap-1 uppercase tracking-widest">Global View</button>
                      </div>
                      <div className="space-y-6">
                        {adminData.chats.slice(0, 6).map((chat: any) => (
                          <div key={chat.id} className="flex items-start gap-6 p-6 hover:bg-slate-50 transition-all rounded-[2rem] group">
                            <div className={`mt-2 w-2 h-2 rounded-full shrink-0 ${chat.role === 'user' ? 'bg-cyan-400' : 'bg-emerald-400'}`}></div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-base font-black text-slate-900 truncate uppercase tracking-tighter">{chat.user_email}</p>
                                <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">{format(new Date(chat.timestamp), 'HH:mm')}</span>
                              </div>
                              <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed font-medium">{chat.content}</p>
                            </div>
                            <button onClick={() => handleDelete('chat', chat.id)} className="px-5 py-2.5 bg-red-50 text-[9px] font-black text-red-400 hover:text-red-600 hover:bg-red-100 transition-all uppercase tracking-[0.2em] rounded-full">Terminate</button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-xl shadow-slate-200">
                        <h4 className="text-lg font-black mb-6 flex items-center gap-2 text-emerald-400 underline decoration-emerald-400/30 underline-offset-8">Market Pulse</h4>
                        <div className="space-y-6">
                          <PulseItem label="Avg Listing Price" val="UGX 2,400" type="VAL" />
                          <PulseItem label="Popular Crop" val="Maize" type="TOP" />
                          <PulseItem label="Top District" val="Wakiso" type="LOC" />
                        </div>
                        <button onClick={() => setActiveTab('marketplace')} className="w-full mt-10 py-4 bg-white/10 hover:bg-white/20 rounded-2xl font-black text-sm transition-all">Go to Marketplace</button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'chats' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h2 className="text-2xl font-black tracking-tighter text-slate-900 mb-1">Conversation Logs</h2>
                      <p className="text-slate-400 text-xs font-medium">{adminData.chats.length} total interactions recorded</p>
                    </div>
                    <span className="px-4 py-2 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-full">{adminData.chats.length} Logs</span>
                  </div>
                  <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-slate-900 text-left">
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">User</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Role</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 min-w-[300px]">Message</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Time</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {adminData.chats.length === 0 && (
                            <tr><td colSpan={5} className="px-6 py-16 text-center text-slate-300 text-sm font-medium">No conversations recorded yet</td></tr>
                          )}
                          {adminData.chats.map((chat: any) => (
                            <tr key={chat.id} className="hover:bg-slate-50/70 transition-colors">
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-600 shrink-0">
                                    {chat.user_email?.charAt(0).toUpperCase()}
                                  </div>
                                  <span className="text-sm font-semibold text-slate-800 truncate max-w-[140px]">{chat.user_email}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${chat.role === 'user' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'
                                  }`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${chat.role === 'user' ? 'bg-blue-500' : 'bg-emerald-500'
                                    }`} />
                                  {chat.role}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-slate-600 text-sm leading-relaxed max-w-sm">
                                <p className="line-clamp-2">{chat.content}</p>
                              </td>
                              <td className="px-6 py-4 text-slate-400 text-xs font-medium whitespace-nowrap">
                                {format(new Date(chat.timestamp), 'MMM dd, HH:mm')}
                              </td>
                              <td className="px-6 py-4 text-right">
                                <button onClick={() => handleDelete('chat', chat.id)} className="px-3 py-1.5 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white text-[10px] font-bold rounded-lg uppercase tracking-wider transition-all">Delete</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'users' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h2 className="text-2xl font-black tracking-tighter text-slate-900 mb-1">Farmer Directory</h2>
                      <p className="text-slate-400 text-xs font-medium">{adminData.appUsers.length} registered farmers</p>
                    </div>
                    <span className="px-4 py-2 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest rounded-full">{adminData.appUsers.length} Members</span>
                  </div>
                  <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-slate-900 text-left">
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Farmer</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">District</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Joined</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {adminData.appUsers.length === 0 && (
                            <tr><td colSpan={4} className="px-6 py-16 text-center text-slate-300 text-sm font-medium">No farmers registered yet</td></tr>
                          )}
                          {adminData.appUsers.map((u: any) => (
                            <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center text-[11px] font-black text-emerald-700 shrink-0">
                                    {u.name?.charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <p className="font-semibold text-slate-900 text-sm">{u.name}</p>
                                    <p className="text-slate-400 text-xs">{u.email}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <span className="px-2.5 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold rounded-md uppercase tracking-wide">
                                  {u.district || 'Unknown'}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-slate-400 text-xs font-medium">
                                {format(new Date(u.created_at), 'dd MMM yyyy')}
                              </td>
                              <td className="px-6 py-4 text-right">
                                <div className="flex justify-end gap-2">
                                  <button onClick={() => setEditingItem({ type: 'app-user', item: u })} className="px-3 py-1.5 bg-slate-100 text-slate-600 hover:bg-cyan-600 hover:text-white text-[10px] font-bold rounded-lg uppercase tracking-wider transition-all">Edit</button>
                                  <button onClick={() => handleDelete('app-user', u.id)} className="px-3 py-1.5 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white text-[10px] font-bold rounded-lg uppercase tracking-wider transition-all">Delete</button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'marketplace' && (
                <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  {/* Marketplace Users */}
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h3 className="text-xl font-black text-slate-900 mb-1">Market Participants</h3>
                        <p className="text-slate-400 text-xs font-medium">{adminData.marketplaceUsers.length} registered traders</p>
                      </div>
                      <span className="px-4 py-2 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-full">{adminData.marketplaceUsers.length} Users</span>
                    </div>
                    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="bg-slate-900 text-left">
                              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Participant</th>
                              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Role</th>
                              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">District</th>
                              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Subscription</th>
                              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {adminData.marketplaceUsers.length === 0 && (
                              <tr><td colSpan={5} className="px-6 py-16 text-center text-slate-300 text-sm">No market participants yet</td></tr>
                            )}
                            {adminData.marketplaceUsers.map((u: any) => (
                              <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-3">
                                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-black shrink-0 ${u.role === 'seller' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                                      }`}>
                                      {u.name?.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                      <p className="font-semibold text-slate-900 text-sm">{u.name}</p>
                                      <p className="text-slate-400 text-xs">{u.email}</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide ${u.role === 'seller' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'
                                    }`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${u.role === 'seller' ? 'bg-emerald-500' : 'bg-blue-500'
                                      }`} />
                                    {u.role}
                                  </span>
                                </td>
                                <td className="px-6 py-4">
                                  <span className="px-2.5 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold rounded-md uppercase tracking-wide">
                                    {u.district || 'Unknown'}
                                  </span>
                                </td>
                                <td className="px-6 py-4">
                                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide ${u.is_subscribed ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                                    }`}>
                                    {u.is_subscribed ? 'Active' : 'Unpaid'}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                  <div className="flex justify-end gap-2">
                                    <button onClick={() => setEditingItem({ type: 'marketplace-user', item: u })} className="px-3 py-1.5 bg-slate-100 text-slate-600 hover:bg-cyan-600 hover:text-white text-[10px] font-bold rounded-lg uppercase tracking-wider transition-all">Edit</button>
                                    <button onClick={() => handleDelete('marketplace-user', u.id)} className="px-3 py-1.5 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white text-[10px] font-bold rounded-lg uppercase tracking-wider transition-all">Delete</button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'listings' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h2 className="text-2xl font-black tracking-tighter text-slate-900 mb-1">Active Listings</h2>
                      <p className="text-slate-400 text-xs font-medium">{adminData.listings.length} crop listings on the market</p>
                    </div>
                    <span className="px-4 py-2 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest rounded-full">{adminData.listings.length} Listings</span>
                  </div>
                  <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-slate-900 text-left">
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Crop</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Seller</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Quantity</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Price / kg</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {adminData.listings.length === 0 && <tr><td colSpan={6} className="px-6 py-16 text-center text-slate-300 text-sm">No active listings</td></tr>}
                          {adminData.listings.map((item: any) => (
                            <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                              <td className="px-6 py-4 font-semibold text-slate-900">{item.crop}</td>
                              <td className="px-6 py-4 text-slate-500 text-sm">{item.seller_name}</td>
                              <td className="px-6 py-4 text-slate-600 text-sm">{item.quantity_kg} kg</td>
                              <td className="px-6 py-4 font-bold text-slate-900 text-sm">{item.currency} {item.price_per_kg?.toLocaleString()}</td>
                              <td className="px-6 py-4"><span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-bold rounded-md uppercase">{item.status}</span></td>
                              <td className="px-6 py-4 text-right">
                                <div className="flex justify-end gap-2">
                                  <button onClick={() => setEditingItem({ type: 'listing', item })} className="px-3 py-1.5 bg-slate-100 text-slate-600 hover:bg-cyan-600 hover:text-white text-[10px] font-bold rounded-lg uppercase tracking-wider transition-all">Edit</button>
                                  <button onClick={() => handleDelete('listing', item.id)} className="px-3 py-1.5 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white text-[10px] font-bold rounded-lg uppercase tracking-wider transition-all">Delete</button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'orders' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h2 className="text-2xl font-black tracking-tighter text-slate-900 mb-1">Buy Orders</h2>
                      <p className="text-slate-400 text-xs font-medium">{adminData.orders.length} open purchase requests</p>
                    </div>
                    <span className="px-4 py-2 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-full">{adminData.orders.length} Orders</span>
                  </div>
                  <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-slate-900 text-left">
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Crop</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Buyer</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Quantity</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Max Price / kg</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {adminData.orders.length === 0 && <tr><td colSpan={6} className="px-6 py-16 text-center text-slate-300 text-sm">No buy orders yet</td></tr>}
                          {adminData.orders.map((item: any) => (
                            <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                              <td className="px-6 py-4 font-semibold text-slate-900">{item.crop}</td>
                              <td className="px-6 py-4 text-slate-500 text-sm">{item.buyer_name}</td>
                              <td className="px-6 py-4 text-slate-600 text-sm">{item.quantity_kg} kg</td>
                              <td className="px-6 py-4 font-bold text-slate-900 text-sm">{item.currency} {item.max_price_per_kg?.toLocaleString()}</td>
                              <td className="px-6 py-4"><span className={`px-2.5 py-1 text-[10px] font-bold rounded-md uppercase ${item.status === 'open' ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>{item.status}</span></td>
                              <td className="px-6 py-4 text-right">
                                <div className="flex justify-end gap-2">
                                  <button onClick={() => setEditingItem({ type: 'order', item })} className="px-3 py-1.5 bg-slate-100 text-slate-600 hover:bg-cyan-600 hover:text-white text-[10px] font-bold rounded-lg uppercase tracking-wider transition-all">Edit</button>
                                  <button onClick={() => handleDelete('order', item.id)} className="px-3 py-1.5 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white text-[10px] font-bold rounded-lg uppercase tracking-wider transition-all">Delete</button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'trades' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h2 className="text-2xl font-black tracking-tighter text-slate-900 mb-1">Transaction Ledger</h2>
                      <p className="text-slate-400 text-xs font-medium">{adminData.trades.length} completed and pending trades</p>
                    </div>
                    <span className="px-4 py-2 bg-amber-500 text-white text-[10px] font-black uppercase tracking-widest rounded-full">{adminData.trades.length} Trades</span>
                  </div>
                  <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-slate-900 text-left">
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Commodity</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Seller</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Buyer</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Value</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {adminData.trades.length === 0 && <tr><td colSpan={6} className="px-6 py-16 text-center text-slate-300 text-sm">No trades recorded yet</td></tr>}
                          {adminData.trades.map((t: any) => (
                            <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                              <td className="px-6 py-4">
                                <p className="font-semibold text-slate-900 text-sm uppercase">{t.crop}</p>
                                <p className="text-slate-400 text-xs">{t.quantity_kg} kg</p>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                  <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center text-[10px] font-black text-emerald-700">{t.seller_name?.charAt(0).toUpperCase()}</div>
                                  <span className="text-sm text-slate-700">{t.seller_name}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                  <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-black text-blue-700">{t.buyer_name?.charAt(0).toUpperCase()}</div>
                                  <span className="text-sm text-slate-700">{t.buyer_name}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <p className="font-bold text-slate-900 text-sm">UGX {t.total_value?.toLocaleString()}</p>
                                <p className="text-slate-400 text-xs">{t.agreed_price_per_kg}/kg</p>
                              </td>
                              <td className="px-6 py-4">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase ${t.status === 'completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${t.status === 'completed' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                  {t.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <button onClick={() => handleDelete('trade', t.id)} className="px-3 py-1.5 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white text-[10px] font-bold rounded-lg uppercase tracking-wider transition-all">Delete</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      <AnimatePresence>
        {editingItem && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-12">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setEditingItem(null)} className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" />

            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-[3rem] shadow-2xl w-full max-w-xl relative shrink-0 overflow-y-auto max-h-[90vh]"
            >
              <div className="p-8 sm:p-10 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-4">
                  <div className="px-5 py-2 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest">MOD</div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter leading-none">Modify Asset</h3>
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">{editingItem.type.replace('-', ' ')}</p>
                  </div>
                </div>
                <button onClick={() => setEditingItem(null)} className="px-5 py-2 bg-white text-[10px] font-black text-slate-400 hover:text-slate-950 uppercase tracking-widest rounded-2xl transition-all shadow-sm">Close</button>
              </div>

              <form onSubmit={handleUpdate} className="p-8 sm:p-10 space-y-6" autoComplete="off">
                {editingItem.type.includes('user') && (
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[0.65rem] font-black text-slate-400 uppercase tracking-widest px-1">Display Name</label>
                      <input type="text" autoComplete="off" value={editingItem.item.name} onChange={(e) => setEditingItem({ ...editingItem, item: { ...editingItem.item, name: e.target.value } })}
                        className="w-full px-6 py-4 rounded-2xl bg-slate-50 outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-bold text-slate-900 shadow-sm" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[0.65rem] font-black text-slate-400 uppercase tracking-widest px-1">Primary Email</label>
                      <input type="email" autoComplete="off" value={editingItem.item.email} onChange={(e) => setEditingItem({ ...editingItem, item: { ...editingItem.item, email: e.target.value } })}
                        className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-bold text-slate-900" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[0.65rem] font-black text-slate-400 uppercase tracking-widest px-1">District / Location</label>
                      <input type="text" autoComplete="off" value={editingItem.item.district || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, item: { ...editingItem.item, district: e.target.value } })}
                        className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-bold text-slate-900" />
                    </div>
                    {editingItem.type === 'marketplace-user' && (
                      <div className="flex items-center justify-between p-6 bg-slate-50 rounded-2xl border border-slate-100">
                        <div>
                          <p className="text-xs font-black text-slate-900 uppercase tracking-widest">Subscription Paid</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Authorize access to market features</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setEditingItem({ ...editingItem, item: { ...editingItem.item, is_subscribed: editingItem.item.is_subscribed ? 0 : 1 } })}
                          className={`w-14 h-8 rounded-full relative transition-all ${editingItem.item.is_subscribed ? 'bg-emerald-500' : 'bg-slate-300'}`}
                        >
                          <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${editingItem.item.is_subscribed ? 'left-7' : 'left-1'}`} />
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {(editingItem.type === 'listing' || editingItem.type === 'order') && (
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[0.65rem] font-black text-slate-400 uppercase tracking-widest px-1">Product Description</label>
                      <input type="text" autoComplete="off" value={editingItem.item.crop} onChange={(e) => setEditingItem({ ...editingItem, item: { ...editingItem.item, crop: e.target.value } })}
                        className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-bold text-slate-900" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[0.65rem] font-black text-slate-400 uppercase tracking-widest px-1">Stock (kg)</label>
                        <input type="number" autoComplete="off" value={editingItem.item.quantity_kg} onChange={(e) => setEditingItem({ ...editingItem, item: { ...editingItem.item, quantity_kg: e.target.value } })}
                          className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-bold text-slate-900" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[0.65rem] font-black text-slate-400 uppercase tracking-widest px-1">{editingItem.type === 'listing' ? 'UGX / kg' : 'Max UGX / kg'}</label>
                        <input type="number" autoComplete="off" value={editingItem.type === 'listing' ? editingItem.item.price_per_kg : editingItem.item.max_price_per_kg}
                          onChange={(e) => setEditingItem({ ...editingItem, item: { ...editingItem.item, [editingItem.type === 'listing' ? 'price_per_kg' : 'max_price_per_kg']: e.target.value } })}
                          className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-bold text-slate-900" />
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-4 pt-6">
                  <button type="button" onClick={() => setEditingItem(null)} className="flex-1 py-4.5 text-[10px] font-black text-slate-400 uppercase tracking-widest border border-slate-200 rounded-2xl hover:bg-slate-50 transition-all">Abort</button>
                  <button type="submit" disabled={editLoading} className="flex-1 py-4.5 bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-slate-800 shadow-xl transition-all">
                    {editLoading ? 'Syncing...' : 'Commit Changes'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatCard({ label, val, grow, type, color }: any) {
  const borderColors: any = {
    emerald: 'border-[#1E2B3C]', // Navy
    blue: 'border-[#E6B143]', // Gold/Amber
    amber: 'border-[#27AE60]', // Green
    purple: 'border-[#6C5CE7]',
    cyan: 'border-[#00BCD4]',
    red: 'border-[#FF4757]'
  }
  const textColors: any = {
    emerald: 'text-[#1E2B3C]',
    blue: 'text-[#E6B143]',
    amber: 'text-[#27AE60]',
    purple: 'text-[#6C5CE7]',
    cyan: 'text-[#00BCD4]',
    red: 'text-[#FF4757]'
  }
  return (
    <div className={`bg-white rounded-[1.5rem] shadow-sm p-8 relative overflow-hidden flex flex-col justify-between min-h-[160px] hover:shadow-md transition-shadow`}>
      <div className="flex items-start justify-between">
        <p className={`text-4xl font-extrabold ${textColors[color] || 'text-[#1A1C1E]'} tracking-tight`}>{val}</p>
        <span className={`px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest ${color === 'amber' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400'}`}>
          {grow} {type.toLowerCase()}
        </span>
      </div>
      <div>
        <p className="text-[11px] font-black text-[#1A1C1E] uppercase tracking-[0.15em] opacity-100">{label}</p>
      </div>
    </div>
  );
}

function PulseItem({ label, val, type }: any) {
  return (
    <div className="flex items-center gap-4">
      <div className="px-3 py-1 bg-white/10 rounded-xl text-white/50 font-black text-[9px] uppercase tracking-widest">{type}</div>
      <div>
        <p className="text-[0.65rem] font-black text-white/30 uppercase tracking-[0.2em]">{label}</p>
        <p className="font-bold text-white tracking-tight">{val}</p>
      </div>
    </div>
  );
}

function MarketTable({ label, data, type, badge, col, onEdit, onDelete }: any) {
  const accentColor = col === 'emerald' ? 'bg-emerald-600' : 'bg-blue-600';
  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden flex flex-col h-full">
      <div className="px-6 py-5 flex items-center justify-between bg-slate-900">
        <h4 className="font-black text-white uppercase tracking-widest text-[11px]">{label}</h4>
        <span className={`px-3 py-1 ${accentColor} text-white text-[9px] font-black uppercase tracking-widest rounded-full`}>{data.length} Total</span>
      </div>
      <div className="flex-1 overflow-y-auto max-h-[400px]">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50 text-left">
              <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Crop</th>
              <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Qty</th>
              <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Price/kg</th>
              <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {data.map((item: any) => (
              <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                <td className="px-5 py-3.5">
                  <div className="font-semibold text-slate-900 text-sm">{item.crop}</div>
                  <p className="text-slate-400 text-xs">{item.seller_name || item.buyer_name}</p>
                </td>
                <td className="px-5 py-3.5 text-slate-600 text-sm font-medium">{item.quantity_kg} kg</td>
                <td className="px-5 py-3.5 text-slate-600 text-sm font-medium">
                  {item.price_per_kg || item.max_price_per_kg}
                </td>
                <td className="px-5 py-3.5 text-right">
                  <div className="flex justify-end gap-1.5">
                    <button onClick={() => onEdit(item)} className="px-3 py-1.5 bg-slate-100 text-slate-600 hover:bg-cyan-600 hover:text-white text-[10px] font-bold rounded-lg transition-all uppercase tracking-wider">Edit</button>
                    <button onClick={() => onDelete(item.id)} className="px-3 py-1.5 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white text-[10px] font-bold rounded-lg transition-all uppercase tracking-wider">Del</button>
                  </div>
                </td>
              </tr>
            ))}
            {data.length === 0 && (
              <tr><td colSpan={4} className="px-5 py-12 text-center text-slate-300 text-sm">No data</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
