import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    const { user_email, crop, planting_date, region, data_json } = await req.json();

    if (!user_email || !crop || !planting_date || !region || !data_json) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const id = crypto.randomUUID();
    const { error } = await db.from('crop_calendars').insert({
      id,
      user_email,
      crop,
      planting_date,
      region,
      data_json: JSON.stringify(data_json),
    });
    if (error) throw error;

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error('Database Error:', error);
    return NextResponse.json({ error: 'Failed to save calendar' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const { data: calendars, error } = await db
      .from('crop_calendars')
      .select('*')
      .eq('user_email', email)
      .order('timestamp', { ascending: false });
    if (error) throw error;

    const results = (calendars || []).map((c: any) => ({
      ...c,
      data_json: typeof c.data_json === 'string' ? JSON.parse(c.data_json) : c.data_json,
    }));

    return NextResponse.json({ calendars: results });
  } catch (error) {
    console.error('Database Error:', error);
    return NextResponse.json({ error: 'Failed to fetch calendars' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const email = searchParams.get('email');

    if (!id || !email) {
      return NextResponse.json({ error: 'ID and email are required' }, { status: 400 });
    }

    const { error } = await db
      .from('crop_calendars')
      .delete()
      .eq('id', id)
      .eq('user_email', email);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Database Error:', error);
    return NextResponse.json({ error: 'Failed to delete calendar' }, { status: 500 });
  }
}