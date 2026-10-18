import { NextResponse } from 'next/server';
import { isAdminSession } from '@/platform/admin/auth';
import { reloadServerProviders } from '@/lib/server/provider-config';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * Read/write server-providers.yml — the source of truth for model config.
 * Super-admin edits this via the web UI; end users never see provider settings.
 */
const PROVIDERS_FILE = path.join(process.cwd(), 'server-providers.yml');

export async function GET(request: Request) {
  if (!(await isAdminSession(request))) {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }
  try {
    const content = await fs.readFile(PROVIDERS_FILE, 'utf-8');
    return NextResponse.json({ config: content });
  } catch {
    return NextResponse.json({ config: '# No providers configured yet\nproviders:\n' });
  }
}

export async function PUT(request: Request) {
  if (!(await isAdminSession(request))) {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }
  const body = await request.json();
  if (typeof body.config !== 'string') {
    return NextResponse.json({ error: 'config must be a string' }, { status: 400 });
  }
  await fs.writeFile(PROVIDERS_FILE, body.config, 'utf-8');
  reloadServerProviders();
  return NextResponse.json({ ok: true });
}
