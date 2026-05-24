import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const secret = searchParams.get('secret');

    if (secret !== 'admin2026') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const users = db.prepare('SELECT id, name, email, phone, district, role, created_at FROM marketplace_users ORDER BY created_at DESC').all();
    const listings = db.prepare('SELECT l.*, mu.name as seller_name FROM listings l JOIN marketplace_users mu ON l.seller_id = mu.id ORDER BY l.created_at DESC').all();
    const orders = db.prepare('SELECT bo.*, mu.name as buyer_name FROM buy_orders bo JOIN marketplace_users mu ON bo.buyer_id = mu.id ORDER BY bo.created_at DESC').all();
    const trades = db.prepare('SELECT t.*, s.name as seller_name, b.name as buyer_name FROM trades t JOIN marketplace_users s ON t.seller_id = s.id JOIN marketplace_users b ON t.buyer_id = b.id ORDER BY t.created_at DESC').all();

    return NextResponse.json({
      users,
      listings,
      orders,
      trades
    });
  } catch (error) {
    console.error('Admin marketplace fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const secret = searchParams.get('secret');
    const { type, id } = await req.json();

    if (secret !== 'admin2026') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (type === 'user') {
      // First delete dependent trades
      db.prepare('DELETE FROM trades WHERE seller_id = ? OR buyer_id = ?').run(id, id);
      db.prepare('DELETE FROM marketplace_users WHERE id = ?').run(id);
    } else if (type === 'listing') {
      // Delete trades associated with this listing
      db.prepare('DELETE FROM trades WHERE listing_id = ?').run(id);
      db.prepare('DELETE FROM listings WHERE id = ?').run(id);
    } else if (type === 'order') {
      // Delete trades associated with this order
      db.prepare('DELETE FROM trades WHERE buy_order_id = ?').run(id);
      db.prepare('DELETE FROM buy_orders WHERE id = ?').run(id);
    }


    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
  }
}
