/**
 * Platform-level TTS text sanitizer.
 * Removes LaTeX markup from narration text so TTS engines don't
 * read out raw TeX commands like "frac" or "sqrt".
 */

/** Common LaTeX math patterns → spoken Chinese equivalents */
const LATEX_REPLACEMENTS: [RegExp, string][] = [
  // \frac{a}{b} → a/b spoken as "b分之a"
  [/\\frac\{([^}]*)\}\{([^}]*)\}/g, '$2分之$1'],
  // \sqrt{x} → "根号下x"
  [/\\sqrt\{([^}]*)\}/g, '根号下$1'],
  // x^n → "x的n次方"
  [/\^(\w+|\([^)]*\))/g, '的$1次方'],
  // x_n → "x下标n"
  [/_(\w+|\{[^}]*\})/g, '下标$1'],
  // \times → "乘以"
  [/\\times/g, '乘以'],
  // \div → "除以"
  [/\\div/g, '除以'],
  // \pm → "正负"
  [/\\pm/g, '正负'],
  // \pi → "派"
  [/\\pi/g, '派'],
  // \alpha → "阿尔法"
  [/\\alpha/g, '阿尔法'],
  // \beta → "贝塔"
  [/\\beta/g, '贝塔'],
  // \Delta → "德尔塔"
  [/\\Delta/g, '德尔塔'],
  // \theta → "西塔"
  [/\\theta/g, '西塔'],
  // \sin → "正弦"
  [/\\sin/g, '正弦'],
  // \cos → "余弦"
  [/\\cos/g, '余弦'],
  // \tan → "正切"
  [/\\tan/g, '正切'],
  // \lim → "极限"
  [/\\lim/g, '极限'],
  // \int → "积分"
  [/\\int/g, '积分'],
  // \sum → '求和'
  [/\\sum/g, '求和'],
  // \infty → "无穷大"
  [/\\infty/g, '无穷大'],
  // \approx → "约等于"
  [/\\approx/g, '约等于'],
  // \leq → "小于等于"
  [/\\leq/g, '小于等于'],
  // \geq → "大于等于"
  [/\\geq/g, '大于等于'],
  // \neq → "不等于"
  [/\\neq/g, '不等于'],
  // \neq → "不等于"
  [/\\neq/g, '不等于'],
  // \cdot → "点"
  [/\\cdot/g, '点'],
  // \rightarrow → "箭头"
  [/\\rightarrow/g, '箭头'],
  // \Rightarrow → "推出"
  [/\\Rightarrow/g, '推出'],
  // \in → "属于"
  [/\\in/g, '属于'],
  // \subset → "包含于"
  [/\\subset/g, '包含于'],
  // \cup → "并集"
  [/\\cup/g, '并集'],
  // \cap → "交集"
  [/\\cap/g, '交集'],
  // \forall → "任意"
  [/\\forall/g, '任意'],
  // \exists → "存在"
  [/\\exists/g, '存在'],
  // \partial → "偏导"
  [/\\partial/g, '偏导'],
  // \nabla → "梯度"
  [/\\nabla/g, '梯度'],
  // \rightarrow → "箭头"
  [/\\rightarrow/g, '箭头'],
];

/** Strip remaining LaTeX commands and braces */
const LATEX_CLEANUP: RegExp[] = [
  /\\[a-zA-Z]+/g,     // remaining \command
  /[{}]/g,             // braces
  /\$/g,               // dollar signs
];

export function sanitizeForTTS(text: string): string {
  if (!text) return text;
  let result = text;

  // Apply known replacements first
  for (const [pattern, replacement] of LATEX_REPLACEMENTS) {
    result = result.replace(pattern, replacement);
  }

  // Clean up remaining LaTeX artifacts
  for (const pattern of LATEX_CLEANUP) {
    result = result.replace(pattern, '');
  }

  // Normalize whitespace
  result = result.replace(/\s+/g, ' ').trim();

  return result;
}
