import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get('lat');
  const lon = searchParams.get('lon');

  if (!lat || !lon) {
    return NextResponse.json({ error: 'Missing lat or lon' }, { status: 400 });
  }

  const roundedLat = parseFloat(lat).toFixed(2);
  const roundedLon = parseFloat(lon).toFixed(2);
  const cacheKey = `geo:${roundedLat},${roundedLon}`;

  try {
    // Check cache
    try {
      const { data: cached } = await db
        .from('weather_cache')
        .select('data_json')
        .eq('location_key', cacheKey)
        .maybeSingle();
      if (cached && cached.data_json.includes('address')) {
        return NextResponse.json(JSON.parse(cached.data_json));
      }
    } catch (e) { }

    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`,
      {
        headers: {
          'Accept-Language': 'en',
          'User-Agent': 'AgroBot/1.0 (ndayishimiyebienvenu34@gmail.com)',
        },
      }
    );
    if (!response.ok) throw new Error(`Geocoding API returned ${response.status}`);

    const data = await response.json();

    try {
      await db.from('weather_cache').upsert({
        location_key: cacheKey,
        data_json: JSON.stringify(data),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'location_key' });
    } catch (e) { }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Geocoding API Error:', error);
    return NextResponse.json({ error: `Geocoding Service Error: ${error.message}` }, { status: 500 });
  }
}