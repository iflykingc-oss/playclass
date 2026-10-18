/**
 * Playclass owner auth: maps the platform's `platform_session` cookie onto the
 * OpenMAIC v1.2.0 owner identity, so every owner-scoped surface (materials,
 * generation runs, classrooms) resolves the signed-in platform user instead of
 * an anonymous owner. Registered once at boot from `instrumentation.ts`.
 *
 * Owner id format follows `platform/auth.ts`: `user:<userId>` for personal
 * accounts, `org:<orgId>` for organisation members.
 */
import type {
  OwnerAuthMethod,
  OwnerAuthRequest,
  OwnerPrincipal,
} from './types';

const SESSION_COOKIE = 'platform_session';

/** Read the raw platform session token from the request's Cookie header. */
export function readPlatformSessionCookie(headers: Headers): string | null {
  const cookie = headers.get('cookie') ?? '';
  const match = /(?:^|;\s*)platform_session=([^;\s]+)/.exec(cookie);
  return match ? match[1] : null;
}

/**
 * Resolve the platform user behind an owner id (`user:<id>` or `org:<orgId>`),
 * when one exists. Used by billing hooks that see only an owner id.
 */
export function platformUserIdFromOwnerId(ownerId: string): string | null {
  if (!ownerId.startsWith('user:')) return null;
  const id = ownerId.slice('user:'.length);
  return id.length > 0 ? id : null;
}

export const playclassOwnerAuth: OwnerAuthMethod = {
  name: 'playclass-session',

  async authenticate(req: OwnerAuthRequest): Promise<
    { status: 'authenticated'; principal: OwnerPrincipal } |
    { status: 'not-applicable' } |
    { status: 'invalid'; reason?: string }
  > {
    const token = readPlatformSessionCookie(req.headers);
    if (!token) return { status: 'not-applicable' };

    // Dynamic import keeps `pg` out of any Edge bundle and defers to the
    // platform's DB client, mirroring the rest of the platform layer.
    const { getSessionUser } = await import('@/platform/auth');
    let user;
    try {
      user = await getSessionUser(token);
    } catch (error) {
      // A DB outage is a server fault, not an invalid credential: throw so the
      // request fails 500 rather than downgrading to anonymous.
      throw error;
    }
    if (!user) {
      return { status: 'invalid', reason: 'unknown or expired platform session' };
    }

    const ownerId = user.org_id ? `org:${user.org_id}` : `user:${user.id}`;
    const principal: OwnerPrincipal = {
      ownerId,
      kind: 'user',
      roles: new Set(),
      assurance: 'verified',
      channel: 'web',
    };
    return { status: 'authenticated', principal };
  },

  describeStoredOwner(ownerId: string) {
    if (ownerId.startsWith('user:') || ownerId.startsWith('org:')) {
      return { kind: 'user' as const };
    }
    return undefined;
  },
};
