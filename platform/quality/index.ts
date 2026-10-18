/**
 * Durable quality / platform events (success AND failure).
 * Admin console reads these; nothing in the product path should fail if this write fails.
 */
import { randomBytes } from 'node:crypto';
import { query } from '../db/client';

export type QualityOutcome = 'success' | 'failure' | 'degraded' | 'skipped';

export type QualityCategory =
  | 'tts'
  | 'interactive'
  | 'generation'
  | 'export'
  | 'media'
  | 'auth'
  | 'billing'
  | 'system';

export interface QualityEventInput {
  userId?: string | null;
  stageId?: string | null;
  jobId?: string | null;
  category: QualityCategory;
  event: string;
  outcome: QualityOutcome;
  reason?: string;
  meta?: Record<string, unknown>;
}

/** Best-effort insert. Never throws — telemetry must not break the product path. */
export async function recordQualityEvent(input: QualityEventInput): Promise<void> {
  try {
    await query(
      `INSERT INTO platform_quality_events
         (id, user_id, stage_id, job_id, category, event, outcome, reason, meta)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        'qe_' + randomBytes(10).toString('hex'),
        input.userId ?? null,
        (input.stageId ?? '').slice(0, 64) || null,
        (input.jobId ?? '').slice(0, 64) || null,
        input.category,
        input.event,
        input.outcome,
        (input.reason ?? '').slice(0, 500),
        JSON.stringify(input.meta ?? {}),
      ],
    );
  } catch (e) {
    console.warn('[quality] recordQualityEvent failed', e);
  }
}

export interface QualityEventRow {
  id: string;
  user_id: string | null;
  email: string | null;
  stage_id: string | null;
  job_id: string | null;
  category: string;
  event: string;
  outcome: QualityOutcome;
  reason: string;
  meta: Record<string, unknown>;
  created_at: string;
}

export async function listQualityEvents(opts: {
  category?: string;
  outcome?: string;
  q?: string;
  limit?: number;
}): Promise<QualityEventRow[]> {
  const where: string[] = [];
  const params: unknown[] = [];
  let i = 1;
  if (opts.category) {
    where.push(`e.category = $${i++}`);
    params.push(opts.category);
  }
  if (opts.outcome) {
    where.push(`e.outcome = $${i++}`);
    params.push(opts.outcome);
  }
  if (opts.q) {
    where.push(`(e.event ILIKE $${i} OR e.reason ILIKE $${i} OR e.meta::text ILIKE $${i})`);
    params.push(`%${opts.q}%`);
    i++;
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const limit = Math.min(200, Math.max(10, opts.limit ?? 50));
  return query<QualityEventRow>(
    `SELECT e.id, e.user_id, u.email, e.stage_id, e.job_id, e.category, e.event,
            e.outcome, e.reason, e.meta, e.created_at
     FROM platform_quality_events e
     LEFT JOIN platform_users u ON u.id = e.user_id
     ${whereSql}
     ORDER BY e.created_at DESC
     LIMIT $${i}`,
    [...params, limit],
  );
}

export async function qualitySummary(): Promise<{
  byOutcome: Array<{ outcome: string; count: number }>;
  byEvent: Array<{ category: string; event: string; outcome: string; count: number; last_24h: number }>;
  recent: QualityEventRow[];
}> {
  const byOutcome = await query<{ outcome: string; count: number }>(
    `SELECT outcome, COUNT(*)::int AS count
     FROM platform_quality_events
     WHERE created_at > NOW() - INTERVAL '30 days'
     GROUP BY outcome ORDER BY count DESC`,
  );
  const byEvent = await query<{
    category: string;
    event: string;
    outcome: string;
    count: number;
    last_24h: number;
  }>(
    `SELECT category, event, outcome,
            COUNT(*)::int AS count,
            COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours')::int AS last_24h
     FROM platform_quality_events
     WHERE created_at > NOW() - INTERVAL '30 days'
     GROUP BY category, event, outcome
     ORDER BY count DESC
     LIMIT 40`,
  );
  const recent = await listQualityEvents({ limit: 30 });
  return { byOutcome, byEvent, recent };
}
