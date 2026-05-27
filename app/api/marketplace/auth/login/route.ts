import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyPassword } from '@/lib/auth';
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    const { email, password, role, phone } = await req.json();

    if (!email || !password || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const user = db
      .prepare('SELECT * FROM marketplace_users WHERE email = ? AND role = ?')
      .get(email, role) as any;

    if (!user || !(await verifyPassword(password, user.password_hash))) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Update phone if provided and not already set (or if changed)
    if (phone && phone.trim() !== '' && phone.trim() !== user.phone) {
      db.prepare('UPDATE marketplace_users SET phone = ? WHERE id = ?').run(phone.trim(), user.id);
      user.phone = phone.trim();
    }

    const sessionId = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    db.prepare('INSERT INTO marketplace_sessions (id, user_id, expires_at) VALUES (?, ?, ?)').run(
      sessionId,
      user.id,
      expiresAt
    );

    const response = NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        district: user.district,
        role: user.role,
        is_subscribed: user.is_subscribed
      },
    });
    response.cookies.set('mp_session', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });
    return response;
  } catch (error: any) {
    console.error('Marketplace login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
