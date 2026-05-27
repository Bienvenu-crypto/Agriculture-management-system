import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    const { name, email, password, phone, district, role } = await req.json();

    if (!name || !email || !password || !district || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!phone) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
    }

    if (!['seller', 'buyer'].includes(role)) {
      return NextResponse.json({ error: 'Role must be seller or buyer' }, { status: 400 });
    }

    // Check for existing user by email OR phone (within the same role)
    const existing = db
      .prepare('SELECT id FROM marketplace_users WHERE (email = ? OR (phone = ? AND phone IS NOT NULL)) AND role = ?')
      .get(email, phone || null, role);

    if (existing) {
      return NextResponse.json(
        { error: `An account with this email or phone number already exists as a ${role}.` },
        { status: 400 }
      );
    }

    const userId = crypto.randomUUID();
    const passwordHash = await hashPassword(password);

    db.prepare(
      'INSERT INTO marketplace_users (id, name, email, phone, district, role, password_hash) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(userId, name, email, phone || null, district, role, passwordHash);

    // Create session
    const sessionId = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    db.prepare('INSERT INTO marketplace_sessions (id, user_id, expires_at) VALUES (?, ?, ?)').run(
      sessionId,
      userId,
      expiresAt
    );

    const response = NextResponse.json({
      user: { id: userId, name, email, phone: phone || null, district, role, is_subscribed: 0 },
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
    console.error('Marketplace register error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
