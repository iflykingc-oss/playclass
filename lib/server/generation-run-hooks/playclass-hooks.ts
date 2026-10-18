/**
 * Playclass generation run hooks: meters course generation for the platform's
 * billing/quota. Registered once from `instrumentation.ts` via
 * `configureGenerationRunHooks`. These are the v1.2.0 host extension points for
 * generation — the platform adds quota enforcement and usage metering without
 * forking the run engine.
 */
import type { GenerationRunHooks } from './types';
import type { GenerationStartContext } from './types';
import type { GenerationRunHookEvent } from './types';
import { platformUserIdFromOwnerId } from '@/lib/server/identity/playclass-owner-auth';

const log = typeof console !== 'undefined' ? console : null;

export const playclassGenerationHooks: GenerationRunHooks = {
  name: 'playclass-metering',

  /**
   * Refuse a start when the signed-in user is out of monthly generation quota.
   * The owner's run is admitted before its row is written; a refusal answers
   * 402 and no run is created. Anonymous owners (no platform session) are not
   * metered here — the platform gate requires login for generation.
   */
  async authorizeStart(context: GenerationStartContext): Promise<
    | { allow: true }
    | { allow: false; status: number; code: string; message: string }
  > {
    const userId = platformUserIdFromOwnerId(context.ownerId);
    if (!userId) return { allow: true };

    try {
      const { assertQuota } = await import('@/platform/billing');
      await assertQuota(userId);
      return { allow: true };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Monthly course generation limit reached';
      return {
        allow: false,
        status: 402,
        code: 'RATE_LIMITED',
        message,
      };
    }
  },

  /**
   * Record one `course_generate` usage unit when a run completes. Best effort:
   * the platform's own durable quality events remain the audit record; this
   * just keeps the monthly meter moving.
   */
  async onRunEvent(event: GenerationRunHookEvent): Promise<void> {
    if (event.type !== 'completed') return;
    const userId = platformUserIdFromOwnerId(event.currentOwnerId);
    if (!userId) return;
    try {
      const { recordUsage } = await import('@/platform/billing');
      await recordUsage(userId, 'course_generate', 1, {
        runId: event.runId,
        stageId: event.stageId,
      });
    } catch (error) {
      // Best-effort metering; never fail the request.
      log?.warn?.('[playclass-generation-hooks] failed to record usage', error);
    }
  },
};
