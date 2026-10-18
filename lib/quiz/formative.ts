/**
 * WP2.3 formative assessment loop:
 *   quiz submit → diagnose wrong items → ask teacher to reteach (help ladder)
 *   → optional unaided re-check.
 */
import type { QuestionResult } from '@/lib/quiz/grading';
import type { QuizQuestion } from '@/lib/types/stage';

export interface FormativeDiagnosis {
  correctCount: number;
  incorrectCount: number;
  totalCount: number;
  wrongQuestionIds: string[];
  wrongSummaries: string[];
  scorePct: number;
  needsReteach: boolean;
}

export function diagnoseQuizResults(
  questions: QuizQuestion[],
  results: QuestionResult[],
): FormativeDiagnosis {
  const byId = new Map(questions.map((q) => [q.id, q]));
  const wrong = results.filter((r) => r.status === 'incorrect');
  const wrongSummaries = wrong.map((r) => {
    const q = byId.get(r.questionId) as
      | { question?: string; prompt?: string; title?: string }
      | undefined;
    const title = q?.question || q?.prompt || q?.title || r.questionId;
    return String(title).slice(0, 80);
  });
  const total = results.length || questions.length;
  const correct = results.filter((r) => r.status === 'correct').length;
  return {
    correctCount: correct,
    incorrectCount: wrong.length,
    totalCount: total,
    wrongQuestionIds: wrong.map((r) => r.questionId),
    wrongSummaries,
    scorePct: total > 0 ? Math.round((correct / total) * 100) : 0,
    needsReteach: wrong.length > 0,
  };
}

/**
 * Build a teacher prompt that respects the teaching contract (help ladder,
 * hold-answer) instead of asking for a free solution dump.
 */
export function buildReteachPrompt(diag: FormativeDiagnosis, locale: string = 'zh-CN'): string {
  const zh = locale.toLowerCase().startsWith('zh');
  if (!diag.needsReteach) {
    return zh ? '这次测验都对了，帮我出一道稍难的无辅助小测巩固一下。' : 'I got them all right. Give me one slightly harder unaided check.';
  }
  const list = diag.wrongSummaries.slice(0, 5).map((s, i) => `${i + 1}. ${s}`).join('；');
  if (zh) {
    return (
      `我刚才的测验错了 ${diag.incorrectCount} 道（正确 ${diag.correctCount}/${diag.totalCount}）。` +
      `相关题目：${list}。` +
      `请针对这些错题辅导我：先用帮助阶梯（提示→中间步骤→最后再给解），不要直接给我完整答案；` +
      `等我尝试后，再出一道无辅助小测检查我是否真正掌握。`
    );
  }
  return (
    `I missed ${diag.incorrectCount} of ${diag.totalCount} on the quiz just now (wrong: ${list}). ` +
    `Coach me with a help ladder (hint → intermediate step → full solution last); do not dump the answer. ` +
    `After I try, give me one unaided check question to verify I actually learned it.`
  );
}

/** Custom event used to hand a reteach request to the classroom chat UI. */
export const RETEACH_EVENT = 'maic:formative-reteach';

export function dispatchReteachRequest(prompt: string, meta: Record<string, unknown> = {}): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent(RETEACH_EVENT, {
      detail: { prompt, ...meta },
    }),
  );
}
