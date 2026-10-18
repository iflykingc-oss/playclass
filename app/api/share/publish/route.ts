import { NextResponse } from 'next/server';
import { resolvePlatformOwnerId, readSessionToken, getSessionUser } from '@/platform/auth';
import { publishCourse } from '@/platform/share';
import { query } from '@/platform/db/client';
import { shouldWatermark } from '@/platform/billing';

export async function POST(request: Request) {
  const { ownerId, user } = await resolvePlatformOwnerId(request);
  if (!user) return NextResponse.json({ error: 'Login required' }, { status: 401 });

  let body: { stageId?: string; title?: string; shareMode?: 'none' | 'login' };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  if (!body.stageId) return NextResponse.json({ error: 'stageId required' }, { status: 400 });

  const watermarked = user ? await shouldWatermark(user.id) : true;
    await query(
      `UPDATE platform_course_shares SET watermarked = $2 WHERE stage_id = $1`,
      [body.stageId, watermarked],
    ).catch(() => {});
    const share = await publishCourse(body.stageId, ownerId, body.title || 'Untitled', body.shareMode || 'none');
  return NextResponse.json({ share, url: `/share/${share.id}` });
}
