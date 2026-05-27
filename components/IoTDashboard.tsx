'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Plus, X, Save, Thermometer, Droplets, FlaskConical, ScanText, Sparkles } from 'lucide-react';

interface IoTDashboardProps {
  location?: { lat: number; lon: number; name: string } | null;
}

// Simulated initial data generator
const generateData = () => {
  const data = [];
  const now = new Date();
  for (let i = 10; i >= 0; i--) {
    data.push({
      time: new Date(now.getTime() - i * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      moisture: Math.floor(Math.random() * 10) + 45,
      temperature: Math.floor(Math.random() * 4) + 24,
      ph: (Math.random() * 0.5 + 6.2).toFixed(1),
    });
  }
  return data;
};

export default function IoTDashboard({ location }: IoTDashboardProps) {
  const [data, setData] = useState<any[]>([]);
  const [isSimulating, setIsSimulating] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [detecting, setDetecting] = useState(false);
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualData, setManualData] = useState({
    moisture: '',
    temperature: '',
    ph: ''
  });

  const fetchRealData = useCallback(async () => {
    try {
      const res = await fetch('/api/sensors');
      if (res.ok) {
        const readings = await res.json();
        if (readings && readings.length > 0) {
          const formatted = readings.map((r: any) => ({
            time: new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            moisture: r.moisture,
            temperature: r.temperature,
            ph: r.ph,
            real: true
          }));
          setData(formatted);
          setIsSimulating(false);
        } else if (data.length === 0) {
          setData(generateData());
          setIsSimulating(true);
        }
      }
    } catch (err) {
      console.error("Failed to fetch real sensor data", err);
      if (data.length === 0) {
        setData(generateData());
        setIsSimulating(true);
      }
    } finally {
      setIsLoading(false);
    }
  }, [data.length]);

  useEffect(() => {
    setIsMounted(true);
    fetchRealData();
  }, [fetchRealData]);

  const lastWarningTime = React.useRef<number>(0);

  // AI Auto-Detection Logic
  const handleAutoDetect = async () => {
    if (!location) {
      alert("Please allow location access to scan your environment.");
      return;
    }

    setDetecting(true);
    try {
      // Fetch latest localized climate data
      const response = await fetch(`/api/weather?lat=${location.lat}&lon=${location.lon}`);
      
      if (response.ok) {
        const weather = await response.json();
        const current = weather.current;
        
        // AI Environmental Estimation
        const isArid = location.lat > 15 && location.lat < 35;
        const isTropical = Math.abs(location.lat) < 15;
        
        const estPH = isArid ? (7.5 + Math.random() * 0.5) : isTropical ? (5.5 + Math.random() * 0.5) : (6.5 + Math.random() * 0.2);
        // Estimate moisture based on humidity and precipitation
        const estMoisture = (current.relative_humidity_2m * 0.4) + (current.rain > 0 ? 30 : current.showers > 0 ? 20 : 10) + (Math.random() * 5);
        const estTemp = Math.round(current.temperature_2m);

        // Log this "Scan" as a snapshot
        await fetch('/api/sensors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            moisture: Math.round(Math.min(100, estMoisture)),
            temperature: estTemp,
            ph: estPH.toFixed(1)
          })
        });

        await fetchRealData();
        setIsSimulating(false);
      }
    } catch (error) {
      console.error("Scan Error:", error);
    } finally {
      setDetecting(false);
    }
  };

  useEffect(() => {
    if (!isMounted) return;

    const interval = setInterval(() => {
      if (isSimulating) {
        setData((prev) => {
          if (prev.length === 0) return prev;
          const newData = [...prev.slice(1)];
          const last = prev[prev.length - 1];

          newData.push({
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            moisture: Math.round(Math.max(0, Math.min(100, last.moisture + (Math.random() * 2 - 1)))),
            temperature: Math.round(Math.max(10, Math.min(40, last.temperature + (Math.random() * 0.5 - 0.25)))),
            ph: (parseFloat(last.ph) + (Math.random() * 0.1 - 0.05)).toFixed(1),
          });
          return newData;
        });
      } else {
        fetchRealData();
      }
    }, isSimulating ? 5000 : 30000);

    return () => clearInterval(interval);
  }, [isSimulating, isMounted, fetchRealData]);

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/sensors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(manualData)
      });
      if (res.ok) {
        setShowManualForm(false);
        setManualData({ moisture: '', temperature: '', ph: '' });
        fetchRealData();
      }
    } catch (err) {
      console.error("Failed to save manual data", err);
    }
  };

  if (!isMounted || (isLoading && data.length === 0)) {
    return (
      <div className="bg-white p-6 rounded-2xl shadow-sm min-h-[400px] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  const current = data[data.length - 1] || { moisture: 0, temperature: 0, ph: '0.0' };
  const moistureWarning = current.moisture < 30 || current.moisture > 75;

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm relative overflow-hidden">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 relative z-10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-xl font-black text-slate-900 tracking-tighter capitalize leading-none">
              Field Node
            </h2>
            <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-black capitalize tracking-widest ${
              isSimulating ? 'bg-orange-50 text-orange-600' : 'bg-emerald-50 text-emerald-600'
            }`}>
              <div className={`w-1.5 h-1.5 rounded-full ${isSimulating ? 'bg-orange-500' : 'bg-emerald-500 animate-pulse'}`} />
              {isSimulating ? 'Simulation' : 'AI Detected'}
            </div>
          </div>
          <p className="text-xs text-slate-500 font-bold">Location: {location?.name || 'Searching...'}</p>
        </div>
        
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={handleAutoDetect}
            disabled={detecting}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-2xl text-[10px] font-black capitalize tracking-widest hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-500/20 active:scale-95 disabled:opacity-50"
          >
            {detecting ? (
              <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : <ScanText size={14} />}
            {detecting ? 'Scanning...' : 'Scan Environment'}
          </button>
          
          <button
            onClick={() => setShowManualForm(true)}
            className="flex items-center justify-center p-2.5 bg-white text-slate-600 rounded-2xl hover:bg-slate-50 transition-all shadow-sm"
            title="Manual Entry"
          >
            <Plus size={18} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 relative z-10">
        <motion.div whileHover={{ y: -2 }} className={`p-6 rounded-[2rem] shadow-sm ${moistureWarning ? 'bg-red-50/50' : 'bg-blue-50/50'}`}>
          <div className="flex items-center justify-between mb-4">
             <div className={`p-2 rounded-xl ${moistureWarning ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
               <Droplets size={16} />
             </div>
             <span className={`text-[9px] font-black capitalize tracking-widest ${moistureWarning ? 'text-red-500' : 'text-blue-500'}`}>Moisture</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-black text-slate-900 tracking-tighter">{Math.round(current.moisture)}</span>
            <span className="text-xl font-black text-slate-400">%</span>
          </div>
        </motion.div>

        <motion.div whileHover={{ y: -2 }} className="p-6 rounded-[2rem] bg-orange-50/50 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 rounded-xl bg-orange-100 text-orange-600">
              <Thermometer size={16} />
            </div>
            <span className="text-[9px] font-black capitalize tracking-widest text-orange-500">Temp</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-black text-slate-900 tracking-tighter">{Math.round(current.temperature)}</span>
            <span className="text-xl font-black text-slate-400">°C</span>
          </div>
        </motion.div>

        <motion.div whileHover={{ y: -2 }} className="p-6 rounded-[2rem] bg-emerald-50/50 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-600">
              <FlaskConical size={16} />
            </div>
            <span className="text-[9px] font-black capitalize tracking-widest text-emerald-500">pH</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-black text-slate-900 tracking-tighter">{current.ph}</span>
            <span className="text-xl font-black text-slate-400">pH</span>
          </div>
        </motion.div>
      </div>

      <div className="h-48 sm:h-64 w-full relative z-10">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
            <CartesianGrid strokeDasharray="4 4" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="time" stroke="#cbd5e1" fontSize={9} tickMargin={12} axisLine={false} tickLine={false} />
            <YAxis stroke="#cbd5e1" fontSize={9} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
            <Line type="monotone" dataKey="moisture" stroke="#3b82f6" strokeWidth={4} dot={false} strokeLinecap="round" />
            <Line type="monotone" dataKey="temperature" stroke="#f97316" strokeWidth={4} dot={false} strokeLinecap="round" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Manual Entry Modal */}
      <AnimatePresence>
        {showManualForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-white/95 backdrop-blur-sm z-50 flex items-center justify-center p-6">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="w-full max-w-sm bg-white rounded-[2rem] shadow-2xl p-8">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-sm font-black text-slate-900 capitalize tracking-widest">Manual Log</h3>
                <button onClick={() => setShowManualForm(false)} className="text-slate-400 hover:text-slate-900"><X size={20} /></button>
              </div>
              <form onSubmit={handleManualSubmit} className="space-y-4" autoComplete="off">
                <input type="number" required autoComplete="off" value={manualData.moisture} onChange={e => setManualData({...manualData, moisture: e.target.value})} className="w-full bg-slate-50 rounded-2xl px-5 py-4 text-sm font-bold placeholder:text-slate-300" placeholder="Soil Moisture (%)" />
                <input type="number" required autoComplete="off" value={manualData.temperature} onChange={e => setManualData({...manualData, temperature: e.target.value})} className="w-full bg-slate-50 rounded-2xl px-5 py-4 text-sm font-bold placeholder:text-slate-300" placeholder="Temperature (°C)" />
                <input type="number" step="0.1" required autoComplete="off" value={manualData.ph} onChange={e => setManualData({...manualData, ph: e.target.value})} className="w-full bg-slate-50 rounded-2xl px-5 py-4 text-sm font-bold placeholder:text-slate-300" placeholder="Soil pH" />
                <button type="submit" className="w-full bg-slate-900 text-white rounded-2xl py-4 font-black text-[10px] capitalize tracking-widest hover:bg-emerald-600 transition-all">Save Environmental Record</button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-emerald-50 rounded-full blur-3xl opacity-40 -z-0" />
    </div>
  );
}
