import { NextRequest, NextResponse } from 'next/server';
import { isAdminSession } from '@/platform/admin/auth';
import { query } from '@/platform/db/client';

function csvEscape(value: unknown): string {
  const s = value === null || value === undefined ? '' : String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsv(rows: Record<string, unknown>[], columns: string[]): string {
  return [columns.join(','), ...rows.map((r) => columns.map((c) => csvEscape(r[c])).join(','))].join('\n');
}

function csvResponse(filename: string, content: string): NextResponse {
  return new NextResponse(content, {
    status: 200,
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="${filename}"`,
      'cache-control': 'no-store',
    },
  });
}

/**
 * GET /api/admin/export?type=users|orders|usage|quality&days=30
 * Super-admin CSV dumps for ops / finance.
 */
export async function GET(request: NextRequest) {
  if (!(await isAdminSession(request))) {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }
  const url = new URL(request.url);
  const type = url.searchParams.get('type') || 'users';
  const days = Math.min(365, Math.max(1, parseInt(url.searchParams.get('days') || '30', 10) || 30));
  const stamp = new Date().toISOString().slice(0, 10);

  if (type === 'orders') {
    const rows = await query(
      `SELECT o.out_trade_no, o.trade_no, o.subject, o.plan, o.kind, o.money, o.currency,
              o.status, o.type, o.created_at::date AS created_on, o.paid_at
       FROM platform_orders o
       ORDER BY o.created_at DESC LIMIT 5000`,
    );
    return csvResponse(
      `playclass-orders-${stamp}.csv`,
      toCsv(rows as Record<string, unknown>[], [
        'out_trade_no',
        'trade_no',
        'subject',
        'plan',
        'kind',
        'money',
        'currency',
        'status',
        'type',
        'created_on',
        'paid_at',
      ]),
    );
  }

  if (type === 'usage') {
    const rows = await query(
      `SELECT date_trunc('day', created_at)::date AS day, kind,
              COUNT(*)::int AS events, SUM(credits)::int AS credits
       FROM platform_usage
       WHERE created_at > NOW() - ($1 || ' days')::interval
       GROUP BY 1, 2 ORDER BY 1 DESC, 2`,
      [String(days)],
    );
    return csvResponse(
      `playclass-usage-${stamp}.csv`,
      toCsv(rows as Record<string, unknown>[], ['day', 'kind', 'events', 'credits']),
    );
  }

  if (type === 'quality') {
    const rows = await query(
      `SELECT created_at::date AS day, category, event, outcome, COUNT(*)::int AS count
       FROM platform_quality_events
       WHERE created_at > NOW() - ($1 || ' days')::interval
       GROUP BY 1, 2, 3, 4 ORDER BY 1 DESC`,
      [String(days)],
    );
    return csvResponse(
      `playclass-quality-${stamp}.csv`,
      toCsv(rows as Record<string, unknown>[], ['day', 'category', 'event', 'outcome', 'count']),
    );
  }

  const rows = await query(
    `SELECT u.id, u.email, u.name, u.account_type, u.plan, u.disabled,
            u.org_id, u.created_at::date AS joined_on,
            COALESCE(q.used_generations, 0) AS used_generations,
            COALESCE(q.monthly_generations, 0) AS monthly_generations,
            (SELECT COUNT(*)::int FROM platform_orders o WHERE o.user_id = u.id AND o.status = 'paid') AS paid_orders
     FROM platform_users u
     LEFT JOIN platform_quotas q ON q.user_id = u.id
     ORDER BY u.created_at DESC LIMIT 10000`,
  );
  return csvResponse(
    `playclass-users-${stamp}.csv`,
    toCsv(rows as Record<string, unknown>[], [
      'id',
      'email',
      'name',
      'account_type',
      'plan',
      'disabled',
      'org_id',
      'joined_on',
      'used_generations',
      'monthly_generations',
      'paid_orders',
    ]),
  );
}
