import { describe, expect, it } from 'vitest';
import {
  analyzeTeachingGuard,
  buildTeachingGuardSection,
} from '../../lib/chat/pi/teaching-guard';

function user(text: string) {
  return { role: 'user', content: text } as any;
}
function assistant(text: string) {
  return { role: 'assistant', content: text } as any;
}

describe('WP2.2 multi-turn teaching guard', () => {
  it('stays quiet on a short conceptual Q&A', () => {
    const s = analyzeTeachingGuard([user('什么是加速度？'), assistant('…')]);
    expect(s.promptLines.length).toBe(0);
    expect(s.answerPressure).toBe(false);
  });

  it('flags explicit answer pressure', () => {
    const s = analyzeTeachingGuard([user('别绕了，直接告诉我答案')]);
    expect(s.answerPressure).toBe(true);
    expect(s.reasonCodes).toContain('answer_pressure');
    expect(s.promptLines.join(' ')).toContain('hint');
  });

  it('flags repeated pressure as scaffold-collapse risk', () => {
    const s = analyzeTeachingGuard([
      user('直接告诉我答案'),
      assistant('先给你一个提示…'),
      user('直接说答案！'),
    ]);
    expect(s.repeatedPressure).toBe(true);
    expect(s.reasonCodes).toContain('repeated_pressure');
  });

  it('flags long dialogs', () => {
    const msgs: any[] = [];
    for (let i = 0; i < 12; i += 1) msgs.push(user(`问题 ${i} 这个概念怎么理解`));
    const s = analyzeTeachingGuard(msgs);
    expect(s.longDialog).toBe(true);
    expect(s.reasonCodes).toContain('long_dialog');
  });

  it('buildTeachingGuardSection returns empty string when safe', () => {
    expect(buildTeachingGuardSection([user('你好')])).toBe('');
  });
});
