import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cookies } from 'next/headers';
import crypto from 'crypto';

// Helper to get authenticated user ID
async function getUserId() {
  try {
    const cookieStore = await cookies();

    // Check Marketplace Session
    const mpSessionId = cookieStore.get('mp_session')?.value;
    if (mpSessionId) {
      console.log("Checking MP Session:", mpSessionId);
      const session = db
        .prepare('SELECT user_id FROM marketplace_sessions WHERE id = ?')
        .get(mpSessionId) as any;
      if (session) return session.user_id;
    }

    // Check Agrobot Session
    const sessionId = cookieStore.get('agrobot_session')?.value;
    if (sessionId) {
      console.log("Checking Agrobot Session:", sessionId);
      const session = db
        .prepare('SELECT user_id FROM sessions WHERE id = ?')
        .get(sessionId) as any;
      if (session) return session.user_id;
    }
  } catch (e) {
    console.warn("Could not retrieve cookies for notifications:", (e as any).message);
  }
  return null;
}

export async function GET(req: Request) {
  try {
    const userId = await getUserId();
    console.log("Fetching notifications, userId:", userId);

    // Fetch notifications where user_id matches OR it's global (NULL)
    let notifications;
    if (userId) {
      notifications = db.prepare(`
        SELECT * FROM notifications 
        WHERE user_id = ? OR user_id IS NULL 
        ORDER BY timestamp DESC LIMIT 20
      `).all(userId);
    } else {
      notifications = db.prepare(`
        SELECT * FROM notifications 
        WHERE user_id IS NULL 
        ORDER BY timestamp DESC LIMIT 20
      `).all();
    }

    let unreadCount = 0;
    if (userId) {
      const res = db.prepare('SELECT COUNT(*) as count FROM notifications WHERE (user_id = ? OR user_id IS NULL) AND is_read = 0').get(userId) as any;
      unreadCount = res?.count || 0;
    } else {
      const res = db.prepare('SELECT COUNT(*) as count FROM notifications WHERE user_id IS NULL AND is_read = 0').get() as any;
      unreadCount = res?.count || 0;
    }

    return NextResponse.json({ notifications, unreadCount });
  } catch (error: any) {
    console.error('Fetch notifications error:', error);
    return NextResponse.json({
      error: 'Failed to fetch notifications',
      details: error.message
    }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id, readAll } = await req.json();

    if (readAll) {
      db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ? OR user_id IS NULL').run(userId);
    } else if (id) {
      db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?').run(id);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { user_id, type, title, message } = await req.json();
    const id = crypto.randomUUID();
    db.prepare(`
      INSERT INTO notifications (id, user_id, type, title, message) 
      VALUES (?, ?, ?, ?, ?)
    `).run(id, user_id || null, type, title, message);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: 'Creation failed' }, { status: 500 });
  }
}
