import { describe, expect, it } from 'vitest';
import { buildReteachPrompt, diagnoseQuizResults } from '../../lib/quiz/formative';
import type { QuestionResult } from '../../lib/quiz/grading';

const questions = [
  { id: 'q1', type: 'single', prompt: '什么是加速度？', options: [{ value: 'a', label: 'A' }], answer: 'a' },
  { id: 'q2', type: 'single', prompt: '力的单位是什么？', options: [{ value: 'n', label: 'N' }], answer: 'n' },
] as any;

const results: QuestionResult[] = [
  { questionId: 'q1', correct: false, status: 'incorrect', earned: 0 },
  { questionId: 'q2', correct: true, status: 'correct', earned: 1 },
];

describe('WP2.3 formative assessment loop', () => {
  it('diagnoses wrong items and flags reteach', () => {
    const d = diagnoseQuizResults(questions, results);
    expect(d.incorrectCount).toBe(1);
    expect(d.wrongQuestionIds).toContain('q1');
    expect(d.wrongSummaries[0]).toContain('加速度');
    expect(d.needsReteach).toBe(true);
    expect(d.scorePct).toBe(50);
  });

  it('reteach prompt uses help ladder and unaided check (zh)', () => {
    const d = diagnoseQuizResults(questions, results);
    const prompt = buildReteachPrompt(d, 'zh-CN');
    expect(prompt).toContain('帮助阶梯');
    expect(prompt).toContain('不要直接给我完整答案');
    expect(prompt).toContain('无辅助');
    expect(prompt).toContain('加速度');
  });

  it('all-correct path asks for unaided check', () => {
    const allOk = results.map((r) => ({ ...r, status: 'correct' as const, correct: true }));
    const d = diagnoseQuizResults(questions, allOk);
    expect(d.needsReteach).toBe(false);
    expect(buildReteachPrompt(d, 'en-US').toLowerCase()).toContain('unaided');
  });
});
