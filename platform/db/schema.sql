-- ============================================================================
-- Platform Business Schema (independent of OpenMAIC core tables)
-- Run idempotently on startup. All tables use IF NOT EXISTS so re-running is safe.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Users: platform accounts (personal + org members)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS platform_users (
  id            TEXT PRIMARY KEY,              -- nanoid, becomes the OpenMAIC ownerId
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name          TEXT NOT NULL DEFAULT '',
  account_type  TEXT NOT NULL DEFAULT 'personal' CHECK (account_type IN ('personal', 'org')),
  org_id        TEXT,                          -- FK added after platform_orgs exists
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Organizations: institutional accounts
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS platform_orgs (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  plan            TEXT NOT NULL DEFAULT 'free'
                  CHECK (plan IN ('free', 'pro_monthly', 'pro_plus_monthly', 'enterprise', 'enterprise_yearly')),
  seat_count      INTEGER NOT NULL DEFAULT 1,
  owner_user_id   TEXT NOT NULL REFERENCES platform_users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add org_id FK after both tables exist
DO $$
BEGIN
  ALTER TABLE platform_users
    ADD CONSTRAINT platform_users_org_fk
    FOREIGN KEY (org_id) REFERENCES platform_orgs(id)
    NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- Sessions: server-side session store
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS platform_sessions (
  token       TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES platform_users(id),
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_agent  TEXT,
  ip          TEXT
);
CREATE INDEX IF NOT EXISTS idx_platform_sessions_user ON platform_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_platform_sessions_expires ON platform_sessions(expires_at);

-- ---------------------------------------------------------------------------
-- Usage / billing: metered generation
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS platform_usage (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES platform_users(id),
  org_id      TEXT REFERENCES platform_orgs(id),
  kind        TEXT NOT NULL CHECK (kind IN ('course_generate', 'video_clip', 'video_export', 'pptx_export', 'scene_edit')),
  credits     INTEGER NOT NULL DEFAULT 1,
  meta        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_platform_usage_user_time ON platform_usage(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_usage_org_time ON platform_usage(org_id, created_at DESC);

-- Quota snapshot per user (cached for fast reads; synced by billing job)
CREATE TABLE IF NOT EXISTS platform_quotas (
  user_id           TEXT PRIMARY KEY REFERENCES platform_users(id),
  monthly_generations INTEGER NOT NULL DEFAULT 5,    -- free tier: 5 courses/month
  used_generations    INTEGER NOT NULL DEFAULT 0,
  period_started_at   TIMESTAMPTZ NOT NULL DEFAULT DATE_TRUNC('month', NOW()),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Course publishing / sharing
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS platform_course_shares (
  id            TEXT PRIMARY KEY,
  stage_id      TEXT NOT NULL,                  -- OpenMAIC stageId
  owner_id      TEXT NOT NULL,                  -- OpenMAIC ownerId
  title         TEXT NOT NULL DEFAULT '',
  share_mode    TEXT NOT NULL DEFAULT 'none' CHECK (share_mode IN ('none', 'login')),
  -- none: anyone with link can view;  login: require platform login
  is_published  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_platform_shares_owner ON platform_course_shares(owner_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_platform_shares_stage ON platform_course_shares(stage_id);

DO $$
BEGIN
  ALTER TABLE platform_course_shares ADD COLUMN IF NOT EXISTS watermarked BOOLEAN NOT NULL DEFAULT FALSE;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- Learner runtime aggregation (dashboard)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS platform_learner_events (
  id          TEXT PRIMARY KEY,
  stage_id    TEXT NOT NULL,
  org_id      TEXT REFERENCES platform_orgs(id),
  learner_id  TEXT NOT NULL,                  -- anonymous cookie or logged-in user
  event_type  TEXT NOT NULL,                  -- 'page_view', 'quiz_submit', 'lesson_complete'
  meta        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_platform_learner_stage ON platform_learner_events(stage_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_learner_org ON platform_learner_events(org_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- Admin (super-user)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS platform_admins (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS platform_admin_sessions (
  token       TEXT PRIMARY KEY,
  admin_id    TEXT NOT NULL REFERENCES platform_admins(id),
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- MCP API keys
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS platform_mcp_keys (
  key         TEXT PRIMARY KEY,                -- sha256 of the raw secret
  key_prefix  TEXT NOT NULL DEFAULT '',        -- display-only prefix (first 12 chars of raw)
  user_id     TEXT NOT NULL REFERENCES platform_users(id),
  name        TEXT NOT NULL DEFAULT '',
  last_used_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked     BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX IF NOT EXISTS idx_platform_mcp_keys_user ON platform_mcp_keys(user_id);

DO $$
BEGIN
  ALTER TABLE platform_mcp_keys ADD COLUMN IF NOT EXISTS key_prefix TEXT NOT NULL DEFAULT '';
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- User plan (personal users; org members resolve via platform_orgs.plan)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  ALTER TABLE platform_users ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'free';
  ALTER TABLE platform_users ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMPTZ;
  ALTER TABLE platform_users ADD COLUMN IF NOT EXISTS quota_override INTEGER;
  ALTER TABLE platform_users ADD COLUMN IF NOT EXISTS disabled BOOLEAN NOT NULL DEFAULT FALSE;
  ALTER TABLE platform_users ADD COLUMN IF NOT EXISTS disabled_reason TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- Plans catalog: admin-configurable generation limits and dual-currency prices
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS platform_plans (
  id                  TEXT PRIMARY KEY,          -- free | pro_monthly | pro_plus_monthly | enterprise_yearly
  name_zh             TEXT NOT NULL,
  name_en             TEXT NOT NULL,
  monthly_generations INTEGER NOT NULL DEFAULT 5, -- -1 = unlimited
  monthly_video_clips INTEGER NOT NULL DEFAULT 0, -- AI video clips / month, -1 unlimited
  video_export_credits INTEGER NOT NULL DEFAULT 0, -- classroom→MP4 exports / month, -1 unlimited
  price_cny           NUMERIC(10,2) NOT NULL DEFAULT 0,
  price_usd           NUMERIC(10,2) NOT NULL DEFAULT 0,
  period_days         INTEGER NOT NULL DEFAULT 30,
  sort_order          INTEGER NOT NULL DEFAULT 0,
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  features_zh         JSONB NOT NULL DEFAULT '[]'::jsonb,
  features_en         JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  ALTER TABLE platform_plans ADD COLUMN IF NOT EXISTS monthly_video_clips INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE platform_plans ADD COLUMN IF NOT EXISTS video_export_credits INTEGER NOT NULL DEFAULT 0;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Per-user monthly counters for AI video clips and MP4 exports
DO $$
BEGIN
  ALTER TABLE platform_quotas ADD COLUMN IF NOT EXISTS used_video_clips INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE platform_quotas ADD COLUMN IF NOT EXISTS used_video_exports INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE platform_users ADD COLUMN IF NOT EXISTS video_clip_override INTEGER;
  ALTER TABLE platform_users ADD COLUMN IF NOT EXISTS video_export_override INTEGER;
  -- Prepaid add-on packs: persist until consumed, do NOT reset monthly.
  ALTER TABLE platform_users ADD COLUMN IF NOT EXISTS bonus_video_clips INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE platform_users ADD COLUMN IF NOT EXISTS bonus_video_exports INTEGER NOT NULL DEFAULT 0;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Widen usage.kind to include video_clip and quality telemetry (older DBs have a tighter CHECK)
DO $$
BEGIN
  ALTER TABLE platform_usage DROP CONSTRAINT IF EXISTS platform_usage_kind_check;
  ALTER TABLE platform_usage ADD CONSTRAINT platform_usage_kind_check
    CHECK (kind IN (
      'course_generate', 'video_clip', 'video_export', 'pptx_export', 'scene_edit',
      'interactive_error', 'tts_failure', 'generation_failure', 'export_failure'
    ));
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

INSERT INTO platform_plans (id, name_zh, name_en, monthly_generations, monthly_video_clips, video_export_credits, price_cny, price_usd, period_days, sort_order, features_zh, features_en) VALUES
  ('free', '免费版', 'Free', 3, 0, 0, 0, 0, 3650, 1,
   '["每月 3 次生成","基础互动课件导出","在线分享链接","社区支持"]'::jsonb,
   '["3 generations / month","Interactive courseware export","Online share links","Community support"]'::jsonb),
  ('pro_monthly', '专业版', 'Pro', 40, 20, 20, 39.00, 9.99, 30, 2,
   '["每月 40 次生成","AI 视频片段 20 条/月","互动视频导出 20 次/月","无水印分享","优先生成队列"]'::jsonb,
   '["40 generations / month","20 AI video clips / month","20 MP4 exports / month","Watermark-free share","Priority queue"]'::jsonb),
  ('pro_plus_monthly', '专业版 Plus', 'Pro+', 100, 60, 60, 79.00, 19.99, 30, 3,
   '["每月 100 次生成","AI 视频片段 60 条/月","互动视频导出 60 次/月","无水印分享","优先模型"]'::jsonb,
   '["100 generations / month","60 AI video clips / month","60 MP4 exports / month","Watermark-free share","Priority models"]'::jsonb),
  ('enterprise_yearly', '机构版', 'Team', 200, 100, -1, 999.00, 149.00, 365, 4,
   '["按席位计费","AI 视频片段 100 条/席/月","互动视频导出不限","机构共享课程库","API 接入"]'::jsonb,
   '["Per-seat billing","100 AI video clips / seat / mo","Unlimited MP4 exports","Shared org library","API access"]'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Widen org plan CHECK for the shipped plan catalog
DO $$
BEGIN
  ALTER TABLE platform_orgs DROP CONSTRAINT IF EXISTS platform_orgs_plan_check;
  ALTER TABLE platform_orgs ADD CONSTRAINT platform_orgs_plan_check
    CHECK (plan IN ('free', 'pro_monthly', 'pro_plus_monthly', 'enterprise', 'enterprise_yearly'));
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- Org invites (for members who have not registered yet)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS platform_org_invites (
  id          TEXT PRIMARY KEY,
  org_id      TEXT NOT NULL REFERENCES platform_orgs(id),
  email       TEXT NOT NULL,
  token       TEXT NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_org_invites_org ON platform_org_invites(org_id);
CREATE INDEX IF NOT EXISTS idx_org_invites_email ON platform_org_invites(email);

-- ---------------------------------------------------------------------------
-- Orders: ZPay (or future Stripe) checkout
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS platform_orders (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES platform_users(id),
  out_trade_no TEXT NOT NULL UNIQUE,
  trade_no    TEXT NOT NULL DEFAULT '',
  subject     TEXT NOT NULL DEFAULT '',
  plan        TEXT NOT NULL,                   -- plan id OR product SKU (video_pack_20, ...)
  kind        TEXT NOT NULL DEFAULT 'plan' CHECK (kind IN ('plan', 'product')),
  money       NUMERIC(10,2) NOT NULL,
  currency    TEXT NOT NULL DEFAULT 'CNY',
  type        TEXT NOT NULL DEFAULT 'alipay',
  status      TEXT NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending', 'paid', 'closed', 'refunded')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at     TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_platform_orders_user ON platform_orders(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_orders_status ON platform_orders(status);

DO $$
BEGIN
  ALTER TABLE platform_orders ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'plan';
  -- Older installs used name/pay_time/param; align to subject/paid_at/currency.
  ALTER TABLE platform_orders ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'CNY';
  ALTER TABLE platform_orders ADD COLUMN IF NOT EXISTS subject TEXT NOT NULL DEFAULT '';
  ALTER TABLE platform_orders ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
  -- Legacy `name` is NOT NULL; new code writes `subject` only.
  ALTER TABLE platform_orders ALTER COLUMN name DROP NOT NULL;
  ALTER TABLE platform_orders ALTER COLUMN name SET DEFAULT '';
  ALTER TABLE platform_orders ALTER COLUMN param SET DEFAULT '';
EXCEPTION WHEN undefined_column THEN NULL;
END $$;

-- Backfill subject/paid_at from legacy columns when present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'platform_orders' AND column_name = 'name'
  ) THEN
    EXECUTE 'UPDATE platform_orders SET subject = COALESCE(subject, ''''), subject = name WHERE subject = '''' AND name IS NOT NULL';
    EXECUTE 'UPDATE platform_orders SET paid_at = pay_time WHERE paid_at IS NULL AND pay_time IS NOT NULL';
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

-- One-off add-on SKUs (video clip packs, export packs)
CREATE TABLE IF NOT EXISTS platform_products (
  id              TEXT PRIMARY KEY,            -- video_pack_20 | video_pack_50 | export_pack_20
  name_zh         TEXT NOT NULL,
  name_en         TEXT NOT NULL,
  kind            TEXT NOT NULL CHECK (kind IN ('video_clips', 'video_exports')),
  units           INTEGER NOT NULL,            -- clips or exports granted
  price_cny       NUMERIC(10,2) NOT NULL,
  price_usd       NUMERIC(10,2) NOT NULL,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO platform_products (id, name_zh, name_en, kind, units, price_cny, price_usd, sort_order) VALUES
  ('video_pack_20', 'AI 视频包 20 条', 'AI Video Pack 20', 'video_clips', 20, 19.00, 4.99, 1),
  ('video_pack_50', 'AI 视频包 50 条', 'AI Video Pack 50', 'video_clips', 50, 39.00, 9.99, 2),
  ('export_pack_20', '视频导出包 20 次', 'Export Pack 20', 'video_exports', 20, 19.00, 4.99, 3)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Payment gateway config (zpay_pid / zpay_key / zpay_api_url / default_currency)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS platform_payment_config (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT ''
);

-- ---------------------------------------------------------------------------
-- Quality / platform events (success AND failure, always durable)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS platform_quality_events (
  id          TEXT PRIMARY KEY,
  user_id     TEXT,                          -- nullable: anonymous classroom shares
  stage_id    TEXT,
  job_id      TEXT,
  category    TEXT NOT NULL,                 -- tts | interactive | generation | export | media | auth | billing
  event       TEXT NOT NULL,                 -- tts_voice_lock | tts_clip_ok | tts_clip_failed | ...
  outcome     TEXT NOT NULL CHECK (outcome IN ('success', 'failure', 'degraded', 'skipped')),
  reason      TEXT NOT NULL DEFAULT '',      -- human-readable cause, e.g. rate-limit budget exhausted
  meta        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_quality_events_created ON platform_quality_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quality_events_cat ON platform_quality_events(category, event, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quality_events_user ON platform_quality_events(user_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- Org webhooks (institutional reports — ClassPoint-style raw JSON to customer endpoint)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS platform_org_webhooks (
  id          TEXT PRIMARY KEY,
  org_id      TEXT NOT NULL REFERENCES platform_orgs(id),
  url         TEXT NOT NULL,
  secret      TEXT NOT NULL DEFAULT '',
  events      TEXT NOT NULL DEFAULT 'learner_summary,usage_summary,quality_summary',
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  last_status INTEGER,
  last_error  TEXT,
  last_fired_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_org_webhooks_org ON platform_org_webhooks(org_id);

CREATE TABLE IF NOT EXISTS platform_org_webhook_deliveries (
  id          TEXT PRIMARY KEY,
  webhook_id  TEXT NOT NULL REFERENCES platform_org_webhooks(id),
  event       TEXT NOT NULL,
  status      INTEGER,
  error       TEXT,
  payload     JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries ON platform_org_webhook_deliveries(webhook_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- Auth attempt throttle (login / register / admin login)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS platform_auth_attempts (
  id         TEXT PRIMARY KEY,
  kind       TEXT NOT NULL,                 -- login | register | admin_login
  identifier TEXT NOT NULL,                 -- email or ip
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_auth_attempts_lookup
  ON platform_auth_attempts(kind, identifier, created_at DESC);
