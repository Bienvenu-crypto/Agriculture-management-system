'use client';

import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { sendGAEvent } from '@next/third-parties/google';

interface CropData {
  crop: string;
  price: number;
  change: string;
  trend: 'up' | 'down' | 'stable';
  historical: { month: string; price: number }[];
}

export default function MarketPrices() {
  const [selectedCrop, setSelectedCrop] = useState<string>('');
  const [marketData, setMarketData] = useState<CropData[]>([]);
  const [dataSource, setDataSource] = useState<string>('mock');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    async function fetchPrices() {
      try {
        const response = await fetch('/api/market-prices');

        let result;
        try {
          const text = await response.text();
          result = JSON.parse(text);
        } catch (e) {
          throw new Error(`Server returned an invalid response (${response.status}).`);
        }

        if (!response.ok) {
          throw new Error(result.error || 'Failed to fetch market prices');
        }

        setMarketData(result.data);
        setDataSource(result.source);
        if (result.data && result.data.length > 0) {
          setSelectedCrop(result.data[0].crop);
          sendGAEvent({ event: 'market_trend_view', value: result.data[0].crop });

          // Send notification for top trending crop
          const topTrend = result.data.find((c: any) => c.trend === 'up');
          if (topTrend) {
            fetch('/api/notifications', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'info',
                title: 'Market Opportunity',
                message: `${topTrend.crop} prices are up ${topTrend.change}. It's a great time to list your harvest!`
              })
            }).catch(() => { });
          }
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchPrices();
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setError(null);

    try {
      const response = await fetch('/api/market-prices/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ crop: searchQuery }),
      });

      let data;
      try {
        const text = await response.text();
        data = JSON.parse(text);
      } catch (e) {
        throw new Error(`Server returned an invalid response (${response.status}). Please try again later.`);
      }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch market data for this crop');
      }

      setMarketData(prev => {
        const exists = prev.find(c => c.crop.toLowerCase() === data.crop.toLowerCase());
        if (exists) {
          return prev.map(c => c.crop.toLowerCase() === data.crop.toLowerCase() ? data : c);
        }
        return [data, ...prev];
      });

      setSelectedCrop(data.crop);
      setSearchQuery('');
      sendGAEvent({ event: 'market_trend_search', value: data.crop });
    } catch (err: any) {
      console.error('Search error:', err);
      alert(err.message || 'Failed to fetch market data for this crop');
    } finally {
      setIsSearching(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-2xl shadow-sm min-h-[400px] flex flex-col items-center justify-center">
        <p className="text-indigo-600 font-black capitalize tracking-[0.2em] animate-pulse">Scanning Markets...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white p-6 rounded-2xl shadow-sm min-h-[400px] flex flex-col items-center justify-center text-center">
        <h3 className="text-xl font-black text-slate-900 capitalize tracking-tighter mb-2">Feed Interrupted</h3>
        <p className="text-slate-500 font-bold max-w-sm mb-6 capitalize text-[10px] tracking-widest">{error}</p>
      </div>
    );
  }

  const currentCropData = marketData.find(c => c.crop === selectedCrop);

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h2 className="font-black text-slate-900 capitalize tracking-tighter text-lg">
            Market Intelligence
          </h2>
          {dataSource === 'live' || dataSource === 'live_hdx' ? (
            <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[9px] font-black tracking-widest capitalize">Verified</span>
          ) : (
            <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-500 text-[9px] font-black tracking-widest capitalize">Estimate</span>
          )}
        </div>
        <span className="text-[9px] text-slate-400 capitalize font-black tracking-[0.2em]">UNITS / KG</span>
      </div>

      <form onSubmit={handleSearch} className="mb-6 relative" autoComplete="off">
        <input
          type="text"
          value={searchQuery}
          autoComplete="off"
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="ENTER CROP NAME..."
          className="w-full px-4 py-3 bg-slate-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm font-bold capitalize placeholder:tracking-widest"
          disabled={isSearching}
        />
        <button
          type="submit"
          disabled={isSearching || !searchQuery.trim()}
          className="absolute right-2 top-1/2 -translate-y-1/2 bg-indigo-600 text-white px-4 py-1.5 rounded-lg text-[10px] font-black capitalize tracking-widest hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {isSearching ? '...' : 'Search'}
        </button>
      </form>

      <div className="space-y-2 mb-8">
        {marketData.map((item) => (
          <div
            key={item.crop}
            onClick={() => {
              setSelectedCrop(item.crop);
              sendGAEvent({ event: 'market_trend_view', value: item.crop });
            }}
            className={`flex items-center justify-between p-3 rounded-xl transition-colors cursor-pointer ${selectedCrop === item.crop
              ? 'bg-indigo-50 shadow-sm'
              : 'hover:bg-slate-50'
              }`}
          >
            <div className="flex items-center gap-3">
              <span className={`text-[10px] font-black ${selectedCrop === item.crop ? 'text-indigo-900' : 'text-slate-400'}`}>
                {item.trend === 'up' ? 'RISE' : item.trend === 'down' ? 'FALL' : 'HELD'}
              </span>
              <span className={`font-black capitalize tracking-tighter ${selectedCrop === item.crop ? 'text-indigo-950 text-lg' : 'text-slate-700'}`}>
                {item.crop}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span className={`text-lg font-black tracking-tighter ${selectedCrop === item.crop ? 'text-indigo-900' : 'text-slate-900'}`}>
                {item.price.toLocaleString()}
              </span>
              <div className={`text-[9px] font-black px-2 py-0.5 rounded capitalize tracking-widest ${item.trend === 'up' ? 'bg-emerald-100 text-emerald-700' :
                item.trend === 'down' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-500'
                }`}>
                {item.change}
              </div>
            </div>
          </div>
        ))}
      </div>

      {currentCropData && currentCropData.historical && (
        <div className="mt-6">
          <h4 className="text-[10px] font-black text-slate-400 capitalize tracking-[0.2em] mb-4">{selectedCrop} — Historical Output</h4>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={currentCropData.historical}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 'bold' }}
                />
                <YAxis
                  hide
                  domain={['dataMin - 100', 'dataMax + 100']}
                />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                  labelStyle={{ fontWeight: '900', color: '#1e293b', marginBottom: '4px', textTransform: 'capitalize', fontSize: '10px' }}
                  itemStyle={{ color: '#4f46e5', fontWeight: '900', fontSize: '12px' }}
                  formatter={(value: any) => [`${Number(value).toLocaleString()}`, 'PRICE']}
                />
                <Line
                  type="monotone"
                  dataKey="price"
                  stroke="#4f46e5"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#4f46e5', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 6, fill: '#4f46e5', strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
