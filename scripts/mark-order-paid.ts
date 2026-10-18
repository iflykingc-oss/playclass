/**
 * Local/test helper: mark a ZPay order paid and apply its grant when async
 * notify cannot reach localhost.
 *   pnpm tsx scripts/mark-order-paid.ts <out_trade_no>
 */
import { readFileSync } from 'fs';
import { join } from 'path';

try {
  const env = readFileSync(join(process.cwd(), '.env.local'), 'utf-8');
  for (const line of env.split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m && !process.env[m[1].trim()]) process.env[m[1].trim()] = m[2].trim();
  }
} catch {}

async function main() {
  const outTradeNo = process.argv[2];
  if (!outTradeNo) {
    console.error('Usage: pnpm tsx scripts/mark-order-paid.ts <out_trade_no>');
    process.exit(1);
  }
  const { query } = await import('../platform/db/client');
  const { applyPlanPurchase, applyProductPurchase } = await import('../platform/billing');

  const updated = await query<any>(
    `UPDATE platform_orders
     SET status = 'paid', paid_at = COALESCE(paid_at, NOW())
     WHERE out_trade_no = $1 AND status = 'pending'
     RETURNING id, plan, kind, user_id, money`,
    [outTradeNo],
  );
  if (updated.length === 0) {
    console.log('Order not found or already paid:', outTradeNo);
    return;
  }
  const order = updated[0];
  console.log('Marked paid:', outTradeNo, order.plan, order.kind, order.money);
  if (order.kind === 'product') {
    await applyProductPurchase(order.user_id, order.plan);
    console.log('Applied product', order.plan);
  } else {
    await applyPlanPurchase(order.user_id, order.plan);
    console.log('Applied plan', order.plan);
  }
  const u = await query<any>(
    `SELECT email, plan, plan_expires_at FROM platform_users WHERE id = $1`,
    [order.user_id],
  );
  console.log('User now:', u[0]);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
