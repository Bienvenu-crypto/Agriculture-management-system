'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from './AuthProvider';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;  
  initialMode?: 'login' | 'signup';
}

export default function AuthModal({ isOpen, onClose, initialMode = 'login' }: AuthModalProps) {
  const { setUser } = useAuth();
  const [isLogin, setIsLogin] = useState(initialMode === 'login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setIsLogin(initialMode === 'login');
  }, [initialMode, isOpen]);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    district: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!isLogin) {
        if (!formData.district.trim()) {
          throw new Error("Please enter your district.");
        }
      }

      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(formData),
      });

      let data: any;
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const text = await res.text();
        throw new Error(`Server returned invalid response (${res.status}): ${text.slice(0, 250)}`);
      }

      if (!res.ok) {
        throw new Error(data?.error || 'Authentication failed');
      }

      setUser(data.user);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          onClick={onClose}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-y-auto max-h-[90vh]"
        >
          <button
            onClick={onClose}
            className="absolute top-6 right-6 px-4 py-2 text-[10px] font-black text-slate-400 hover:text-slate-950 capitalize tracking-[0.2em] transition-colors"
          >
            Close
          </button>

          <div className="p-10">
            <div className="flex justify-center mb-6">
              <div className="px-6 py-2 bg-emerald-100 rounded-2xl text-emerald-600 font-black text-[10px] capitalize tracking-[0.3em]">
                Log
              </div>
            </div>

            <h2 className="text-2xl font-black text-center text-slate-950 mb-2 capitalize tracking-tighter">
              {isLogin ? 'Welcome Back' : 'Join the System'}
            </h2>
            <p className="text-slate-500 text-center mb-10 text-[10px] font-bold capitalize tracking-widest px-4">
              {isLogin ? 'Access your agricultural intelligence data' : 'Begin your journey with state-of-the-art management'}
            </p>

            <form onSubmit={handleSubmit} className="space-y-5" autoComplete="off">
              {!isLogin && (
                <>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 capitalize tracking-widest mb-1.5 px-1">Full Name</label>
                    <input
                      type="text"
                      required
                      autoComplete="off"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full bg-slate-50 px-4 py-3 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-bold placeholder:text-slate-300 shadow-sm"
                      placeholder="JOHN DOE"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 capitalize tracking-widest mb-1.5 px-1">District</label>
                    <input
                      type="text"
                      required
                      autoComplete="off"
                      value={formData.district}
                      onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                      className="w-full bg-slate-50 px-4 py-3 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-bold placeholder:text-slate-300 shadow-sm"
                      placeholder="E.G. WAKISO"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-[10px] font-black text-slate-400 capitalize tracking-widest mb-1.5 px-1">Email Identifier</label>
                <input
                  type="email"
                  required
                  autoComplete="off"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-slate-50 px-4 py-3 rounded-2xl border border-black/5 focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-bold placeholder:text-slate-300"
                  placeholder="USER@DOMAIN.COM"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 capitalize tracking-widest mb-1.5 px-1">Access Token</label>
                <input
                  type="password"
                  required
                  autoComplete="new-password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full bg-slate-50 px-4 py-3 rounded-2xl border border-black/5 focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-bold placeholder:text-slate-300"
                  placeholder="••••••••"
                />
              </div>

              {error && (
                <div className="p-3 bg-red-50 text-red-600 text-[9px] font-black capitalize tracking-widest rounded-xl">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black text-[10px] capitalize tracking-[0.2em] hover:bg-emerald-700 transition-all disabled:opacity-70 shadow-xl shadow-emerald-500/10 active:scale-[0.98]"
              >
                {loading ? 'Processing...' : (isLogin ? 'Secure Sign In' : 'Create Account')}
              </button>
            </form>

            <div className="mt-8 text-center text-[10px] font-black capitalize tracking-widest text-slate-400">
              {isLogin ? "Need access? " : "Already registered? "}
              <button
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError('');
                }}
                className="text-emerald-600 hover:text-emerald-700 transition-colors ml-1"
              >
                {isLogin ? 'Apply Now' : 'Sign In Instead'}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

