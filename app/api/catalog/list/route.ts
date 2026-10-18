import { NextResponse } from 'next/server';
import { query } from '@/platform/db/client';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const subject = searchParams.get('subject');
  const grade = searchParams.get('grade');
  const search = searchParams.get('search');

  let sql = `SELECT id, title, subject, grade, semester, textbook, description, outline, knowledge, objectives, source
             FROM platform_courses WHERE is_published = TRUE`;
  const params: any[] = [];
  let i = 1;
  if (subject && subject !== '全部') { sql += ` AND subject = $${i}`; params.push(subject); i++; }
  if (grade && grade !== '全部') { sql += ` AND grade = $${i}`; params.push(grade); i++; }
  if (search) { sql += ` AND title ILIKE $${i}`; params.push(`%${search}%`); i++; }
  sql += ` ORDER BY sort_order LIMIT 500`;

  const courses = await query(sql, params);
  const subjects = await query(`SELECT DISTINCT subject FROM platform_courses WHERE is_published = TRUE ORDER BY subject`);
  const grades = ['小学','初中','高中','大学','通用'];

  return NextResponse.json({ courses, subjects: subjects.map((s: any) => s.subject), grades });
}
