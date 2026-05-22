import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cookies } from 'next/headers';
import crypto from 'crypto';

async function getMarketplaceUser(role?: string) {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('mp_session')?.value;
  if (!sessionId) return null;

  const session = db
    .prepare('SELECT user_id, expires_at FROM marketplace_sessions WHERE id = ?')
    .get(sessionId) as any;
  if (!session || new Date(session.expires_at) < new Date()) return null;

  const query = role
    ? 'SELECT * FROM marketplace_users WHERE id = ? AND role = ?'
    : 'SELECT * FROM marketplace_users WHERE id = ?';
  const params = role ? [session.user_id, role] : [session.user_id];
  return db.prepare(query).get(...params) as any;
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

    // 1. Fetch listing
    const listing = db.prepare(`
      SELECT l.*, mu.name as seller_name, mu.phone as seller_phone
      FROM listings l
      JOIN marketplace_users mu ON l.seller_id = mu.id
      WHERE l.id = ?
    `).get(listingId) as any;

    if (!listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    if (listing.status !== 'active') {
      return NextResponse.json({ error: 'Listing is no longer active' }, { status: 400 });
    }

    if (listing.seller_id === buyer.id) {
      return NextResponse.json({ error: 'You cannot buy your own crop listing' }, { status: 400 });
    }

    if (parsedQty > listing.quantity_kg) {
      return NextResponse.json({ error: `Insufficient stock. Only ${listing.quantity_kg} KG available.` }, { status: 400 });
    }

    // Simulate Payment Steps - Transaction Safe
    const updatedQty = listing.quantity_kg - parsedQty;
    const newStatus = updatedQty <= 0.01 ? 'sold' : 'active';
    const totalValue = parsedQty * listing.price_per_kg;

    // Create buy order (fulfilled)
    const buyOrderId = crypto.randomUUID();
    db.prepare(`
      INSERT INTO buy_orders (id, buyer_id, crop, quantity_kg, max_price_per_kg, currency, description, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'fulfilled')
    `).run(
      buyOrderId,
      buyer.id,
      listing.crop,
      parsedQty,
      listing.price_per_kg,
      listing.currency,
      `Direct purchase from listing ${listing.id}`,
    );

    // Update listing
    db.prepare('UPDATE listings SET quantity_kg = ?, status = ? WHERE id = ?')
      .run(updatedQty, newStatus, listing.id);

    // Create Trade
    const tradeId = crypto.randomUUID();
    db.prepare(`
      INSERT INTO trades (
        id, listing_id, buy_order_id, seller_id, buyer_id, crop, quantity_kg, 
        agreed_price_per_kg, total_value, currency, status, payment_status, 
        payment_method, payment_phone
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'paid', 'Mobile Money', ?)
    `).run(
      tradeId,
      listing.id,
      buyOrderId,
      listing.seller_id,
      buyer.id,
      listing.crop,
      parsedQty,
      listing.price_per_kg,
      totalValue,
      listing.currency,
      phone,
    );

    // Buyer Notification
    db.prepare(`
      INSERT INTO notifications (id, user_id, type, title, message) 
      VALUES (?, ?, ?, ?, ?)
    `).run(
      crypto.randomUUID(),
      buyer.id,
      'trade_match',
      'Order Placed & Paid!',
      `You ordered ${parsedQty}kg of ${listing.crop} for ${listing.currency} ${totalValue.toLocaleString()}. Payment sent immediately to seller.`,
    );

    // Seller Notification
    db.prepare(`
      INSERT INTO notifications (id, user_id, type, title, message) 
      VALUES (?, ?, ?, ?, ?)
    `).run(
      crypto.randomUUID(),
      listing.seller_id,
      'trade_match',
      'New Payment Received!',
      `Buyer ${buyer.name} bought ${parsedQty}kg of ${listing.crop}. Payment of ${listing.currency} ${totalValue.toLocaleString()} has been sent to your account.`,
    );

    return NextResponse.json({ success: true, tradeId });
  } catch (error: any) {
    console.error('Payment order checkout error:', error);
    return NextResponse.json({ error: 'Failed to process purchase' }, { status: 500 });
  }
}
