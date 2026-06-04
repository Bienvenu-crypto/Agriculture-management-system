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
      { data: appUsers },
      { data: marketplaceUsers },
      { data: chats },
      { data: listingsRaw },
      { data: ordersRaw },
      { data: tradesRaw },
    ] = await Promise.all([
      db.from('users').select('id, name, email, district, created_at').order('created_at', { ascending: false }),
      db.from('marketplace_users').select('id, name, email, phone, district, role, is_subscribed, created_at').order('created_at', { ascending: false }),
      db.from('chats').select('id, user_email, role, content, image_url, timestamp').order('timestamp', { ascending: false }),
      db.from('listings').select('*, marketplace_users!seller_id(name)').order('created_at', { ascending: false }),
      db.from('buy_orders').select('*, marketplace_users!buyer_id(name)').order('created_at', { ascending: false }),
      db.from('trades').select('*, seller:marketplace_users!seller_id(name), buyer:marketplace_users!buyer_id(name)').order('created_at', { ascending: false }),
    ]);

    const listings = (listingsRaw || []).map((l: any) => ({ ...l, seller_name: l.marketplace_users?.name, marketplace_users: undefined }));
    const orders = (ordersRaw || []).map((o: any) => ({ ...o, buyer_name: o.marketplace_users?.name, marketplace_users: undefined }));
    const trades = (tradesRaw || []).map((t: any) => ({ ...t, seller_name: t.seller?.name, buyer_name: t.buyer?.name, seller: undefined, buyer: undefined }));

    return NextResponse.json({ appUsers: appUsers || [], marketplaceUsers: marketplaceUsers || [], chats: chats || [], listings, orders, trades });
  } catch (error) {
    console.error('Admin data fetch error:', error);
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

    if (type === 'app-user') {
      await db.from('users').delete().eq('id', id);
    } else if (type === 'marketplace-user') {
      await db.from('trades').delete().or(`seller_id.eq.${id},buyer_id.eq.${id}`);
      await db.from('marketplace_users').delete().eq('id', id);
    } else if (type === 'chat') {
      await db.from('chats').delete().eq('id', id);
    } else if (type === 'listing') {
      await db.from('trades').delete().eq('listing_id', id);
      await db.from('listings').delete().eq('id', id);
    } else if (type === 'order') {
      await db.from('trades').delete().eq('buy_order_id', id);
      await db.from('buy_orders').delete().eq('id', id);
    } else if (type === 'trade') {
      await db.from('trades').delete().eq('id', id);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    if (searchParams.get('secret') !== ADMIN_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { type, id, data } = await req.json();

    if (type === 'app-user') {
      await db.from('users').update({ name: data.name, email: data.email, district: data.district }).eq('id', id);
    } else if (type === 'marketplace-user') {
      await db.from('marketplace_users').update({
        name: data.name, email: data.email, phone: data.phone,
        district: data.district, role: data.role, is_subscribed: data.is_subscribed,
      }).eq('id', id);
    } else if (type === 'listing') {
      await db.from('listings').update({ crop: data.crop, quantity_kg: data.quantity_kg, price_per_kg: data.price_per_kg }).eq('id', id);
    } else if (type === 'order') {
      await db.from('buy_orders').update({ crop: data.crop, quantity_kg: data.quantity_kg, max_price_per_kg: data.max_price_per_kg }).eq('id', id);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Update error:', error);
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }
}