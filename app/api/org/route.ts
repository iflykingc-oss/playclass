import { NextResponse } from 'next/server';
import { resolvePlatformOwnerId } from '@/platform/auth';
import { isAdminSession } from '@/platform/admin/auth';
import {
  getOrgForUser,
  listMembers,
  addMemberByEmail,
  removeMember,
  setSeatCount,
  renameOrg,
  createInvite,
} from '@/platform/orgs';

/** GET /api/org — current user's org info + members. */
export async function GET(request: Request) {
  const { user } = await resolvePlatformOwnerId(request);
  if (!user) {
    if (await isAdminSession(request)) {
      return NextResponse.json({ org: null, members: [], isOwner: false, adminPreview: true });
    }
    return NextResponse.json({ error: 'Login required' }, { status: 401 });
  }

  const org = await getOrgForUser(user.id);
  if (!org) return NextResponse.json({ org: null, members: [] });

  const members = await listMembers(org.id);
  return NextResponse.json({
    org,
    members,
    isOwner: org.ownerUserId === user.id,
  });
}

/**
 * POST /api/org
 *  - { action: 'add_member', email }     owner only
 *  - { action: 'invite', email }         owner only (for users who have not registered)
 *  - { action: 'remove_member', userId } owner only
 *  - { action: 'set_seats', seatCount }  owner only (must not go below used)
 *  - { action: 'rename', name }          owner only
 */
export async function POST(request: Request) {
  const { user } = await resolvePlatformOwnerId(request);
  if (!user) return NextResponse.json({ error: 'Login required' }, { status: 401 });

  const org = await getOrgForUser(user.id);
  if (!org) return NextResponse.json({ error: 'No organization' }, { status: 400 });
  if (org.ownerUserId !== user.id) {
    return NextResponse.json({ error: 'Org owner only' }, { status: 403 });
  }

  let body: {
    action?: string;
    email?: string;
    userId?: string;
    seatCount?: number;
    name?: string;
  };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  try {
    switch (body.action) {
      case 'add_member': {
        if (!body.email) return NextResponse.json({ error: 'email required' }, { status: 400 });
        const member = await addMemberByEmail(org.id, body.email);
        return NextResponse.json({ ok: true, member });
      }
      case 'invite': {
        if (!body.email) return NextResponse.json({ error: 'email required' }, { status: 400 });
        const invite = await createInvite(org.id, body.email);
        // Return the raw token once — no email channel yet, owner hands it over manually.
        return NextResponse.json({ ok: true, invite });
      }
      case 'remove_member': {
        if (!body.userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });
        await removeMember(org.id, body.userId);
        return NextResponse.json({ ok: true });
      }
      case 'set_seats': {
        if (typeof body.seatCount !== 'number') {
          return NextResponse.json({ error: 'seatCount required' }, { status: 400 });
        }
        // Owners may only shrink seats (return unused). Expanding seats is an
        // admin/sales action so it cannot be used to dodge enterprise billing.
        if (body.seatCount > org.seatCount) {
          return NextResponse.json(
            { error: 'Contact support to add seats' },
            { status: 403 },
          );
        }
        await setSeatCount(org.id, body.seatCount);
        return NextResponse.json({ ok: true });
      }
      case 'rename': {
        if (!body.name) return NextResponse.json({ error: 'name required' }, { status: 400 });
        await renameOrg(org.id, body.name);
        return NextResponse.json({ ok: true });
      }
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
