/**
 * Write ZPay merchant credentials into platform_payment_config.
 * Secrets stay in Postgres — never commit to git.
 *
 * Usage:
 *   $env:ZPAY_PID=...; $env:ZPAY_KEY=...; $env:ZPAY_API_URL=...
 *   pnpm tsx scripts/configure-zpay.ts
 */
import { readFileSync } from 'fs';
import { join } from 'path';

try {
  const env = readFileSync(join(process.cwd(), '.env.local'), 'utf-8');
  for (const line of env.split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m && !process.env[m[1].trim()]) process.env[m[1].trim()] = m[2].trim();
  }
} catch {
  /* optional */
}

const { Pool } = require('pg');

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL not set');
    process.exit(1);
  }

  const pid = process.env.ZPAY_PID?.trim();
  const key = process.env.ZPAY_KEY?.trim();
  const apiUrl = (process.env.ZPAY_API_URL || 'https://pay.z-pay.cn').trim().replace(/\/$/, '');
  const alipayPid = process.env.ZPAY_ALIPAY_PID?.trim() || '';
  const wxpayPid = process.env.ZPAY_WXPAY_PID?.trim() || '';

  if (!pid || !key) {
    console.error('Set ZPAY_PID and ZPAY_KEY first');
    process.exit(1);
  }

  const pool = new Pool({ connectionString });
  const rows: Array<[string, string]> = [
    ['zpay_pid', pid],
    ['zpay_key', key],
    ['zpay_api_url', apiUrl],
    ['zpay_alipay_pid', alipayPid],
    ['zpay_wxpay_pid', wxpayPid],
    ['zpay_alipay_type', 'alipay'],
    ['zpay_wxpay_type', 'wxpay'],
  ];
  for (const [k, v] of rows) {
    await pool.query(
      `INSERT INTO platform_payment_config (key, value) VALUES ($1, $2)
       ON CONFLICT (key) DO UPDATE SET value = $2`,
      [k, v],
    );
    const shown = k.includes('key') ? `${String(v).slice(0, 3)}****` : v || '(empty)';
    console.log(`✓ ${k} = ${shown}`);
  }
  await pool.end();
  console.log('\nZPay config stored. Alipay/WeChat channels registered in DB.');
  console.log('Check /admin → 支付配置 to confirm; gateway URL must match your ZPay panel.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
