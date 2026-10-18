import { describe, expect, it } from 'vitest';
import { formatOutcome, formatQualityReason, formatCategory } from '../../lib/i18n/quality-reason';

describe('失败原因本地化（与页面语言一致）', () => {
  it('中文页面显示中文原因', () => {
    expect(formatQualityReason('rate_limit_retries_exhausted', 'zh-CN')).toContain('限流');
    expect(formatQualityReason('retry_after_exceeds_budget:3000ms', 'zh-CN')).toContain('预算');
    expect(formatQualityReason('TypeError: Cannot read properties of undefined', 'zh-CN')).toContain('合成失败');
    expect(formatOutcome('degraded', 'zh-CN')).toBe('降级');
    expect(formatCategory('tts', 'zh-CN')).toBe('语音合成');
  });

  it('英文页面显示英文原因', () => {
    expect(formatQualityReason('rate_limit_retries_exhausted', 'en-US')).toContain('Rate limited');
    expect(formatQualityReason('retry_after_exceeds_budget:3000ms', 'en-US')).toContain('Retry-After');
    expect(formatOutcome('failure', 'en-US')).toBe('Failure');
    expect(formatCategory('generation', 'en-US')).toBe('Generation');
  });

  it('未知原因原样透传，不丢信息', () => {
    expect(formatQualityReason('weird_custom_code', 'zh-CN')).toBe('weird_custom_code');
  });
});
