import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

const ADMIN_SECRET = 'admin2026';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    if (searchParams.get('secret') !== ADMIN_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [
      { data: users },
      { data: listingsRaw },
      { data: ordersRaw },
      { data: tradesRaw },
    ] = await Promise.all([
      db.from('marketplace_users').select('id, name, email, phone, district, role, created_at').order('created_at', { ascending: false }),
      db.from('listings').select('*, marketplace_users!seller_id(name)').order('created_at', { ascending: false }),
      db.from('buy_orders').select('*, marketplace_users!buyer_id(name)').order('created_at', { ascending: false }),
      db.from('trades').select('*, seller:marketplace_users!seller_id(name), buyer:marketplace_users!buyer_id(name)').order('created_at', { ascending: false }),
    ]);

    const listings = (listingsRaw || []).map((l: any) => ({ ...l, seller_name: l.marketplace_users?.name, marketplace_users: undefined }));
    const orders = (ordersRaw || []).map((o: any) => ({ ...o, buyer_name: o.marketplace_users?.name, marketplace_users: undefined }));
    const trades = (tradesRaw || []).map((t: any) => ({ ...t, seller_name: t.seller?.name, buyer_name: t.buyer?.name, seller: undefined, buyer: undefined }));

    return NextResponse.json({ users: users || [], listings, orders, trades });
  } catch (error) {
    console.error('Admin marketplace fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    if (searchParams.get('secret') !== ADMIN_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { type, id } = await req.json();

    if (type === 'user') {
      await db.from('trades').delete().or(`seller_id.eq.${id},buyer_id.eq.${id}`);
      await db.from('marketplace_users').delete().eq('id', id);
    } else if (type === 'listing') {
      await db.from('trades').delete().eq('listing_id', id);
      await db.from('listings').delete().eq('id', id);
    } else if (type === 'order') {
      await db.from('trades').delete().eq('buy_order_id', id);
      await db.from('buy_orders').delete().eq('id', id);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
  }
}