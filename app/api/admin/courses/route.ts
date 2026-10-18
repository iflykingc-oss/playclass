import { NextResponse } from 'next/server';
import { query } from '@/platform/db/client';
import { isAdminSession } from '@/platform/admin/auth';

export async function DELETE(request: Request) {
  if (!(await isAdminSession(request))) {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'missing id' }, { status: 400 });
  await query('DELETE FROM platform_courses WHERE id = $1', [id]);
  return NextResponse.json({ ok: true });
}
