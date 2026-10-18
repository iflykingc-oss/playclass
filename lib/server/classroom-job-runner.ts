import { createLogger } from '@/lib/logger';
import {
  generateClassroom,
  type GenerateClassroomInput,
  type GenerateClassroomResult,
} from '@/lib/server/classroom-generation';
import {
  markClassroomGenerationJobFailed,
  markClassroomGenerationJobRunning,
  markClassroomGenerationJobSucceeded,
  updateClassroomGenerationJob,
  updateClassroomGenerationJobProgress,
} from '@/lib/server/classroom-job-store';

const log = createLogger('ClassroomJob');
const runningJobs = new Map<string, Promise<GenerateClassroomResult | null>>();

/**
 * Runs the generation job. Resolves with the result on success, or `null` when
 * the job failed (failure is persisted on the job store either way).
 */
export function runClassroomGenerationJob(
  jobId: string,
  input: GenerateClassroomInput,
  baseUrl: string,
): Promise<GenerateClassroomResult | null> {
  const existing = runningJobs.get(jobId);
  if (existing) {
    return existing;
  }

  const jobPromise = (async () => {
    try {
      await markClassroomGenerationJobRunning(jobId);

      const result = await generateClassroom(input, {
        baseUrl,
        onProgress: async (progress) => {
          await updateClassroomGenerationJobProgress(jobId, progress);
        },
        onOutlineCheckpoint: async (outlines) => {
          // WP1.3: crash-resume point for the long scene loop.
          await updateClassroomGenerationJob(jobId, { checkpointOutlines: outlines });
        },
      });

      await markClassroomGenerationJobSucceeded(jobId, result);
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      log.error(`Classroom generation job ${jobId} failed:`, error);
      try {
        await markClassroomGenerationJobFailed(jobId, message);
      } catch (markFailedError) {
        log.error(`Failed to persist failed status for job ${jobId}:`, markFailedError);
      }
      return null;
    } finally {
      runningJobs.delete(jobId);
    }
  })();

  runningJobs.set(jobId, jobPromise);
  return jobPromise;
}
