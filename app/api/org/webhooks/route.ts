import { NextResponse } from 'next/server';
import { resolvePlatformOwnerId } from '@/platform/auth';
import { isAdminSession } from '@/platform/admin/auth';
import { getOrgForUser } from '@/platform/orgs';
import {
  deliverOrgWebhooks,
  getOrgWebhooks,
  setOrgWebhook,
} from '@/platform/webhooks';

/**
 * GET  /api/org/webhooks — list (secret masked)
 * POST /api/org/webhooks — { url, events? } upsert + one-time secret
 * POST /api/org/webhooks/fire — { event? } test delivery (owner/admin)
 */
export async function GET(request: Request) {
  const { user } = await resolvePlatformOwnerId(request);
  let orgId: string | null = null;
  if (user) {
    const org = await getOrgForUser(user.id);
    if (org && org.ownerUserId === user.id) orgId = org.id;
  }
  if (!orgId) {
    // Admin can pass ?orgId=
    if (await isAdminSession(request)) {
      orgId = new URL(request.url).searchParams.get('orgId');
    }
  }
  if (!orgId) return NextResponse.json({ error: 'Org owner or admin only' }, { status: 403 });

  const hooks = await getOrgWebhooks(orgId);
  return NextResponse.json({
    webhooks: hooks.map((h) => ({
      id: h.id,
      url: h.url,
      events: h.events,
      isActive: h.is_active,
      secretMasked: h.secret ? `${h.secret.slice(0, 4)}****` : '',
    })),
  });
}

export async function POST(request: Request) {
  let body: { url?: string; events?: string[]; action?: string; event?: string; orgId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { user } = await resolvePlatformOwnerId(request);
  let orgId: string | null = null;
  let isOwner = false;
  if (user) {
    const org = await getOrgForUser(user.id);
    if (org && org.ownerUserId === user.id) {
      orgId = org.id;
      isOwner = true;
    }
  }
  const admin = await isAdminSession(request);
  if (!isOwner) {
    if (admin && body.orgId) orgId = body.orgId;
  }
  if (!orgId) return NextResponse.json({ error: 'Org owner or admin only' }, { status: 403 });

  if (body.action === 'fire') {
    const result = await deliverOrgWebhooks(orgId, (body.event as never) || 'all');
    return NextResponse.json({ ok: true, ...result });
  }

  if (!body.url) return NextResponse.json({ error: 'url required' }, { status: 400 });
  try {
    new URL(body.url);
  } catch {
    return NextResponse.json({ error: 'invalid url' }, { status: 400 });
  }
  if (!/^https?:\/\//i.test(body.url)) {
    return NextResponse.json({ error: 'url must be http(s)' }, { status: 400 });
  }

  const hook = await setOrgWebhook(orgId, body.url, body.events);
  // Return secret exactly once so the customer can verify HMAC signatures.
  return NextResponse.json({
    ok: true,
    webhook: {
      id: hook.id,
      url: hook.url,
      events: hook.events,
      secret: hook.secret,
    },
  });
}
