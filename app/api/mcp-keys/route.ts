import { NextResponse } from 'next/server';
import { randomBytes, createHash } from 'crypto';
import { resolvePlatformOwnerId } from '@/platform/auth';
import { isAdminSession } from '@/platform/admin/auth';
import { query } from '@/platform/db/client';

function hashKey(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

/** List user's MCP keys (prefix only — full secret is never stored in the clear). */
export async function GET(request: Request) {
  const { user } = await resolvePlatformOwnerId(request);
  if (!user) {
    if (await isAdminSession(request)) {
      return NextResponse.json({ keys: [], adminPreview: true });
    }
    return NextResponse.json({ error: 'Login required' }, { status: 401 });
  }

  const keys = await query(
    `SELECT key_prefix, name, last_used_at, created_at FROM platform_mcp_keys
     WHERE user_id = $1 AND revoked = FALSE ORDER BY created_at DESC`,
    [user.id],
  );
  return NextResponse.json({
    keys: keys.map((k: any) => ({
      // Back-compat shape for the dashboard: `key` is now a display prefix.
      key: k.key_prefix,
      key_prefix: k.key_prefix,
      name: k.name,
      last_used_at: k.last_used_at,
      created_at: k.created_at,
    })),
  });
}

/** Create a new MCP key. The full secret is returned exactly once. */
export async function POST(request: Request) {
  const { user } = await resolvePlatformOwnerId(request);
  if (!user) return NextResponse.json({ error: 'Login required' }, { status: 401 });

  let body: { name?: string };
  try { body = await request.json(); } catch { body = {}; }

  const raw = 'maic_' + randomBytes(24).toString('base64url');
  const prefix = raw.slice(0, 12);
  await query(
    `INSERT INTO platform_mcp_keys (key, key_prefix, user_id, name) VALUES ($1, $2, $3, $4)`,
    [hashKey(raw), prefix, user.id, body.name || 'Default key'],
  );
  return NextResponse.json({ key: raw, key_prefix: prefix, name: body.name || 'Default key' }, { status: 201 });
}

export async function DELETE(request: Request) {
  const { user } = await resolvePlatformOwnerId(request);
  if (!user) return NextResponse.json({ error: 'Login required' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const keyParam = searchParams.get('key') || searchParams.get('key_prefix') || '';
  if (!keyParam) return NextResponse.json({ error: 'key required' }, { status: 400 });

  // Accept either the display prefix or the stored hash.
  await query(
    `UPDATE platform_mcp_keys SET revoked = TRUE
     WHERE user_id = $1 AND (key_prefix = $2 OR key = $2)`,
    [user.id, keyParam],
  );
  return NextResponse.json({ ok: true });
}
