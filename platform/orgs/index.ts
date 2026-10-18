/**
 * Organization seats — members share `org:<orgId>` as OpenMAIC ownerId
 * (same course space), and consume seats against `platform_orgs.seat_count`.
 */
import { randomBytes } from 'node:crypto';
import { query } from '../db/client';

export interface OrgMember {
  userId: string;
  email: string;
  name: string;
  role: 'owner' | 'member';
  joinedAt: string;
}

export interface OrgInfo {
  id: string;
  name: string;
  plan: string;
  seatCount: number;
  usedSeats: number;
  ownerUserId: string;
}

export async function createOrg(name: string, ownerUserId: string, seatCount = 1): Promise<OrgInfo> {
  const id = 'org_' + randomBytes(10).toString('base64url');
  await query(
    `INSERT INTO platform_orgs (id, name, plan, seat_count, owner_user_id) VALUES ($1, $2, 'free', $3, $4)`,
    [id, name, seatCount, ownerUserId],
  );
  await query(
    `UPDATE platform_users SET org_id = $2, account_type = 'org' WHERE id = $1`,
    [ownerUserId, id],
  );
  return { id, name, plan: 'free', seatCount, usedSeats: 1, ownerUserId };
}

export async function getOrgForUser(userId: string): Promise<OrgInfo | null> {
  const rows = await query<{
    id: string;
    name: string;
    plan: string;
    seat_count: number;
    owner_user_id: string;
    used: number;
  }>(
    `SELECT o.id, o.name, o.plan, o.seat_count, o.owner_user_id,
            (SELECT COUNT(*)::int FROM platform_users u WHERE u.org_id = o.id) AS used
     FROM platform_orgs o
     JOIN platform_users u ON u.org_id = o.id
     WHERE u.id = $1`,
    [userId],
  );
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    plan: row.plan,
    seatCount: row.seat_count,
    usedSeats: row.used,
    ownerUserId: row.owner_user_id,
  };
}

export async function listMembers(orgId: string): Promise<OrgMember[]> {
  const rows = await query<{
    id: string;
    email: string;
    name: string;
    owner_user_id: string;
    created_at: Date;
  }>(
    `SELECT u.id, u.email, u.name, o.owner_user_id, u.created_at
     FROM platform_users u
     JOIN platform_orgs o ON o.id = u.org_id
     WHERE u.org_id = $1
     ORDER BY u.created_at ASC`,
    [orgId],
  );
  return rows.map(r => ({
    userId: r.id,
    email: r.email,
    name: r.name,
    role: r.id === r.owner_user_id ? 'owner' : 'member',
    joinedAt: r.created_at.toISOString(),
  }));
}

/**
 * Attach an existing user (by email) to the org. Enforces seat_count.
 * Returns the updated member or throws on seat-full / already-in-org.
 */
export async function addMemberByEmail(orgId: string, email: string): Promise<OrgMember> {
  const orgRows = await query<{ seat_count: number; owner_user_id: string }>(
    `SELECT seat_count, owner_user_id FROM platform_orgs WHERE id = $1`,
    [orgId],
  );
  const org = orgRows[0];
  if (!org) throw new Error('Org not found');

  const userRows = await query<{ id: string; email: string; name: string; org_id: string | null; created_at: Date }>(
    `SELECT id, email, name, org_id, created_at FROM platform_users WHERE LOWER(email) = LOWER($1)`,
    [email],
  );
  const user = userRows[0];
  if (!user) throw new Error('User not found — they must register first');
  if (user.org_id === orgId) throw new Error('Already a member');
  if (user.org_id && user.org_id !== orgId) throw new Error('User already belongs to another org');

  const usedRows = await query<{ count: number }>(
    `SELECT COUNT(*)::int AS count FROM platform_users WHERE org_id = $1`,
    [orgId],
  );
  const used = usedRows[0]?.count ?? 0;
  if (used >= org.seat_count) throw new Error(`Seat limit reached (${org.seat_count})`);

  await query(
    `UPDATE platform_users SET org_id = $2, account_type = 'org', updated_at = NOW() WHERE id = $1`,
    [user.id, orgId],
  );

  return {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.id === org.owner_user_id ? 'owner' : 'member',
    joinedAt: user.created_at.toISOString(),
  };
}

export async function removeMember(orgId: string, userId: string): Promise<void> {
  const orgRows = await query<{ owner_user_id: string }>(
    `SELECT owner_user_id FROM platform_orgs WHERE id = $1`,
    [orgId],
  );
  if (!orgRows[0]) throw new Error('Org not found');
  if (orgRows[0].owner_user_id === userId) throw new Error('Cannot remove the org owner');

  await query(
    `UPDATE platform_users SET org_id = NULL, account_type = 'personal', updated_at = NOW()
     WHERE id = $1 AND org_id = $2`,
    [userId, orgId],
  );
}

export async function setSeatCount(orgId: string, seatCount: number): Promise<void> {
  if (seatCount < 1) throw new Error('seatCount must be >= 1');
  const usedRows = await query<{ count: number }>(
    `SELECT COUNT(*)::int AS count FROM platform_users WHERE org_id = $1`,
    [orgId],
  );
  const used = usedRows[0]?.count ?? 0;
  if (seatCount < used) throw new Error(`Cannot set seats below current members (${used})`);
  await query(`UPDATE platform_orgs SET seat_count = $2, updated_at = NOW() WHERE id = $1`, [
    orgId,
    seatCount,
  ]);
}

export async function renameOrg(orgId: string, name: string): Promise<void> {
  await query(`UPDATE platform_orgs SET name = $2, updated_at = NOW() WHERE id = $1`, [orgId, name]);
}

export async function setOrgPlan(orgId: string, plan: string, seatCount?: number): Promise<void> {
  if (seatCount !== undefined) {
    await query(`UPDATE platform_orgs SET plan = $2, seat_count = $3, updated_at = NOW() WHERE id = $1`, [
      orgId,
      plan,
      seatCount,
    ]);
  } else {
    await query(`UPDATE platform_orgs SET plan = $2, updated_at = NOW() WHERE id = $1`, [orgId, plan]);
  }
}

// ---------------------------------------------------------------------------
// Invites — for users who have not registered yet
// ---------------------------------------------------------------------------

export interface OrgInvite {
  id: string;
  email: string;
  token: string;
  expiresAt: string;
}

export async function createInvite(orgId: string, email: string, days = 7): Promise<OrgInvite> {
  const orgRows = await query<{ seat_count: number }>(`SELECT seat_count FROM platform_orgs WHERE id = $1`, [orgId]);
  if (!orgRows[0]) throw new Error('Org not found');

  const usedRows = await query<{ count: number }>(
    `SELECT COUNT(*)::int AS count FROM platform_users WHERE org_id = $1`,
    [orgId],
  );
  const pendingRows = await query<{ count: number }>(
    `SELECT COUNT(*)::int AS count FROM platform_org_invites
     WHERE org_id = $1 AND accepted_at IS NULL AND expires_at > NOW()`,
    [orgId],
  );
  const total = (usedRows[0]?.count ?? 0) + (pendingRows[0]?.count ?? 0);
  if (total >= orgRows[0].seat_count) throw new Error(`Seat limit reached (${orgRows[0].seat_count})`);

  const id = 'inv_' + randomBytes(10).toString('base64url');
  const token = randomBytes(24).toString('base64url');
  const expiresAt = new Date(Date.now() + days * 86400_000);
  await query(
    `INSERT INTO platform_org_invites (id, org_id, email, token, expires_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [id, orgId, email.toLowerCase(), token, expiresAt],
  );
  return { id, email: email.toLowerCase(), token, expiresAt: expiresAt.toISOString() };
}

/** Accept an invite for the currently logged-in user. */
export async function acceptInvite(token: string, userId: string, userEmail: string): Promise<string> {
  const rows = await query<{ id: string; org_id: string; email: string; expires_at: Date }>(
    `SELECT id, org_id, email, expires_at FROM platform_org_invites
     WHERE token = $1 AND accepted_at IS NULL`,
    [token],
  );
  const invite = rows[0];
  if (!invite) throw new Error('Invalid invite');
  if (new Date(invite.expires_at) < new Date()) throw new Error('Invite expired');
  if (invite.email.toLowerCase() !== userEmail.toLowerCase()) {
    throw new Error('Invite is for a different email');
  }

  const userRows = await query<{ org_id: string | null }>(`SELECT org_id FROM platform_users WHERE id = $1`, [userId]);
  if (userRows[0]?.org_id) throw new Error('Already belongs to an org');

  await addMemberByEmail(invite.org_id, userEmail);
  await query(`UPDATE platform_org_invites SET accepted_at = NOW() WHERE id = $1`, [invite.id]);
  return invite.org_id;
}
