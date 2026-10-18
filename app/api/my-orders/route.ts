import { NextResponse } from 'next/server';
import { resolvePlatformOwnerId } from '@/platform/auth';
import { query } from '@/platform/db/client';

export async function GET(request: Request) {
  const { user } = await resolvePlatformOwnerId(request);
  if (!user) return NextResponse.json({ error: 'Login required' }, { status: 401 });

  const orders = await query(
    `SELECT out_trade_no, trade_no, money, currency, subject, plan, status, type, created_at, paid_at
     FROM platform_orders WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100`,
    [user.id],
  );

  return NextResponse.json({ orders });
}
