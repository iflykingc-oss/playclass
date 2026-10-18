import { NextResponse } from 'next/server';
import { listActivePlans, getQuota } from '@/platform/billing';
import { resolvePlatformOwnerId } from '@/platform/auth';

/** Public: active plans + prices for the pricing page. */
export async function GET(request: Request) {
  const plans = await listActivePlans();
  const { user } = await resolvePlatformOwnerId(request);

  let quota = null;
  if (user) {
    try { quota = await getQuota(user.id); } catch { /* ignore */ }
  }

  return NextResponse.json({
    plans: plans.map(p => ({
      id: p.id,
      name: { zh: p.name_zh, en: p.name_en },
      monthlyGenerations: p.monthly_generations,
      monthlyVideoClips: p.monthly_video_clips ?? 0,
      videoExportCredits: p.video_export_credits ?? 0,
      price: { CNY: Number(p.price_cny), USD: Number(p.price_usd) },
      periodDays: p.period_days,
      features: { zh: p.features_zh, en: p.features_en },
    })),
    quota,
  });
}
