/**
 * Platform DB client — thin wrapper around the existing Postgres pool.
 * Reuses DATABASE_URL from OpenMAIC config; runs our business schema on boot.
 */
import { Pool } from 'pg';
import { promises as fs } from 'fs';
import path from 'path';

let pool: Pool | null = null;
let schemaRan = false;

export function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL is required for platform features');
    }
    pool = new Pool({ connectionString, max: 10 });
  }
  return pool;
}

export async function query<T = Record<string, unknown>>(
  text: string,
  params?: unknown[],
): Promise<T[]> {
  const client = await getPool().connect();
  try {
    const result = await client.query(text, params);
    return result.rows as T[];
  } finally {
    client.release();
  }
}

/** Run our business schema. Idempotent — safe to call on every boot. */
export async function ensurePlatformSchema(): Promise<void> {
  if (schemaRan) return;
  const schemaPath = path.join(process.cwd(), 'platform', 'db', 'schema.sql');
  const sql = await fs.readFile(schemaPath, 'utf-8');
  await query(sql);

  // Course catalog table lives in a separate file; also idempotent.
  try {
    const coursesPath = path.join(process.cwd(), 'platform', 'db', 'courses-schema.sql');
    const coursesSql = await fs.readFile(coursesPath, 'utf-8');
    await query(coursesSql);
  } catch {
    // optional until courses catalog is deployed
  }

  schemaRan = true;
}
