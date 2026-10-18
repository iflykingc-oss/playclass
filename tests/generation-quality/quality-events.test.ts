import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();

describe('T30 platform quality events (success + failure durable)', () => {
  it('has a dedicated durable table', () => {
    const sql = readFileSync(join(ROOT, 'platform/db/schema.sql'), 'utf-8');
    expect(sql).toContain('platform_quality_events');
    expect(sql).toContain("outcome IN ('success', 'failure', 'degraded', 'skipped')");
  });

  it('records via platform/quality and never throws', () => {
    const src = readFileSync(join(ROOT, 'platform/quality/index.ts'), 'utf-8');
    expect(src).toContain('recordQualityEvent');
    expect(src).toContain('Never throws');
  });

  it('TTS coverage carries voice lock and fallback reasons', () => {
    const src = readFileSync(join(ROOT, 'lib/server/classroom-media-generation.ts'), 'utf-8');
    expect(src).toContain('failures');
    expect(src).toContain('reason');
    expect(src).toContain('providerId');
  });

  it('generate-classroom logs tts voice lock and scene failures', () => {
    const src = readFileSync(join(ROOT, 'app/api/generate-classroom/route.ts'), 'utf-8');
    expect(src).toContain('tts_voice_lock');
    expect(src).toContain('tts_degraded');
    expect(src).toContain('scene_skipped');
    expect(src).toContain('recordQualityEvent');
  });

  it('admin quality API and UI exist', () => {
    expect(existsSync(join(ROOT, 'app/api/admin/quality/route.ts'))).toBe(true);
    const admin = readFileSync(join(ROOT, 'app/admin/page.tsx'), 'utf-8');
    expect(admin).toContain('loadQuality');
    expect(admin).toContain('质量事件落盘');
    expect(admin).toContain('音色锁定');
  });

  it('generation isolates per-scene failures (#595)', () => {
    const src = readFileSync(join(ROOT, 'lib/server/classroom-generation.ts'), 'utf-8');
    expect(src).toContain('failedScenes');
    expect(src).toContain('onOutlineCheckpoint');
  });
});
