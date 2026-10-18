import { NextResponse } from 'next/server';
import { isAdminSession } from '@/platform/admin/auth';
import { listQualityEvents, qualitySummary } from '@/platform/quality';

/**
 * GET /api/admin/quality?category=&outcome=&q=&limit=
 * Durable quality / platform event log (success + failure + reasons).
 */
export async function GET(request: Request) {
  if (!(await isAdminSession(request))) {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }
  const url = new URL(request.url);
  const events = await listQualityEvents({
    category: url.searchParams.get('category') || undefined,
    outcome: url.searchParams.get('outcome') || undefined,
    q: url.searchParams.get('q') || undefined,
    limit: parseInt(url.searchParams.get('limit') || '50', 10) || 50,
  });
  const summary = await qualitySummary();
  return NextResponse.json({ events, ...summary });
}
