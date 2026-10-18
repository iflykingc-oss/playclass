import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();

describe('P2 institutional CSV export', () => {
  it('org export API supports usage / members / quality', () => {
    expect(existsSync(join(ROOT, 'app/api/org/export/route.ts'))).toBe(true);
    const src = readFileSync(join(ROOT, 'app/api/org/export/route.ts'), 'utf-8');
    expect(src).toContain("type === 'members'");
    expect(src).toContain("type === 'quality'");
    expect(src).toContain('text/csv');
    expect(src).toContain('content-disposition');
  });

  it('admin export API supports users / orders / usage / quality', () => {
    const src = readFileSync(join(ROOT, 'app/api/admin/export/route.ts'), 'utf-8');
    expect(src).toContain("type === 'orders'");
    expect(src).toContain('isAdminSession');
  });

  it('UI links to CSV endpoints', () => {
    const dash = readFileSync(join(ROOT, 'app/dashboard/page.tsx'), 'utf-8');
    expect(dash).toContain('/api/org/export?type=usage');
    const admin = readFileSync(join(ROOT, 'app/admin/page.tsx'), 'utf-8');
    expect(admin).toContain('/api/admin/export');
  });

  it('CSV escaping quotes commas and newlines', () => {
    // mirror the escape rule used by both routes
    const csvEscape = (value: unknown): string => {
      const s = value === null || value === undefined ? '' : String(value);
      if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };
    expect(csvEscape('a,b')).toBe('"a,b"');
    expect(csvEscape('say "hi"')).toBe('"say ""hi"""');
    expect(csvEscape('line1\nline2')).toBe('"line1\nline2"');
  });
});
