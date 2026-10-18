/**
 * One-time setup script: runs platform schema and creates the first super-admin.
 *
 * Usage: pnpm tsx scripts/setup-platform.ts
 */
import { readFileSync } from 'fs';
import { join } from 'path';

// Load .env.local
try {
  const env = readFileSync(join(process.cwd(), '.env.local'), 'utf-8');
  for (const line of env.split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m && !process.env[m[1].trim()]) {
      process.env[m[1].trim()] = m[2].trim();
    }
  }
} catch {}

const { Pool } = require('pg');
const { scryptSync, randomBytes } = require('crypto');

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL not set in .env.local');
    process.exit(1);
  }

  const pool = new Pool({ connectionString });

  // Run schema
  console.log('Running platform schema…');
  const schema = readFileSync(join(process.cwd(), 'platform/db/schema.sql'), 'utf-8');
  await pool.query(schema);
  console.log('✓ Schema ready');

  // Create default admin if not exists. Password comes from ADMIN_BOOTSTRAP_PASSWORD
  // or is randomly generated (never a fixed default).
  const existing = await pool.query(`SELECT id FROM platform_admins WHERE email = 'admin@platform.com'`);
  if (existing.rows.length > 0) {
    console.log('✓ Admin already exists: admin@platform.com');
  } else {
    const bootstrapPassword = process.env.ADMIN_BOOTSTRAP_PASSWORD || randomBytes(12).toString('base64url');
    const id = 'admin_' + randomBytes(8).toString('base64url');
    await pool.query(
      `INSERT INTO platform_admins (id, email, password_hash) VALUES ($1, $2, $3)`,
      [id, 'admin@platform.com', hashPassword(bootstrapPassword)],
    );
    if (process.env.ADMIN_BOOTSTRAP_PASSWORD) {
      console.log('✓ Created admin from ADMIN_BOOTSTRAP_PASSWORD: admin@platform.com');
    } else {
      console.log('✓ Created admin: admin@platform.com');
      console.log(`  One-time password: ${bootstrapPassword}`);
      console.log('  ⚠  Save this now — it will not be shown again. Change it after first login.');
    }
  }

  await pool.end();
  console.log('\nDone. Start the app with: pnpm dev');
}

main().catch((e) => { console.error(e); process.exit(1); });
