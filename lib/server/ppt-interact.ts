/**
 * WP2.6 PPT → interactive classroom (ClassPoint-style "don't rebuild your PPT").
 * Turns extracted slide text into a generation requirement that keeps the
 * original structure and adds quizzes / interactive elements.
 */
export function buildPptInteractRequirement(options: {
  fileName: string;
  slideText: string;
  locale?: string;
}): string {
  const zh = (options.locale || 'zh-CN').toLowerCase().startsWith('zh');
  const body = options.slideText.trim().slice(0, 12000);
  const name = options.fileName.replace(/\.(pptx?|ppt|pdf)$/i, '');
  if (zh) {
    return [
      `请将已有课件《${name}》改编为互动课堂（不要推倒重写）：`,
      '1. 保留原课件的章节顺序与核心知识点，不要增删主题；',
      '2. 每 1–2 个知识点配一个测验或互动练习（选择/判断/简答/模拟均可）；',
      '3. 为每个主要章节准备简短讲稿旁白（口语化，不用 LaTeX）；',
      '4. 不确定的事实标注「资料未涵盖」；',
      '5. 目标：教师上传原 PPT 后，30 分钟内得到可上课的互动版。',
      '',
      '—— 课件内容如下 ——',
      body || '（未解析到文本，请根据常见教学结构生成骨架并标注需教师核对）',
    ].join('\n');
  }
  return [
    `Adapt the existing deck "${name}" into an interactive classroom (do not rewrite from scratch):`,
    '1. Keep the original section order and core knowledge points.',
    '2. Add one quiz or interactive practice every 1–2 knowledge points.',
    '3. Write short spoken narration per major section (plain language, no LaTeX).',
    '4. Mark uncertain facts as "not covered in source".',
    '5. Goal: teacher uploads existing PPT and gets a teachable interactive version within 30 minutes.',
    '',
    '—— Deck content ——',
    body || '(no text extracted; generate a skeleton and mark items for teacher review)',
  ].join('\n');
}
