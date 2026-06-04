import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const { data: readings, error } = await db
      .from('sensor_readings')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(20);
    if (error) throw error;

    return NextResponse.json((readings || []).reverse());
  } catch (error: any) {
    return NextResponse.json([]);
  }
}

export async function POST(req: Request) {
  try {
    const { moisture, temperature, ph, battery_level } = await req.json();
    const { error } = await db.from('sensor_readings').insert({
      moisture,
      temperature,
      ph,
      battery_level: battery_level ?? 100,
    });
    if (error) throw error;

    return NextResponse.json({ success: true, message: 'Sensor data logged' });
  } catch (error: any) {
    console.error('Sensor Logging Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}