import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/platform/db/client';
import { applyPlanPurchase, applyProductPurchase } from '@/platform/billing';
import { recordQualityEvent } from '@/platform/quality';
import crypto from 'crypto';

function verifySign(params: Record<string, string>, key: string): boolean {
  const receivedSign = params.sign || '';
  const sorted = Object.keys(params)
    .filter(k => k !== 'sign' && k !== 'sign_type' && params[k] !== '')
    .sort()
    .map(k => `${k}=${params[k]}`)
    .join('&');
  const expected = crypto.createHash('md5').update(sorted + key).digest('hex');
  // timing-safe compare
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(receivedSign, 'utf8');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/**
 * ZPay async notify. Must:
 *  - verify signature
 *  - verify amount matches the stored order
 *  - be idempotent (pending → paid only, row lock)
 *  - apply the plan with expiry
 */
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const params: Record<string, string> = {};
  sp.forEach((v, k) => { params[k] = v; });

  const configRows = await query<{ value: string }>(
    `SELECT value FROM platform_payment_config WHERE key = 'zpay_key'`,
  );
  const key = configRows[0]?.value || '';
  if (!key || !verifySign(params, key)) {
    return new NextResponse('fail', { status: 403 });
  }

  const outTradeNo = params.out_trade_no;
  const tradeStatus = params.trade_status;
  const tradeNo = params.trade_no || '';
  const money = parseFloat(params.money || '0');

  if (!outTradeNo || tradeStatus !== 'TRADE_SUCCESS') {
    return new NextResponse('success', { status: 200 });
  }

  // Idempotent close with row lock; verify amount before applying the grant.
  const updated = await query<{ id: string; plan: string; kind: string; user_id: string; money: string }>(
    `UPDATE platform_orders
     SET status = 'paid', trade_no = $2, paid_at = NOW()
     WHERE out_trade_no = $1
       AND status = 'pending'
       AND ABS(money - $3) < 0.01
     RETURNING id, plan, kind, user_id, money`,
    [outTradeNo, tradeNo, money],
  );

  if (updated.length === 1) {
    const order = updated[0];
    try {
      if (order.kind === 'product') {
        await applyProductPurchase(order.user_id, order.plan);
      } else {
        await applyPlanPurchase(order.user_id, order.plan);
      }
      await recordQualityEvent({
        userId: order.user_id,
        category: 'billing',
        event: 'payment_success',
        outcome: 'success',
        reason: 'zpay_notify',
        meta: { outTradeNo, plan: order.plan, kind: order.kind, money },
      });
    } catch (e) {
      console.error('[payment/notify] apply failed', outTradeNo, e);
      return new NextResponse('fail', { status: 500 });
    }
  }

  return new NextResponse('success', { status: 200 });
}
