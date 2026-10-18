import { NextResponse } from 'next/server';
import { resolvePlatformOwnerId } from '@/platform/auth';
import { isAdminSession } from '@/platform/admin/auth';
import { query } from '@/platform/db/client';
import { getQuota } from '@/platform/billing';

export async function GET(request: Request) {
  const { ownerId, user } = await resolvePlatformOwnerId(request);

  // Super-admin preview of the user workbench: no end-user session, but the
  // operator must still see the shell without a 401 redirect loop.
  if (!user) {
    if (await isAdminSession(request)) {
      return NextResponse.json({
        coursesPublished: 0,
        usageThisMonth: [],
        quota: {
          plan: 'free',
          monthly_generations: 0,
          used_generations: 0,
          remaining: 0,
          video_clips: { limit: 0, used: 0, bonus: 0, remaining: 0 },
          video_exports: { limit: 0, used: 0, bonus: 0, remaining: 0 },
          plan_expires_at: null,
          source: 'free',
        },
        accountType: 'personal',
        orgId: null,
        learnerStats: { totalSessions: 0, uniqueLearners: 0, completedSessions: 0, byCourse: [] },
        adminPreview: true,
      });
    }
    return NextResponse.json({ error: 'Login required' }, { status: 401 });
  }

  // Courses published by this owner
  const courseRows = await query<{ count: string }>(
    `SELECT COUNT(*)::int as count FROM platform_course_shares WHERE owner_id = $1 AND is_published = TRUE`,
    [ownerId],
  );

  // Usage this month
  const usageRows = await query<{ kind: string; count: number }>(
    `SELECT kind, COUNT(*)::int as count FROM platform_usage
     WHERE user_id = $1 AND created_at > DATE_TRUNC('month', NOW())
     GROUP BY kind`,
    [user.id],
  );

  // Quota — plan-aware (user plan / org plan / admin override)
  const quota = await getQuota(user.id);

  // --- Learner runtime analytics (from OpenMAIC runtime_sessions table) ---
  // Get all stage_ids owned by this user
  const stageRows = await query<{ stage_id: string }>(
    `SELECT stage_id FROM platform_course_shares WHERE owner_id = $1 AND is_published = TRUE`,
    [ownerId],
  );
  const stageIds = stageRows.map((r: any) => r.stage_id);

  let learnerStats = { totalSessions: 0, uniqueLearners: 0, completedSessions: 0, byCourse: [] as any[] };

  if (stageIds.length > 0) {
    // Total sessions across all user's courses
    const sessionRows = await query<{ count: number; learners: number; completed: number }>(
      `SELECT
         COUNT(*)::int as count,
         COUNT(DISTINCT learner_key)::int as learners,
         COUNT(*) FILTER (WHERE status = 'complete')::int as completed
       FROM runtime_sessions WHERE stage_id = ANY($1)`,
      [stageIds],
    );
    learnerStats.totalSessions = sessionRows[0]?.count || 0;
    learnerStats.uniqueLearners = sessionRows[0]?.learners || 0;
    learnerStats.completedSessions = sessionRows[0]?.completed || 0;

    // Per-course breakdown
    learnerStats.byCourse = await query(
      `SELECT stage_id,
         COUNT(*)::int as sessions,
         COUNT(DISTINCT learner_key)::int as learners,
         COUNT(*) FILTER (WHERE status = 'complete')::int as completed
       FROM runtime_sessions WHERE stage_id = ANY($1)
       GROUP BY stage_id`,
      [stageIds],
    );
  }

  return NextResponse.json({
    coursesPublished: courseRows[0]?.count || 0,
    usageThisMonth: usageRows,
    quota: {
      plan: quota.plan,
      monthly_generations: quota.monthlyLimit,
      used_generations: quota.used,
      remaining: quota.remaining,
      video_clips: quota.videoClips,
      video_exports: quota.videoExports,
      plan_expires_at: quota.planExpiresAt,
      source: quota.source,
    },
    accountType: user.account_type,
    orgId: user.org_id,
    learnerStats,
    adminPreview: false,
  });
}
