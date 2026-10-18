import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildOfflinePlayerHtml, OFFLINE_PLAYER_README } from '../../lib/export/offline-player-template';

const ROOT = process.cwd();

describe('WP1.6 offline folder player (#1470)', () => {
  it('player HTML is self-contained (no CDN)', () => {
    const html = buildOfflinePlayerHtml('测试课');
    expect(html).toContain('manifest.json');
    expect(html).toContain('离线播放');
    expect(html).toContain('测试课');
    expect(html).not.toMatch(/https?:\/\/(cdn|unpkg|jsdelivr|cdnjs)/i);
  });

  it('classroom ZIP export embeds index.html and README', () => {
    const src = readFileSync(join(ROOT, 'lib/export/use-export-classroom.ts'), 'utf-8');
    expect(src).toContain("zip.file('index.html'");
    expect(src).toContain('buildOfflinePlayerHtml');
    expect(src).toContain('OFFLINE_PLAYER_README');
  });

  it('README tells teachers to double-click index.html', () => {
    expect(OFFLINE_PLAYER_README).toContain('index.html');
    expect(OFFLINE_PLAYER_README).toContain('离线');
  });
});
