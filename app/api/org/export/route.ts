import { NextRequest, NextResponse } from 'next/server';
import { resolvePlatformOwnerId } from '@/platform/auth';
import { isAdminSession } from '@/platform/admin/auth';
import { getOrgForUser } from '@/platform/orgs';
import { query } from '@/platform/db/client';

function csvEscape(value: unknown): string {
  const s = value === null || value === undefined ? '' : String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsv(rows: Record<string, unknown>[], columns: string[]): string {
  const header = columns.join(',');
  const lines = rows.map((r) => columns.map((c) => csvEscape(r[c])).join(','));
  return [header, ...lines].join('\n');
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
 * GET /api/org/export?type=usage|members|quality&days=30
 * Org-owner CSV reports (institutional buyer ask — ClassPoint/Nearpod parity).
 * Admin may pass ?orgId=.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const type = url.searchParams.get('type') || 'usage';
  const days = Math.min(365, Math.max(1, parseInt(url.searchParams.get('days') || '30', 10) || 30));

  const { user } = await resolvePlatformOwnerId(request);
  let orgId: string | null = null;
  if (user) {
    const org = await getOrgForUser(user.id);
    if (org && org.ownerUserId === user.id) orgId = org.id;
  }
  if (!orgId) {
    if (await isAdminSession(request)) {
      orgId = url.searchParams.get('orgId');
    }
  }
  if (!orgId) {
    return NextResponse.json({ error: 'Org owner or admin only' }, { status: 403 });
  }

  const stamp = new Date().toISOString().slice(0, 10);

  if (type === 'members') {
    const rows = await query(
      `SELECT u.id AS user_id, u.email, u.name, u.account_type, u.plan,
              COALESCE(q.used_generations, 0) AS used_generations,
              COALESCE(q.monthly_generations, 0) AS monthly_generations,
              COALESCE(q.used_video_clips, 0) AS used_video_clips,
              COALESCE(u.bonus_video_clips, 0) AS bonus_video_clips,
              u.created_at::date AS joined_on
       FROM platform_users u
       LEFT JOIN platform_quotas q ON q.user_id = u.id
       WHERE u.org_id = $1
       ORDER BY u.created_at ASC`,
      [orgId],
    );
    return csvResponse(
      `playclass-org-members-${stamp}.csv`,
      toCsv(rows as Record<string, unknown>[], [
        'user_id',
        'email',
        'name',
        'account_type',
        'plan',
        'used_generations',
        'monthly_generations',
        'used_video_clips',
        'bonus_video_clips',
        'joined_on',
      ]),
    );
  }

  if (type === 'quality') {
    const rows = await query(
      `SELECT e.created_at::date AS day, e.category, e.event, e.outcome,
              COUNT(*)::int AS count
       FROM platform_quality_events e
       JOIN platform_users u ON u.id = e.user_id
       WHERE u.org_id = $1 AND e.created_at > NOW() - ($2 || ' days')::interval
       GROUP BY 1, 2, 3, 4
       ORDER BY 1 DESC, 2, 3`,
      [orgId, String(days)],
    );
    return csvResponse(
      `playclass-org-quality-${stamp}.csv`,
      toCsv(rows as Record<string, unknown>[], ['day', 'category', 'event', 'outcome', 'count']),
    );
  }

  // default: usage
  const daily = await query(
    `SELECT date_trunc('day', x.created_at)::date AS day,
            x.kind,
            COUNT(*)::int AS events,
            SUM(x.credits)::int AS credits
     FROM platform_usage x
     WHERE x.org_id = $1 AND x.created_at > NOW() - ($2 || ' days')::interval
     GROUP BY 1, 2
     ORDER BY 1 DESC, 2`,
    [orgId, String(days)],
  );
  return csvResponse(
    `playclass-org-usage-${stamp}.csv`,
    toCsv(daily as Record<string, unknown>[], ['day', 'kind', 'events', 'credits']),
  );
}
