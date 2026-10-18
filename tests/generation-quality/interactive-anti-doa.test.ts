/**
 * WP1.1 anti-DOA contracts: broken interactive scripts must never fail silently.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { findInteractiveScriptSyntaxFailure } from '../../packages/@openmaic/generation/src/interactive-script-validator.js';

const ROOT = process.cwd();

describe('WP1.1 interactive anti-DOA', () => {
  it('rejects classic scripts with syntax errors', () => {
    const html = `<html><body><button id="go">Start</button>
<script>function startSimulation() { const counts = ; }</script>
</body></html>`;
    const failure = findInteractiveScriptSyntaxFailure(html);
    expect(failure, 'must detect invalid inline JS').toBeTruthy();
    expect(failure?.message).toBeTruthy();
  });

  it('accepts valid interactive scripts', () => {
    const html = `<html><body><button id="go">Start</button>
<script>document.getElementById('go').onclick = function () { document.title = 'ok'; };</script>
</body></html>`;
    expect(findInteractiveScriptSyntaxFailure(html)).toBeNull();
  });

  it('runtime error banner exposes reload + copy for operators', () => {
    const path = join(ROOT, 'components/scene-renderers/InteractiveRuntimeErrorBanner.tsx');
    expect(existsSync(path)).toBe(true);
    const src = readFileSync(path, 'utf-8');
    expect(src).toContain('interactive-runtime-error-reload');
    expect(src).toContain('interactive-runtime-error-copy');
    expect(src).toContain('mayBeUnresponsive');
  });

  it('iframe host reports quality telemetry and can reload the document', () => {
    const path = join(ROOT, 'components/scene-renderers/InteractiveIframeHost.tsx');
    const src = readFileSync(path, 'utf-8');
    expect(src).toContain('/api/quality/events');
    expect(src).toContain('onReload');
    expect(src).toContain('interactive_error');
  });

  it('quality events API accepts interactive_error', () => {
    const path = join(ROOT, 'app/api/quality/events/route.ts');
    const src = readFileSync(path, 'utf-8');
    expect(src).toContain('interactive_error');
    expect(src).toContain('recordQualityEvent');
  });

  it('generation path still rejects unusable interactive HTML', () => {
    const path = join(ROOT, 'packages/@openmaic/generation/src/scene-generator.ts');
    const src = readFileSync(path, 'utf-8');
    expect(src).toContain('findInteractiveScriptSyntaxFailure');
    expect(src).toContain('invalid-model-output');
  });
});
