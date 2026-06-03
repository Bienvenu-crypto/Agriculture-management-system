'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { sendGAEvent } from '@next/third-parties/google';

// ─── Types ───────────────────────────────────────────────────────────────

interface CurrentWeather {
  temp: number;
  feelsLike: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  windDirection: number;
  cloudCover: number;
  pressure: number;
  uvIndex: number;
  dewPoint: number;
  visibility: number;
  precipitation: number;
  weatherCode: number;
  location: string;
}

interface DailyForecast {
  date: string;
  dayName: string;
  weatherCode: number;
  condition: string;
  tempMax: number;
  tempMin: number;
  precipSum: number;
  precipProb: number;
  sunrise: string;
  sunset: string;
  uvMax: number;
  windMax: number;
}

interface HourlyData {
  time: string;
  temp: number;
  precipProb: number;
  weatherCode: number;
}

interface WeatherState {
  current: CurrentWeather;
  daily: DailyForecast[];
  hourly: HourlyData[];
  lastUpdated: string;
}

// ─── Constants ───────────────────────────────────────────────────────────

const DEFAULT_COORDS = { lat: 0.3136, lon: 32.5811, name: 'Kampala' };

// ─── Weather Helpers ─────────────────────────────────────────────────────

const getWeatherInfo = (code: number) => {
  if (code === 0) return { condition: 'Clear Sky', icon: '☀️', label: 'SUN' };
  if (code === 1) return { condition: 'Mainly Clear', icon: '🌤️', label: 'CLEAR' };
  if (code === 2) return { condition: 'Partly Cloudy', icon: '⛅', label: 'CLOUD' };
  if (code === 3) return { condition: 'Overcast', icon: '☁️', label: 'OVERCAST' };
  if (code === 45 || code === 48) return { condition: 'Fog', icon: '🌫️', label: 'FOG' };
  if (code >= 51 && code <= 55) return { condition: 'Drizzle', icon: '🌦️', label: 'DRIZZLE' };
  if (code >= 56 && code <= 57) return { condition: 'Freezing Drizzle', icon: '🌧️', label: 'FREEZE' };
  if (code >= 61 && code <= 65) return { condition: 'Rain', icon: '🌧️', label: 'RAIN' };
  if (code >= 66 && code <= 67) return { condition: 'Freezing Rain', icon: '🌧️', label: 'FREEZE' };
  if (code >= 71 && code <= 77) return { condition: 'Snow', icon: '❄️', label: 'SNOW' };
  if (code >= 80 && code <= 82) return { condition: 'Rain Showers', icon: '🌦️', label: 'SHOWER' };
  if (code >= 85 && code <= 86) return { condition: 'Snow Showers', icon: '🌨️', label: 'SNOW' };
  if (code >= 95 && code <= 99) return { condition: 'Thunderstorm', icon: '⛈️', label: 'STORM' };
  return { condition: 'Stable', icon: '🌤️', label: 'NATURE' };
};

const getSmallWeatherIcon = (code: number) => {
  if (code === 0) return '☀️';
  if (code <= 3) return '⛅';
  if (code === 45 || code === 48) return '🌫️';
  if (code >= 51 && code <= 67) return '🌧️';
  if (code >= 71 && code <= 77) return '❄️';
  if (code >= 80 && code <= 82) return '🌦️';
  if (code >= 85 && code <= 86) return '🌨️';
  if (code >= 95) return '⛈️';
  return '🌤️';
};

const getUVLevel = (uv: number): { level: string; color: string; bgColor: string } => {
  if (uv <= 2) return { level: 'Low', color: 'text-green-700', bgColor: 'bg-green-500' };
  if (uv <= 5) return { level: 'Moderate', color: 'text-yellow-700', bgColor: 'bg-yellow-500' };
  if (uv <= 7) return { level: 'High', color: 'text-orange-700', bgColor: 'bg-orange-500' };
  if (uv <= 10) return { level: 'Very High', color: 'text-red-700', bgColor: 'bg-red-500' };
  return { level: 'Extreme', color: 'text-purple-700', bgColor: 'bg-purple-500' };
};

const getWindDirection = (degrees: number): string => {
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return dirs[Math.round(degrees / 22.5) % 16];
};

const getDrainageQuality = (precip: number, humidity: number): string => {
  if (precip > 10 || humidity > 85) return 'Poor';
  if (precip > 5 || humidity > 75) return 'Fair';
  return 'Good';
};

// ─── Agricultural Advice Engine ──────────────────────────────────────────

const getDetailedAdvice = (current: CurrentWeather, daily: DailyForecast[]) => {
  const advisories: Array<{ crop: string; status: string; statusColor: string; statusBg: string; message: string }> = [];

  // Planting advice
  const soilMoistureOk = current.humidity >= 60 && current.humidity <= 80;
  const plantingCondition = soilMoistureOk && current.precipitation < 5;

  if (plantingCondition) {
    const nextRain = daily.find(d => d.precipProb > 50);
    const nextRainDay = nextRain ? `Rain expected ${nextRain.dayName}` : 'No significant rain forecast';
    advisories.push({
      crop: 'Maize Planting',
      status: 'Good to Go',
      statusColor: 'text-emerald-700',
      statusBg: 'bg-emerald-100',
      message: `Soil moisture levels are ${soilMoistureOk ? 'optimal' : 'suboptimal'} (${current.humidity}%). ${nextRainDay}. Recommended variety: NARO-H1.`
    });
  } else {
    advisories.push({
      crop: 'Maize Planting',
      status: 'Wait',
      statusColor: 'text-amber-700',
      statusBg: 'bg-amber-100',
      message: `Current conditions ${current.precipitation > 5 ? 'too wet' : 'humidity too ' + (current.humidity < 60 ? 'low' : 'high')} for planting. Monitor soil moisture before proceeding.`
    });
  }

  // Harvest advice
  const rainToday = current.precipitation > 0 || daily[0]?.precipProb > 60;
  if (rainToday) {
    advisories.push({
      crop: 'Coffee Harvesting',
      status: 'Use Caution',
      statusColor: 'text-amber-700',
      statusBg: 'bg-amber-100',
      message: `${Math.round(daily[0]?.precipProb || 0)}% rain probability. Harvest only morning batches. Ensure drying racks are covered before ${daily[0]?.sunset ? new Date(daily[0].sunset).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '3 PM'}. Allow 24h dry window after rain.`
    });
  } else {
    advisories.push({
      crop: 'Coffee Harvesting',
      status: 'Good to Go',
      statusColor: 'text-emerald-700',
      statusBg: 'bg-emerald-100',
      message: `Clear conditions are ideal for harvesting and drying. Proceed with full-day harvest operations.`
    });
  }

  // Spraying advice
  const highHumidity = current.humidity > 70;
  const rainRisk = daily[0]?.precipProb > 30;
  const fungalRisk = highHumidity && current.temp > 22;

  if (highHumidity && rainRisk) {
    advisories.push({
      crop: 'Tomato Spraying',
      status: 'Hold Off',
      statusColor: 'text-red-700',
      statusBg: 'bg-red-100',
      message: `High humidity (${current.humidity}%) and rain risk will wash off pesticides. ${fungalRisk ? 'Fungal risk elevated — monitor closely.' : 'Reschedule to first dry day.'}`
    });
  } else if (current.windSpeed > 15) {
    advisories.push({
      crop: 'Tomato Spraying',
      status: 'Use Caution',
      statusColor: 'text-amber-700',
      statusBg: 'bg-amber-100',
      message: `Wind speed ${current.windSpeed} km/h may cause spray drift. Consider early morning application when wind typically calms.`
    });
  } else {
    advisories.push({
      crop: 'Tomato Spraying',
      status: 'Good to Go',
      statusColor: 'text-emerald-700',
      statusBg: 'bg-emerald-100',
      message: `Conditions are favorable for pesticide application. Low wind and dry conditions will ensure good coverage.`
    });
  }

  return advisories;
};

// Generates active weather alerts
const getActiveAlerts = (current: CurrentWeather, daily: DailyForecast[]) => {
  const alerts: Array<{ type: 'danger' | 'warning' | 'info'; icon: string; title: string; message: string; timing: string }> = [];

  // Heavy rain alert
  if (current.precipitation > 5 || daily[0]?.precipProb > 70) {
    alerts.push({
      type: 'danger',
      icon: '',
      title: 'Heavy Rain',
      message: `${current.weatherCode >= 95 ? 'Thunderstorm' : 'Heavy showers'} expected. Potential localized flooding in low-lying fields.`,
      timing: `Updated ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    });
  }

  // High UV alert
  if (current.uvIndex >= 7) {
    alerts.push({
      type: 'warning',
      icon: '☀️',
      title: 'High UV Index',
      message: `UV index at ${Math.round(current.uvIndex)}. Limit midday exposure. Protect crops from leaf scorch.`,
      timing: 'Peak 10 AM – 3 PM'
    });
  }

  // Wind alert
  if (current.windSpeed > 20) {
    alerts.push({
      type: 'warning',
      icon: '💨',
      title: 'Strong Winds',
      message: `Wind gusts up to ${current.windSpeed} km/h. Secure lightweight structures and delay aerial spraying.`,
      timing: `Active now`
    });
  }

  // Drought / dry conditions
  if (current.humidity < 40 && daily.every(d => d.precipProb < 20)) {
    alerts.push({
      type: 'info',
      icon: '🏜️',
      title: 'Dry Spell Advisory',
      message: `Low humidity and no rain forecast. Increase irrigation frequency. Mulch exposed soil.`,
      timing: 'Next 3 days'
    });
  }

  // Extended rain advisory
  const rainyDays = daily.filter(d => d.precipProb > 50).length;
  if (rainyDays >= 2) {
    alerts.push({
      type: 'info',
      icon: '📋',
      title: 'Extended Rain Advisory',
      message: `Rain expected over ${rainyDays} of the next 3 days. Plan accordingly for field operations.`,
      timing: 'Seasonal note'
    });
  }

  return alerts;
};

// ─── Moon Phase Calculator ───────────────────────────────────────────────

const getMoonPhase = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const day = now.getDate();

  // Calculate moon phase using Conway's algorithm
  let r = year % 100;
  r %= 19;
  if (r > 9) r -= 19;
  r = ((r * 11) % 30) + month + day;
  if (month < 3) r += 2;
  r -= ((year < 2000) ? 4 : 8.3);
  r = Math.floor(r + 0.5) % 30;
  if (r < 0) r += 30;

  // Map to phase
  let phaseName: string;
  let phaseIcon: string;
  let daysToNew: number;

  if (r === 0) { phaseName = 'New Moon'; phaseIcon = '🌑'; daysToNew = 0; }
  else if (r <= 3) { phaseName = 'Waxing Crescent'; phaseIcon = '🌒'; daysToNew = 30 - r; }
  else if (r <= 7) { phaseName = 'First Quarter'; phaseIcon = '🌓'; daysToNew = 30 - r; }
  else if (r <= 11) { phaseName = 'Waxing Gibbous'; phaseIcon = '🌔'; daysToNew = 30 - r; }
  else if (r <= 14) { phaseName = 'Full Moon'; phaseIcon = '🌕'; daysToNew = 30 - r; }
  else if (r <= 18) { phaseName = 'Waning Gibbous'; phaseIcon = '🌖'; daysToNew = 30 - r; }
  else if (r <= 22) { phaseName = 'Last Quarter'; phaseIcon = '🌗'; daysToNew = 30 - r; }
  else if (r <= 26) { phaseName = 'Waning Crescent'; phaseIcon = '🌘'; daysToNew = 30 - r; }
  else { phaseName = 'New Moon'; phaseIcon = '🌑'; daysToNew = 0; }

  // Approximate next new moon date
  const nextNew = new Date(now);
  nextNew.setDate(nextNew.getDate() + daysToNew);
  const nextNewStr = nextNew.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return { phaseName, phaseIcon, daysToNew, nextNewStr };
};

// ─── Component ───────────────────────────────────────────────────────────

export default function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherState | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);

  const lastCoords = useRef<{ lat: number; lon: number; name: string }>(DEFAULT_COORDS);
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
      const weatherInfo = getWeatherInfo(current.weather_code);

      const newCurrent: CurrentWeather = {
        temp: Math.round(current.temperature_2m),
        feelsLike: Math.round(current.apparent_temperature ?? current.temperature_2m),
        condition: weatherInfo.condition,
        humidity: Math.round(current.relative_humidity_2m),
        windSpeed: Math.round(current.wind_speed_10m),
        windDirection: current.wind_direction_10m ?? 0,
        cloudCover: current.cloud_cover ?? 0,
        pressure: Math.round(current.pressure_msl ?? current.surface_pressure ?? 1013),
        uvIndex: current.uv_index ?? 0,
        dewPoint: Math.round(current.dew_point_2m ?? 0),
        visibility: current.visibility ? (current.visibility / 1000) : 10,
        precipitation: current.precipitation ?? 0,
        weatherCode: current.weather_code,
        location: name
      };

      // Parse daily forecast
      const dailyForecasts: DailyForecast[] = [];
      if (data.daily) {
        const d = data.daily;
        for (let i = 0; i < (d.time?.length ?? 0) && i < 3; i++) {
          const dateObj = new Date(d.time[i]);
          const dayName = i === 0 ? 'Today' : dateObj.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
          // Open-Meteo's daily code aggregates the most extreme weather of the whole day.
          // To reflect "real" current conditions for Today, we override it with the live current weather code.
          const effectiveCode = i === 0 ? current.weather_code : d.weather_code[i];
          const info = getWeatherInfo(effectiveCode);
          dailyForecasts.push({
            date: d.time[i],
            dayName,
            weatherCode: effectiveCode,
            condition: info.condition,
            tempMax: Math.round(d.temperature_2m_max[i]),
            tempMin: Math.round(d.temperature_2m_min[i]),
            precipSum: d.precipitation_sum?.[i] ?? 0,
            precipProb: d.precipitation_probability_max?.[i] ?? 0,
            sunrise: d.sunrise?.[i] ?? '',
            sunset: d.sunset?.[i] ?? '',
            uvMax: d.uv_index_max?.[i] ?? 0,
            windMax: d.wind_speed_10m_max?.[i] ?? 0
          });
        }
      }

      // Parse hourly data (next 24 hours)
      const hourlyData: HourlyData[] = [];
      if (data.hourly) {
        const h = data.hourly;
        const now = new Date();
        // Start from the current hour (ignoring minutes) so the chart shows "Now" as the first item
        const currentHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());
        for (let i = 0; i < (h.time?.length ?? 0) && hourlyData.length < 24; i++) {
          const hTime = new Date(h.time[i]);
          if (hTime >= currentHour) {
            hourlyData.push({
              time: h.time[i],
              temp: Math.round(h.temperature_2m[i]),
              precipProb: h.precipitation_probability?.[i] ?? 0,
              weatherCode: h.weather_code?.[i] ?? 0
            });
          }
        }
      }

      setWeather({
        current: newCurrent,
        daily: dailyForecasts,
        hourly: hourlyData,
        lastUpdated: new Date().toLocaleString('en-US', {
          day: 'numeric', month: 'short', year: 'numeric',
          hour: '2-digit', minute: '2-digit'
        })
      });
      setErrorDetails(null);
      setLoading(false);

      sendGAEvent({ event: 'weather_fetch_success', value: name });
    } catch (err: any) {
      if (!weather) {
        setErrorDetails('Initial sync in progress...');
      }
      if (retryCount < 3) {
        setTimeout(() => performFetch(lat, lon, name, retryCount + 1), Math.pow(2, retryCount) * 1500);
      }
    } finally {
      fetchLock.current = false;
    }
  };

  const updateLocationAndWeather = async (lat: number, lon: number) => {
    if (
      Math.abs(lastCoords.current.lat - lat) < 0.005 &&
      Math.abs(lastCoords.current.lon - lon) < 0.005 &&
      weather
    ) {
      return;
    }

    let name = 'Kampala';
    try {
      const geoRes = await fetch(`/api/geocode?lat=${lat}&lon=${lon}`);
      if (geoRes.ok) {
        const geoData = await geoRes.json();
        name = geoData.address?.city || geoData.address?.town || geoData.address?.village || geoData.address?.suburb || 'Your Location';
      }
    } catch (e) {
      console.warn('Geocoding failed, using previous/default name');
      name = lastCoords.current.name || 'Kampala';
    }

    lastCoords.current = { lat, lon, name };
    performFetch(lat, lon, name);
  };

  useEffect(() => {
    performFetch(DEFAULT_COORDS.lat, DEFAULT_COORDS.lon, DEFAULT_COORDS.name);

    let watchId: number;
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => updateLocationAndWeather(pos.coords.latitude, pos.coords.longitude),
        () => console.warn('Location permission denied. Staying in Kampala.'),
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
    }, 900000);

    return () => {
      clearInterval(refreshTimer);
      if (watchId !== undefined && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, []);

  const moonPhase = useMemo(() => getMoonPhase(), []);

  // Computed values
  const advisories = useMemo(() => {
    if (!weather) return [];
    return getDetailedAdvice(weather.current, weather.daily);
  }, [weather]);

  const alerts = useMemo(() => {
    if (!weather) return [];
    return getActiveAlerts(weather.current, weather.daily);
  }, [weather]);

  const soilTemp = useMemo(() => {
    if (!weather) return 0;
    // Approximate soil temperature from air temperature
    return Math.round(weather.current.temp - 2);
  }, [weather]);

  const drainage = useMemo(() => {
    if (!weather) return 'Good';
    return getDrainageQuality(weather.current.precipitation, weather.current.humidity);
  }, [weather]);

  // ─── Loading State ─────────────────────────────────────────────────

  if (!weather && loading) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-xs font-bold text-slate-400 tracking-widest uppercase">
          {errorDetails || 'Loading weather data...'}
        </p>
      </div>
    );
  }

  if (!weather) return null;

  const { current, daily, hourly } = weather;
  const weatherInfo = getWeatherInfo(current.weatherCode);
  const uvInfo = getUVLevel(current.uvIndex);

  return (
    <div className="space-y-6">

      {/* ── Hero Banner ──────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl"
        style={{
          background: 'linear-gradient(135deg, #1a3a2a 0%, #2d5016 40%, #3a6b1e 70%, #4a7c2e 100%)'
        }}
      >
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-300/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" />
        </div>

        <div className="relative z-10 p-6 lg:p-8">
          {/* Top row: Location + Last updated */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-white/60 text-xs"></span>
                <h3 className="text-xl lg:text-2xl font-black text-white tracking-tight">
                  {current.location}
                </h3>
              </div>
              <p className="text-white/50 text-xs font-medium">
                Central Region, Uganda
              </p>
            </div>
            <div className="text-right">
              <p className="text-white/40 text-[10px] font-bold uppercase tracking-wider">
                Last updated: {weather.lastUpdated}
              </p>
            </div>
          </div>

          {/* Main weather display */}
          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6 lg:gap-10 mb-6">
            {/* Temperature */}
            <div className="flex items-center gap-4">
              <span className="text-6xl lg:text-7xl">{weatherInfo.icon}</span>
              <div>
                <div className="flex items-start">
                  <span className="text-5xl lg:text-6xl font-black text-white tracking-tighter leading-none">
                    {current.temp}
                  </span>
                  <span className="text-xl text-white/70 font-bold mt-1">°C</span>
                </div>
                <p className="text-white/70 text-sm font-semibold mt-1">{current.condition}</p>
                <p className="text-white/40 text-xs">
                  Feels like {current.feelsLike}°C · High {daily[0]?.tempMax ?? '--'}° / Low {daily[0]?.tempMin ?? '--'}°
                </p>
              </div>
            </div>

            {/* Quick stats */}
            <div className="flex flex-wrap gap-4 lg:gap-6">
              {[
                { icon: '', label: 'Humidity', value: `${current.humidity}%` },
                { icon: '', label: 'Wind', value: `${current.windSpeed} km/h` },
                { icon: '', label: 'Cloud Cover', value: `${current.cloudCover}%` },
                { icon: '', label: 'Visibility', value: `${current.visibility.toFixed(1)} km` },
                { icon: '', label: 'Pressure', value: `${current.pressure}` },
              ].map((stat) => (
                <div key={stat.label} className="flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2 backdrop-blur-sm">
                  <span className="text-lg">{stat.icon}</span>
                  <div>
                    <p className="text-white/40 text-[9px] font-bold uppercase tracking-wider">{stat.label}</p>
                    <p className="text-white font-bold text-sm">{stat.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Alert banner */}
          {alerts.length > 0 && alerts[0].type === 'danger' && (
            <div className="bg-amber-500/20 backdrop-blur-sm border border-amber-400/30 rounded-xl px-4 py-3 flex items-center gap-3">
              <span className="text-amber-300 text-sm"></span>
              <p className="text-amber-100 text-sm font-medium flex-1">
                <span className="font-bold">{alerts[0].title}:</span> {alerts[0].message}
              </p>
              <button className="text-amber-300/60 hover:text-amber-200 text-lg leading-none">×</button>
            </div>
          )}
        </div>
      </motion.div>

      {/* ── 3-Day Forecast ───────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6"
      >
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-5">
          3-Day Forecast
        </h3>
        <div className="grid grid-cols-3 gap-4">
          {daily.map((day, i) => (
            <motion.div
              key={day.date}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.05 }}
              className={`relative rounded-xl p-4 text-center transition-all ${i === 0
                ? 'bg-emerald-50 border-2 border-emerald-200 shadow-sm'
                : 'bg-slate-50 border border-slate-100 hover:border-slate-200 hover:shadow-sm'
                }`}
            >
              <p className={`text-xs font-black uppercase tracking-wider mb-3 ${i === 0 ? 'text-emerald-700' : 'text-slate-500'
                }`}>
                {day.dayName}
              </p>
              <span className="text-3xl block mb-2">{getSmallWeatherIcon(day.weatherCode)}</span>
              <p className="text-xs text-slate-500 font-medium mb-3">{day.condition}</p>
              <div className="flex items-center justify-center gap-1 mb-3">
                <span className="text-lg font-black text-slate-900">{day.tempMax}°</span>
                <span className="text-sm text-slate-400 font-bold">{day.tempMin}°</span>
              </div>
              <div className="flex items-center justify-center gap-1 text-xs">
                <span className="text-blue-500"></span>
                <span className="text-blue-600 font-bold">{day.precipProb}%</span>
              </div>
              {day.precipSum > 0 && (
                <p className="text-[10px] text-slate-400 mt-1">{day.precipSum.toFixed(1)}mm</p>
              )}
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* ── Two Column Layout: Left & Right Panels ────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left Column (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">

          {/* Temperature Trend */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-black text-slate-800">Temperature Trend</h3>
                <p className="text-[10px] text-slate-400 font-medium">
                  Hourly for today — {new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
            </div>

            {/* Simple temperature chart using CSS */}
            <div className="relative h-44 mt-2">
              {hourly.length > 0 ? (
                <div className="flex items-end h-full gap-0.5">
                  {hourly.slice(0, 24).map((h, i) => {
                    const temps = hourly.slice(0, 24).map(x => x.temp);
                    const minT = Math.min(...temps);
                    const maxT = Math.max(...temps);
                    const range = maxT - minT || 1;
                    const heightPercent = ((h.temp - minT) / range) * 70 + 20;
                    const hTime = new Date(h.time);
                    const hour = hTime.getHours();
                    const showLabel = i % 3 === 0;

                    return (
                      <div key={i} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                        {/* Tooltip */}
                        <div className="absolute bottom-full mb-1 bg-slate-800 text-white text-[9px] font-bold px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                          {h.temp}°C
                        </div>
                        <div
                          className="w-full rounded-t-sm transition-all duration-300 group-hover:opacity-80"
                          style={{
                            height: `${heightPercent}%`,
                            background: h.temp >= 30
                                ? 'linear-gradient(to top, #fbbf24, #f59e0b)'
                                : 'linear-gradient(to top, #6ee7b7, #10b981)',
                            opacity: 0.7 + (i === 0 ? 0.3 : 0),
                          }}
                        />
                        {showLabel && (
                          <span className="text-[8px] text-slate-400 font-bold mt-1">
                            {hour.toString().padStart(2, '0')}:00
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                  Hourly data loading...
                </div>
              )}

              {/* Legend */}
              <div className="flex items-center gap-4 mt-3 justify-end">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-2 rounded-sm bg-emerald-500" />
                  <span className="text-[9px] text-slate-400 font-bold">Temperature</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* AI Planting & Harvest Advisories */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6"
          >
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-black text-slate-800">AI Planting & Harvest Advisories</h3>
            </div>
            <p className="text-[10px] text-slate-400 font-medium mb-5">
              Based on current weather conditions · Updated hourly
            </p>

            <div className="space-y-4">
              {advisories.map((adv, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.25 + i * 0.05 }}
                  className="flex items-start gap-4 p-4 rounded-xl bg-slate-50/50 border border-slate-100 hover:border-slate-200 transition-all"
                >
                  <div className={`mt-1 w-2.5 h-2.5 rounded-full shrink-0 ${adv.statusColor === 'text-emerald-700' ? 'bg-emerald-500' :
                    adv.statusColor === 'text-amber-700' ? 'bg-amber-500' : 'bg-red-500'
                    }`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-sm font-black text-slate-800">{adv.crop}</span>
                      <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${adv.statusBg} ${adv.statusColor}`}>
                        {adv.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">{adv.message}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Right Column (1/3 width) */}
        <div className="space-y-6">

          {/* UV Index */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5"
          >
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">
              UV Index
            </h3>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-3xl font-black text-slate-900">{Math.round(current.uvIndex)}</span>
              <span className={`text-sm font-black ${uvInfo.color}`}>{uvInfo.level}</span>
            </div>
            {/* UV Scale bar */}
            <div className="relative h-2 rounded-full bg-gradient-to-r from-green-400 via-yellow-400 via-orange-400 to-red-500 mb-3">
              <div
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full border-2 border-slate-800 shadow-md transition-all"
                style={{ left: `${Math.min((current.uvIndex / 11) * 100, 100)}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              {current.uvIndex >= 7
                ? 'Wear sunscreen · Limit midday exposure · Protect crops from leaf scorch'
                : current.uvIndex >= 3
                  ? 'Moderate exposure is fine · Use shade for transplants'
                  : 'Low UV — no special precautions needed'}
            </p>
          </motion.div>

          {/* Soil Conditions */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5"
          >
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">
              Soil Conditions
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Moisture', value: `${Math.min(Math.max(current.humidity - 10, 30), 90)}%`, sub: '' },
                { label: 'Temperature', value: `${soilTemp}°C`, sub: '' },
                { label: 'pH Level', value: '6.4', sub: '' },
                { label: 'Drainage', value: drainage, sub: '' },
              ].map((item) => (
                <div key={item.label} className="bg-slate-50 rounded-xl p-3 text-center">
                  <p className="text-lg font-black text-slate-800">{item.value}</p>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">{item.label}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Moon Phase */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 text-center"
          >
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">
              Moon Phase
            </h3>
            <span className="text-5xl block mb-2">{moonPhase.phaseIcon}</span>
            <p className="text-sm font-black text-slate-800">{moonPhase.phaseName}</p>
            <p className="text-[10px] text-slate-400 font-medium mt-1">
              New Moon in {moonPhase.daysToNew} days · {moonPhase.nextNewStr}
            </p>
          </motion.div>

          {/* Active Alerts */}
          {alerts.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5"
            >
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">
                Active Alerts
              </h3>
              <div className="space-y-3">
                {alerts.map((alert, i) => (
                  <div
                    key={i}
                    className={`rounded-xl p-3 border ${alert.type === 'danger'
                      ? 'bg-red-50 border-red-200'
                      : alert.type === 'warning'
                        ? 'bg-amber-50 border-amber-200'
                        : 'bg-blue-50 border-blue-200'
                      }`}
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-sm shrink-0 mt-0.5"></span>
                      <div className="min-w-0">
                        <p className={`text-xs font-black ${alert.type === 'danger' ? 'text-red-800' :
                          alert.type === 'warning' ? 'text-amber-800' : 'text-blue-800'
                          }`}>
                          {alert.title}
                          <span className="font-medium"> — {alert.message}</span>
                        </p>
                        <p className={`text-[9px] font-bold mt-1 ${alert.type === 'danger' ? 'text-red-500' :
                          alert.type === 'warning' ? 'text-amber-500' : 'text-blue-500'
                          }`}>
                          {alert.timing}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
