import { NextResponse } from 'next/server';
import { createUser, sessionCookieHeader } from '@/platform/auth';
import { ensurePlatformSchema } from '@/platform/db/client';
import { checkAuthAttempt, clearAuthAttempts } from '@/platform/auth/throttle';

export async function POST(request: Request) {
  await ensurePlatformSchema();
  let body: { email?: string; password?: string; name?: string; accountType?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { email, password, name, accountType } = body;
  if (!email || !password || password.length < 8) {
    return NextResponse.json({ error: 'Email and password (min 8 chars) required' }, { status: 400 });
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const throttle = await checkAuthAttempt('register', `${email}|${ip}`);
  if (!throttle.allowed) {
    return NextResponse.json(
      { error: 'Too many attempts. Try again later.' },
      { status: 429, headers: { 'Retry-After': String(throttle.retryAfterSec) } },
    );
  }

  try {
    const user = await createUser(email, password, name || email.split('@')[0], accountType === 'org' ? 'org' : 'personal');
    // Org accounts get their own org (owner seat = 1) so members can be invited later.
    if (accountType === 'org') {
      const { createOrg } = await import('@/platform/orgs');
      await createOrg(name || email.split('@')[0], user.id, 1);
    }
    await clearAuthAttempts('register', `${email}|${ip}`);
    const token = await (await import('@/platform/auth')).createSession(user.id);
    const res = NextResponse.json({ user }, { status: 201 });
    res.headers.set('Set-Cookie', sessionCookieHeader(token));
    return res;
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    if (msg.includes('duplicate') || msg.includes('unique')) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
