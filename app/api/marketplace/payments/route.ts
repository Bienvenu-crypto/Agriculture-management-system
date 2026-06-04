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

export async function POST(req: Request) {
  try {
    const buyer = await getMarketplaceUser('buyer');
    if (!buyer) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in as a buyer.' }, { status: 401 });
    }

    const { listingId, quantity, phone } = await req.json();
    if (!listingId || !quantity || !phone) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const parsedQty = parseFloat(quantity);
    if (isNaN(parsedQty) || parsedQty <= 0) {
      return NextResponse.json({ error: 'Invalid quantity' }, { status: 400 });
    }

    const { data: listing } = await db
      .from('listings')
      .select('*, marketplace_users!seller_id(name, phone)')
      .eq('id', listingId)
      .maybeSingle();

    if (!listing) return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    if (listing.status !== 'active') return NextResponse.json({ error: 'Listing is no longer active' }, { status: 400 });
    if (listing.seller_id === buyer.id) return NextResponse.json({ error: 'You cannot buy your own crop listing' }, { status: 400 });
    if (parsedQty > listing.quantity_kg) {
      return NextResponse.json({ error: `Insufficient stock. Only ${listing.quantity_kg} KG available.` }, { status: 400 });
    }

    const updatedQty = listing.quantity_kg - parsedQty;
    const newStatus = updatedQty <= 0.01 ? 'sold' : 'active';
    const totalValue = parsedQty * listing.price_per_kg;
    const tx_ref = crypto.randomUUID();

    const flutterwaveKey = process.env.FLUTTERWAVE_SECRET_KEY;
    if (!flutterwaveKey || flutterwaveKey.includes('replace_this_with_your_real_key')) {
      return NextResponse.json({ error: 'Please configure FLUTTERWAVE_SECRET_KEY to enable payments.' }, { status: 400 });
    }

    const flwResponse = await fetch('https://api.flutterwave.com/v3/charges?type=mobile_money_uganda', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${flutterwaveKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tx_ref,
        amount: totalValue,
        currency: 'UGX',
        network: phone.startsWith('077') || phone.startsWith('078') || phone.startsWith('076') ? 'MTN' : 'AIRTEL',
        email: buyer.email || 'customer@marketplace.com',
        phone_number: phone,
        redirect_url: process.env.NEXT_PUBLIC_APP_URL || 'https://your-app.vercel.app',
        meta: { buyer_id: buyer.id, listing_id: listing.id },
      }),
    });

    const flwData = await flwResponse.json();
    if (flwData.status !== 'success') {
      return NextResponse.json({ error: flwData.message || 'Payment provider rejected the request.' }, { status: 400 });
    }

    const buyOrderId = crypto.randomUUID();
    await db.from('buy_orders').insert({
      id: buyOrderId,
      buyer_id: buyer.id,
      crop: listing.crop,
      quantity_kg: parsedQty,
      max_price_per_kg: listing.price_per_kg,
      currency: listing.currency,
      description: `Direct purchase from listing ${listing.id}`,
      status: 'fulfilled',
    });

    await db.from('listings').update({ quantity_kg: updatedQty, status: newStatus }).eq('id', listing.id);

    const tradeId = crypto.randomUUID();
    await db.from('trades').insert({
      id: tradeId,
      listing_id: listing.id,
      buy_order_id: buyOrderId,
      seller_id: listing.seller_id,
      buyer_id: buyer.id,
      crop: listing.crop,
      quantity_kg: parsedQty,
      agreed_price_per_kg: listing.price_per_kg,
      total_value: totalValue,
      currency: listing.currency,
      status: 'pending',
      payment_status: 'paid',
      payment_method: 'Mobile Money',
      payment_phone: phone,
    });

    await db.from('notifications').insert([
      {
        id: crypto.randomUUID(),
        user_id: buyer.id,
        type: 'trade_match',
        title: 'Order Placed & Paid!',
        message: `You ordered ${parsedQty}kg of ${listing.crop} for ${listing.currency} ${totalValue.toLocaleString()}. Payment sent immediately to seller.`,
      },
      {
        id: crypto.randomUUID(),
        user_id: listing.seller_id,
        type: 'trade_match',
        title: 'New Payment Received!',
        message: `Buyer ${buyer.name} bought ${parsedQty}kg of ${listing.crop}. Payment of ${listing.currency} ${totalValue.toLocaleString()} has been sent to your account.`,
      },
    ]);

    return NextResponse.json({ success: true, tradeId });
  } catch (error: any) {
    console.error('Payment order checkout error:', error);
    return NextResponse.json({ error: 'Failed to process purchase' }, { status: 500 });
  }
}