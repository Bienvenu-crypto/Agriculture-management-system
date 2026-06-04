import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('mp_session')?.value;
    if (!sessionId) return NextResponse.json({ user: null });

    const { data: session } = await db
      .from('marketplace_sessions')
      .select('user_id, expires_at')
      .eq('id', sessionId)
      .maybeSingle();

    if (!session) return NextResponse.json({ user: null });

    if (new Date(session.expires_at) < new Date()) {
      await db.from('marketplace_sessions').delete().eq('id', sessionId);
      return NextResponse.json({ user: null });
    }

    const { data: user } = await db
      .from('marketplace_users')
      .select('id, name, email, phone, district, role, is_subscribed')
      .eq('id', session.user_id)
      .maybeSingle();

    return NextResponse.json({ user: user || null });
  } catch (error) {
    return NextResponse.json({ user: null });
  }
}

export async function DELETE() {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('mp_session')?.value;
    if (sessionId) {
      await db.from('marketplace_sessions').delete().eq('id', sessionId);
    }
    const response = NextResponse.json({ ok: true });
    response.cookies.delete('mp_session');
    return response;
  } catch (error) {
    return NextResponse.json({ error: 'Logout failed' }, { status: 500 });
  }
}