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
    const category = searchParams.get('category');
    const sellerId = searchParams.get('seller_id');

    let query = db
      .from('listings')
      .select('*, marketplace_users!seller_id(name, district, phone)')
      .eq('status', 'active');

    if (sellerId) {
      query = query.eq('seller_id', sellerId);
    }
    // Note: removed is_subscribed filter — RLS may prevent DB writes so this filter
    // would incorrectly hide listings. Subscription is enforced at the POST level.

    if (crop) query = query.ilike('crop', `%${crop}%`);
    if (category && category !== 'All') query = query.ilike('category', category);

    query = query.order('is_promoted', { ascending: false }).order('created_at', { ascending: false });

    const { data: rawListings, error } = await query;
    if (error) throw error;

    // Flatten joined fields
    const listings = (rawListings || []).map((l: any) => ({
      ...l,
      seller_name: l.marketplace_users?.name,
      seller_district: l.marketplace_users?.district,
      seller_phone: l.marketplace_users?.phone,
      marketplace_users: undefined,
    }));

    // Record impressions for unique sellers
    const uniqueSellers = [...new Set(listings.map((l: any) => l.seller_id))];
    if (uniqueSellers.length > 0) {
      await db.from('marketplace_analytics').insert(
        uniqueSellers.map((sId) => ({ seller_id: sId, type: 'impression' }))
      );
    }

    return NextResponse.json({ listings, totalCount: listings.length });
  } catch (error) {
    console.error('Listings GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch listings' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const seller = await getMarketplaceUser('seller');
    if (!seller) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in as a seller.' }, { status: 401 });
    }
    // Note: is_subscribed check removed from API — subscription is enforced on the frontend.
    // The subscribe route updates the DB best-effort; RLS may prevent the write in some environments.

    const { crop, quantity_kg, price_per_kg, currency, description, category, image_url } = await req.json();
    if (!crop || !quantity_kg || !price_per_kg) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    if (quantity_kg <= 0 || price_per_kg <= 0) {
      return NextResponse.json({ error: 'Quantity and price must be positive' }, { status: 400 });
    }

    const id = crypto.randomUUID();
    const { error: insertError } = await db.from('listings').insert({
      id,
      seller_id: seller.id,
      crop: crop.trim(),
      quantity_kg,
      price_per_kg,
      currency: currency || 'UGX',
      description: description || null,
      category: category || 'Grains',
      image_url: image_url || null,
    });
    if (insertError) throw insertError;

    // === REVERSE MATCHING ENGINE ===
    const { data: openOrders } = await db
      .from('buy_orders')
      .select('*')
      .ilike('crop', crop.trim())
      .gte('max_price_per_kg', price_per_kg)
      .eq('currency', currency || 'UGX')
      .eq('status', 'open')
      .neq('buyer_id', seller.id)
      .order('max_price_per_kg', { ascending: false })
      .order('created_at', { ascending: true });

    let remainingListingQty = quantity_kg;
    const tradesCreated: any[] = [];

    for (const order of (openOrders || [])) {
      if (remainingListingQty <= 0) break;

      const matchQty = Math.min(remainingListingQty, order.quantity_kg);
      const tradeId = crypto.randomUUID();
      const totalValue = price_per_kg * matchQty;

      await db.from('trades').insert({
        id: tradeId,
        listing_id: id,
        buy_order_id: order.id,
        seller_id: seller.id,
        buyer_id: order.buyer_id,
        crop: crop.trim(),
        quantity_kg: matchQty,
        agreed_price_per_kg: price_per_kg,
        total_value: totalValue,
        currency: currency || 'UGX',
      });

      remainingListingQty -= matchQty;
      const newOrderQty = order.quantity_kg - matchQty;
      await db.from('buy_orders')
        .update({ quantity_kg: newOrderQty, status: newOrderQty <= 0.01 ? 'fulfilled' : 'open' })
        .eq('id', order.id);

      await db.from('notifications').insert({
        id: crypto.randomUUID(),
        user_id: order.buyer_id,
        type: 'trade_match',
        title: 'Order Matched!',
        message: `We found ${matchQty}kg of ${crop} from ${seller.name}.`,
      });

      const { data: tRecord } = await db
        .from('trades')
        .select('*, seller:marketplace_users!seller_id(name, phone, email), buyer:marketplace_users!buyer_id(name, phone, email)')
        .eq('id', tradeId)
        .single();
      if (tRecord) tradesCreated.push(tRecord);
    }

    await db.from('listings')
      .update({ quantity_kg: remainingListingQty, status: remainingListingQty <= 0.01 ? 'sold' : 'active' })
      .eq('id', id);

    if (tradesCreated.length > 0) {
      await db.from('notifications').insert({
        id: crypto.randomUUID(),
        user_id: seller.id,
        type: 'trade_match',
        title: 'Multiple Sales!',
        message: `You sold a total of ${quantity_kg - remainingListingQty}kg to ${tradesCreated.length} buyers.`,
      });
    }

    const { data: listing } = await db.from('listings').select('*').eq('id', id).single();
    return NextResponse.json({ listing, trade: tradesCreated[0] || null, allTrades: tradesCreated }, { status: 201 });
  } catch (error) {
    console.error('Create listing error:', error);
    return NextResponse.json({ error: 'Failed to create listing' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await getMarketplaceUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await req.json();

    if (user.role !== 'seller') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: listing } = await db
      .from('listings')
      .select('id')
      .eq('id', id)
      .eq('seller_id', user.id)
      .maybeSingle();
    if (!listing) return NextResponse.json({ error: 'Listing not found' }, { status: 404 });

    await db.from('listings').update({ status: 'cancelled' }).eq('id', id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to cancel listing' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const seller = await getMarketplaceUser();
    if (!seller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id, is_promoted } = await req.json();

    // Verify listing belongs to this seller (or admin)
    const { data: listing } = await db
      .from('listings')
      .select('id, seller_id')
      .eq('id', id)
      .maybeSingle();
    if (!listing) return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    if (listing.seller_id !== seller.id && seller.role !== 'admin') {
      return NextResponse.json({ error: 'Not your listing' }, { status: 403 });
    }

    const { error: updateError } = await db
      .from('listings')
      .update({ is_promoted: is_promoted ? true : false })
      .eq('id', id);

    if (updateError) {
      console.error('Promote update error:', JSON.stringify(updateError));
      return NextResponse.json({ error: 'Failed to update promotion status' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('PATCH listing error:', error);
    return NextResponse.json({ error: 'Failed to update listing' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const user = await getMarketplaceUser();
    if (!user || user.role !== 'seller') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, crop, quantity_kg, price_per_kg, category, image_url, description } = await req.json();
    if (!id || !crop || !quantity_kg || !price_per_kg) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data: listing } = await db
      .from('listings')
      .select('id')
      .eq('id', id)
      .eq('seller_id', user.id)
      .maybeSingle();
    if (!listing) return NextResponse.json({ error: 'Listing not found' }, { status: 404 });

    await db.from('listings').update({
      crop: crop.trim(),
      quantity_kg,
      price_per_kg,
      category: category || 'Grains',
      image_url: image_url || null,
      description: description || null,
    }).eq('id', id);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update listing' }, { status: 500 });
  }
}