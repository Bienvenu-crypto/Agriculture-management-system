import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('mp_session')?.value;
    if (!sessionId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: session } = await db
      .from('marketplace_sessions')
      .select('user_id')
      .eq('id', sessionId)
      .maybeSingle();

    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { phone } = await req.json();
    console.log(`Processing 100,000 UGX payment from ${phone}`);

    // Simulate payment processing delay
    await new Promise((resolve) => setTimeout(resolve, 2000));

    await db
      .from('marketplace_users')
      .update({ is_subscribed: true })
      .eq('id', session.user_id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Subscription error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}