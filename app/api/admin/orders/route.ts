import { NextResponse } from 'next/server';
import { query } from '@/platform/db/client';
import { isAdminSession } from '@/platform/admin/auth';
import { applyPlanPurchase, applyProductPurchase } from '@/platform/billing';

export async function GET(request: Request) {
  if (!(await isAdminSession(request))) {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }
  const orders = await query(
    `SELECT o.id, o.user_id, u.email, o.out_trade_no, o.trade_no, o.money, o.currency,
            COALESCE(NULLIF(o.subject, ''), o.plan) AS subject, o.plan, o.kind, o.status, o.type,
            o.created_at, COALESCE(o.paid_at, o.created_at) AS paid_at
     FROM platform_orders o
     LEFT JOIN platform_users u ON u.id = o.user_id
     ORDER BY o.created_at DESC LIMIT 200`,
  );
  const stats = await query(
    `SELECT
       COUNT(*)::int AS total_orders,
       COUNT(*) FILTER (WHERE status = 'paid')::int AS paid_orders,
       COALESCE(SUM(money) FILTER (WHERE status = 'paid'), 0)::float AS total_revenue
     FROM platform_orders`,
  );
  return NextResponse.json({ orders, stats: stats[0] || {} });
}

/**
 * Manual reconciliation (admin):
 *  { action: 'mark_paid', outTradeNo }  — complete a pending order and apply its grant
 *  { action: 'refund_note', outTradeNo, note? } — mark refunded (no auto-revoke)
 */
export async function PATCH(request: Request) {
  if (!(await isAdminSession(request))) {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }
  let body: { action?: string; outTradeNo?: string; note?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!body.outTradeNo) return NextResponse.json({ error: 'outTradeNo required' }, { status: 400 });

  try {
    if (body.action === 'mark_paid') {
      const updated = await query<{ plan: string; kind: string; user_id: string }>(
        `UPDATE platform_orders
         SET status = 'paid', paid_at = COALESCE(paid_at, NOW())
         WHERE out_trade_no = $1 AND status = 'pending'
         RETURNING plan, kind, user_id`,
        [body.outTradeNo],
      );
      if (updated.length === 0) {
        return NextResponse.json({ error: 'Order not pending or missing' }, { status: 400 });
      }
      const o = updated[0];
      if (o.kind === 'product') await applyProductPurchase(o.user_id, o.plan);
      else await applyPlanPurchase(o.user_id, o.plan);
      await query(
        `INSERT INTO platform_quality_events (id, user_id, category, event, outcome, reason, meta)
         VALUES ($1, $2, 'billing', 'admin_mark_paid', 'success', 'manual_reconciliation', $3)`,
        [
          'qe_' + Math.random().toString(36).slice(2, 12),
          o.user_id,
          JSON.stringify({ outTradeNo: body.outTradeNo, plan: o.plan, kind: o.kind }),
        ],
      );
      return NextResponse.json({ ok: true, applied: o });
    }

    if (body.action === 'mark_unpaid') {
      await query(
        `UPDATE platform_orders SET status = 'pending', paid_at = NULL WHERE out_trade_no = $1 AND status = 'paid'`,
        [body.outTradeNo],
      );
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'error' }, { status: 400 });
  }
}
