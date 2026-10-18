import { describe, expect, it } from 'vitest';
import { retryMaterialUpload } from '../../lib/workbench/material-upload-scheduling';

function err(status: number, message = 'fail') {
  return Object.assign(new Error(message), { status });
}

describe('WP1.4 material upload retry hygiene', () => {
  it('does not retry 429 quota / rate-limit', async () => {
    let calls = 0;
    const sleep = async () => {};
    await expect(
      retryMaterialUpload(
        async () => {
          calls += 1;
          throw err(429, 'MaterialQuotaExceededError');
        },
        sleep,
      ),
    ).rejects.toThrow();
    expect(calls).toBe(1);
  });

  it('retries 503 at most twice more than the first attempt', async () => {
    let calls = 0;
    const sleep = async () => {};
    await expect(
      retryMaterialUpload(
        async () => {
          calls += 1;
          throw err(503, 'upstream');
        },
        sleep,
      ),
    ).rejects.toThrow();
    expect(calls).toBe(3);
  });

  it('returns immediately on success', async () => {
    const out = await retryMaterialUpload(async () => 'ok');
    expect(out).toBe('ok');
  });
});
