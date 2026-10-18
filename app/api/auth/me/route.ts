import { NextResponse } from 'next/server';
import { readSessionToken, getSessionUser } from '@/platform/auth';
import { isAdminSession } from '@/platform/admin/auth';

export async function GET(request: Request) {
  const token = readSessionToken(request);
  const adminSession = await isAdminSession(request);
  const user = token ? await getSessionUser(token) : null;

  // Identity is exclusive: a logged-in platform user is that user — a leftover
  // admin cookie from another session must not label them "super admin".
  const isAdmin = adminSession && !user;

  if (!user) {
    return NextResponse.json({ user: null, isAdmin }, { status: isAdmin ? 200 : 401 });
  }
  return NextResponse.json({ user, isAdmin: false });
}
