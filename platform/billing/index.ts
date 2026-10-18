/**
 * Platform billing / quota.
 *
 * Effective limit resolution (first match wins):
 *   1. user.quota_override          — admin per-user exception
 *   2. user.plan (if not expired)   — personal subscription
 *   3. org.plan                     — org members share the org plan
 *   4. free
 *
 * Monthly generation caps come from `platform_plans` (admin-configurable),
 * falling back to the built-in defaults if the table is empty.
 */
import { query } from '../db/client';

export type Plan = 'free' | 'pro_monthly' | 'pro_plus_monthly' | 'enterprise_yearly' | (string & {});

export const PLAN_LIMITS: Record<
  string,
  { monthlyGenerations: number; monthlyVideoClips: number; videoExportCredits: number; description: string }
> = {
  free: { monthlyGenerations: 3, monthlyVideoClips: 0, videoExportCredits: 0, description: '3 courses/month, no AI video' },
  pro_monthly: { monthlyGenerations: 40, monthlyVideoClips: 20, videoExportCredits: 20, description: '40 courses/month, 20 video clips' },
  pro_plus_monthly: { monthlyGenerations: 100, monthlyVideoClips: 60, videoExportCredits: 60, description: '100 courses/month, 60 video clips' },
  enterprise_yearly: { monthlyGenerations: 200, monthlyVideoClips: 100, videoExportCredits: -1, description: '200/seat, 100 clips, unlimited exports' },
};

export interface QuotaStatus {
  plan: Plan;
  monthlyLimit: number; // -1 = unlimited
  used: number;
  remaining: number;
  /** AI video clips (Seedance/Kling/...), NOT classroom→MP4 export. */
  videoClips: { limit: number; used: number; remaining: number; bonus: number };
  /** Classroom → MP4 export via render-service. */
  videoExports: { limit: number; used: number; remaining: number; bonus: number };
  periodStartedAt: string;
  planExpiresAt: string | null;
  source: 'override' | 'user_plan' | 'org_plan' | 'free';
}

export interface PlanRow {
  id: string;
  name_zh: string;
  name_en: string;
  monthly_generations: number;
  monthly_video_clips: number;
  video_export_credits: number;
  price_cny: number;
  price_usd: number;
  period_days: number;
  sort_order: number;
  is_active: boolean;
  features_zh: string[];
  features_en: string[];
}

const PLAN_SELECT = `SELECT id, name_zh, name_en, monthly_generations, monthly_video_clips, video_export_credits,
       price_cny, price_usd, period_days, sort_order, is_active, features_zh, features_en
  FROM platform_plans`;

interface PlanBudget {
  generations: number;
  videoClips: number;
  videoExports: number;
}

async function loadPlanBudget(planId: string): Promise<PlanBudget> {
  const rows = await query<{ monthly_generations: number; monthly_video_clips: number; video_export_credits: number }>(
    `SELECT monthly_generations, monthly_video_clips, video_export_credits FROM platform_plans WHERE id = $1`,
    [planId],
  );
  if (rows.length > 0) {
    return {
      generations: rows[0].monthly_generations,
      videoClips: rows[0].monthly_video_clips ?? 0,
      videoExports: rows[0].video_export_credits ?? 0,
    };
  }
  const fallback = PLAN_LIMITS[planId] ?? PLAN_LIMITS.free;
  return {
    generations: fallback.monthlyGenerations,
    videoClips: fallback.monthlyVideoClips,
    videoExports: fallback.videoExportCredits,
  };
}

export async function listActivePlans(): Promise<PlanRow[]> {
  return query<PlanRow>(`${PLAN_SELECT} WHERE is_active = TRUE ORDER BY sort_order ASC`);
}

export async function getPlan(planId: string): Promise<PlanRow | null> {
  const rows = await query<PlanRow>(`${PLAN_SELECT} WHERE id = $1`, [planId]);
  return rows[0] ?? null;
}

/** Update admin-configurable limits and dual-currency prices. */
export async function updatePlanConfig(
  planId: string,
  patch: {
    monthlyGenerations?: number;
    monthlyVideoClips?: number;
    videoExportCredits?: number;
    priceCny?: number;
    priceUsd?: number;
    periodDays?: number;
    isActive?: boolean;
  },
): Promise<void> {
  const sets: string[] = [];
  const params: unknown[] = [planId];
  let i = 2;
  const push = (col: string, val: unknown) => {
    sets.push(`${col} = $${i++}`);
    params.push(val);
  };
  if (patch.monthlyGenerations !== undefined) push('monthly_generations', patch.monthlyGenerations);
  if (patch.monthlyVideoClips !== undefined) push('monthly_video_clips', patch.monthlyVideoClips);
  if (patch.videoExportCredits !== undefined) push('video_export_credits', patch.videoExportCredits);
  if (patch.priceCny !== undefined) push('price_cny', patch.priceCny);
  if (patch.priceUsd !== undefined) push('price_usd', patch.priceUsd);
  if (patch.periodDays !== undefined) push('period_days', patch.periodDays);
  if (patch.isActive !== undefined) push('is_active', patch.isActive);
  if (sets.length === 0) return;
  sets.push(`updated_at = NOW()`);
  await query(`UPDATE platform_plans SET ${sets.join(', ')} WHERE id = $1`, params);
}

interface UserPlanRow {
  org_id: string | null;
  plan: string | null;
  plan_expires_at: Date | null;
  quota_override: number | null;
  video_clip_override: number | null;
  video_export_override: number | null;
  bonus_video_clips: number | null;
  bonus_video_exports: number | null;
}

function remainingOf(limit: number, used: number, bonus = 0): number {
  if (limit === -1) return -1;
  return Math.max(0, limit - used) + Math.max(0, bonus);
}

function budgetStatus(limit: number, used: number, bonus = 0) {
  return {
    limit,
    used,
    bonus: Math.max(0, bonus),
    remaining: remainingOf(limit, used, bonus),
  };
}

export async function getQuota(userId: string): Promise<QuotaStatus> {
  const userRows = await query<UserPlanRow>(
    `SELECT org_id, plan, plan_expires_at, quota_override, video_clip_override, video_export_override,
            bonus_video_clips, bonus_video_exports
     FROM platform_users WHERE id = $1`,
    [userId],
  );
  const user = userRows[0];
  if (!user) {
    return {
      plan: 'free',
      monthlyLimit: 3,
      used: 0,
      remaining: 3,
      videoClips: budgetStatus(0, 0, 0),
      videoExports: budgetStatus(0, 0, 0),
      periodStartedAt: new Date().toISOString(),
      planExpiresAt: null,
      source: 'free',
    };
  }

  const bonusClips = user.bonus_video_clips ?? 0;
  const bonusExports = user.bonus_video_exports ?? 0;

  // --- resolve effective plan + limits ---
  let plan: Plan = 'free';
  let source: QuotaStatus['source'] = 'free';
  let budget: PlanBudget = await loadPlanBudget('free');
  let planExpiresAt: string | null = null;

  const now = new Date();
  const userPlanActive =
    user.plan &&
    user.plan !== 'free' &&
    (!user.plan_expires_at || new Date(user.plan_expires_at) > now);

  if (user.quota_override !== null && user.quota_override !== undefined) {
    budget = {
      generations: user.quota_override,
      videoClips: user.video_clip_override ?? budget.videoClips,
      videoExports: user.video_export_override ?? budget.videoExports,
    };
    plan = (user.plan as Plan) || 'free';
    source = 'override';
    planExpiresAt = user.plan_expires_at?.toISOString() ?? null;
  } else if (userPlanActive) {
    plan = user.plan as Plan;
    budget = await loadPlanBudget(plan);
    source = 'user_plan';
    planExpiresAt = user.plan_expires_at?.toISOString() ?? null;
  } else if (user.org_id) {
    const orgRows = await query<{ plan: string }>(
      `SELECT plan FROM platform_orgs WHERE id = $1`,
      [user.org_id],
    );
    const orgPlan = orgRows[0]?.plan;
    if (orgPlan && orgPlan !== 'free') {
      plan = orgPlan;
      budget = await loadPlanBudget(orgPlan);
      source = 'org_plan';
    }
  }

  // Standalone video overrides (even without generation override)
  if (user.video_clip_override !== null && user.video_clip_override !== undefined) {
    budget = { ...budget, videoClips: user.video_clip_override };
  }
  if (user.video_export_override !== null && user.video_export_override !== undefined) {
    budget = { ...budget, videoExports: user.video_export_override };
  }

  // --- used this calendar month ---
  const qRows = await query<{
    used_generations: number;
    used_video_clips: number;
    used_video_exports: number;
    period_started_at: Date;
  }>(
    `SELECT used_generations, used_video_clips, used_video_exports, period_started_at
     FROM platform_quotas WHERE user_id = $1`,
    [userId],
  );

  const zeroUsed = {
    plan,
    monthlyLimit: budget.generations,
    used: 0,
    remaining: remainingOf(budget.generations, 0),
    videoClips: budgetStatus(budget.videoClips, 0, bonusClips),
    videoExports: budgetStatus(budget.videoExports, 0, bonusExports),
    periodStartedAt: new Date().toISOString(),
    planExpiresAt,
    source,
  } satisfies QuotaStatus;

  if (qRows.length === 0) {
    await query(`INSERT INTO platform_quotas (user_id) VALUES ($1) ON CONFLICT DO NOTHING`, [userId]);
    return zeroUsed;
  }

  const q = qRows[0];
  const periodStart = new Date(q.period_started_at);
  if (now.getMonth() !== periodStart.getMonth() || now.getFullYear() !== periodStart.getFullYear()) {
    await query(
      `UPDATE platform_quotas
       SET used_generations = 0, used_video_clips = 0, used_video_exports = 0,
           period_started_at = DATE_TRUNC('month', NOW())
       WHERE user_id = $1`,
      [userId],
    );
    return zeroUsed;
  }

  return {
    plan,
    monthlyLimit: budget.generations,
    used: q.used_generations,
    remaining: remainingOf(budget.generations, q.used_generations),
    videoClips: budgetStatus(budget.videoClips, q.used_video_clips ?? 0, bonusClips),
    videoExports: budgetStatus(budget.videoExports, q.used_video_exports ?? 0, bonusExports),
    periodStartedAt: q.period_started_at.toISOString(),
    planExpiresAt,
    source,
  };
}

export async function assertQuota(userId: string): Promise<void> {
  const quota = await getQuota(userId);
  if (quota.monthlyLimit !== -1 && quota.remaining <= 0) {
    throw new Error('Quota exceeded');
  }
}

/** Throws when this user cannot spend `clips` more AI video clips. */
export async function assertVideoClipQuota(userId: string, clips = 1): Promise<void> {
  const quota = await getQuota(userId);
  if (quota.videoClips.limit !== -1 && quota.videoClips.remaining < clips) {
    throw new Error('Video clip quota exceeded');
  }
}

/** Throws when this user cannot spend `count` more MP4 exports. */
export async function assertVideoExportQuota(userId: string, count = 1): Promise<void> {
  const quota = await getQuota(userId);
  if (quota.videoExports.limit !== -1 && quota.videoExports.remaining < count) {
    throw new Error('Video export quota exceeded');
  }
}

export async function recordUsage(
  userId: string,
  kind: string,
  credits = 1,
  meta: Record<string, unknown> = {},
): Promise<void> {
  const orgRow = await query<{ org_id: string | null }>(
    `SELECT org_id FROM platform_users WHERE id = $1`,
    [userId],
  );
  const orgId = orgRow[0]?.org_id ?? null;
  const id = 'usage_' + Math.random().toString(36).slice(2, 14);
  await query(
    `INSERT INTO platform_usage (id, user_id, org_id, kind, credits, meta)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [id, userId, orgId, kind, credits, JSON.stringify(meta)],
  );
  if (kind === 'course_generate') {
    await query(
      `UPDATE platform_quotas SET used_generations = used_generations + $2 WHERE user_id = $1`,
      [userId, credits],
    );
  } else if (kind === 'video_clip' || kind === 'video_export') {
    const isClip = kind === 'video_clip';
    const usedCol = isClip ? 'used_video_clips' : 'used_video_exports';
    const bonusCol = isClip ? 'bonus_video_clips' : 'bonus_video_exports';

    // Spend monthly plan allowance first; overflow comes from prepaid pack bonus.
    const q = await getQuota(userId);
    const meter = isClip ? q.videoClips : q.videoExports;
    let fromMonthly = credits;
    if (meter.limit !== -1) {
      fromMonthly = Math.min(credits, Math.max(0, meter.limit - meter.used));
    }
    const fromBonus = credits - fromMonthly;

    if (fromMonthly > 0) {
      await query(
        `UPDATE platform_quotas SET ${usedCol} = ${usedCol} + $2 WHERE user_id = $1`,
        [userId, fromMonthly],
      );
    }
    if (fromBonus > 0) {
      await query(
        `UPDATE platform_users SET ${bonusCol} = GREATEST(0, ${bonusCol} - $2) WHERE id = $1`,
        [userId, fromBonus],
      );
    }
  }
}

/**
 * Activate / extend a purchased plan for a personal user.
 * Same-plan renewals stack remaining time; switching plans starts fresh.
 */
export async function applyPlanPurchase(
  userId: string,
  planId: string,
  periodDays?: number,
): Promise<void> {
  const plan = await getPlan(planId);
  const days = periodDays ?? plan?.period_days ?? 30;

  const rows = await query<{ plan: string | null; plan_expires_at: Date | null }>(
    `SELECT plan, plan_expires_at FROM platform_users WHERE id = $1`,
    [userId],
  );
  const current = rows[0];
  const now = new Date();
  const samePlanActive =
    current?.plan === planId && current.plan_expires_at && new Date(current.plan_expires_at) > now;

  let expiresAt: Date;
  if (samePlanActive) {
    expiresAt = new Date(new Date(current!.plan_expires_at!).getTime() + days * 86400_000);
  } else {
    expiresAt = new Date(now.getTime() + days * 86400_000);
  }

  await query(
    `UPDATE platform_users SET plan = $2, plan_expires_at = $3, updated_at = NOW() WHERE id = $1`,
    [userId, planId, expiresAt],
  );

  // Reset monthly window so the new limit applies immediately.
  await query(
    `UPDATE platform_quotas
     SET used_generations = 0, used_video_clips = 0, used_video_exports = 0,
         period_started_at = DATE_TRUNC('month', NOW())
     WHERE user_id = $1`,
    [userId],
  );
}

export interface ProductRow {
  id: string;
  name_zh: string;
  name_en: string;
  kind: 'video_clips' | 'video_exports';
  units: number;
  price_cny: number;
  price_usd: number;
  is_active: boolean;
  sort_order: number;
}

export async function listActiveProducts(): Promise<ProductRow[]> {
  return query<ProductRow>(
    `SELECT id, name_zh, name_en, kind, units, price_cny, price_usd, is_active, sort_order
     FROM platform_products WHERE is_active = TRUE ORDER BY sort_order ASC`,
  );
}

export async function getProduct(productId: string): Promise<ProductRow | null> {
  const rows = await query<ProductRow>(
    `SELECT id, name_zh, name_en, kind, units, price_cny, price_usd, is_active, sort_order
     FROM platform_products WHERE id = $1`,
    [productId],
  );
  return rows[0] ?? null;
}

/**
 * Grant prepaid add-on units (video clips / export credits). Packs persist
 * until consumed and are NOT reset by the monthly rollover.
 */
export async function applyProductPurchase(userId: string, productId: string): Promise<void> {
  const product = await getProduct(productId);
  if (!product) throw new Error(`Unknown product: ${productId}`);
  const col = product.kind === 'video_clips' ? 'bonus_video_clips' : 'bonus_video_exports';
  await query(
    `UPDATE platform_users SET ${col} = ${col} + $2, updated_at = NOW() WHERE id = $1`,
    [userId, product.units],
  );
}


/** Commercial entitlement: plans other than free remove watermarks. */
export function isPlanPaid(plan: string | null | undefined): boolean {
  return !!plan && plan !== 'free';
}

/** Watermark exports/shares unless the effective plan is paid. */
export async function shouldWatermark(userId: string): Promise<boolean> {
  const q = await getQuota(userId);
  return !isPlanPaid(q.plan);
}
