import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get('secret');

  const expectedSecret = process.env.ADMIN_SECRET || 'admin2026';

  if (secret !== expectedSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const totalChats = db.prepare('SELECT COUNT(*) as count FROM chats').get() as { count: number };
    const userCount = db.prepare('SELECT COUNT(DISTINCT user_email) as count FROM chats').get() as { count: number };
    const recentChats = db.prepare('SELECT * FROM chats ORDER BY timestamp DESC LIMIT 10').all();

    return NextResponse.json({
      stats: {
        totalMessages: totalChats.count,
        uniqueUsers: userCount.count,
      },
      recentChats
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
