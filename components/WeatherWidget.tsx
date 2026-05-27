'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { sendGAEvent } from '@next/third-parties/google';

interface WeatherData {
  temp: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  location: string;
  advice: string;
  weatherCode: number;
}

// Default to Kampala coordinates
const DEFAULT_COORDS = { lat: 0.3136, lon: 32.5811, name: 'Kampala' };

const getWeatherDetails = (code: number) => {
  if (code === 0) return { condition: 'Clear sky', advice: 'Ideal for field work. Maintain irrigation schedule.', label: 'SUN' };
  if (code === 1 || code === 2 || code === 3) return { condition: 'Partly cloudy', advice: 'Optimal conditions for planting and harvesting.', label: 'CLOUD' };
  if (code === 45 || code === 48) return { condition: 'Fog', advice: 'Visibility low. Delay pesticide application.', label: 'FOG' };
  if (code >= 51 && code <= 67) return { condition: 'Rain', advice: 'Expect rainfall. Postpone fertilizer application.', label: 'RAIN' };
  if (code >= 71 && code <= 77) return { condition: 'Snow', advice: 'Cold conditions. Protect sensitive young plants.', label: 'SNOW' };
  if (code >= 80 && code <= 82) return { condition: 'Rain showers', advice: 'Brief showers likely. Good for soil moisture.', label: 'SHOWER' };
  if (code >= 85 && code <= 86) return { condition: 'Snow showers', advice: 'Sudden cold spikes. Check greenhouse heat.', label: 'SNOW' };
  if (code >= 95 && code <= 99) return { condition: 'Thunderstorm', advice: 'Storm warning. Seek shelter and secure loose equipment.', label: 'STORM' };
  return { condition: 'Stable', advice: 'Continue regular farming operations.', label: 'NATURE' };
};

export default function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  
  const lastCoords = useRef<{ lat: number, lon: number, name: string }>(DEFAULT_COORDS);
  const fetchLock = useRef(false);

  const performFetch = async (lat: number, lon: number, name: string, retryCount = 0) => {
    if (fetchLock.current && retryCount === 0) return;
    fetchLock.current = true;

    try {
      const response = await fetch(`/api/weather?lat=${lat}&lon=${lon}`);
      const data = await response.json();

      if (!response.ok) {
        if (!weather) setErrorDetails('Weather update in progress...');
        fetchLock.current = false;
        if (retryCount < 3) {
          setTimeout(() => performFetch(lat, lon, name, retryCount + 1), Math.pow(2, retryCount) * 1000);
        }
        return;
      }

      const current = data.current;
      const details = getWeatherDetails(current.weather_code);

      const newWeather: WeatherData = {
        temp: Math.round(current.temperature_2m),
        condition: details.condition,
        humidity: Math.round(current.relative_humidity_2m),
        windSpeed: Math.round(current.wind_speed_10m),
        location: name,
        advice: details.advice,
        weatherCode: current.weather_code
      };

      setWeather(newWeather);
      setErrorDetails(null);
      setLoading(false);
      
      sendGAEvent({ event: 'weather_fetch_success', value: name });
    } catch (err: any) {
      if (!weather) {
        setErrorDetails("Initial sync in progress...");
      }

      if (retryCount < 3) {
        setTimeout(() => performFetch(lat, lon, name, retryCount + 1), Math.pow(2, retryCount) * 1500);
      }
    } finally {
      fetchLock.current = false;
    }
  };

  const updateLocationAndWeather = async (lat: number, lon: number) => {
    // Prevent redundant calls for small movements
    if (
      Math.abs(lastCoords.current.lat - lat) < 0.005 &&
      Math.abs(lastCoords.current.lon - lon) < 0.005 &&
      weather
    ) {
      return;
    }

    let name = 'Kampala'; // Default fallback
    try {
      const geoRes = await fetch(`/api/geocode?lat=${lat}&lon=${lon}`);
      if (geoRes.ok) {
        const geoData = await geoRes.json();
        name = geoData.address?.city || geoData.address?.town || geoData.address?.village || geoData.address?.suburb || 'Your Location';
      }
    } catch (e) {
      console.warn("Geocoding failed, using previous/default name");
      name = lastCoords.current.name || 'Kampala';
    }

    lastCoords.current = { lat, lon, name };
    performFetch(lat, lon, name);
  };

  useEffect(() => {
    // Immediate load with defaults to prevent empty UI
    performFetch(DEFAULT_COORDS.lat, DEFAULT_COORDS.lon, DEFAULT_COORDS.name);

    let watchId: number;
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => updateLocationAndWeather(pos.coords.latitude, pos.coords.longitude),
        () => console.warn("Location permission denied. Staying in Kampala."),
        { enableHighAccuracy: false, timeout: 5000 }
      );

      watchId = navigator.geolocation.watchPosition(
        (pos) => updateLocationAndWeather(pos.coords.latitude, pos.coords.longitude),
        null,
        { enableHighAccuracy: false, maximumAge: 300000 }
      );
    }

    const refreshTimer = setInterval(() => {
      performFetch(lastCoords.current.lat, lastCoords.current.lon, lastCoords.current.name);
    }, 900000); // 15 minute refresh

    return () => {
      clearInterval(refreshTimer);
      if (watchId !== undefined && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, []); // Constant dependency array to fix Hook Error

  const weatherLabel = weather ? getWeatherDetails(weather.weatherCode).label : 'INFO';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white p-6 rounded-2xl shadow-sm relative overflow-hidden"
    >
      <div className="flex items-center justify-between mb-6 relative z-10">
        <div className="flex items-center gap-2 text-gray-400">
          <span className="text-[10px] font-black capitalize tracking-widest">Location</span>
          <span className="text-sm font-bold text-slate-800">{weather?.location || lastCoords.current.name}</span>
        </div>
        <div className={`px-3 py-1 rounded-full text-[10px] font-black capitalize tracking-widest flex items-center gap-1 transition-colors ${loading ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${loading ? 'bg-amber-500' : 'bg-emerald-500'} animate-pulse`}></span>
          {loading ? 'Syncing' : 'Live'}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {!weather && errorDetails ? (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="h-32 flex flex-col items-center justify-center text-center p-4"
          >
            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-[10px] font-black text-slate-400 capitalize tracking-widest">{errorDetails}</p>
          </motion.div>
        ) : (
          <motion.div
            key="content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="relative z-10"
          >
            <div className="flex items-center gap-6 mb-6">
              <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 text-[10px] font-black tracking-tighter shadow-inner">
                {weatherLabel}
              </div>
              <div>
                <div className="text-4xl font-black text-emerald-950 tracking-tighter">{weather?.temp ?? '--'}°C</div>
                <div className="text-sm text-slate-500 font-bold capitalize tracking-wide">{weather?.condition ?? 'Fetching...'}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-black text-slate-400 capitalize tracking-widest">Humidity</span>
                <span className="text-sm font-bold text-slate-800">{weather?.humidity ?? '--'}%</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-black text-slate-400 capitalize tracking-widest">Wind Speed</span>
                <span className="text-sm font-bold text-slate-800">{weather?.windSpeed ?? '--'} km/h</span>
              </div>
            </div>

            <div className="p-4 bg-emerald-50 rounded-xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                <div className="w-8 h-8 rounded-full border-4 border-emerald-500" />
              </div>
              <h4 className="text-[10px] font-black text-emerald-800 capitalize tracking-widest mb-1 relative z-10">Smart Advisory</h4>
              <p className="text-sm text-emerald-700 font-medium leading-relaxed relative z-10">
                {weather?.advice || 'Synchronizing with local climate patterns to provide tailored advice...'}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Decorative background element */}
      <div className="absolute bottom-[-20px] right-[-20px] w-40 h-40 bg-emerald-500/5 rounded-full blur-3xl -z-0" />
    </motion.div>
  );
}
