import { describe, expect, it } from 'vitest';
import {
  buildSourceGroundingContract,
  evaluateGroundingMarkers,
} from '../../lib/server/grounding-contract';

describe('WP2.4 fact grounding contract', () => {
  it('requires source anchoring and uncovered labels when materials exist', () => {
    const c = buildSourceGroundingContract(true);
    expect(c).toContain('资料事实锚定');
    expect(c).toContain('禁止编造');
    expect(c).toContain('资料未涵盖');
    expect(c).toContain('参见资料');
    expect(c).toContain('正确答案必须能在资料中找到依据');
  });

  it('keeps narration LaTeX rule even without materials', () => {
    const c = buildSourceGroundingContract(false);
    expect(c).toContain('LaTeX');
    expect(c).not.toContain('资料事实锚定');
  });

  it('detects citation / uncovered markers in generated text', () => {
    const good = evaluateGroundingMarkers('加速度定义（参见资料第 2 节）。其他（资料未涵盖，模型补充）。', true);
    expect(good.hasSourceCitation).toBe(true);
    expect(good.hasUncoveredMarker).toBe(true);
    expect(good.suggestion).toBe('');

    const weak = evaluateGroundingMarkers('随便说说。', true);
    expect(weak.suggestion).toBe('missing_source_citation');
  });
});
