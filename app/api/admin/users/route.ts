import { NextResponse } from 'next/server';
import { randomBytes, scryptSync } from 'crypto';
import { query } from '@/platform/db/client';
import { isAdminSession } from '@/platform/admin/auth';

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

/**
 * GET /api/admin/users?q=&plan=&page=&pageSize=
 * List users with quota + usage summary. Supports search and filters.
 */
export async function GET(request: Request) {
  if (!(await isAdminSession(request))) {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }
  const url = new URL(request.url);
  const q = (url.searchParams.get('q') || '').trim();
  const plan = (url.searchParams.get('plan') || '').trim();
  const status = (url.searchParams.get('status') || '').trim(); // active | disabled
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10) || 1);
  const pageSize = Math.min(100, Math.max(10, parseInt(url.searchParams.get('pageSize') || '20', 10) || 20));
  const offset = (page - 1) * pageSize;

  const where: string[] = [];
  const params: unknown[] = [];
  let i = 1;
  if (q) {
    where.push(`(u.email ILIKE $${i} OR u.name ILIKE $${i})`);
    params.push(`%${q}%`);
    i++;
  }
  if (plan) {
    where.push(`u.plan = $${i++}`);
    params.push(plan);
  }
  if (status === 'disabled') where.push(`u.disabled = TRUE`);
  if (status === 'active') where.push(`u.disabled = FALSE`);
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const users = await query(
    `SELECT u.id, u.email, u.name, u.account_type, u.org_id, u.plan, u.plan_expires_at,
            u.disabled, u.disabled_reason, u.created_at,
            COALESCE(q.monthly_generations, 5) AS monthly_generations,
            COALESCE(q.used_generations, 0) AS used_generations,
            COALESCE(q.used_video_clips, 0) AS used_video_clips,
            COALESCE(u.bonus_video_clips, 0) AS bonus_video_clips,
            (SELECT COUNT(*)::int FROM platform_usage x WHERE x.user_id = u.id) AS total_actions,
            (SELECT MAX(created_at) FROM platform_usage x WHERE x.user_id = u.id) AS last_action,
            (SELECT COUNT(*)::int FROM platform_orders o WHERE o.user_id = u.id AND o.status = 'paid') AS paid_orders
     FROM platform_users u
     LEFT JOIN platform_quotas q ON q.user_id = u.id
     ${whereSql}
     ORDER BY u.created_at DESC
     LIMIT $${i++} OFFSET $${i++}`,
    [...params, pageSize, offset],
  );

  const countRows = await query<{ count: number }>(
    `SELECT COUNT(*)::int AS count FROM platform_users u ${whereSql}`,
    params,
  );

  return NextResponse.json({
    users,
    total: countRows[0]?.count ?? 0,
    page,
    pageSize,
  });
}

/**
 * PATCH /api/admin/users
 * { userId, action }
 *  - set_plan        { plan, planDays? }
 *  - set_quota       { monthlyGenerations?, monthlyVideoClips?, videoExportCredits? }
 *  - toggle_disabled { disabled, reason? }
 *  - reset_password  { newPassword? }  → returns generated password if omitted
 *  - grant_bonus     { bonusVideoClips?, bonusVideoExports? }
 */
export async function PATCH(request: Request) {
  if (!(await isAdminSession(request))) {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }
  let body: any;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { userId, action } = body;
  if (!userId || !action) {
    return NextResponse.json({ error: 'userId and action required' }, { status: 400 });
  }

  try {
    switch (action) {
      case 'set_plan': {
        const plan = body.plan || 'free';
        const days = Number(body.planDays) || 30;
        if (plan === 'free') {
          await query(
            `UPDATE platform_users SET plan = 'free', plan_expires_at = NULL, updated_at = NOW() WHERE id = $1`,
            [userId],
          );
        } else {
          await query(
            `UPDATE platform_users SET plan = $2, plan_expires_at = NOW() + ($3 || ' days')::interval, updated_at = NOW()
             WHERE id = $1`,
            [userId, plan, String(days)],
          );
        }
        // Reset monthly window so the new plan takes effect immediately
        await query(
          `UPDATE platform_quotas SET used_generations = 0, used_video_clips = 0, used_video_exports = 0,
              period_started_at = DATE_TRUNC('month', NOW())
           WHERE user_id = $1`,
          [userId],
        );
        return NextResponse.json({ ok: true });
      }
      case 'set_quota': {
        if (body.monthlyGenerations !== undefined) {
          await query(`UPDATE platform_users SET quota_override = $2 WHERE id = $1`, [
            userId,
            Number(body.monthlyGenerations),
          ]);
        }
        if (body.monthlyVideoClips !== undefined) {
          await query(`UPDATE platform_users SET video_clip_override = $2 WHERE id = $1`, [
            userId,
            Number(body.monthlyVideoClips),
          ]);
        }
        if (body.videoExportCredits !== undefined) {
          await query(`UPDATE platform_users SET video_export_override = $2 WHERE id = $1`, [
            userId,
            Number(body.videoExportCredits),
          ]);
        }
        return NextResponse.json({ ok: true });
      }
      case 'toggle_disabled': {
        await query(
          `UPDATE platform_users SET disabled = $2, disabled_reason = $3, updated_at = NOW() WHERE id = $1`,
          [userId, !!body.disabled, body.reason ? String(body.reason).slice(0, 200) : null],
        );
        // Kick all sessions when disabling
        if (body.disabled) {
          await query(`DELETE FROM platform_sessions WHERE user_id = $1`, [userId]);
        }
        return NextResponse.json({ ok: true });
      }
      case 'reset_password': {
        const password = body.newPassword || randomBytes(9).toString('base64url');
        await query(`UPDATE platform_users SET password_hash = $2, updated_at = NOW() WHERE id = $1`, [
          userId,
          hashPassword(password),
        ]);
        return NextResponse.json({ ok: true, password });
      }
      case 'grant_bonus': {
        if (body.bonusVideoClips !== undefined) {
          await query(`UPDATE platform_users SET bonus_video_clips = GREATEST(0, $2) WHERE id = $1`, [
            userId,
            Number(body.bonusVideoClips),
          ]);
        }
        if (body.bonusVideoExports !== undefined) {
          await query(`UPDATE platform_users SET bonus_video_exports = GREATEST(0, $2) WHERE id = $1`, [
            userId,
            Number(body.bonusVideoExports),
          ]);
        }
        return NextResponse.json({ ok: true });
      }
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Unknown error' }, { status: 400 });
  }
}

/**
 * DELETE /api/admin/users?userId= — soft-delete: disable + anonymize email, keep usage history.
 */
export async function DELETE(request: Request) {
  if (!(await isAdminSession(request))) {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }
  const userId = new URL(request.url).searchParams.get('userId');
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

  const tag = randomBytes(4).toString('hex');
  await query(
    `UPDATE platform_users
     SET email = 'deleted+' || $2 || '@invalid.local',
         name = '已注销用户',
         disabled = TRUE,
         disabled_reason = 'deleted',
         password_hash = 'deleted',
         updated_at = NOW()
     WHERE id = $1`,
    [userId, tag],
  );
  await query(`DELETE FROM platform_sessions WHERE user_id = $1`, [userId]);
  return NextResponse.json({ ok: true });
}
