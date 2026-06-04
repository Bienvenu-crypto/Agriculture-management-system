import crypto from 'crypto';
import { supabase } from './supabase';
import { cookies } from 'next/headers';
import { promisify } from 'util';

const SALT_LENGTH = 16;
const ITERATIONS = 10000;
const KEY_LENGTH = 64;
const DIGEST = 'sha512';

const pbkdf2 = promisify(crypto.pbkdf2);

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(SALT_LENGTH).toString('hex');
  const hash = (await pbkdf2(password, salt, ITERATIONS, KEY_LENGTH, DIGEST)).toString('hex');
  return `${salt}:${hash}`;
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [salt, hash] = storedHash.split(':');
  const verifyHash = (await pbkdf2(password, salt, ITERATIONS, KEY_LENGTH, DIGEST)).toString('hex');
  return hash === verifyHash;
}

export async function createSession(userId: string): Promise<string> {
  const sessionId = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  await supabase.from('sessions').insert({
    id: sessionId,
    user_id: userId,
    expires_at: expiresAt,
  });

  return sessionId;
}

export async function setSessionCookie(sessionId: string) {
  const cookieStore = await cookies();
  cookieStore.set('agrobot_session', sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60,
    path: '/',
  });
}

export async function getSessionUser() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('agrobot_session')?.value;
  if (!sessionId) return null;

  const { data: session } = await supabase
    .from('sessions')
    .select('user_id, expires_at')
    .eq('id', sessionId)
    .single();

  if (!session) return null;

  if (new Date(session.expires_at) < new Date()) {
    await supabase.from('sessions').delete().eq('id', sessionId);
    return null;
  }

  const { data: user } = await supabase
    .from('users')
    .select('id, email, name, district')
    .eq('id', session.user_id)
    .single();

  return user || null;
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('agrobot_session')?.value;

  if (sessionId) {
    await supabase.from('sessions').delete().eq('id', sessionId);
  }

  cookieStore.delete('agrobot_session');
}
