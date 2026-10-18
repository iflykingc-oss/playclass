import { NextRequest, NextResponse } from 'next/server';

import { isAgentRuntimeConfigured, isProWorkbenchEnabled } from '@/lib/config/feature-flags';
import {
  anonymousOwnerForNavigation,
  type NavigationIdentity,
} from '@/lib/server/identity/navigation';

// ---------------------------------------------------------------------------
// Playclass platform middleware: fuses OpenMAIC's anonymous-owner navigation
// cookie with the platform's login gate.
//   - Every page request still establishes the v1.2.0 anonymous owner cookie so
//     the owner-scoped API (materials, generation runs) resolves consistently.
//   - Signed-in users are gated by cookie presence here; real session validation
//     happens in the API routes (resolvePlatformOwnerId / isAdminSession).
// ---------------------------------------------------------------------------

const SESSION_COOKIE = 'platform_session';
const ADMIN_SESSION_COOKIE = 'platform_admin_session';

// Paths that never require login
const PUBLIC_PATHS = [
  '/api/auth/',        // login/register/logout
  '/api/health',
  '/api/mcp',          // MCP uses API key auth, not cookies
  '/api/mcp/',
  '/api/admin/login',  // admin login endpoint
  '/api/admin/',       // admin APIs validate isAdminSession internally
  '/auth/',            // login/register pages
  '/admin/login',      // admin login page (other /admin routes check isAdminSession in API)
  '/share/',           // public share landing (checks share_mode server-side)
  '/terms',            // legal pages — must be readable pre-login
  '/privacy',
  '/legal/',           // institutional compliance (FERPA etc.)
  '/api/plans',        // public pricing catalog
  '/api/access-code',  // gate status must work before login (root layout)
  '/api/server-providers', // provider catalog is read-only config for the picker
];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p));
}

/**
 * Let the request through, carrying the anonymous owner a page request
 * establishes: the cookie is set on the page response, and the forwarded
 * request carries it too, so the page and every request it sends resolve one
 * owner (see `lib/server/identity/navigation.ts`).
 */
function next(request: NextRequest, identity: NavigationIdentity | undefined): NextResponse {
  if (!identity) return NextResponse.next();
  const headers = new Headers(request.headers);
  headers.set('cookie', identity.requestCookie);
  const response = NextResponse.next({ request: { headers } });
  response.headers.append('set-cookie', identity.setCookie);
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // --- OpenMAIC workbench gate (preserved from upstream) ---
  const canInspectServerRuntime = process.env.NEXT_RUNTIME !== 'edge';
  const workbenchEnabled =
    isProWorkbenchEnabled() && (!canInspectServerRuntime || isAgentRuntimeConfigured());
  if (!workbenchEnabled && (pathname === '/workbench' || pathname.startsWith('/workbench/'))) {
    return new NextResponse('Not found', { status: 404 });
  }

  // One anonymous owner per browser, established on the page response before
  // any API request can mint its own (OpenMAIC v1.2.0 owner identity).
  const identity = anonymousOwnerForNavigation({
    method: request.method,
    headers: request.headers,
    pathname,
  });

  // --- Platform auth gate ---
  if (isPublic(pathname)) {
    return next(request, identity);
  }

  // Cookie *presence* only — real session validation happens in API routes.
  // Admin console uses a separate cookie, so both count as "signed in" here;
  // route handlers still enforce which identity is allowed.
  const hasUserSession = !!request.cookies.get(SESSION_COOKIE)?.value;
  const hasAdminSession = !!request.cookies.get(ADMIN_SESSION_COOKIE)?.value;

  // Classroom playback: if it's a public share (share_mode=none), allow through.
  // The classroom page/API will verify the share exists and enforce login if needed.
  if (pathname.startsWith('/classroom/')) {
    return next(request, identity);
  }

  // Admin pages / APIs: admin cookie is enough (APIs re-check isAdminSession).
  const isAdminArea =
    pathname === '/admin' || pathname.startsWith('/admin/') || pathname.startsWith('/api/admin');
  if (isAdminArea) {
    if (hasAdminSession || hasUserSession) {
      return next(request, identity);
    }
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 },
      );
    }
    const loginUrl = new URL('/admin/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Operator with only the admin cookie may open the user workbench (preview).
  // APIs that require a real end-user still reject/return empty; page shell loads.
  const signedIn = hasUserSession || hasAdminSession;
  if (!signedIn) {
    // API requests → 401
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 },
      );
    }
    // Page requests → redirect to login
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Page requests → let through
  return next(request, identity);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|logos/).*)'],
};
