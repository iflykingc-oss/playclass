import { NextResponse } from 'next/server';
import { query } from '@/platform/db/client';
import { isAdminSession } from '@/platform/admin/auth';
import { setOrgPlan, setSeatCount, listMembers } from '@/platform/orgs';

export async function GET(request: Request) {
  if (!(await isAdminSession(request))) {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }
  const orgs = await query(
    `SELECT o.id, o.name, o.plan, o.seat_count, o.created_at, u.email as owner_email,
            (SELECT COUNT(*)::int FROM platform_users m WHERE m.org_id = o.id) AS used_seats
     FROM platform_orgs o JOIN platform_users u ON u.id = o.owner_user_id
     ORDER BY o.created_at DESC LIMIT 200`,
  );
  return NextResponse.json({ orgs });
}

/** PATCH { id, plan?, seatCount?, name? } */
export async function PATCH(request: Request) {
  if (!(await isAdminSession(request))) {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }
  let body: { id?: string; plan?: string; seatCount?: number; name?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  if (!body.id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  try {
    if (body.seatCount !== undefined) await setSeatCount(body.id, body.seatCount);
    if (body.plan) await setOrgPlan(body.id, body.plan);
    if (body.name) {
      await query(`UPDATE platform_orgs SET name = $2 WHERE id = $1`, [body.id, body.name]);
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Unknown error' }, { status: 400 });
  }
}

/** GET members of one org: /api/admin/orgs?orgId=... */
export async function POST(request: Request) {
  if (!(await isAdminSession(request))) {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }
  let body: { orgId?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  if (!body.orgId) return NextResponse.json({ error: 'orgId required' }, { status: 400 });
  const members = await listMembers(body.orgId);
  return NextResponse.json({ members });
}
