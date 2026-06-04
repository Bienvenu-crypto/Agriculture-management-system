import { NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';
import { db } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const { crop } = await req.json();

    if (!crop || typeof crop !== 'string') {
      return NextResponse.json({ error: 'Invalid crop name provided' }, { status: 400 });
    }

    const normalizedCrop = crop.trim().toLowerCase();

    // Check cache
    const { data: cached } = await db
      .from('market_prices_cache')
      .select('data_json, updated_at')
      .eq('crop_name', normalizedCrop)
      .maybeSingle();

    if (cached) {
      const hoursDiff = (Date.now() - new Date(cached.updated_at).getTime()) / (1000 * 60 * 60);
      if (hoursDiff < 24) {
        return NextResponse.json(JSON.parse(cached.data_json));
      }
    }

    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    let data;

    if (!apiKey) {
      data = generateMockData(crop);
    } else {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: `Generate realistic mock market price data for the crop: "${crop}" in Uganda (prices in UGX per KG).\nProvide the current price, the percentage change over the last month (e.g., "+2.4%" or "-1.2%"), the overall trend ("up", "down", or "stable"), and historical prices for the last 6 months (Oct, Nov, Dec, Jan, Feb, Mar).`,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                crop: { type: Type.STRING },
                price: { type: Type.NUMBER },
                change: { type: Type.STRING },
                trend: { type: Type.STRING },
                historical: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      month: { type: Type.STRING },
                      price: { type: Type.NUMBER },
                    },
                    required: ['month', 'price'],
                  },
                },
              },
              required: ['crop', 'price', 'change', 'trend', 'historical'],
            },
          },
        });
        data = JSON.parse(response.text || '{}');
      } catch (aiError) {
        data = generateMockData(crop);
      }
    }

    // Save to cache (upsert)
    await db.from('market_prices_cache').upsert({
      crop_name: normalizedCrop,
      data_json: JSON.stringify(data),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'crop_name' });

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Market price search error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch market data' }, { status: 500 });
  }
}

function generateMockData(cropName: string) {
  const basePrice = Math.floor(Math.random() * 4500) + 500;
  const trends = ['up', 'down', 'stable'];
  const trend = trends[Math.floor(Math.random() * trends.length)];
  const changeNum = (Math.random() * 10).toFixed(1);
  const change = trend === 'up' ? `+${changeNum}%` : trend === 'down' ? `-${changeNum}%` : '0.0%';
  const months = ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
  const historical = months.map((month, index) => {
    if (index === 5) return { month, price: basePrice };
    const variance = Math.floor(Math.random() * 200) - 100;
    let histPrice = basePrice;
    if (trend === 'up') histPrice = basePrice - (5 - index) * 50 + variance;
    else if (trend === 'down') histPrice = basePrice + (5 - index) * 50 + variance;
    else histPrice = basePrice + variance;
    return { month, price: Math.max(100, histPrice) };
  });
  return {
    crop: cropName.charAt(0).toUpperCase() + cropName.slice(1),
    price: basePrice,
    change,
    trend,
    historical,
  };
}