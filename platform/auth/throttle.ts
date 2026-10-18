/**
 * Simple DB-backed throttle for auth-sensitive endpoints (login/register/admin login).
 * Sliding window: max N attempts per identifier within `windowMs`.
 */
import { randomBytes } from 'node:crypto';
import { query } from '../db/client';

const WINDOW_MS = 10 * 60 * 1000; // 10 minutes

const LIMITS: Record<string, number> = {
  login: 10,
  register: 10,
  admin_login: 5,
};

export async function checkAuthAttempt(kind: string, identifier: string): Promise<{ allowed: boolean; retryAfterSec: number }> {
  const limit = LIMITS[kind] ?? 10;
  const rows = await query<{ count: number }>(
    `SELECT COUNT(*)::int AS count FROM platform_auth_attempts
     WHERE kind = $1 AND identifier = $2 AND created_at > NOW() - ($3 || ' milliseconds')::interval`,
    [kind, identifier.toLowerCase(), String(WINDOW_MS)],
  );
  const count = rows[0]?.count ?? 0;
  if (count >= limit) {
    return { allowed: false, retryAfterSec: Math.ceil(WINDOW_MS / 1000) };
  }
  await query(
    `INSERT INTO platform_auth_attempts (id, kind, identifier) VALUES ($1, $2, $3)`,
    ['atk_' + randomBytes(8).toString('hex'), kind, identifier.toLowerCase()],
  );
  return { allowed: true, retryAfterSec: 0 };
}

/** Clear attempts after a successful login so users aren't punished for typos then success. */
export async function clearAuthAttempts(kind: string, identifier: string): Promise<void> {
  await query(
    `DELETE FROM platform_auth_attempts WHERE kind = $1 AND identifier = $2`,
    [kind, identifier.toLowerCase()],
  );
}
