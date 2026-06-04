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

    // Check for existing user by email OR phone within the same role
    const { data: existing } = await db
      .from('marketplace_users')
      .select('id')
      .eq('role', role)
      .or(`email.eq.${email},phone.eq.${phone}`)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: `An account with this email or phone number already exists as a ${role}.` },
        { status: 400 }
      );
    }

    const userId = crypto.randomUUID();
    const passwordHash = await hashPassword(password);

    const { error: insertError } = await db.from('marketplace_users').insert({
      id: userId,
      name,
      email,
      phone: phone || null,
      district,
      role,
      password_hash: passwordHash,
    });

    if (insertError) {
      console.error('Insert marketplace_users error:', insertError);
      return NextResponse.json({ error: 'Failed to create account' }, { status: 500 });
    }

    // Create session
    const sessionId = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    await db.from('marketplace_sessions').insert({
      id: sessionId,
      user_id: userId,
      expires_at: expiresAt,
    });

    const response = NextResponse.json({
      user: { id: userId, name, email, phone: phone || null, district, role, is_subscribed: false },
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