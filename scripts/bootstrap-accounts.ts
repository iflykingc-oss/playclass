/**
 * Bootstrap local/dev accounts with known passwords.
 *
 * Usage:
 *   DEV_SEED_ACCOUNTS=1 \
 *   ADMIN_BOOTSTRAP_PASSWORD=Admin123! \
 *   TEST_USER_PASSWORD=Test123456! \
 *   pnpm tsx scripts/bootstrap-accounts.ts
 *
 * Creates (idempotent):
 *   - super-admin  admin@playclass.com
 *   - test user    test@user.com
 *   - demo org owner  org@playclass.com  (org "演示机构", 5 seats)
 *
 * Never run with production passwords committed to the repo — pass them via env.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { randomBytes, scryptSync } from 'crypto';

try {
  const env = readFileSync(join(process.cwd(), '.env.local'), 'utf-8');
  for (const line of env.split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m && !process.env[m[1].trim()]) {
      process.env[m[1].trim()] = m[2].trim();
    }
  }
} catch {
  /* .env.local optional */
}

const { Pool } = require('pg');

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function newId(prefix: string): string {
  return prefix + randomBytes(10).toString('base64url');
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL not set');
    process.exit(1);
  }

  const adminPassword = process.env.ADMIN_BOOTSTRAP_PASSWORD || 'Admin123!dev';
  const userPassword = process.env.TEST_USER_PASSWORD || 'Test123456!dev';
  const orgPassword = process.env.ORG_USER_PASSWORD || 'Org123456!dev';

  const pool = new Pool({ connectionString });

  // Schema first
  const schema = readFileSync(join(process.cwd(), 'platform/db/schema.sql'), 'utf-8');
  await pool.query(schema);
  try {
    const courses = readFileSync(join(process.cwd(), 'platform/db/courses-schema.sql'), 'utf-8');
    await pool.query(courses);
  } catch {
    /* optional */
  }

  // --- super-admin ---
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@playclass.com';
  const existingAdmin = await pool.query(`SELECT id FROM platform_admins WHERE email = $1`, [adminEmail]);
  if (existingAdmin.rows.length > 0) {
    // Reset password so local credentials stay predictable
    await pool.query(`UPDATE platform_admins SET password_hash = $2 WHERE email = $1`, [
      adminEmail,
      hashPassword(adminPassword),
    ]);
    console.log(`✓ Admin password reset: ${adminEmail}`);
  } else {
    await pool.query(
      `INSERT INTO platform_admins (id, email, password_hash) VALUES ($1, $2, $3)`,
      [newId('admin_'), adminEmail, hashPassword(adminPassword)],
    );
    console.log(`✓ Admin created: ${adminEmail}`);
  }

  // --- helper: upsert a platform user ---
  async function upsertUser(email: string, name: string, password: string, accountType: string) {
    const existing = await pool.query(`SELECT id FROM platform_users WHERE LOWER(email) = LOWER($1)`, [email]);
    if (existing.rows.length > 0) {
      const id = existing.rows[0].id;
      await pool.query(
        `UPDATE platform_users SET password_hash = $2, name = $3, account_type = $4 WHERE id = $1`,
        [id, hashPassword(password), name, accountType],
      );
      await pool.query(`INSERT INTO platform_quotas (user_id) VALUES ($1) ON CONFLICT DO NOTHING`, [id]);
      return id as string;
    }
    const id = newId('usr_');
    await pool.query(
      `INSERT INTO platform_users (id, email, password_hash, name, account_type)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, email, hashPassword(password), name, accountType],
    );
    await pool.query(`INSERT INTO platform_quotas (user_id) VALUES ($1) ON CONFLICT DO NOTHING`, [id]);
    return id;
  }

  // --- test user ---
  const testEmail = process.env.TEST_USER_EMAIL || 'test@user.com';
  await upsertUser(testEmail, '测试用户', userPassword, 'personal');
  console.log(`✓ Test user ready: ${testEmail}`);

  // --- demo org owner ---
  const orgEmail = process.env.ORG_USER_EMAIL || 'org@playclass.com';
  const orgUserId = await upsertUser(orgEmail, '机构管理员', orgPassword, 'org');
  const existingOrg = await pool.query(`SELECT id FROM platform_orgs WHERE owner_user_id = $1`, [orgUserId]);
  if (existingOrg.rows.length === 0) {
    const orgId = newId('org_');
    await pool.query(
      `INSERT INTO platform_orgs (id, name, plan, seat_count, owner_user_id)
       VALUES ($1, $2, 'enterprise_yearly', 5, $3)`,
      [orgId, '演示机构', orgUserId],
    );
    await pool.query(`UPDATE platform_users SET org_id = $2 WHERE id = $1`, [orgUserId, orgId]);
    console.log(`✓ Demo org created (5 seats, enterprise_yearly)`);
  } else {
    console.log(`✓ Demo org already exists`);
  }

  // --- payment config placeholder (empty keys → checkout returns 503 until filled) ---
  for (const key of ['zpay_pid', 'zpay_key', 'zpay_api_url']) {
    await pool.query(
      `INSERT INTO platform_payment_config (key, value) VALUES ($1, '') ON CONFLICT (key) DO NOTHING`,
      [key],
    );
  }

  await pool.end();

  console.log('\n========== 本地测试账号 ==========');
  console.log(`超管后台   ${adminEmail}`);
  console.log(`           密码: ${adminPassword}`);
  console.log(`           入口: http://localhost:3000/admin/login`);
  console.log('');
  console.log(`普通用户   ${testEmail}`);
  console.log(`           密码: ${userPassword}`);
  console.log(`           入口: http://localhost:3000/auth/login`);
  console.log('');
  console.log(`机构用户   ${orgEmail}`);
  console.log(`           密码: ${orgPassword}`);
  console.log(`           机构: 演示机构（5 席位 / enterprise_yearly）`);
  console.log('==================================');
  console.log('\n⚠️  以上为本地开发默认口令，生产环境请用环境变量覆盖后重新运行本脚本。');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
