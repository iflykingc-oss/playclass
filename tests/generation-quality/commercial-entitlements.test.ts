import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isPlanPaid } from '../../platform/billing/index';

const ROOT = process.cwd();

describe('commercial entitlements & payment UX', () => {
  it('free plan is watermarked; paid plans are not', () => {
    expect(isPlanPaid('free')).toBe(false);
    expect(isPlanPaid(null)).toBe(false);
    expect(isPlanPaid('pro_monthly')).toBe(true);
    expect(isPlanPaid('pro_plus_monthly')).toBe(true);
    expect(isPlanPaid('enterprise_yearly')).toBe(true);
  });

  it('dashboard shows payment result banners', () => {
    const t = readFileSync(join(ROOT, 'app/dashboard/page.tsx'), 'utf-8');
    expect(t).toContain("sp.get('paid')");
    expect(t).toContain('payStatus');
  });

  it('successful notify writes billing quality event', () => {
    const t = readFileSync(join(ROOT, 'app/api/payment/notify/route.ts'), 'utf-8');
    expect(t).toContain('payment_success');
    expect(t).toContain('recordQualityEvent');
  });

  it('share publish stamps watermark for free tier', () => {
    const t = readFileSync(join(ROOT, 'app/api/share/publish/route.ts'), 'utf-8');
    expect(t).toContain('shouldWatermark');
    const sql = readFileSync(join(ROOT, 'platform/db/schema.sql'), 'utf-8');
    expect(sql).toContain('watermarked');
  });
});

describe('pricing CTA tier semantics', () => {
  it('does not call a lower tier an upgrade', () => {
    const t = readFileSync(join(ROOT, 'app/dashboard/page.tsx'), 'utf-8');
    expect(t).toContain('PLAN_RANK');
    expect(t).toContain('isDowngrade');
    expect(t).toContain('升级到此套餐');
    expect(t).toContain('降级/切换');
  });
});
