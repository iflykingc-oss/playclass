import { NextResponse } from 'next/server';
import { resolvePlatformOwnerId } from '@/platform/auth';
import { recordQualityEvent, type QualityCategory } from '@/platform/quality';

const ALLOWED_CATEGORIES = new Set<QualityCategory>([
  'tts',
  'interactive',
  'generation',
  'export',
  'media',
  'auth',
  'billing',
  'system',
]);

/**
 * Quality telemetry (M0 / admin audit). Records success AND failure without
 * blocking the UI. Client debounces; table is the durable source for /admin.
 */
export async function POST(request: Request) {
  let body: {
    kind?: string;
    category?: string;
    event?: string;
    outcome?: string;
    reason?: string;
    sceneId?: string;
    stageId?: string;
    jobId?: string;
    message?: string;
    meta?: Record<string, unknown>;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Accept both the earlier `kind` vocabulary and the richer category/event pair.
  const category = (body.category || body.kind || 'interactive') as QualityCategory;
  if (!ALLOWED_CATEGORIES.has(category)) {
    return NextResponse.json({ error: 'Unknown category' }, { status: 400 });
  }

  const legacyKind = body.kind || body.event || 'interactive_error';
  const event = body.event || legacyKind;
  let outcome = body.outcome || 'failure';
  if (!['success', 'failure', 'degraded', 'skipped'].includes(outcome)) {
    outcome = 'failure';
  }

  let userId: string | null = null;
  try {
    const { user } = await resolvePlatformOwnerId(request);
    userId = user?.id ?? null;
  } catch {
    userId = null;
  }

  await recordQualityEvent({
    userId,
    stageId: body.stageId ?? body.sceneId ?? null,
    jobId: body.jobId ?? null,
    category,
    event,
    outcome: outcome as 'success' | 'failure' | 'degraded' | 'skipped',
    reason: body.reason || body.message || '',
    meta: {
      ...(body.meta || {}),
      ...(body.sceneId ? { sceneId: body.sceneId } : {}),
      ...(body.message ? { message: body.message.slice(0, 300) } : {}),
    },
  });

  return NextResponse.json({ ok: true, recorded: userId != null });
}
