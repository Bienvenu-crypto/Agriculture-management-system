import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cookies } from 'next/headers';
import crypto from 'crypto';

async function getMarketplaceUser() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('mp_session')?.value;
  if (!sessionId) return null;

  const { data: session } = await db
    .from('marketplace_sessions')
    .select('user_id, expires_at')
    .eq('id', sessionId)
    .maybeSingle();
  if (!session || new Date(session.expires_at) < new Date()) return null;

  const { data: user } = await db
    .from('marketplace_users')
    .select('*')
    .eq('id', session.user_id)
    .maybeSingle();
  return user;
}

export async function GET() {
  try {
    const user = await getMarketplaceUser();
    if (!user) return NextResponse.json({ trades: [] });

    const { data: trades, error } = await db
      .from('trades')
      .select(`
        *,
        seller:marketplace_users!seller_id(name, phone, district),
        buyer:marketplace_users!buyer_id(name, phone, district),
        listing:listings!listing_id(image_url)
      `)
      .or(`seller_id.eq.${user.id},buyer_id.eq.${user.id}`)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const flatTrades = (trades || []).map((t: any) => ({
      ...t,
      seller_name: t.seller?.name,
      seller_phone: t.seller?.phone,
      seller_district: t.seller?.district,
      buyer_name: t.buyer?.name,
      buyer_phone: t.buyer?.phone,
      buyer_district: t.buyer?.district,
      image_url: t.listing?.image_url,
      seller: undefined,
      buyer: undefined,
      listing: undefined,
    }));

    return NextResponse.json({ trades: flatTrades });
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

    const { data: trade } = await db
      .from('trades')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (!trade) return NextResponse.json({ error: 'Trade not found' }, { status: 404 });
    if (trade.seller_id !== user.id && trade.buyer_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const updateData: any = { status };
    if (status === 'completed') updateData.completed_at = new Date().toISOString();
    await db.from('trades').update(updateData).eq('id', id);

    const otherId = user.id === trade.seller_id ? trade.buyer_id : trade.seller_id;
    const roleLabel = user.id === trade.seller_id ? 'Seller' : 'Buyer';
    await db.from('notifications').insert({
      id: crypto.randomUUID(),
      user_id: otherId,
      type: 'trade_update',
      title: 'Trade Status Updated',
      message: `The ${roleLabel} has marked the ${trade.crop} trade as ${status}.`,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Trade update error:', error);
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }
}