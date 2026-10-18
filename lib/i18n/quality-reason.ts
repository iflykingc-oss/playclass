/**
 * Localized display for quality / failure reasons.
 * Machine codes stay stable in the DB; the UI always shows the active page locale.
 */

export type ReasonLocale = 'zh-CN' | 'en-US' | string;

interface ReasonText {
  zh: string;
  en: string;
}

/** Known machine reasons (from TTS / generation / interactive / retry paths). */
const REASON_TEXTS: Record<string, ReasonText> = {
  rate_limit_retries_exhausted: {
    zh: '接口限流，重试次数已用尽',
    en: 'Rate limited; retry attempts exhausted',
  },
  rate_limit_backoff_budget_exhausted: {
    zh: '限流退避时间用尽，后续旁白改为文字展示',
    en: 'Rate-limit back-off budget exhausted; remaining narration shown as text',
  },
  classroom_voice_locked: {
    zh: '本课已锁定统一音色',
    en: 'Classroom voice locked to a single voice',
  },
  'MaterialQuotaExceededError': {
    zh: '素材配额已用尽',
    en: 'Material quota exceeded',
  },
  'ChatStorageLockUnavailableError': {
    zh: '聊天存储暂时被占用，稍后自动重试',
    en: 'Chat storage is temporarily locked; will retry',
  },
  invalid_model_output: {
    zh: '模型输出无效，已跳过该页',
    en: 'Invalid model output; this scene was skipped',
  },
  'invalid-model-output': {
    zh: '模型输出无效，已跳过该页',
    en: 'Invalid model output; this scene was skipped',
  },
  'prompt-unavailable': {
    zh: '生成提示词不可用，已跳过该页',
    en: 'Generation prompt unavailable; this scene was skipped',
  },
  stale_job: {
    zh: '任务超时或进程重启，生成中断',
    en: 'Job timed out or process restarted; generation interrupted',
  },
  archive_too_large: {
    zh: '导出压缩包过大',
    en: 'Export archive is too large',
  },
  queue_full: {
    zh: '渲染队列已满，请稍后重试',
    en: 'Render queue is full; retry later',
  },
  per_identity_limit: {
    zh: '并发导出已达上限，请稍后重试',
    en: 'Too many concurrent exports; retry later',
  },
  render_service_accepted_job: {
    zh: '渲染服务已接收导出任务',
    en: 'Render service accepted the export job',
  },
  render_service_rejected: {
    zh: '渲染服务拒绝了导出请求',
    en: 'Render service rejected the export request',
  },
};

function isZhLocale(locale: string): boolean {
  return locale.toLowerCase().startsWith('zh');
}

/** Translate a structured reason prefix like `retry_after_exceeds_budget:3000ms`. */
export function formatQualityReason(reason: string, locale: ReasonLocale = 'zh-CN'): string {
  const raw = (reason || '').trim();
  if (!raw) return isZhLocale(locale) ? '—' : '—';

  const zh = isZhLocale(locale);

  // `key:detail` form
  const colon = raw.indexOf(':');
  if (colon > 0) {
    const head = raw.slice(0, colon);
    const detail = raw.slice(colon + 1);
    if (head === 'retry_after_exceeds_budget') {
      return zh
        ? `限流等待超过预算（${detail}），该段旁白改为文字`
        : `Retry-After exceeds budget (${detail}); clip shown as text`;
    }
    if (head === 'rate_limit_retries_exhausted') {
      return zh ? '接口限流，重试次数已用尽' : 'Rate limited; retry attempts exhausted';
    }
  }

  // exact code
  const hit = REASON_TEXTS[raw] || REASON_TEXTS[raw.replace(/^Error:/, '')];
  if (hit) return zh ? hit.zh : hit.en;

  // `ErrorName:message` from TTS catch path
  if (/^[A-Za-z]+Error:/.test(raw)) {
    const msg = raw.replace(/^[A-Za-z]+Error:/, '').trim();
    if (zh) return msg ? `合成失败：${msg}` : '合成失败';
    return msg ? `Synthesis failed: ${msg}` : 'Synthesis failed';
  }

  // HTTP / status style
  if (/^429\b/.test(raw)) return zh ? '请求过于频繁（429）' : 'Too many requests (429)';
  if (/^503\b/.test(raw)) return zh ? '服务暂时不可用（503）' : 'Service temporarily unavailable (503)';

  // Fallback: pass through (still show something useful)
  return raw;
}

/** Human label for a quality event outcome. */
export function formatOutcome(outcome: string, locale: ReasonLocale = 'zh-CN'): string {
  const zh = isZhLocale(locale);
  switch (outcome) {
    case 'success':
      return zh ? '成功' : 'Success';
    case 'failure':
      return zh ? '失败' : 'Failure';
    case 'degraded':
      return zh ? '降级' : 'Degraded';
    case 'skipped':
      return zh ? '跳过' : 'Skipped';
    default:
      return outcome;
  }
}

/** Human label for quality category. */
export function formatCategory(category: string, locale: ReasonLocale = 'zh-CN'): string {
  const zh = isZhLocale(locale);
  const map: Record<string, { zh: string; en: string }> = {
    tts: { zh: '语音合成', en: 'TTS' },
    interactive: { zh: '互动页', en: 'Interactive' },
    generation: { zh: '课程生成', en: 'Generation' },
    export: { zh: '导出', en: 'Export' },
    media: { zh: '媒体', en: 'Media' },
    auth: { zh: '认证', en: 'Auth' },
    billing: { zh: '计费', en: 'Billing' },
    system: { zh: '系统', en: 'System' },
  };
  const hit = map[category];
  return hit ? (zh ? hit.zh : hit.en) : category;
}

/** Human label for TTS clip failure reason. */
export function formatTtsFailureReason(reason: string, locale: ReasonLocale = 'zh-CN'): string {
  return formatQualityReason(reason, locale);
}
