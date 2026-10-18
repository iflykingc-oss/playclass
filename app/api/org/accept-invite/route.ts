import { NextResponse } from 'next/server';
import { resolvePlatformOwnerId } from '@/platform/auth';
import { acceptInvite } from '@/platform/orgs';

/** POST /api/org/accept-invite { token } — join an org via invite token. */
export async function POST(request: Request) {
  const { user } = await resolvePlatformOwnerId(request);
  if (!user) return NextResponse.json({ error: 'Login required' }, { status: 401 });

  let body: { token?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  if (!body.token) return NextResponse.json({ error: 'token required' }, { status: 400 });

  try {
    const orgId = await acceptInvite(body.token, user.id, user.email);
    return NextResponse.json({ ok: true, orgId });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
