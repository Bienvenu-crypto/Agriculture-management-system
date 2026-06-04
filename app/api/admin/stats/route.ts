import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get('secret');
  const expectedSecret = process.env.ADMIN_SECRET || 'admin2026';

  if (secret !== expectedSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { count: totalMessages } = await db
      .from('chats')
      .select('*', { count: 'exact', head: true });

    const { data: uniqueUsersData } = await db
      .from('chats')
      .select('user_email');
    const uniqueUsers = new Set((uniqueUsersData || []).map((c: any) => c.user_email)).size;

    const { data: recentChats, error } = await db
      .from('chats')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(10);
    if (error) throw error;

    return NextResponse.json({
      stats: { totalMessages: totalMessages || 0, uniqueUsers },
      recentChats: recentChats || [],
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}