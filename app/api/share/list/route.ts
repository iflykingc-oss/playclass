import { NextResponse } from 'next/server';
import { resolvePlatformOwnerId } from '@/platform/auth';
import { isAdminSession } from '@/platform/admin/auth';
import { listSharesForOwner } from '@/platform/share';

export async function GET(request: Request) {
  const { ownerId, user } = await resolvePlatformOwnerId(request);
  if (!user) {
    if (await isAdminSession(request)) {
      return NextResponse.json({ shares: [], adminPreview: true });
    }
    return NextResponse.json({ error: 'Login required' }, { status: 401 });
  }
  const shares = await listSharesForOwner(ownerId);
  return NextResponse.json({ shares });
}
