import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    const { messages, user_email, session_id } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Messages array is required' }, { status: 400 });
    }

    const rows = messages.map((msg: any) => ({
      id: msg.id || crypto.randomUUID(),
      user_email: user_email || 'anonymous',
      session_id,
      role: msg.role,
      content: msg.content,
      image_url: msg.image || null,
    }));

    const { error } = await db.from('chats').insert(rows);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Database Error:', error);
    return NextResponse.json({ error: 'Failed to save chat' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email');
    const sessionId = searchParams.get('session_id');

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    if (sessionId) {
      const { data: chats, error } = await db
        .from('chats')
        .select('id, role, content, image_url')
        .eq('user_email', email)
        .eq('session_id', sessionId)
        .order('timestamp', { ascending: true });
      if (error) throw error;

      // Rename image_url -> image
      const formatted = (chats || []).map((c: any) => ({ ...c, image: c.image_url, image_url: undefined }));
      return NextResponse.json({ chats: formatted });
    } else {
      // Return sessions grouped
      const { data: rows, error } = await db
        .from('chats')
        .select('session_id, timestamp, content')
        .eq('user_email', email)
        .order('timestamp', { ascending: true });
      if (error) throw error;

      // Group by session_id and keep earliest
      const sessionMap = new Map<string, any>();
      for (const row of (rows || [])) {
        if (!sessionMap.has(row.session_id)) {
          sessionMap.set(row.session_id, { session_id: row.session_id, started_at: row.timestamp, first_message: row.content });
        }
      }
      const sessions = Array.from(sessionMap.values()).sort(
        (a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
      );
      return NextResponse.json({ sessions });
    }
  } catch (error) {
    console.error('Database Error:', error);
    return NextResponse.json({ error: 'Failed to fetch chats' }, { status: 500 });
  }
}