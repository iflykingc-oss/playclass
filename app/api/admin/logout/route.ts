import { NextResponse } from 'next/server';
import { destroyAdminSession, clearAdminCookieHeader, readAdminToken } from '@/platform/admin/auth';

/** POST /api/admin/logout — server-side session teardown for the admin console. */
export async function POST(request: Request) {
  const token = readAdminToken(request);
  if (token) await destroyAdminSession(token);
  const res = NextResponse.json({ ok: true });
  res.headers.set('Set-Cookie', clearAdminCookieHeader());
  return res;
}
