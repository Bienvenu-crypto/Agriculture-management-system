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

// GET — fetch all open buy orders
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const crop = searchParams.get('crop');
    const buyerId = searchParams.get('buyer_id');

    let query = `
      SELECT bo.*, mu.name as buyer_name, mu.district as buyer_district, mu.phone as buyer_phone
      FROM buy_orders bo
      JOIN marketplace_users mu ON bo.buyer_id = mu.id
      WHERE bo.status = 'open'
    `;
    const params: any[] = [];

    if (crop) {
      query += ' AND LOWER(bo.crop) LIKE ?';
      params.push(`%${crop.toLowerCase()}%`);
    }
    if (buyerId) {
      query += ' AND bo.buyer_id = ?';
      params.push(buyerId);
    }
    query += ' ORDER BY bo.created_at DESC';

    const orders = db.prepare(query).all(...params);
    return NextResponse.json({ orders });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch buy orders' }, { status: 500 });
  }
}

// POST — buyer creates a buy order and triggers auto-matching
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
    db.prepare(
      'INSERT INTO buy_orders (id, buyer_id, crop, quantity_kg, max_price_per_kg, currency, description) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(orderId, buyer.id, crop.trim(), quantity_kg, max_price_per_kg, currency || 'UGX', description || null);

    // === AUTO-MATCHING ENGINE (PARTIAL FULFILLMENT) ===
    const availableListings = db.prepare(`
      SELECT * FROM listings
      WHERE LOWER(crop) = LOWER(?)
        AND price_per_kg <= ?
        AND currency = ?
        AND status = 'active'
        AND seller_id != ?
      ORDER BY price_per_kg ASC, created_at ASC
    `).all(crop.trim(), max_price_per_kg, currency || 'UGX', buyer.id) as any[];

    let remainingOrderQty = quantity_kg;
    const matchedTrades = [];

    for (const listing of availableListings) {
      if (remainingOrderQty <= 0) break;

      const matchQty = Math.min(remainingOrderQty, listing.quantity_kg);
      const tradeId = crypto.randomUUID();
      const agreedPrice = listing.price_per_kg;
      const totalValue = agreedPrice * matchQty;

      db.prepare(
        'INSERT INTO trades (id, listing_id, buy_order_id, seller_id, buyer_id, crop, quantity_kg, agreed_price_per_kg, total_value, currency) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).run(tradeId, listing.id, orderId, listing.seller_id, buyer.id, crop.trim(), matchQty, agreedPrice, totalValue, currency || 'UGX');

      // Update Listing: Subtract quantity and close if 0
      const newListingQty = listing.quantity_kg - matchQty;
      db.prepare("UPDATE listings SET quantity_kg = ?, status = ? WHERE id = ?")
        .run(newListingQty, newListingQty <= 0.01 ? 'sold' : 'active', listing.id);

      remainingOrderQty -= matchQty;

      // Add notifications for this specific match
      db.prepare(`
        INSERT INTO notifications (id, user_id, type, title, message) 
        VALUES (?, ?, ?, ?, ?)
      `).run(crypto.randomUUID(), listing.seller_id, 'trade_match', 'Partial Sale!', `You sold ${matchQty}kg of ${listing.crop} to ${buyer.name}.`);

      const tRecord = db.prepare(`
        SELECT t.*, 
          s.name as seller_name, s.phone as seller_phone, s.district as seller_district, s.email as seller_email,
          b.name as buyer_name, b.phone as buyer_phone, b.district as buyer_district, b.email as buyer_email
        FROM trades t
        JOIN marketplace_users s ON t.seller_id = s.id
        JOIN marketplace_users b ON t.buyer_id = b.id
        WHERE t.id = ?
      `).get(tradeId);
      matchedTrades.push(tRecord);
    }

    // Final Order Update: set remaining quantity and status
    db.prepare("UPDATE buy_orders SET quantity_kg = ?, status = ? WHERE id = ?")
      .run(remainingOrderQty, remainingOrderQty <= 0.01 ? 'fulfilled' : 'open', orderId);

    if (matchedTrades.length > 0) {
      db.prepare(`
        INSERT INTO notifications (id, user_id, type, title, message) 
        VALUES (?, ?, ?, ?, ?)
      `).run(crypto.randomUUID(), buyer.id, 'trade_match', 'Trade Matched!', `We found ${quantity_kg - remainingOrderQty}kg of ${crop} for you!`);
    }

    const order = db.prepare('SELECT * FROM buy_orders WHERE id = ?').get(orderId);
    return NextResponse.json({ order, trade: matchedTrades[0] || null, allTrades: matchedTrades }, { status: 201 });
  } catch (error: any) {
    console.error('Buy order error:', error);
    return NextResponse.json({ error: 'Failed to create buy order' }, { status: 500 });
  }
}

// DELETE — buyer cancels a buy order
export async function DELETE(req: Request) {
  try {
    const user = await getMarketplaceUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await req.json();

    if (user.role === 'admin') {
      db.prepare("UPDATE buy_orders SET status = 'cancelled' WHERE id = ?").run(id);
      return NextResponse.json({ ok: true });
    }

    if (user.role !== 'buyer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const order = db
      .prepare('SELECT * FROM buy_orders WHERE id = ? AND buyer_id = ?')
      .get(id, user.id) as any;
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

    db.prepare("UPDATE buy_orders SET status = 'cancelled' WHERE id = ?").run(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to cancel order' }, { status: 500 });
  }
}
