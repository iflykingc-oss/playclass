import { NextResponse } from 'next/server';
import { readSessionToken, destroySession, clearSessionCookieHeader } from '@/platform/auth';

export async function POST(request: Request) {
  const token = readSessionToken(request);
  if (token) await destroySession(token);
  const res = NextResponse.json({ ok: true });
  res.headers.set('Set-Cookie', clearSessionCookieHeader());
  return res;
}
