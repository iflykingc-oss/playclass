import { NextResponse } from 'next/server';
import { resolvePlatformOwnerId } from '@/platform/auth';
import { query } from '@/platform/db/client';

/**
 * Import a catalog course by generating a classroom from its stored outline.
 * Single source of truth: `platform_courses` (seeded / admin-managed).
 */
export async function POST(request: Request) {
  const { user } = await resolvePlatformOwnerId(request);
  if (!user) return NextResponse.json({ error: 'Login required' }, { status: 401 });

  let body: { courseId?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  if (!body.courseId) return NextResponse.json({ error: 'courseId required' }, { status: 400 });

  const rows = await query<{
    id: string;
    title: string;
    description: string;
    outline: { section: string; points: string[] }[];
    knowledge: string[];
    objectives: string[];
  }>(
    `SELECT id, title, description, outline, knowledge, objectives
     FROM platform_courses WHERE id = $1 AND is_published = TRUE`,
    [body.courseId],
  );
  const course = rows[0];
  if (!course) return NextResponse.json({ error: 'Course not found' }, { status: 404 });

  // Build a generation requirement from the structured catalog entry.
  const outlineText = (course.outline || [])
    .map((s: any) => `- ${s.section}: ${(s.points || []).join('、')}`)
    .join('\n');
  const knowledgeText = (course.knowledge || []).join('、');
  const objectivesText = (course.objectives || []).join('；');
  const prompt = [
    `请生成一门互动课程：${course.title}。`,
    course.description ? `简介：${course.description}` : '',
    outlineText ? `建议大纲：\n${outlineText}` : '',
    knowledgeText ? `知识点：${knowledgeText}` : '',
    objectivesText ? `教学目标：${objectivesText}` : '',
    '请按上述结构生成完整的互动课堂，包含讲解、测验与练习。',
  ]
    .filter(Boolean)
    .join('\n');

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const res = await fetch(`${baseUrl}/api/generate-classroom`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: request.headers.get('cookie') || '' },
    body: JSON.stringify({ requirement: prompt, enableTTS: true, enableImageGeneration: true }),
  });
  const data = await res.json();
  return NextResponse.json({ catalogCourse: { id: course.id, title: course.title }, generation: data });
}
