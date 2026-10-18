import { NextResponse } from 'next/server';
import { resolvePlatformOwnerId } from '@/platform/auth';
import { query } from '@/platform/db/client';
import { getPlan, getProduct, listActivePlans, listActiveProducts } from '@/platform/billing';
import crypto from 'crypto';

function sign(params: Record<string, string>, key: string): string {
  const sorted = Object.keys(params)
    .filter(k => k !== 'sign' && k !== 'sign_type' && params[k] !== '')
    .sort()
    .map(k => `${k}=${params[k]}`)
    .join('&');
  return crypto.createHash('md5').update(sorted + key).digest('hex');
}

async function getPaymentConfig() {
  const configRows = await query<{ key: string; value: string }>(
    `SELECT key, value FROM platform_payment_config`,
  );
  const config: Record<string, string> = {};
  configRows.forEach(r => { config[r.key] = r.value; });
  return config;
}

/**
 * Checkout for either a subscription plan (`plan`) or a one-off product SKU (`product`).
 * Body: { plan?: string, product?: string, type?: string, currency?: string }
 */
export async function POST(request: Request) {
  const { user } = await resolvePlatformOwnerId(request);
  if (!user) return NextResponse.json({ error: 'Login required' }, { status: 401 });

  let body: { plan?: string; product?: string; type?: string; currency?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const type = body.type || 'alipay';
  const currency = (body.currency || 'CNY').toUpperCase();

  let kind: 'plan' | 'product' = 'plan';
  let sku = body.plan || '';
  let subject = '';
  let settleMoney = 0;
  let displayPrice = 0;

  if (body.product && !body.plan) {
    kind = 'product';
    sku = body.product;
    const product = await getProduct(sku);
    if (!product || !product.is_active || Number(product.price_cny) <= 0) {
      return NextResponse.json({ error: 'Invalid product' }, { status: 400 });
    }
    subject = product.name_zh;
    settleMoney = Number(product.price_cny);
    displayPrice = currency === 'USD' ? Number(product.price_usd) : Number(product.price_cny);
  } else {
    const plan = await getPlan(sku);
    if (!plan || !plan.is_active || Number(plan.price_cny) <= 0) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }
    subject = plan.name_zh;
    settleMoney = Number(plan.price_cny);
    displayPrice = currency === 'USD' ? Number(plan.price_usd) : Number(plan.price_cny);
  }

  const config = await getPaymentConfig();
  if (!config.zpay_pid || !config.zpay_key || !config.zpay_api_url) {
    return NextResponse.json({ error: 'Payment not configured. Please contact admin.' }, { status: 503 });
  }

  const outTradeNo = 'MAIC' + Date.now() + Math.floor(Math.random() * 1000);
  // Callback origin must match what the browser/pay gateway can reach.
  // Request origin wins (dev :3001 / LAN / prod domain); explicit APP_URL only
  // overrides when we are behind a proxy and want a public hostname.
  const reqOrigin = (() => {
    try {
      return new URL(request.url).origin;
    } catch {
      return '';
    }
  })();
  const envOrigin = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || '')
    .replace(/\/$/, '');
  const baseUrl = reqOrigin || envOrigin || 'http://localhost:3000';

  const params: Record<string, string> = {
    pid: config.zpay_pid,
    type,
    out_trade_no: outTradeNo,
    notify_url: `${baseUrl}/api/payment/notify`,
    return_url: `${baseUrl}/api/payment/return`,
    name: subject,
    money: settleMoney.toFixed(2),
    // ZPay `param` carries the sku; kind is prefixed so notify can route it.
    param: `${kind}:${sku}`,
  };
  const signStr = sign(params, config.zpay_key);

  const id = crypto.randomUUID();
  await query(
    `INSERT INTO platform_orders (id, user_id, out_trade_no, subject, name, plan, kind, money, currency, type, status)
     VALUES ($1,$2,$3,$4,$4,$5,$6,$7,$8,$9,'pending')`,
    [id, user.id, outTradeNo, subject, sku, kind, settleMoney, 'CNY', type],
  );

  const qs = new URLSearchParams({ ...params, sign: signStr, sign_type: 'MD5' });
  const redirectUrl = `${config.zpay_api_url.replace(/\/$/, '')}/submit.php?${qs.toString()}`;

  return NextResponse.json({
    redirectUrl,
    outTradeNo,
    kind,
    sku,
    displayPrice,
    currency,
  });
}

/** Public catalog of one-off add-on packs. */
export async function GET() {
  const products = await listActiveProducts();
  return NextResponse.json({
    products: products.map(p => ({
      id: p.id,
      name: { zh: p.name_zh, en: p.name_en },
      kind: p.kind,
      units: p.units,
      price: { CNY: Number(p.price_cny), USD: Number(p.price_usd) },
    })),
  });
}
