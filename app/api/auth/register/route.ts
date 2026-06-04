import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { hashPassword, createSession, setSessionCookie } from '@/lib/auth';
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    const { name, email, password, district } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check for existing user
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return NextResponse.json({ error: 'Email already in use' }, { status: 400 });
    }

    const userId = crypto.randomUUID();
    const passwordHash = await hashPassword(password);

    const { error: insertError } = await supabase.from('users').insert({
      id: userId,
      email,
      password_hash: passwordHash,
      name,
      district: district || null,
    });

    if (insertError) {
      console.error('Insert user error:', insertError);
      return NextResponse.json({ error: 'Failed to create account' }, { status: 500 });
    }

    const sessionId = await createSession(userId);
    await setSessionCookie(sessionId);

    return NextResponse.json({ user: { id: userId, email, name, district } });
  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
