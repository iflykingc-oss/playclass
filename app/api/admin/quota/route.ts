import { NextResponse } from 'next/server';
import { query } from '@/platform/db/client';
import { isAdminSession } from '@/platform/admin/auth';

/**
 * Admin overrides:
 *  - monthlyGenerations + userId → per-user quota_override (and sync snapshot column)
 *  - plan + userId               → set personal plan + 30d expiry (or org plan if org member)
 *  - plan + orgId                → set org plan
 */
export async function PUT(request: Request) {
  if (!(await isAdminSession(request))) {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }
  let body: {
    userId?: string;
    orgId?: string;
    monthlyGenerations?: number;
    monthlyVideoClips?: number;
    videoExportCredits?: number;
    plan?: string;
    seatCount?: number;
    planDays?: number;
  };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  if (body.userId && body.monthlyGenerations !== undefined) {
    await query(
      `UPDATE platform_users SET quota_override = $2 WHERE id = $1`,
      [body.userId, body.monthlyGenerations],
    );
    await query(
      `UPDATE platform_quotas SET monthly_generations = $2 WHERE user_id = $1`,
      [body.userId, body.monthlyGenerations],
    );
  }

  if (body.userId && body.monthlyVideoClips !== undefined) {
    await query(
      `UPDATE platform_users SET video_clip_override = $2 WHERE id = $1`,
      [body.userId, body.monthlyVideoClips],
    );
  }

  if (body.userId && body.videoExportCredits !== undefined) {
    await query(
      `UPDATE platform_users SET video_export_override = $2 WHERE id = $1`,
      [body.userId, body.videoExportCredits],
    );
  }

  if (body.plan && body.userId) {
    const userRows = await query<{ org_id: string | null }>(
      `SELECT org_id FROM platform_users WHERE id = $1`,
      [body.userId],
    );
    const orgId = userRows[0]?.org_id;
    if (orgId) {
      await query(`UPDATE platform_orgs SET plan = $2 WHERE id = $1`, [orgId, body.plan]);
    } else {
      const days = body.planDays ?? 30;
      await query(
        `UPDATE platform_users
         SET plan = $2,
             plan_expires_at = CASE WHEN $2 = 'free' THEN NULL ELSE NOW() + ($3 || ' days')::interval END
         WHERE id = $1`,
        [body.userId, body.plan, String(days)],
      );
    }
  }

  if (body.plan && body.orgId) {
    await query(`UPDATE platform_orgs SET plan = $2 WHERE id = $1`, [body.orgId, body.plan]);
  }

  if (body.seatCount !== undefined && body.orgId) {
    await query(`UPDATE platform_orgs SET seat_count = $2 WHERE id = $1`, [body.orgId, body.seatCount]);
  }

  return NextResponse.json({ ok: true });
}
