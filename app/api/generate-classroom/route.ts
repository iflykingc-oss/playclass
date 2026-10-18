import { after, type NextRequest } from 'next/server';
import { nanoid } from 'nanoid';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { type GenerateClassroomInput } from '@/lib/server/classroom-generation';
import { runClassroomGenerationJob } from '@/lib/server/classroom-job-runner';
import { createClassroomGenerationJob } from '@/lib/server/classroom-job-store';
import { buildRequestOrigin } from '@/lib/server/classroom-storage';
import { createLogger } from '@/lib/logger';
import { resolvePlatformOwnerId } from '@/platform/auth';
import { getQuota, recordUsage } from '@/platform/billing';
import { recordQualityEvent } from '@/platform/quality';
import { buildSourceGroundingContract } from '@/lib/server/grounding-contract';
import { getServerVideoProviders, resolveVideoApiKey } from '@/lib/server/provider-config';

const log = createLogger('GenerateClassroom API');

export const maxDuration = 30;

type PdfContent = NonNullable<GenerateClassroomInput['pdfContent']>;

function isValidPdfContent(value: unknown): value is PdfContent {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  const { text, images } = value as { text?: unknown; images?: unknown };
  return (
    typeof text === 'string' &&
    Array.isArray(images) &&
    images.every((item) => typeof item === 'string')
  );
}

export async function POST(req: NextRequest) {
  let requirementSnippet: string | undefined;
  try {
    const rawBody = (await req.json()) as Partial<GenerateClassroomInput>;
    requirementSnippet = rawBody.requirement?.substring(0, 60);
    const pdfContent = rawBody.pdfContent;

    if (pdfContent !== undefined && !isValidPdfContent(pdfContent)) {
      return apiError(
        'INVALID_REQUEST',
        400,
        'Invalid pdfContent: expected { text: string; images: string[] }',
      );
    }

    const body: GenerateClassroomInput = {
      requirement: rawBody.requirement || '',
      ...(pdfContent !== undefined ? { pdfContent } : {}),

      ...(rawBody.enableWebSearch != null ? { enableWebSearch: rawBody.enableWebSearch } : {}),
      ...(rawBody.webSearchProviderId ? { webSearchProviderId: rawBody.webSearchProviderId } : {}),
      ...(rawBody.webSearchApiKey ? { webSearchApiKey: rawBody.webSearchApiKey } : {}),
      ...(rawBody.webSearchModelId ? { webSearchModelId: rawBody.webSearchModelId } : {}),
      ...(rawBody.baiduSubSources ? { baiduSubSources: rawBody.baiduSubSources } : {}),
      ...(rawBody.enableImageGeneration != null
        ? { enableImageGeneration: rawBody.enableImageGeneration }
        : {}),
      ...(rawBody.enableVideoGeneration != null
        ? { enableVideoGeneration: rawBody.enableVideoGeneration }
        : {}),
      ...(rawBody.enableTTS != null ? { enableTTS: rawBody.enableTTS } : {}),
      ...(rawBody.agentMode ? { agentMode: rawBody.agentMode } : {}),
    };

    // Platform: inject source-grounding instructions when user provides a PDF
    body.requirement = `${body.requirement}

${buildSourceGroundingContract(Boolean(pdfContent?.text))}`;
    const { requirement } = body;

    if (!requirement) {
      return apiError('MISSING_REQUIRED_FIELD', 400, 'Missing required field: requirement');
    }

    // Platform: check quota for logged-in users; gate AI video by clip budget
    // and by whether any video provider is actually configured.
    const { user } = await resolvePlatformOwnerId(req as Request);
    let videoAllowed = body.enableVideoGeneration === true;
    if (user) {
      const quota = await getQuota(user.id);
      if (quota.monthlyLimit !== -1 && quota.remaining <= 0) {
        return apiError('RATE_LIMITED', 402, 'Monthly course generation limit reached', JSON.stringify(quota));
      }
      if (videoAllowed && quota.videoClips.limit !== -1 && quota.videoClips.remaining <= 0) {
        // Soft-disable: course still generates, without burning the generation on a no-video run.
        videoAllowed = false;
        body.enableVideoGeneration = false;
        log.warn(`Video clips exhausted for ${user.id}, generating without AI video`);
      }
    }

    // No usable video provider → never advertise video generation to the outline model.
    if (videoAllowed) {
      const videoProviders = Object.entries(getServerVideoProviders()).filter(([, info]) => !info.disabled);
      const hasVideoProvider = videoProviders.some(([id]) => !!resolveVideoApiKey(id));
      if (!hasVideoProvider) {
        videoAllowed = false;
        body.enableVideoGeneration = false;
        log.warn('No video provider configured, generating without AI video');
      }
    }

    const baseUrl = buildRequestOrigin(req);
    const jobId = nanoid(10);
    const job = await createClassroomGenerationJob(jobId, body);
    const pollUrl = `${baseUrl}/api/generate-classroom/${jobId}`;

    after(async () => {
      const result = await runClassroomGenerationJob(jobId, body, baseUrl);
      // Record usage after generation completes (only on success)
      if (user && result) {
        try {
          await recordUsage(user.id, 'course_generate', 1, { jobId, requirement: requirementSnippet });
          const clips = result.videoClipsGenerated ?? 0;
          if (clips > 0) {
            await recordUsage(user.id, 'video_clip', clips, { jobId });
          }
          // Durable quality log: voice lock + TTS outcome + fallback reasons.
          if (result.ttsCoverage) {
            const cov = result.ttsCoverage;
            await recordQualityEvent({
              userId: user.id,
              jobId,
              stageId: result.id,
              category: 'tts',
              event: 'tts_voice_lock',
              outcome: 'success',
              reason: 'classroom voice locked',
              meta: { providerId: cov.providerId, voice: cov.voice, total: cov.total, written: cov.written },
            });
            if (cov.written < cov.total) {
              await recordUsage(user.id, 'tts_failure', cov.total - cov.written, {
                jobId,
                providerId: cov.providerId,
                voice: cov.voice,
              });
              await recordQualityEvent({
                userId: user.id,
                jobId,
                stageId: result.id,
                category: 'tts',
                event: 'tts_degraded',
                outcome: 'degraded',
                reason:
                  cov.failures?.[0]?.reason ||
                  `silent_clips:${cov.total - cov.written}`,
                meta: {
                  providerId: cov.providerId,
                  voice: cov.voice,
                  written: cov.written,
                  total: cov.total,
                  failures: cov.failures?.slice(0, 20) ?? [],
                },
              });
            } else {
              await recordQualityEvent({
                userId: user.id,
                jobId,
                stageId: result.id,
                category: 'tts',
                event: 'tts_complete',
                outcome: 'success',
                reason: '',
                meta: {
                  providerId: cov.providerId,
                  voice: cov.voice,
                  written: cov.written,
                  total: cov.total,
                },
              });
            }
          }
          // Scene-level generation failures (WP1.3)
          if (rawBody.pdfContent?.text) {
            await recordQualityEvent({
              userId: user.id,
              jobId,
              stageId: result.id,
              category: 'generation',
              event: 'grounded_generation',
              outcome: result.failedScenes?.length ? 'degraded' : 'success',
              reason: result.failedScenes?.length ? 'grounded_with_skipped_scenes' : 'source_anchored',
              meta: {
                hasSourceMaterial: true,
                scenesCount: result.scenesCount,
                failedScenes: (result.failedScenes || []).length,
              },
            });
          }
          if (result.failedScenes?.length) {
            await recordQualityEvent({
              userId: user.id,
              jobId,
              stageId: result.id,
              category: 'generation',
              event: 'scene_skipped',
              outcome: 'failure',
              reason: `${result.failedScenes.length} scene(s) failed`,
              meta: { failedScenes: result.failedScenes.slice(0, 20) },
            });
          } else {
            await recordQualityEvent({
              userId: user.id,
              jobId,
              stageId: result.id,
              category: 'generation',
              event: 'job_succeeded',
              outcome: 'success',
              reason: '',
              meta: { scenesCount: result.scenesCount, videoClips: result.videoClipsGenerated ?? 0 },
            });
          }
        } catch (e) {
          log.warn('Failed to record usage:', e);
        }
      }
    });

    return apiSuccess(
      {
        jobId,
        status: job.status,
        step: job.step,
        message: job.message,
        pollUrl,
        pollIntervalMs: 5000,
      },
      202,
    );
  } catch (error) {
    log.error(
      `Classroom generation job creation failed [requirement="${requirementSnippet ?? 'unknown'}..."]:`,
      error,
    );
    return apiError(
      'INTERNAL_ERROR',
      500,
      'Failed to create classroom generation job',
      error instanceof Error ? error.message : 'Unknown error',
    );
  }
}
