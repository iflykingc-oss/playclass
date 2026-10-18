/**
 * WP2.2 multi-turn teaching guard.
 *
 * Research (SafeTutors / scaffold-collapse): pedagogical failures rise sharply
 * in long dialogs — answer over-disclosure and abandoned scaffolding under
 * student pressure. This module inspects chat history and injects extra
 * constraints into the teacher prompt for the current turn.
 */
import type { AgentMessage } from '@earendil-works/pi-agent-core';
import type { StatelessChatRequest } from '@/lib/types/chat';

export interface TeachingGuardSignal {
  /** Conversation is getting long — higher risk of silent learning erosion. */
  longDialog: boolean;
  /** User is explicitly demanding a direct answer. */
  answerPressure: boolean;
  /** User repeated a similar demand more than once. */
  repeatedPressure: boolean;
  /** Looks like an exercise / homework task. */
  exerciseLikely: boolean;
  /** Extra prompt lines to inject (empty = no special guard). */
  promptLines: string[];
  /** Short reason code for quality telemetry. */
  reasonCodes: string[];
}

const PRESSURE_PATTERNS = [
  /直接(告诉我|说)?答案/i,
  /别绕了|少废话|废话少说|别废话/i,
  /就(告诉|说)我(答案|结果|怎么做)/i,
  /直接(说|给)(结果|解)/i,
  /give (me )?(the )?(answer|solution) (directly|now|please)/i,
  /just tell me (the )?(answer|solution)/i,
  /don'?t explain/i,
  /skip (the )?hints/i,
];

const EXERCISE_PATTERNS = [
  /作业|练习|习题|考题|试卷|帮我(做|算|解)/i,
  /答案是多少|怎么解|怎么做这道/i,
  /homework|problem set|solve this|assignment/i,
];

function isUserMessage(message: AgentMessage): boolean {
  const role = (message as { role?: string }).role;
  return role === 'user';
}

function messageText(message: AgentMessage): string {
  const content = (message as { content?: unknown }).content;
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === 'string') return part;
        if (part && typeof part === 'object' && 'text' in part) {
          return String((part as { text: unknown }).text ?? '');
        }
        return '';
      })
      .join(' ');
  }
  return '';
}

function normalize(text: string): string {
  return text.replace(/\s+/g, ' ').trim().toLowerCase();
}

/** Rough similarity: share of the shorter string's chars present as bigrams. */
function similar(a: string, b: string): boolean {
  if (a.length < 4 || b.length < 4) return a === b;
  const short = a.length <= b.length ? a : b;
  const long = a.length <= b.length ? b : a;
  let hits = 0;
  for (let i = 0; i < short.length - 1; i += 1) {
    if (long.includes(short.slice(i, i + 2))) hits += 1;
  }
  return hits / (short.length - 1) > 0.72;
}

export function analyzeTeachingGuard(messages: AgentMessage[]): TeachingGuardSignal {
  const userTexts = messages.filter(isUserMessage).map((m) => normalize(messageText(m)));
  const userTurns = userTexts.length;

  const lastThree = userTexts.slice(-3);
  const answerPressure = lastThree.some((t) => PRESSURE_PATTERNS.some((re) => re.test(t)));
  const exerciseLikely = userTexts.some((t) => EXERCISE_PATTERNS.some((re) => re.test(t)));

  let repeatedPressure = false;
  if (userTexts.length >= 2) {
    const a = userTexts[userTexts.length - 1];
    const b = userTexts[userTexts.length - 2];
    if (a && b && (similar(a, b) || (PRESSURE_PATTERNS.some((re) => re.test(a)) && PRESSURE_PATTERNS.some((re) => re.test(b))))) {
      repeatedPressure = true;
    }
  }

  const longDialog = userTurns >= 12;

  const promptLines: string[] = [];
  const reasonCodes: string[] = [];

  if (longDialog) {
    reasonCodes.push('long_dialog');
    promptLines.push(
      '- This conversation is long. Re-check the teaching contract before every answer: no full-solution dumps unless the user has already tried twice.',
      '- Avoid silent erosion of learning: do not gradually become an answer machine as the chat continues.',
    );
  }
  if (answerPressure) {
    reasonCodes.push('answer_pressure');
    promptLines.push(
      '- The user is pushing for a direct answer. Keep the help ladder: give ONE more hint level first (not the final result).',
      '- If they insist twice after hints, give only the final step in one short sentence, then ask them to explain why it is correct.',
    );
  }
  if (repeatedPressure) {
    reasonCodes.push('repeated_pressure');
    promptLines.push(
      '- The user repeated the demand. Do not abandon scaffolding — stay calm, one hint step, and only reveal the last step if they explicitly say they already tried.',
    );
  }
  if (exerciseLikely && answerPressure) {
    reasonCodes.push('exercise_pressure');
    promptLines.push(
      '- This looks like an exercise being pushed for a free answer. Prefer coaching over copy-paste solutions.',
    );
  }

  return {
    longDialog,
    answerPressure,
    repeatedPressure,
    exerciseLikely,
    promptLines,
    reasonCodes,
  };
}

export function buildTeachingGuardSection(messages: AgentMessage[]): string {
  const signal = analyzeTeachingGuard(messages);
  if (signal.promptLines.length === 0) return '';
  return ['# Multi-turn teaching guard (auto)', ...signal.promptLines].join('\n');
}

/** Messages from the stateless chat body (history + current). */
export function teachingGuardFromChatBody(body: StatelessChatRequest): string {
  return buildTeachingGuardSection((body.messages ?? []) as unknown as AgentMessage[]);
}
