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

// GET /api/marketplace/listings — fetch all active listings (public)
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const crop = searchParams.get('crop');
    const category = searchParams.get('category');
    const sellerId = searchParams.get('seller_id');

    let query = `
      SELECT l.*, mu.name as seller_name, mu.district as seller_district, mu.phone as seller_phone
      FROM listings l
      JOIN marketplace_users mu ON l.seller_id = mu.id
      WHERE l.status = 'active'
    `;
    const params: any[] = [];

    if (!sellerId) {
      query += ' AND mu.is_subscribed = 1';
    } else {
      query += ' AND l.seller_id = ?';
      params.push(sellerId);
    }

    if (crop) {
      query += ' AND LOWER(l.crop) LIKE ?';
      params.push(`%${crop.toLowerCase()}%`);
    }
    if (category && category !== 'All') {
      query += ' AND LOWER(l.category) = LOWER(?)';
      params.push(category);
    }

    // Capture total count with same filters
    const countQuery = query.replace('l.*, mu.name as seller_name, mu.district as seller_district, mu.phone as seller_phone', 'COUNT(*) as count');
    const totalCount = db.prepare(countQuery).get(...params) as any;

    query += ' ORDER BY l.is_promoted DESC, l.created_at DESC';

    const listings = db.prepare(query).all(...params) as any[];

    // Record impressions for unique sellers in this fetch
    const uniqueSellers = Array.from(new Set(listings.map(l => l.seller_id)));
    if (uniqueSellers.length > 0) {
      const stmt = db.prepare('INSERT INTO marketplace_analytics (seller_id, type) VALUES (?, ?)');
      const insertMany = db.transaction((sellers) => {
        for (const sId of sellers) stmt.run(sId, 'impression');
      });
      insertMany(uniqueSellers);
    }

    return NextResponse.json({
      listings,
      totalCount: totalCount.count
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch listings' }, { status: 500 });
  }
}

// POST /api/marketplace/listings — seller creates a new listing
export async function POST(req: Request) {
  try {
    const seller = await getMarketplaceUser('seller');
    if (!seller) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in as a seller.' }, { status: 401 });
    }
    if (!seller.is_subscribed) {
      return NextResponse.json({ error: 'Subscription required. Please pay the activation fee in the Advertising portal.' }, { status: 403 });
    }

    const { crop, quantity_kg, price_per_kg, currency, description, category, image_url } = await req.json();
    if (!crop || !quantity_kg || !price_per_kg) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    if (quantity_kg <= 0 || price_per_kg <= 0) {
      return NextResponse.json({ error: 'Quantity and price must be positive' }, { status: 400 });
    }

    const id = crypto.randomUUID();
    db.prepare(
      'INSERT INTO listings (id, seller_id, crop, quantity_kg, price_per_kg, currency, description, category, image_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(id, seller.id, crop.trim(), quantity_kg, price_per_kg, currency || 'UGX', description || null, category || 'Grains', image_url || null);

    // === REVERSE MATCHING ENGINE (PARTIAL FULFILLMENT) ===
    const openOrders = db.prepare(`
      SELECT * FROM buy_orders
      WHERE LOWER(crop) = LOWER(?)
        AND max_price_per_kg >= ?
        AND currency = ?
        AND status = 'open'
        AND buyer_id != ?
      ORDER BY max_price_per_kg DESC, created_at ASC
    `).all(crop.trim(), price_per_kg, currency || 'UGX', seller.id) as any[];

    let remainingListingQty = quantity_kg;
    const tradesCreated = [];

    for (const order of openOrders) {
      if (remainingListingQty <= 0) break;

      const matchQty = Math.min(remainingListingQty, order.quantity_kg);
      const tradeId = crypto.randomUUID();
      const agreedPrice = price_per_kg;
      const totalValue = agreedPrice * matchQty;

      db.prepare(
        'INSERT INTO trades (id, listing_id, buy_order_id, seller_id, buyer_id, crop, quantity_kg, agreed_price_per_kg, total_value, currency) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).run(tradeId, id, order.id, seller.id, order.buyer_id, crop.trim(), matchQty, agreedPrice, totalValue, currency || 'UGX');

      // Update Listing: Subtract quantity (we'll do final status update outside loop)
      remainingListingQty -= matchQty;

      // Update Order: Subtract quantity and close if 0
      const newOrderQty = order.quantity_kg - matchQty;
      db.prepare("UPDATE buy_orders SET quantity_kg = ?, status = ? WHERE id = ?")
        .run(newOrderQty, newOrderQty <= 0.01 ? 'fulfilled' : 'open', order.id);

      // Notifications
      db.prepare(`
        INSERT INTO notifications (id, user_id, type, title, message) 
        VALUES (?, ?, ?, ?, ?)
      `).run(crypto.randomUUID(), order.buyer_id, 'trade_match', 'Order Matched!', `We found ${matchQty}kg of ${crop} from ${seller.name}.`);

      const tRecord = db.prepare(`
        SELECT t.*, 
          s.name as seller_name, s.phone as seller_phone, s.email as seller_email,
          b.name as buyer_name, b.phone as buyer_phone, b.email as buyer_email
        FROM trades t
        JOIN marketplace_users s ON t.seller_id = s.id
        JOIN marketplace_users b ON t.buyer_id = b.id
        WHERE t.id = ?
      `).get(tradeId);
      tradesCreated.push(tRecord);
    }

    // Final Listing Update
    db.prepare("UPDATE listings SET quantity_kg = ?, status = ? WHERE id = ?")
      .run(remainingListingQty, remainingListingQty <= 0.01 ? 'sold' : 'active', id);

    if (tradesCreated.length > 0) {
      db.prepare(`
        INSERT INTO notifications (id, user_id, type, title, message) 
        VALUES (?, ?, ?, ?, ?)
      `).run(crypto.randomUUID(), seller.id, 'trade_match', 'Multiple Sales!', `You sold a total of ${quantity_kg - remainingListingQty}kg to ${tradesCreated.length} buyers.`);
    }

    const listing = db.prepare('SELECT * FROM listings WHERE id = ?').get(id);
    return NextResponse.json({ listing, trade: tradesCreated[0] || null, allTrades: tradesCreated }, { status: 201 });
  } catch (error) {
    console.error('Create listing error:', error);
    return NextResponse.json({ error: 'Failed to create listing' }, { status: 500 });
  }
}

// DELETE /api/marketplace/listings — cancel a listing
export async function DELETE(req: Request) {
  try {
    const user = await getMarketplaceUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await req.json();

    if (user.role === 'admin') {
      db.prepare("UPDATE listings SET status = 'cancelled' WHERE id = ?").run(id);
      return NextResponse.json({ ok: true });
    }

    if (user.role !== 'seller') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const listing = db
      .prepare('SELECT * FROM listings WHERE id = ? AND seller_id = ?')
      .get(id, user.id) as any;
    if (!listing) return NextResponse.json({ error: 'Listing not found' }, { status: 404 });

    db.prepare("UPDATE listings SET status = 'cancelled' WHERE id = ?").run(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to cancel listing' }, { status: 500 });
  }
}

// PATCH /api/marketplace/listings — toggle promotion status
export async function PATCH(req: Request) {
  try {
    const seller = await getMarketplaceUser('seller');
    if (!seller) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, is_promoted } = await req.json();
    const listing = db
      .prepare('SELECT * FROM listings WHERE id = ? AND seller_id = ?')
      .get(id, seller.id) as any;
    if (!listing) return NextResponse.json({ error: 'Listing not found' }, { status: 404 });

    db.prepare("UPDATE listings SET is_promoted = ? WHERE id = ?").run(is_promoted ? 1 : 0, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update listing' }, { status: 500 });
  }
}

// PUT /api/marketplace/listings — update a listing details
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

    const listing = db
      .prepare('SELECT * FROM listings WHERE id = ? AND seller_id = ?')
      .get(id, user.id) as any;
    if (!listing) return NextResponse.json({ error: 'Listing not found' }, { status: 404 });

    db.prepare(
      "UPDATE listings SET crop = ?, quantity_kg = ?, price_per_kg = ?, category = ?, image_url = ?, description = ? WHERE id = ?"
    ).run(crop.trim(), quantity_kg, price_per_kg, category || 'Grains', image_url || null, description || null, id);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update listing' }, { status: 500 });
  }
}
