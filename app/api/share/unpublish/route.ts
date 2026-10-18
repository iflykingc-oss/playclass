import { NextResponse } from 'next/server';
import { resolvePlatformOwnerId } from '@/platform/auth';
import { unpublishCourse } from '@/platform/share';

export async function POST(request: Request) {
  const { user } = await resolvePlatformOwnerId(request);
  if (!user) return NextResponse.json({ error: 'Login required' }, { status: 401 });
  let body: { stageId?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  if (!body.stageId) return NextResponse.json({ error: 'stageId required' }, { status: 400 });
  await unpublishCourse(body.stageId);
  return NextResponse.json({ ok: true });
}
