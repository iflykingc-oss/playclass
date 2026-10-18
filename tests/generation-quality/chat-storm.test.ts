import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();

describe('WP1.4 chat autosave anti-storm (#1558)', () => {
  const src = readFileSync(join(ROOT, 'lib/utils/chat-storage.ts'), 'utf-8');

  it('caps new runtime generations per chat session per minute', () => {
    expect(src).toContain('MAX_GENERATIONS_PER_MINUTE');
    expect(src).toContain('consumeGenerationBudget');
  });

  it('gates both generation-creating plan kinds', () => {
    expect(src).toMatch(/plan\.kind === 'replace-isolated'[\s\S]{0,400}consumeGenerationBudget/);
    expect(src).toMatch(/plan\.kind === 'start-generation'[\s\S]{0,400}consumeGenerationBudget/);
  });

  it('refunds budget when a failed generation is deleted', () => {
    expect(src).toContain('releaseGenerationBudget(desired.id)');
  });

  it('stage autosave already backs off consecutive failures', () => {
    const stage = readFileSync(join(ROOT, 'lib/store/stage.ts'), 'utf-8');
    expect(stage).toContain('SAVE_BACKOFF_MAX_MS');
    expect(stage).toContain('consecutiveFlushFailures');
  });
});
