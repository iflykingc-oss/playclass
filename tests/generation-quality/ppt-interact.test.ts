import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildPptInteractRequirement } from '../../lib/server/ppt-interact';

describe('WP2.6 PPT one-click interactive conversion', () => {
  it('keeps original structure and demands quizzes', () => {
    const r = buildPptInteractRequirement({
      fileName: '高等数学第三章.pptx',
      slideText: '第三章 导数\n一、导数定义\n二、求导法则',
      locale: 'zh-CN',
    });
    expect(r).toContain('高等数学第三章');
    expect(r).toContain('不要推倒重写');
    expect(r).toContain('测验');
    expect(r).toContain('导数定义');
    expect(r).toContain('资料未涵盖');
  });

  it('supports English locale', () => {
    const r = buildPptInteractRequirement({
      fileName: 'calculus.pptx',
      slideText: 'Derivatives',
      locale: 'en-US',
    });
    expect(r).toContain('do not rewrite');
    expect(r).toContain('quiz');
  });

  it('client hook and dashboard entry exist', () => {
    const hook = readFileSync(join(ROOT(), 'lib/import/use-ppt-to-classroom.tsx'), 'utf-8');
    expect(hook).toContain('buildPptInteractRequirement');
    expect(hook).toContain('/api/generate-classroom');
    const dash = readFileSync(join(ROOT(), 'app/dashboard/page.tsx'), 'utf-8');
    expect(dash).toContain('usePptToClassroom');
    // UI copy may be unicode-escaped for encoding safety
    expect(dash).toMatch(/PPT \\u8F6C|PPT 转|pptStart/);
  });
});

function ROOT() {
  return process.cwd();
}
