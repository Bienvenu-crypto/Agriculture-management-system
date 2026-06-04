import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cookies } from 'next/headers';
import crypto from 'crypto';

async function getMarketplaceUser(role?: string) {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('mp_session')?.value;
  if (!sessionId) return null;

  const { data: session } = await db
    .from('marketplace_sessions')
    .select('user_id, expires_at')
    .eq('id', sessionId)
    .maybeSingle();
  if (!session || new Date(session.expires_at) < new Date()) return null;

  let query = db.from('marketplace_users').select('*').eq('id', session.user_id);
  if (role) query = query.eq('role', role);
  const { data: user } = await query.maybeSingle();
  return user;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const crop = searchParams.get('crop');
    const buyerId = searchParams.get('buyer_id');

    let query = db
      .from('buy_orders')
      .select('*, marketplace_users!buyer_id(name, district, phone)')
      .eq('status', 'open');

    if (crop) query = query.ilike('crop', `%${crop}%`);
    if (buyerId) query = query.eq('buyer_id', buyerId);
    query = query.order('created_at', { ascending: false });

    const { data: rawOrders, error } = await query;
    if (error) throw error;

    const orders = (rawOrders || []).map((o: any) => ({
      ...o,
      buyer_name: o.marketplace_users?.name,
      buyer_district: o.marketplace_users?.district,
      buyer_phone: o.marketplace_users?.phone,
      marketplace_users: undefined,
    }));

    return NextResponse.json({ orders });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch buy orders' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const buyer = await getMarketplaceUser('buyer');
    if (!buyer) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in as a buyer.' }, { status: 401 });
    }

    const { crop, quantity_kg, max_price_per_kg, currency, description } = await req.json();
    if (!crop || !quantity_kg || !max_price_per_kg) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    if (quantity_kg <= 0 || max_price_per_kg <= 0) {
      return NextResponse.json({ error: 'Quantity and price must be positive' }, { status: 400 });
    }

    const orderId = crypto.randomUUID();
    await db.from('buy_orders').insert({
      id: orderId,
      buyer_id: buyer.id,
      crop: crop.trim(),
      quantity_kg,
      max_price_per_kg,
      currency: currency || 'UGX',
      description: description || null,
    });

    // === AUTO-MATCHING ENGINE ===
    const { data: availableListings } = await db
      .from('listings')
      .select('*')
      .ilike('crop', crop.trim())
      .lte('price_per_kg', max_price_per_kg)
      .eq('currency', currency || 'UGX')
      .eq('status', 'active')
      .neq('seller_id', buyer.id)
      .order('price_per_kg', { ascending: true })
      .order('created_at', { ascending: true });

    let remainingOrderQty = quantity_kg;
    const matchedTrades: any[] = [];

    for (const listing of (availableListings || [])) {
      if (remainingOrderQty <= 0) break;

      const matchQty = Math.min(remainingOrderQty, listing.quantity_kg);
      const tradeId = crypto.randomUUID();
      const totalValue = listing.price_per_kg * matchQty;

      await db.from('trades').insert({
        id: tradeId,
        listing_id: listing.id,
        buy_order_id: orderId,
        seller_id: listing.seller_id,
        buyer_id: buyer.id,
        crop: crop.trim(),
        quantity_kg: matchQty,
        agreed_price_per_kg: listing.price_per_kg,
        total_value: totalValue,
        currency: currency || 'UGX',
      });

      const newListingQty = listing.quantity_kg - matchQty;
      await db.from('listings')
        .update({ quantity_kg: newListingQty, status: newListingQty <= 0.01 ? 'sold' : 'active' })
        .eq('id', listing.id);

      remainingOrderQty -= matchQty;

      await db.from('notifications').insert({
        id: crypto.randomUUID(),
        user_id: listing.seller_id,
        type: 'trade_match',
        title: 'Partial Sale!',
        message: `You sold ${matchQty}kg of ${listing.crop} to ${buyer.name}.`,
      });

      const { data: tRecord } = await db
        .from('trades')
        .select('*, seller:marketplace_users!seller_id(name, phone, district, email), buyer:marketplace_users!buyer_id(name, phone, district, email)')
        .eq('id', tradeId)
        .single();
      if (tRecord) matchedTrades.push(tRecord);
    }

    await db.from('buy_orders')
      .update({ quantity_kg: remainingOrderQty, status: remainingOrderQty <= 0.01 ? 'fulfilled' : 'open' })
      .eq('id', orderId);

    if (matchedTrades.length > 0) {
      await db.from('notifications').insert({
        id: crypto.randomUUID(),
        user_id: buyer.id,
        type: 'trade_match',
        title: 'Trade Matched!',
        message: `We found ${quantity_kg - remainingOrderQty}kg of ${crop} for you!`,
      });
    }

    const { data: order } = await db.from('buy_orders').select('*').eq('id', orderId).single();
    return NextResponse.json({ order, trade: matchedTrades[0] || null, allTrades: matchedTrades }, { status: 201 });
  } catch (error: any) {
    console.error('Buy order error:', error);
    return NextResponse.json({ error: 'Failed to create buy order' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await getMarketplaceUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await req.json();

    if (user.role !== 'buyer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: order } = await db
      .from('buy_orders')
      .select('id')
      .eq('id', id)
      .eq('buyer_id', user.id)
      .maybeSingle();
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

    await db.from('buy_orders').update({ status: 'cancelled' }).eq('id', id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to cancel order' }, { status: 500 });
  }
}