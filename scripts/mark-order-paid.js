/**
 * Local/test helper: mark a ZPay order paid and apply its grant.
 * Use only when you confirmed payment in the ZPay/Alipay/WeChat UI
 * (async notify cannot reach localhost).
 *
 * Usage: node scripts/mark-order-paid.js MAIC1790...
 */
const { Pool } = require('pg');
const { readFileSync } = require('fs');

const env = readFileSync('.env.local', 'utf-8');
const m = env.match(/^DATABASE_URL=(.+)$/m);
const pool = new Pool({ connectionString: (m ? m[1] : '').trim() });

async function main() {
  const outTradeNo = process.argv[2];
  if (!outTradeNo) {
    console.error('Usage: node scripts/mark-order-paid.js <out_trade_no>');
    process.exit(1);
  }
  const { applyPlanPurchase, applyProductPurchase } = require('../platform/billing');
  const { query } = require('../platform/db/client');

  const updated = await query(
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
  console.log('Marked paid:', outTradeNo, order.plan, order.kind);
  if (order.kind === 'product') {
    await applyProductPurchase(order.user_id, order.plan);
    console.log('Applied product grant', order.plan);
  } else {
    await applyPlanPurchase(order.user_id, order.plan);
    console.log('Applied plan', order.plan);
  }
  const u = await query(`SELECT email, plan, plan_expires_at FROM platform_users WHERE id = $1`, [order.user_id]);
  console.log('User now:', u[0]);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
