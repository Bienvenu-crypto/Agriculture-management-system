import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cookies } from 'next/headers';
import crypto from 'crypto';

async function getUserId() {
  try {
    const cookieStore = await cookies();

    const mpSessionId = cookieStore.get('mp_session')?.value;
    if (mpSessionId) {
      const { data: session } = await db
        .from('marketplace_sessions')
        .select('user_id')
        .eq('id', mpSessionId)
        .maybeSingle();
      if (session) return session.user_id;
    }

    const sessionId = cookieStore.get('agrobot_session')?.value;
    if (sessionId) {
      const { data: session } = await db
        .from('sessions')
        .select('user_id')
        .eq('id', sessionId)
        .maybeSingle();
      if (session) return session.user_id;
    }
  } catch (e) {
    console.warn('Could not retrieve cookies for notifications:', (e as any).message);
  }
  return null;
}

export async function GET() {
  try {
    const userId = await getUserId();

    let notifQuery = db
      .from('notifications')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(20);

    if (userId) {
      notifQuery = notifQuery.or(`user_id.eq.${userId},user_id.is.null`);
    } else {
      notifQuery = notifQuery.is('user_id', null);
    }

    const { data: notifications, error } = await notifQuery;
    if (error) throw error;

    let unreadCount = 0;
    if (userId) {
      const { count } = await db
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .or(`user_id.eq.${userId},user_id.is.null`)
        .eq('is_read', false);
      unreadCount = count || 0;
    } else {
      const { count } = await db
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .is('user_id', null)
        .eq('is_read', false);
      unreadCount = count || 0;
    }

    return NextResponse.json({ notifications: notifications || [], unreadCount });
  } catch (error: any) {
    console.error('Fetch notifications error:', error);
    return NextResponse.json({ error: 'Failed to fetch notifications', details: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id, readAll } = await req.json();

    if (readAll) {
      await db
        .from('notifications')
        .update({ is_read: true })
        .or(`user_id.eq.${userId},user_id.is.null`);
    } else if (id) {
      await db.from('notifications').update({ is_read: true }).eq('id', id);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { user_id, type, title, message } = await req.json();
    await db.from('notifications').insert({
      id: crypto.randomUUID(),
      user_id: user_id || null,
      type,
      title,
      message,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: 'Creation failed' }, { status: 500 });
  }
}