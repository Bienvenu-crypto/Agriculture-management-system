import { NextResponse } from 'next/server';
import db from '@/lib/db';
import crypto from 'crypto';


export async function POST(req: Request) {
  try {
    const { user_email, crop, planting_date, region, data_json } = await req.json();

    if (!user_email || !crop || !planting_date || !region || !data_json) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const id = crypto.randomUUID();
    const stmt = db.prepare(`
      INSERT INTO crop_calendars (id, user_email, crop, planting_date, region, data_json)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(id, user_email, crop, planting_date, region, JSON.stringify(data_json));

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

    const stmt = db.prepare(`
      SELECT * FROM crop_calendars 
      WHERE user_email = ? 
      ORDER BY timestamp DESC
    `);
    const calendars = stmt.all(email);

    // Parse the data_json back into an object
    const results = calendars.map((c: any) => ({
      ...c,
      data_json: JSON.parse(c.data_json)
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

    const stmt = db.prepare('DELETE FROM crop_calendars WHERE id = ? AND user_email = ?');
    stmt.run(id, email);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Database Error:', error);
    return NextResponse.json({ error: 'Failed to delete calendar' }, { status: 500 });
  }
}
