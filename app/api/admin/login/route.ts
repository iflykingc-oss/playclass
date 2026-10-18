import { NextResponse } from 'next/server';
import { verifyAdminLogin, createAdminSession, adminCookieHeader } from '@/platform/admin/auth';
import { ensurePlatformSchema } from '@/platform/db/client';
import { checkAuthAttempt, clearAuthAttempts } from '@/platform/auth/throttle';

export async function POST(request: Request) {
  await ensurePlatformSchema();
  let body: { email?: string; password?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const email = body.email || '';
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const throttle = await checkAuthAttempt('admin_login', `${email}|${ip}`);
  if (!throttle.allowed) {
    return NextResponse.json(
      { error: 'Too many attempts. Try again later.' },
      { status: 429, headers: { 'Retry-After': String(throttle.retryAfterSec) } },
    );
  }

  const adminId = await verifyAdminLogin(email, body.password || '');
  if (!adminId) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  await clearAuthAttempts('admin_login', `${email}|${ip}`);

  const token = await createAdminSession(adminId);
  const res = NextResponse.json({ ok: true });
  res.headers.set('Set-Cookie', adminCookieHeader(token));
  return res;
}
