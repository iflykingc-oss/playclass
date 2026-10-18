import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/platform/db/client';
import { applyPlanPurchase, applyProductPurchase } from '@/platform/billing';
import crypto from 'crypto';

function verifySign(params: Record<string, string>, key: string): boolean {
  const receivedSign = params.sign || '';
  const sorted = Object.keys(params)
    .filter((k) => k !== 'sign' && k !== 'sign_type' && params[k] !== '')
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join('&');
  const expected = crypto.createHash('md5').update(sorted + key).digest('hex');
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(receivedSign, 'utf8');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/**
 * Browser return from ZPay. If the query is signed like notify, complete the
 * order here too (async notify cannot reach localhost / some intranets).
 */
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const params: Record<string, string> = {};
  sp.forEach((v, k) => {
    params[k] = v;
  });

  const outTradeNo = params.out_trade_no;
  if (outTradeNo && params.sign) {
    try {
      const configRows = await query<{ value: string }>(
        `SELECT value FROM platform_payment_config WHERE key = 'zpay_key'`,
      );
      const key = configRows[0]?.value || '';
      if (key && verifySign(params, key) && params.trade_status === 'TRADE_SUCCESS') {
        const money = parseFloat(params.money || '0');
        const updated = await query<{ plan: string; kind: string; user_id: string }>(
          `UPDATE platform_orders
           SET status = 'paid', trade_no = COALESCE(NULLIF($2, ''), trade_no), paid_at = COALESCE(paid_at, NOW())
           WHERE out_trade_no = $1 AND status = 'pending' AND ABS(money - $3) < 0.01
           RETURNING plan, kind, user_id`,
          [outTradeNo, params.trade_no || '', money],
        );
        if (updated[0]) {
          const o = updated[0];
          if (o.kind === 'product') await applyProductPurchase(o.user_id, o.plan);
          else await applyPlanPurchase(o.user_id, o.plan);
        }
      }
    } catch (e) {
      console.error('[payment/return] sync failed', e);
    }
  }

  const rows = await query<{ status: string; plan: string }>(
    `SELECT status, plan FROM platform_orders WHERE out_trade_no = $1`,
    [outTradeNo],
  );

  const status = rows[0]?.status || 'pending';
  const dashboardUrl = new URL('/dashboard', request.nextUrl.origin);

  if (status === 'paid') {
    dashboardUrl.searchParams.set('paid', '1');
    dashboardUrl.searchParams.set('plan', rows[0]?.plan || '');
  } else {
    dashboardUrl.searchParams.set('payment', 'pending');
  }

  return NextResponse.redirect(dashboardUrl.toString());
}
