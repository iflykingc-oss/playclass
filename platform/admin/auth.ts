/**
 * Super-admin auth — separate from platform user auth.
 * Admins are stored in platform_admins table and have their own session cookie.
 */
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { query } from '../db/client';

const ADMIN_COOKIE = 'platform_admin_session';
const ADMIN_TTL_HOURS = 12;

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

export async function createAdmin(email: string, password: string): Promise<void> {
  const id = 'admin_' + randomBytes(8).toString('base64url');
  await query(
    `INSERT INTO platform_admins (id, email, password_hash) VALUES ($1, $2, $3)`,
    [id, email.toLowerCase(), hashPassword(password)],
  );
}

export async function verifyAdminLogin(email: string, password: string): Promise<string | null> {
  const rows = await query<{ id: string; password_hash: string }>(
    `SELECT id, password_hash FROM platform_admins WHERE LOWER(email) = LOWER($1)`,
    [email],
  );
  if (rows.length === 0) return null;
  if (!verifyPassword(password, rows[0].password_hash)) return null;
  return rows[0].id;
}

export async function createAdminSession(adminId: string): Promise<string> {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + ADMIN_TTL_HOURS * 3600 * 1000);
  await query(
    `INSERT INTO platform_admin_sessions (token, admin_id, expires_at) VALUES ($1, $2, $3)`,
    [token, adminId, expiresAt],
  );
  return token;
}

export async function isAdminSession(request: Request): Promise<boolean> {
  const token = readAdminToken(request);
  if (!token) return false;
  const rows = await query(
    `SELECT 1 FROM platform_admin_sessions WHERE token = $1 AND expires_at > NOW()`,
    [token],
  );
  return rows.length > 0;
}

export function readAdminToken(request: Request): string | null {
  return (
    request as { cookies?: { get(name: string): { value: string } | undefined } }
  ).cookies?.get(ADMIN_COOKIE)?.value ?? null;
}

export async function destroyAdminSession(token: string): Promise<void> {
  await query(`DELETE FROM platform_admin_sessions WHERE token = $1`, [token]);
}

export function clearAdminCookieHeader(): string {
  return `${ADMIN_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export function adminCookieHeader(token: string): string {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${ADMIN_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${ADMIN_TTL_HOURS * 3600}${secure}`;
}
