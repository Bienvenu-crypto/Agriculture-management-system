import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const secret = searchParams.get('secret');

    if (secret !== 'admin2026') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const appUsers = db.prepare('SELECT id, name, email, district, created_at FROM users ORDER BY created_at DESC').all();
    const marketplaceUsers = db.prepare('SELECT id, name, email, phone, district, role, is_subscribed, created_at FROM marketplace_users ORDER BY created_at DESC').all();
    const chats = db.prepare('SELECT id, user_email, role, content, image_url, timestamp FROM chats ORDER BY timestamp DESC').all();
    const listings = db.prepare('SELECT l.*, mu.name as seller_name FROM listings l JOIN marketplace_users mu ON l.seller_id = mu.id ORDER BY l.created_at DESC').all();
    const orders = db.prepare('SELECT bo.*, mu.name as buyer_name FROM buy_orders bo JOIN marketplace_users mu ON bo.buyer_id = mu.id ORDER BY bo.created_at DESC').all();
    const trades = db.prepare('SELECT t.*, s.name as seller_name, b.name as buyer_name FROM trades t JOIN marketplace_users s ON t.seller_id = s.id JOIN marketplace_users b ON t.buyer_id = b.id ORDER BY t.created_at DESC').all();

    return NextResponse.json({
      appUsers,
      marketplaceUsers,
      chats,
      listings,
      orders,
      trades
    });
  } catch (error) {
    console.error('Admin data fetch error:', error);
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

    if (type === 'app-user') {
      db.prepare('DELETE FROM users WHERE id = ?').run(id);
    } else if (type === 'marketplace-user') {
      // Delete dependent records that don't have cascade
      db.prepare('DELETE FROM trades WHERE seller_id = ? OR buyer_id = ?').run(id, id);
      db.prepare('DELETE FROM marketplace_users WHERE id = ?').run(id);
    } else if (type === 'chat') {
      db.prepare('DELETE FROM chats WHERE id = ?').run(id);
    } else if (type === 'listing') {
      // Delete trades associated with this listing
      db.prepare('DELETE FROM trades WHERE listing_id = ?').run(id);
      db.prepare('DELETE FROM listings WHERE id = ?').run(id);
    } else if (type === 'order') {
      // Delete trades associated with this order
      db.prepare('DELETE FROM trades WHERE buy_order_id = ?').run(id);
      db.prepare('DELETE FROM buy_orders WHERE id = ?').run(id);
    } else if (type === 'trade') {
      db.prepare('DELETE FROM trades WHERE id = ?').run(id);
    }


    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const secret = searchParams.get('secret');
    const { type, id, data } = await req.json();

    if (secret !== 'admin2026') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (type === 'app-user') {
      db.prepare('UPDATE users SET name = ?, email = ?, district = ? WHERE id = ?').run(data.name, data.email, data.district, id);
    } else if (type === 'marketplace-user') {
      db.prepare('UPDATE marketplace_users SET name = ?, email = ?, phone = ?, district = ?, role = ?, is_subscribed = ? WHERE id = ?').run(data.name, data.email, data.phone, data.district, data.role, data.is_subscribed, id);
    } else if (type === 'listing') {
      db.prepare('UPDATE listings SET crop = ?, quantity_kg = ?, price_per_kg = ? WHERE id = ?').run(data.crop, data.quantity_kg, data.price_per_kg, id);
    } else if (type === 'order') {
      db.prepare('UPDATE buy_orders SET crop = ?, quantity_kg = ?, max_price_per_kg = ? WHERE id = ?').run(data.crop, data.quantity_kg, data.max_price_per_kg, id);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Update error:', error);
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }
}
