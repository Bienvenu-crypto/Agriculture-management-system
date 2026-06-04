import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cookies } from 'next/headers';
import crypto from 'crypto';


async function getMarketplaceUser() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('mp_session')?.value;
  if (!sessionId) return null;

  const session = db
    .prepare('SELECT user_id, expires_at FROM marketplace_sessions WHERE id = ?')
    .get(sessionId) as any;
  if (!session || new Date(session.expires_at) < new Date()) return null;

  return db.prepare('SELECT * FROM marketplace_users WHERE id = ?').get(session.user_id) as any;
}

export async function GET(req: Request) {
  try {
    const user = await getMarketplaceUser();
    if (!user) return NextResponse.json({ trades: [] });

    // Fetch trades where the user is either the seller or the buyer
    const trades = db.prepare(`
      SELECT t.*, 
        s.name as seller_name, s.phone as seller_phone, s.district as seller_district,
        b.name as buyer_name, b.phone as buyer_phone, b.district as buyer_district,
        l.image_url
      FROM trades t
      JOIN marketplace_users s ON t.seller_id = s.id
      JOIN marketplace_users b ON t.buyer_id = b.id
      LEFT JOIN listings l ON t.listing_id = l.id
      WHERE t.seller_id = ? OR t.buyer_id = ?
      ORDER BY t.created_at DESC
    `).all(user.id, user.id);

    return NextResponse.json({ trades });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch trades' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await getMarketplaceUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id, status } = await req.json();
    if (!id || !status) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

    // Verify ownership (only the buyer or seller can update, but usually buyer confirms completion)
    const trade = db.prepare('SELECT * FROM trades WHERE id = ?').get(id) as any;
    if (!trade) return NextResponse.json({ error: 'Trade not found' }, { status: 404 });
    if (trade.seller_id !== user.id && trade.buyer_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (status === 'completed') {
      db.prepare('UPDATE trades SET status = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, id);
    } else {
      db.prepare('UPDATE trades SET status = ? WHERE id = ?').run(status, id);
    }

    // If completed, maybe notify the other party?
    const otherId = user.id === trade.seller_id ? trade.buyer_id : trade.seller_id;
    const roleLabel = user.id === trade.seller_id ? 'Seller' : 'Buyer';

    db.prepare(`
      INSERT INTO notifications (id, user_id, type, title, message) 
      VALUES (?, ?, ?, ?, ?)
    `).run(
      crypto.randomUUID(),
      otherId,
      'trade_update',
      'Trade Status Updated',
      `The ${roleLabel} has marked the ${trade.crop} trade as ${status}.`
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Trade update error:', error);
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }
}
