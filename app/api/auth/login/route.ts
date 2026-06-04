import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyPassword, createSession, setSessionCookie } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Missing email or password' }, { status: 400 });
    }

    const { data: user } = await supabase
      .from('users')
      .select('id, email, name, password_hash, district')
      .eq('email', email)
      .single();

    if (!user || !(await verifyPassword(password, user.password_hash))) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const sessionId = await createSession(user.id);
    await setSessionCookie(sessionId);

    return NextResponse.json({ user: { id: user.id, email: user.email, name: user.name, district: user.district } });
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
