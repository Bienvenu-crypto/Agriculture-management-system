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

    const { data: user, error } = await db
      .from('marketplace_users')
      .select('*')
      .eq('email', email)
      .eq('role', role)
      .maybeSingle();

    if (error || !user || !(await verifyPassword(password, user.password_hash))) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Update phone if provided and changed
    if (phone && phone.trim() !== '' && phone.trim() !== user.phone) {
      await db
        .from('marketplace_users')
        .update({ phone: phone.trim() })
        .eq('id', user.id);
      user.phone = phone.trim();
    }

    const sessionId = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    await db.from('marketplace_sessions').insert({
      id: sessionId,
      user_id: user.id,
      expires_at: expiresAt,
    });

    const response = NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        district: user.district,
        role: user.role,
        is_subscribed: user.is_subscribed,
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