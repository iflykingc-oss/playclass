/**
 * Institutional webhooks: push learner / usage / quality JSON summaries to a
 * customer endpoint (LMS integration MVP before full LTI).
 * Payloads are HMAC-signed with `X-Playclass-Signature: sha256=...`.
 */
import { createHmac, randomBytes } from 'crypto';
import { query } from '../db/client';

export type WebhookEvent = 'learner_summary' | 'usage_summary' | 'quality_summary' | 'payment';

export interface OrgWebhook {
  id: string;
  org_id: string;
  url: string;
  secret: string;
  events: string;
  is_active: boolean;
}

export function signWebhookPayload(secret: string, body: string): string {
  return 'sha256=' + createHmac('sha256', secret).update(body).digest('hex');
}

export async function setOrgWebhook(
  orgId: string,
  url: string,
  events: string[] = ['learner_summary', 'usage_summary', 'quality_summary'],
): Promise<OrgWebhook> {
  const secret = randomBytes(24).toString('hex');
  const existing = await query<{ id: string }>(
    `SELECT id FROM platform_org_webhooks WHERE org_id = $1`,
    [orgId],
  );
  if (existing[0]) {
    await query(
      `UPDATE platform_org_webhooks SET url = $2, secret = $3, events = $4, is_active = TRUE WHERE id = $1`,
      [existing[0].id, url, secret, events.join(',')],
    );
    return (await getOrgWebhooks(orgId))[0];
  }
  const id = 'whk_' + randomBytes(8).toString('hex');
  await query(
    `INSERT INTO platform_org_webhooks (id, org_id, url, secret, events) VALUES ($1,$2,$3,$4,$5)`,
    [id, orgId, url, secret, events.join(',')],
  );
  return {
    id,
    org_id: orgId,
    url,
    secret,
    events: events.join(','),
    is_active: true,
  };
}

export async function getOrgWebhooks(orgId: string): Promise<OrgWebhook[]> {
  return query<OrgWebhook>(
    `SELECT id, org_id, url, secret, events, is_active FROM platform_org_webhooks WHERE org_id = $1`,
    [orgId],
  );
}

async function buildLearnerSummary(orgId: string): Promise<Record<string, unknown>> {
  const members = await query<{ id: string; email: string; name: string }>(
    `SELECT id, email, name FROM platform_users WHERE org_id = $1 LIMIT 500`,
    [orgId],
  );
  const usage = await query(
    `SELECT kind, COUNT(*)::int AS count FROM platform_usage
     WHERE org_id = $1 AND created_at > NOW() - INTERVAL '30 days' GROUP BY kind`,
    [orgId],
  );
  return {
    event: 'learner_summary',
    orgId,
    generatedAt: new Date().toISOString(),
    memberCount: members.length,
    members: members.slice(0, 200).map((m) => ({ id: m.id, email: m.email, name: m.name })),
    usageByKind: usage,
  };
}

async function buildQualitySummary(orgId: string): Promise<Record<string, unknown>> {
  const rows = await query(
    `SELECT e.category, e.event, e.outcome, COUNT(*)::int AS count
     FROM platform_quality_events e
     JOIN platform_users u ON u.id = e.user_id
     WHERE u.org_id = $1 AND e.created_at > NOW() - INTERVAL '30 days'
     GROUP BY e.category, e.event, e.outcome
     ORDER BY count DESC LIMIT 50`,
    [orgId],
  );
  return {
    event: 'quality_summary',
    orgId,
    generatedAt: new Date().toISOString(),
    qualityEvents: rows,
  };
}

async function buildUsageSummary(orgId: string): Promise<Record<string, unknown>> {
  const rows = await query(
    `SELECT date_trunc('day', created_at)::date AS day, COUNT(*)::int AS count
     FROM platform_usage WHERE org_id = $1 AND created_at > NOW() - INTERVAL '30 days'
     GROUP BY 1 ORDER BY 1`,
    [orgId],
  );
  return {
    event: 'usage_summary',
    orgId,
    generatedAt: new Date().toISOString(),
    daily: rows,
  };
}

/** Fire webhooks for an org (best-effort; records delivery rows). */
export async function deliverOrgWebhooks(
  orgId: string,
  event: WebhookEvent | 'all' = 'all',
): Promise<{ sent: number; failed: number }> {
  const hooks = (await getOrgWebhooks(orgId)).filter((h) => h.is_active);
  let sent = 0;
  let failed = 0;
  for (const hook of hooks) {
    const events = hook.events.split(',').map((s) => s.trim()).filter(Boolean);
    const want = event === 'all' ? events : events.filter((e) => e === event);
    for (const ev of want) {
      let payload: Record<string, unknown> = { event: ev, orgId };
      if (ev === 'learner_summary') payload = await buildLearnerSummary(orgId);
      else if (ev === 'usage_summary') payload = await buildUsageSummary(orgId);
      else if (ev === 'quality_summary') payload = await buildQualitySummary(orgId);
      else continue;

      const body = JSON.stringify(payload);
      const signature = signWebhookPayload(hook.secret, body);
      try {
        const res = await fetch(hook.url, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-playclass-signature': signature,
            'x-playclass-event': ev,
          },
          body,
          signal: AbortSignal.timeout(10_000),
        });
        await query(
          `INSERT INTO platform_org_webhook_deliveries (id, webhook_id, event, status, payload)
           VALUES ($1,$2,$3,$4,$5)`,
          ['whd_' + randomBytes(8).toString('hex'), hook.id, ev, res.status, JSON.stringify(payload)],
        );
        await query(
          `UPDATE platform_org_webhooks SET last_status = $2, last_error = NULL, last_fired_at = NOW() WHERE id = $1`,
          [hook.id, res.status],
        );
        if (res.ok) sent += 1;
        else failed += 1;
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        failed += 1;
        await query(
          `INSERT INTO platform_org_webhook_deliveries (id, webhook_id, event, status, error, payload)
           VALUES ($1,$2,$3,NULL,$4,$5)`,
          ['whd_' + randomBytes(8).toString('hex'), hook.id, ev, message.slice(0, 300), JSON.stringify(payload)],
        );
        await query(
          `UPDATE platform_org_webhooks SET last_status = NULL, last_error = $2, last_fired_at = NOW() WHERE id = $1`,
          [hook.id, message.slice(0, 300)],
        );
      }
    }
  }
  return { sent, failed };
}
