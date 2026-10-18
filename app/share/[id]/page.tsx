import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { query } from '@/platform/db/client';

export default async function SharePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const rows = await query<{
    stage_id: string;
    share_mode: string;
    is_published: boolean;
  }>(
    `SELECT stage_id, share_mode, is_published FROM platform_course_shares WHERE id = $1`,
    [id],
  );

  if (rows.length === 0 || !rows[0].is_published) {
    return (
      <div style={{ maxWidth: 400, margin: '100px auto', textAlign: 'center' }}>
        <h1>Course not found</h1>
        <p style={{ color: '#666' }}>This link may have expired or been unpublished.</p>
      </div>
    );
  }

  const share = rows[0];

  // If login is required, check for a session cookie
  if (share.share_mode === 'login') {
    const cookieStore = await cookies();
    const hasSession = cookieStore.get('platform_session')?.value;
    if (!hasSession) {
      redirect(`/auth/login?redirect=/share/${id}`);
    }
  }

  redirect(`/classroom/${share.stage_id}?share=${id}`);
}
