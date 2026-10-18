import { NextResponse } from 'next/server';
import { isAdminSession } from '@/platform/admin/auth';
import { query } from '@/platform/db/client';

function maskSecret(value: string): string {
  if (!value) return '';
  if (value.length <= 8) return '****';
  return value.slice(0, 3) + '****' + value.slice(-3);
}

export async function GET(request: Request) {
  const valid = await isAdminSession(request);
  if (!valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rows = await query<{ key: string; value: string }>(`SELECT key, value FROM platform_payment_config`);
  const config: Record<string, string> = {};
  rows.forEach((r: any) => {
    // Never ship the signing key to the browser.
    config[r.key] = r.key.toLowerCase().includes('key') || r.key.toLowerCase().includes('secret')
      ? maskSecret(r.value)
      : r.value;
  });
  return NextResponse.json(config);
}

export async function POST(request: Request) {
  const valid = await isAdminSession(request);
  if (!valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  for (const [key, value] of Object.entries(body)) {
    const raw = String(value);
    // Ignore masked round-trips so a masked view can't wipe the real secret.
    if (raw.includes('****') && (key.toLowerCase().includes('key') || key.toLowerCase().includes('secret'))) {
      continue;
    }
    await query(
      `INSERT INTO platform_payment_config (key, value) VALUES ($1, $2)
       ON CONFLICT (key) DO UPDATE SET value = $2`,
      [key, raw],
    );
  }
  return NextResponse.json({ ok: true });
}
