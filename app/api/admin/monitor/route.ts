import { NextResponse } from 'next/server';
import { query } from '@/platform/db/client';
import { isAdminSession } from '@/platform/admin/auth';

export async function GET(request: Request) {
  if (!(await isAdminSession(request))) {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }

  const [recentUsage, activeSessions, userDetail, systemStats, usageByKind, hourly] =
    await Promise.all([
      query(
        `SELECT u.id, u.kind, u.credits, u.meta, u.created_at, us.email, us.name
         FROM platform_usage u
         LEFT JOIN platform_users us ON u.user_id = us.id
         ORDER BY u.created_at DESC LIMIT 50`,
      ),
      query(
        `SELECT s.user_id, s.ip, s.user_agent, s.created_at, u.email, u.name
         FROM platform_sessions s
         LEFT JOIN platform_users u ON u.id = s.user_id
         WHERE s.expires_at > NOW()
         ORDER BY s.created_at DESC LIMIT 30`,
      ),
      query(
        `SELECT u.id, u.email, u.name, u.account_type, u.plan, u.disabled, u.created_at,
                q.monthly_generations, q.used_generations, q.used_video_clips,
                (SELECT MAX(created_at) FROM platform_usage WHERE user_id = u.id) as last_action,
                (SELECT COUNT(*)::int FROM platform_usage WHERE user_id = u.id) as total_actions,
                (SELECT COUNT(*)::int FROM platform_course_shares
                  WHERE owner_id = u.id OR owner_id = ('user:' || u.id)::text) as courses_published
         FROM platform_users u
         LEFT JOIN platform_quotas q ON u.id = q.user_id
         ORDER BY u.created_at DESC LIMIT 100`,
      ),
      query(
        `SELECT
           (SELECT COUNT(*)::int FROM platform_users) as total_users,
           (SELECT COUNT(*)::int FROM platform_users WHERE disabled = FALSE) as active_users,
           (SELECT COUNT(*)::int FROM platform_users WHERE created_at > NOW() - INTERVAL '7 days') as new_7d,
           (SELECT COUNT(*)::int FROM platform_users WHERE created_at > NOW() - INTERVAL '30 days') as new_30d,
           (SELECT COUNT(*)::int FROM platform_sessions WHERE expires_at > NOW()) as active_sessions,
           (SELECT COUNT(*)::int FROM platform_usage WHERE created_at > NOW() - INTERVAL '24 hours') as actions_24h,
           (SELECT COUNT(*)::int FROM platform_usage WHERE created_at > NOW() - INTERVAL '7 days') as actions_7d,
           (SELECT COUNT(*)::int FROM platform_course_shares WHERE is_published = true) as published_courses,
           (SELECT COALESCE(SUM(money),0)::float FROM platform_orders WHERE status = 'paid') as total_revenue,
           (SELECT COALESCE(SUM(money),0)::float FROM platform_orders
             WHERE status = 'paid' AND created_at > NOW() - INTERVAL '30 days') as revenue_30d,
           (SELECT COUNT(*)::int FROM platform_orders WHERE status = 'paid') as paid_orders
         `,
      ),
      query(
        `SELECT kind, COUNT(*)::int as count
         FROM platform_usage
         WHERE created_at > NOW() - INTERVAL '30 days'
         GROUP BY kind ORDER BY count DESC`,
      ),
      query(
        `SELECT date_trunc('hour', created_at) as hour, COUNT(*)::int as count
         FROM platform_usage
         WHERE created_at > NOW() - INTERVAL '24 hours'
         GROUP BY hour ORDER BY hour`,
      ),
    ]);

  // Daily series (30 days): signups, generations, revenue
  const dailyUsers = await query(
    `SELECT date_trunc('day', created_at)::date AS day, COUNT(*)::int AS count
     FROM platform_users
     WHERE created_at > NOW() - INTERVAL '30 days'
     GROUP BY 1 ORDER BY 1`,
  );
  const dailyUsage = await query(
    `SELECT date_trunc('day', created_at)::date AS day,
            COUNT(*)::int AS count,
            COUNT(*) FILTER (WHERE kind = 'course_generate')::int AS generations
     FROM platform_usage
     WHERE created_at > NOW() - INTERVAL '30 days'
     GROUP BY 1 ORDER BY 1`,
  );
  const dailyRevenue = await query(
    `SELECT date_trunc('day', created_at)::date AS day,
            COALESCE(SUM(money),0)::float AS revenue,
            COUNT(*) FILTER (WHERE status = 'paid')::int AS orders
     FROM platform_orders
     WHERE created_at > NOW() - INTERVAL '30 days'
     GROUP BY 1 ORDER BY 1`,
  );

  // Top users by usage
  const topUsers = await query(
    `SELECT u.email, u.name, u.plan,
            COUNT(x.id)::int AS actions,
            COUNT(x.id) FILTER (WHERE x.kind = 'course_generate')::int AS generations
     FROM platform_users u
     JOIN platform_usage x ON x.user_id = u.id
     WHERE x.created_at > NOW() - INTERVAL '30 days'
     GROUP BY u.id, u.email, u.name, u.plan
     ORDER BY actions DESC
     LIMIT 10`,
  );

  // M0 quality telemetry (WP1.1 anti-DOA / TTS / generation / export)
  const qualityEvents = await query(
    `SELECT kind, COUNT(*)::int AS count,
            COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours')::int AS last_24h
     FROM platform_usage
     WHERE kind IN ('interactive_error', 'tts_failure', 'generation_failure', 'export_failure')
       AND created_at > NOW() - INTERVAL '30 days'
     GROUP BY kind ORDER BY count DESC`,
  );

  return NextResponse.json({
    recentUsage,
    activeSessions,
    userDetail,
    systemStats: systemStats[0] || {},
    usageByKind,
    hourly,
    dailyUsers,
    dailyUsage,
    dailyRevenue,
    topUsers,
    qualityEvents,
  });
}
