import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get('lat');
  const lon = searchParams.get('lon');

  if (!lat || !lon) {
    return NextResponse.json({ error: 'Missing lat or lon' }, { status: 400 });
  }

  const locationKey = `${lat},${lon}`;

  try {
    // Check cache first
    try {
      const cached = db.prepare('SELECT data_json, updated_at FROM weather_cache WHERE location_key = ?').get(locationKey) as { data_json: string, updated_at: string } | undefined;

      if (cached) {
        const cacheTime = new Date(cached.updated_at).getTime();
        const now = new Date().getTime();
        const hoursDiff = (now - cacheTime) / (1000 * 60 * 60);

        if (hoursDiff < 1) {
          return NextResponse.json(JSON.parse(cached.data_json));
        }
      }
    } catch (cacheErr) {
      console.warn('Weather cache lookup failed:', cacheErr);
    }

    // Fetch comprehensive weather data including forecast, hourly, and atmospheric conditions
    const apiUrl = new URL('https://api.open-meteo.com/v1/forecast');
    apiUrl.searchParams.set('latitude', lat);
    apiUrl.searchParams.set('longitude', lon);
    apiUrl.searchParams.set('current', [
      'temperature_2m',
      'relative_humidity_2m',
      'weather_code',
      'wind_speed_10m',
      'wind_direction_10m',
      'apparent_temperature',
      'cloud_cover',
      'pressure_msl',
      'surface_pressure',
      'uv_index',
      'dew_point_2m',
      'visibility',
      'precipitation'
    ].join(','));
    apiUrl.searchParams.set('hourly', [
      'temperature_2m',
      'precipitation_probability',
      'weather_code'
    ].join(','));
    apiUrl.searchParams.set('daily', [
      'weather_code',
      'temperature_2m_max',
      'temperature_2m_min',
      'precipitation_sum',
      'precipitation_probability_max',
      'sunrise',
      'sunset',
      'uv_index_max',
      'wind_speed_10m_max'
    ].join(','));
    apiUrl.searchParams.set('timezone', 'auto');
    apiUrl.searchParams.set('forecast_days', '3');

    const response = await fetch(apiUrl.toString(), {
      headers: { 'Accept': 'application/json' }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Upstream Weather API returned ${response.status}: ${errorText}`);
    }

    const data = await response.json();

    // Save to cache
    try {
      db.prepare(`
        INSERT INTO weather_cache (location_key, data_json, updated_at)
        VALUES (?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(location_key) DO UPDATE SET data_json = excluded.data_json, updated_at = CURRENT_TIMESTAMP
      `).run(locationKey, JSON.stringify(data));
    } catch (saveErr) {
      console.warn('Failed to save weather to cache:', saveErr);
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Weather API Server Error:', error);

    // Fallback to stale cache if available
    try {
      const staleCached = db.prepare('SELECT data_json FROM weather_cache WHERE location_key = ?').get(locationKey) as { data_json: string } | undefined;
      if (staleCached) {
        console.log('Serving stale weather cache for:', locationKey);
        const parsed = JSON.parse(staleCached.data_json);
        parsed._isStale = true;
        return NextResponse.json(parsed);
      }
    } catch (e) {
      console.warn('Weather stale cache fallback failed:', e);
    }

    return NextResponse.json({ error: `Weather Service Error: ${error.message || 'Unknown error'}` }, { status: 500 });
  }
}
