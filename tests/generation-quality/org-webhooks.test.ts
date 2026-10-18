import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { signWebhookPayload } from '../../platform/webhooks/index';

const ROOT = process.cwd();

describe('P2 institutional webhooks + FERPA', () => {
  it('HMAC-signs webhook payloads', () => {
    const sig = signWebhookPayload('secret', '{"a":1}');
    expect(sig.startsWith('sha256=')).toBe(true);
    expect(signWebhookPayload('secret', '{"a":1}')).toBe(sig);
    expect(signWebhookPayload('other', '{"a":1}')).not.toBe(sig);
  });

  it('has org webhook API and schema', () => {
    expect(existsSync(join(ROOT, 'app/api/org/webhooks/route.ts'))).toBe(true);
    const sql = readFileSync(join(ROOT, 'platform/db/schema.sql'), 'utf-8');
    expect(sql).toContain('platform_org_webhooks');
    expect(sql).toContain('platform_org_webhook_deliveries');
  });

  it('ships institutional compliance page for school buyers', () => {
    expect(existsSync(join(ROOT, 'app/legal/institutional/page.tsx'))).toBe(true);
    const t = readFileSync(join(ROOT, 'app/legal/institutional/page.tsx'), 'utf-8');
    expect(t).toContain('FERPA');
    expect(t).toContain('Webhook');
    expect(t).toContain('未成年人');
    const mw = readFileSync(join(ROOT, 'middleware.ts'), 'utf-8');
    expect(mw).toContain('/legal/');
  });

  it('dashboard exposes webhook config for org owners', () => {
    const t = readFileSync(join(ROOT, 'app/dashboard/page.tsx'), 'utf-8');
    expect(t).toContain('机构 Webhook');
    expect(t).toContain('/api/org/webhooks');
  });
});
