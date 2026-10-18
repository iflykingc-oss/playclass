import { resolvePlatformOwnerId } from '@/platform/auth';
import { resolveRequestOwnerId as upstreamResolve } from './owner';

/**
 * Platform-integrated version of withRequestOwnerId.
 *
 * Instead of the upstream anonymous-cookie owner resolution, we first check for
 * a platform session. If logged in, we use "user:<id>" or "org:<orgId>" as the
 * ownerId. If not logged in, we fall back to the upstream anonymous behavior.
 *
 * This is the ONLY upstream file we patch for auth integration — all 63 call
 * sites go through this wrapper and need no changes.
 */
export async function withRequestOwnerId(
  req: Pick<Request, 'headers'>,
  handler: (ownerId: string, responseHeaders: Headers) => Promise<Response>,
): Promise<Response> {
  const responseHeaders = new Headers();

  // Try platform auth first
  try {
    const { ownerId } = await resolvePlatformOwnerId(req as unknown as Request);
    if (ownerId) {
      try {
        return await handler(ownerId, responseHeaders);
      } catch (error) {
        console.error('[platform] request failed under owner', ownerId, error);
        return new Response('Internal Server Error', { status: 500, headers: responseHeaders });
      }
    }
  } catch (e) {
    // DB not ready or session invalid — fall through to anonymous
    console.warn('[platform] auth resolution failed, falling back to anonymous:', e);
  }

  // Fallback: upstream anonymous cookie behavior
  const ownerId = upstreamResolve(req as Parameters<typeof upstreamResolve>[0], responseHeaders);
  try {
    return await handler(ownerId, responseHeaders);
  } catch (error) {
    console.error('[agent-runtime] request failed under anonymous owner', error);
    return new Response('Internal Server Error', { status: 500, headers: responseHeaders });
  }
}
