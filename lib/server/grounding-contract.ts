/**
 * WP2.4 fact-grounding contract for generations backed by uploaded materials.
 * Research (EduGuard): course-grounded RAG + claim-level verification cuts
 * hallucination (~4.9%) and lifts post-test scores. These instructions are
 * injected into the generation requirement when `pdfContent.text` is present.
 */

export function buildTeachingNarrationRule(): string {
  return (
    '[教学指令] 语音旁白中不要出现 LaTeX 公式代码，数学公式用口语化方式表达' +
    '（如「二分之一」而非「\\frac{1}{2}」）。'
  );
}

export function buildSourceGroundingContract(hasSourceMaterial: boolean): string {
  if (!hasSourceMaterial) {
    return buildTeachingNarrationRule();
  }
  return [
    '[重要教学指令｜资料事实锚定]',
    '本课程基于用户上传的资料生成。请严格执行：',
    '1) 所有事实性论点、定理、数据、定义必须锚定上传资料中的内容，禁止编造。',
    '2) 资料未覆盖的内容必须明确标注「（资料未涵盖，模型补充）」，不得伪装成资料结论。',
    '3) 关键结论处用括号标注来源片段序号或页内定位，例如「（参见资料第 3 节）」「（资料 p.12）」。',
    '4) 若资料与常识冲突，以资料为准，并在文中标注「（以上传资料为准）」。',
    '5) 测验题的正确答案必须能在资料中找到依据；没有依据的题不要生成。',
    '6) ' + buildTeachingNarrationRule(),
  ].join('\n');
}

/**
 * Light structural check on generated slide text: when the run was grounded,
 * claim markers should appear at least once. Used as a soft quality signal
 * (not a hard reject — pedagogy beats checkbox compliance).
 */
export function evaluateGroundingMarkers(text: string, grounded: boolean): {
  hasSourceCitation: boolean;
  hasUncoveredMarker: boolean;
  suggestion: string;
} {
  const hasSourceCitation = /参见|资料第|资料 p\.|以上传资料为准|see (source|p\.)/i.test(text);
  const hasUncoveredMarker = /资料未涵盖|资料未覆盖|模型补充|not covered (in|by) (the )?source/i.test(text);
  let suggestion = '';
  if (grounded && !hasSourceCitation) {
    suggestion = 'missing_source_citation';
  } else if (grounded && !hasUncoveredMarker) {
    suggestion = 'consider_uncovered_marker';
  }
  return { hasSourceCitation, hasUncoveredMarker, suggestion };
}
