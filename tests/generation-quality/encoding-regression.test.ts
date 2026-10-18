/**
 * Encoding regression gate: classic mojibake sequences must never ship in UI sources.
 * (PowerShell/Set-Content historically corrupted UTF-8 Chinese into these tokens.)
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
// Mojibake fragments that appeared in shipped UI (not normal Chinese).
const BAD = /锛鍒|涓枃|璁㈠崟|鍔犺浇|鏈烘瀯|璐拱|璐拱|閰嶇疆|鍟嗗搧/;

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '.next' || name === 'dist') continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (/\.(tsx?|jsx?|json)$/.test(name)) out.push(p);
  }
  return out;
}

describe('UI encoding regression', () => {
  it('app/components/lib contain no classic mojibake tokens', () => {
    const files = [...walk(join(ROOT, 'app')), ...walk(join(ROOT, 'components')), ...walk(join(ROOT, 'lib'))];
    const hits: string[] = [];
    for (const f of files) {
      const text = readFileSync(f, 'utf-8');
      if (BAD.test(text)) {
        const line = text.split('\n').find((l) => BAD.test(l)) || '';
        hits.push(`${f.replace(ROOT, '')}: ${line.trim().slice(0, 100)}`);
      }
    }
    expect(hits, hits.join('\n')).toEqual([]);
  });

  it('dashboard currency is yen sign not garbled', () => {
    const t = readFileSync(join(ROOT, 'app/dashboard/page.tsx'), 'utf-8');
    expect(t).toContain('\\u00A5');
    expect(t).not.toMatch(/currencySymbol = isZh \? '楼'/);
    expect(t).toContain("isZh ? '购买' : 'Buy'");
  });

  it('brand is playclass not OpenMAIC lockup', () => {
    const brand = readFileSync(join(ROOT, 'lib/brand/brand-config.ts'), 'utf-8');
    expect(brand).toContain("productName: 'playclass'");
    expect(brand).toContain('playclass-logo.svg');
  });
});
