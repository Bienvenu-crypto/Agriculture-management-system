import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cookies } from 'next/headers';

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
    if (!user || user.role !== 'seller') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { count: impressions } = await db
      .from('marketplace_analytics')
      .select('*', { count: 'exact', head: true })
      .eq('seller_id', user.id)
      .eq('type', 'impression');

    const { count: clicks } = await db
      .from('marketplace_analytics')
      .select('*', { count: 'exact', head: true })
      .eq('seller_id', user.id)
      .eq('type', 'click');

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const { count: yesterdayImpressions } = await db
      .from('marketplace_analytics')
      .select('*', { count: 'exact', head: true })
      .eq('seller_id', user.id)
      .eq('type', 'impression')
      .gte('timestamp', yesterdayStr)
      .lt('timestamp', new Date().toISOString().split('T')[0]);

    const { count: yesterdayClicks } = await db
      .from('marketplace_analytics')
      .select('*', { count: 'exact', head: true })
      .eq('seller_id', user.id)
      .eq('type', 'click')
      .gte('timestamp', yesterdayStr)
      .lt('timestamp', new Date().toISOString().split('T')[0]);

    const imp = impressions || 0;
    const clk = clicks || 0;
    const yImp = yesterdayImpressions || 0;
    const yClk = yesterdayClicks || 0;

    const impGrowth = yImp > 0 ? ((imp - yImp) / yImp) * 100 : 0;
    const clickGrowth = yClk > 0 ? ((clk - yClk) / yClk) * 100 : 0;

    return NextResponse.json({
      impressions: imp,
      clicks: clk,
      impGrowth: impGrowth.toFixed(1),
      clickGrowth: clickGrowth.toFixed(1),
    });
  } catch (error) {
    console.error('Stats fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { listingId, sellerId } = await req.json();
    if (!sellerId) return NextResponse.json({ error: 'Missing seller ID' }, { status: 400 });

    await db.from('marketplace_analytics').insert({
      seller_id: sellerId,
      type: 'click',
      listing_id: listingId || null,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to record click' }, { status: 500 });
  }
}