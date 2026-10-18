/**
 * Platform auth — registration, login, session management.
 * Integrates with OpenMAIC by providing authenticatedOwnerId for resolveRequestOwnerId().
 */
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { query } from '../db/client';

const SESSION_COOKIE = 'platform_session';
const SESSION_TTL_DAYS = 30;

// ---------------------------------------------------------------------------
// Password hashing (scrypt, zero extra deps)
// ---------------------------------------------------------------------------
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, 'hex');
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface PlatformUser {
  id: string;
  email: string;
  name: string;
  account_type: 'personal' | 'org';
  org_id: string | null;
}

// ---------------------------------------------------------------------------
// Registration / login
// ---------------------------------------------------------------------------
export async function createUser(
  email: string,
  password: string,
  name: string,
  accountType: 'personal' | 'org' = 'personal',
): Promise<PlatformUser> {
  const id = 'usr_' + randomBytes(12).toString('base64url');
  const passwordHash = hashPassword(password);
  await query(
    `INSERT INTO platform_users (id, email, password_hash, name, account_type)
     VALUES ($1, $2, $3, $4, $5)`,
    [id, email.toLowerCase(), passwordHash, name, accountType],
  );
  // Give them a default quota row
  await query(`INSERT INTO platform_quotas (user_id) VALUES ($1) ON CONFLICT DO NOTHING`, [id]);
  return { id, email, name, account_type: accountType, org_id: null };
}

export async function verifyLogin(email: string, password: string): Promise<PlatformUser | null> {
  const rows = await query<PlatformUser & { password_hash: string; disabled: boolean }>(
    `SELECT id, email, name, account_type, org_id, password_hash, disabled
     FROM platform_users WHERE LOWER(email) = LOWER($1)`,
    [email],
  );
  if (rows.length === 0) return null;
  const user = rows[0];
  if (user.disabled) return null;
  if (!verifyPassword(password, user.password_hash)) return null;
  return { id: user.id, email: user.email, name: user.name, account_type: user.account_type, org_id: user.org_id };
}

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------
export async function createSession(
  userId: string,
  userAgent?: string,
  ip?: string,
): Promise<string> {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
  await query(
    `INSERT INTO platform_sessions (token, user_id, expires_at, user_agent, ip)
     VALUES ($1, $2, $3, $4, $5)`,
    [token, userId, expiresAt, userAgent ?? null, ip ?? null],
  );
  return token;
}

export async function getSessionUser(token: string): Promise<PlatformUser | null> {
  const rows = await query<PlatformUser>(
    `SELECT u.id, u.email, u.name, u.account_type, u.org_id
     FROM platform_sessions s
     JOIN platform_users u ON u.id = s.user_id
     WHERE s.token = $1 AND s.expires_at > NOW()`,
    [token],
  );
  return rows[0] ?? null;
}

export async function destroySession(token: string): Promise<void> {
  await query(`DELETE FROM platform_sessions WHERE token = $1`, [token]);
}

// ---------------------------------------------------------------------------
// Cookie helpers
// ---------------------------------------------------------------------------
export function sessionCookieHeader(token: string): string {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_TTL_DAYS * 86400}${secure}`;
}

export function clearSessionCookieHeader(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export function readSessionToken(request: Request): string | null {
  return (request as { cookies?: { get(name: string): { value: string } | undefined } }).cookies?.get(SESSION_COOKIE)?.value ?? null;
}

// ---------------------------------------------------------------------------
// Integration with OpenMAIC: resolve authenticatedOwnerId
// ---------------------------------------------------------------------------
/**
 * Given a request, resolve the logged-in platform user.
 * Returns the OpenMAIC ownerId string if authenticated, null otherwise.
 *
 * ownerId format: "user:<userId>" for personal, "org:<orgId>" for org members.
 * This replaces the anonymous "anon:<uuid>" cookie in OpenMAIC's resolveRequestOwnerId.
 */
export async function resolvePlatformOwnerId(request: Request): Promise<{
  ownerId: string;
  user: PlatformUser | null;
}> {
  const token = readSessionToken(request);
  if (!token) return { ownerId: '', user: null };
  const user = await getSessionUser(token);
  if (!user) return { ownerId: '', user: null };
  // Org members share one org-scoped owner; personal users are user-scoped.
  const ownerId = user.org_id ? `org:${user.org_id}` : `user:${user.id}`;
  return { ownerId, user };
}
