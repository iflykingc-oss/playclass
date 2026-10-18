import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();

describe('WP2.5 teacher difficulty / curriculum tags', () => {
  it('SceneOutline supports teacherDifficulty and curriculumTags', () => {
    const src = readFileSync(
      join(ROOT, 'packages/@openmaic/generation/src/outline-types.ts'),
      'utf-8',
    );
    expect(src).toContain('teacherDifficulty');
    expect(src).toContain('curriculumTags');
    expect(src).toContain('Easy Trap');
  });

  it('outline editor exposes difficulty + tags controls', () => {
    const src = readFileSync(join(ROOT, 'components/generation/outlines-editor.tsx'), 'utf-8');
    expect(src).toContain('teacherDifficulty');
    expect(src).toContain('curriculumTags');
  });

  it('generation injects teacher annotation into scene description', () => {
    const src = readFileSync(join(ROOT, 'lib/server/classroom-generation.ts'), 'utf-8');
    expect(src).toContain('withTeacherDifficultyHint');
    expect(src).toContain('以教师标注为准');
    expect(src).toContain('课标/教材标签');
  });
});
