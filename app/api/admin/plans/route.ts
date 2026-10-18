import { NextResponse } from 'next/server';
import { isAdminSession } from '@/platform/admin/auth';
import { updatePlanConfig, getPlan, getProduct } from '@/platform/billing';
import { query } from '@/platform/db/client';

/** Admin: list all plans (including inactive) and patch config. */
export async function GET(request: Request) {
  if (!(await isAdminSession(request))) {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }
  const plans = await query(
    `SELECT id, name_zh, name_en, monthly_generations, monthly_video_clips, video_export_credits,
            price_cny, price_usd, period_days, sort_order, is_active, features_zh, features_en, updated_at
     FROM platform_plans ORDER BY sort_order ASC`,
  );
  const products = await query(
    `SELECT id, name_zh, name_en, kind, units, price_cny, price_usd, is_active, sort_order, updated_at
     FROM platform_products ORDER BY sort_order ASC`,
  );
  return NextResponse.json({ plans, products });
}

export async function PATCH(request: Request) {
  if (!(await isAdminSession(request))) {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }
  let body: {
    id?: string;
    type?: 'plan' | 'product';
    monthlyGenerations?: number;
    monthlyVideoClips?: number;
    videoExportCredits?: number;
    priceCny?: number;
    priceUsd?: number;
    periodDays?: number;
    isActive?: boolean;
    units?: number;
  };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  if (!body.id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  if (body.type === 'product') {
    const product = await getProduct(body.id);
    if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    const sets: string[] = [];
    const params: unknown[] = [body.id];
    let i = 2;
    const push = (col: string, val: unknown) => {
      sets.push(`${col} = $${i++}`);
      params.push(val);
    };
    if (body.units !== undefined) push('units', body.units);
    if (body.priceCny !== undefined) push('price_cny', body.priceCny);
    if (body.priceUsd !== undefined) push('price_usd', body.priceUsd);
    if (body.isActive !== undefined) push('is_active', body.isActive);
    if (sets.length === 0) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    sets.push('updated_at = NOW()');
    await query(`UPDATE platform_products SET ${sets.join(', ')} WHERE id = $1`, params);
    return NextResponse.json({ ok: true, product: await getProduct(body.id) });
  }

  const existing = await getPlan(body.id);
  if (!existing) return NextResponse.json({ error: 'Plan not found' }, { status: 404 });

  await updatePlanConfig(body.id, {
    monthlyGenerations: body.monthlyGenerations,
    monthlyVideoClips: body.monthlyVideoClips,
    videoExportCredits: body.videoExportCredits,
    priceCny: body.priceCny,
    priceUsd: body.priceUsd,
    periodDays: body.periodDays,
    isActive: body.isActive,
  });

  return NextResponse.json({ ok: true, plan: await getPlan(body.id) });
}
