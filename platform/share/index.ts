/**
 * Course publishing & sharing — turn an owner's private course into a shareable link.
 * share_mode: 'none' = anyone with link can view; 'login' = require platform login.
 */
import { query } from '../db/client';

export interface CourseShare {
  id: string;
  stageId: string;
  ownerId: string;
  title: string;
  shareMode: 'none' | 'login';
  isPublished: boolean;
}

export async function publishCourse(
  stageId: string,
  ownerId: string,
  title: string,
  shareMode: 'none' | 'login' = 'none',
): Promise<CourseShare> {
  const id = 'share_' + Math.random().toString(36).slice(2, 14);
  await query(
    `INSERT INTO platform_course_shares (id, stage_id, owner_id, title, share_mode, is_published)
     VALUES ($1, $2, $3, $4, $5, TRUE)
     ON CONFLICT (stage_id) DO UPDATE SET title = $4, share_mode = $5, updated_at = NOW()`,
    [id, stageId, ownerId, title, shareMode],
  );
  return { id, stageId, ownerId, title, shareMode, isPublished: true };
}

export async function getShareByStageId(stageId: string): Promise<CourseShare | null> {
  const rows = await query<CourseShare & { stage_id: string; share_mode: string; is_published: boolean }>(
    `SELECT id, stage_id as "stageId", owner_id as "ownerId", title, share_mode as "shareMode", is_published as "isPublished"
     FROM platform_course_shares WHERE stage_id = $1 AND is_published = TRUE`,
    [stageId],
  );
  return rows[0] ?? null;
}

export async function unpublishCourse(stageId: string): Promise<void> {
  await query(`UPDATE platform_course_shares SET is_published = FALSE WHERE stage_id = $1`, [stageId]);
}

export async function listSharesForOwner(ownerId: string): Promise<CourseShare[]> {
  return query<CourseShare & { stage_id: string; share_mode: string; is_published: boolean }>(
    `SELECT id, stage_id as "stageId", owner_id as "ownerId", title, share_mode as "shareMode", is_published as "isPublished"
     FROM platform_course_shares WHERE owner_id = $1 AND is_published = TRUE ORDER BY updated_at DESC`,
    [ownerId],
  );
}
