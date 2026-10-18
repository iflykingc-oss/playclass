import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();

describe('WP2.1 AI teacher teaching contract', () => {
  const src = readFileSync(join(ROOT, 'lib/chat/pi/prompts.ts'), 'utf-8');

  it('defines a teaching contract used by child prompts', () => {
    expect(src).toContain('buildTeachingContract');
    expect(src).toContain('Teaching contract (CRITICAL)');
    expect(src).toContain('ANSWER THAT QUESTION FIRST');
  });

  it('includes help ladder and hold-answer for exercises', () => {
    expect(src).toContain('HELP LADDER');
    expect(src).toContain('hold-answer');
  });

  it('is injected into both legacy and native child prompts', () => {
    const hits = src.match(/buildTeachingContract\(agent\.role\)/g) || [];
    expect(hits.length).toBeGreaterThanOrEqual(2);
  });

  it('teacher role forbids replaying the slide before the answer', () => {
    expect(src).toContain('do not restart the slide narration');
  });
});
