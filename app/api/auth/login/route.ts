import { NextResponse } from 'next/server';
import { verifyLogin, createSession, sessionCookieHeader } from '@/platform/auth';
import { ensurePlatformSchema } from '@/platform/db/client';
import { checkAuthAttempt, clearAuthAttempts } from '@/platform/auth/throttle';

export async function POST(request: Request) {
  await ensurePlatformSchema();
  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { email, password } = body;
  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const throttle = await checkAuthAttempt('login', `${email}|${ip}`);
  if (!throttle.allowed) {
    return NextResponse.json(
      { error: 'Too many attempts. Try again later.' },
      { status: 429, headers: { 'Retry-After': String(throttle.retryAfterSec) } },
    );
  }

  const user = await verifyLogin(email, password);
  if (!user) {
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
  }
  await clearAuthAttempts('login', `${email}|${ip}`);

  const token = await createSession(user.id);
  const res = NextResponse.json({ user });
  res.headers.set('Set-Cookie', sessionCookieHeader(token));
  return res;
}
