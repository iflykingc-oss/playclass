# Platform Layer

This directory contains all business logic layered on top of the upstream OpenMAIC engine.
It is intentionally isolated so that `git subtree pull` / `git merge upstream/main` stays painless.

## Directory layout

```
platform/
├── db/           # Database schema + connection
│   ├── schema.sql    # platform_users/orgs/sessions, billing, plans, orders, shares, MCP keys
│   ├── courses-schema.sql
│   └── client.ts     # Postgres pool + ensurePlatformSchema()
├── auth/         # User registration, login, sessions, throttle
│   ├── index.ts      # hashPassword, createUser, verifyLogin, createSession, resolvePlatformOwnerId
│   └── throttle.ts   # login/register rate limiting
├── billing/      # Plans, quota & usage tracking
│   └── index.ts      # getQuota (plan-aware), recordUsage, applyPlanPurchase, updatePlanConfig
├── admin/        # Super-admin session auth
│   └── auth.ts       # isAdminSession
├── catalog/      # Legacy hardcoded catalog (prefer platform_courses table)
├── share/        # Course publishing & sharing
└── lib/          # platform helpers (tts-sanitizer)
```

## Billing model

Generation caps are **count-based** and **admin-configurable** via `platform_plans`:

| plan id | gens/month | AI video clips | MP4 exports | CNY | USD | period |
|---|---|---|---|---|---|---|
| `free` | 3 | 0 | 0 | 0 | 0 | — |
| `pro_monthly` | 40 | 20 | 20 | 39 | 9.99 | 30d |
| `pro_plus_monthly` | 100 | 60 | 60 | 79 | 19.99 | 30d |
| `enterprise_yearly` | 200 | 100 | unlimited | 999 | 149 | 365d |

Two different "video" meters — do not mix them:
- **AI video clips** (`video_clip`): Seedance / Kling / Veo / MiniMax / Grok text-to-video
  snippets embedded in scenes. Metered per clip written to the media dir.
- **MP4 exports** (`video_export`): classroom → MP4 via `render-service` (Chromium+FFmpeg).
  Metered when the render service accepts the job.

Effective limit for a user (first match wins):
1. `platform_users.quota_override` / `video_clip_override` / `video_export_override`
2. `platform_users.plan` if not expired (personal subscription)
3. `platform_orgs.plan` (org members)
4. `free`

Payment (ZPay) marks the order `paid` and applies the grant:
- `kind=plan` → `applyPlanPurchase` (sets `plan` + `plan_expires_at`; same-plan renewals stack)
- `kind=product` → `applyProductPurchase` (adds prepaid units to `bonus_video_clips` / `bonus_video_exports`)

Add-on SKUs (`platform_products`): `video_pack_20`, `video_pack_50`, `export_pack_20`.
Pack bonus does **not** reset monthly — it is consumed only after the plan allowance is spent.

## Organization seats (`platform/orgs`)

- Org accounts create a `platform_orgs` row at register (owner occupies 1 seat).
- Owner can add already-registered users by email, or issue an invite token for
  users who have not registered yet (`platform_org_invites`).
- `seat_count` is enforced on add/invite. Owners may only **shrink** seats;
  expanding seats is an admin action (so it cannot dodge enterprise billing).
- All members share `org:<orgId>` as OpenMAIC ownerId (one course space).
- Quota for members resolves from `platform_orgs.plan` (see Billing above).

## Upstream files we modify (minimal patches)

Only these upstream files are changed. Everything else stays untouched so upstream merges are clean:

| File | Change | Why |
|---|---|---|
| `middleware.ts` | Replaced ACCESS_CODE gate with platform session cookie check | Auth |
| `lib/server/agent-runtime/with-owner.ts` | Resolve platform ownerId before falling back to anonymous | Multi-tenant |

The 63 call sites that use `withRequestOwnerId` automatically get platform auth — no per-route changes needed.

## Owner ID format

- Logged-in personal user: `user:<userId>`
- Logged-in org member: `org:<orgId>` (all members of one org share the same course space)
- Not logged in (share links): falls back to upstream `anon:<uuid>` cookie

## Upgrade strategy

1. Add upstream as a git remote: `git remote add upstream https://github.com/THU-MAIC/OpenMAIC.git`
2. Pull regularly: `git fetch upstream && git merge upstream/main`
3. Resolve conflicts only in the two patched files listed above
4. Our `platform/` directory and `app/api/auth/`, `app/auth/` are new files — they never conflict

## Environment variables (in addition to upstream)

```env
DATABASE_URL=postgres://user:pass@localhost:5432/openmaic
# LLM/TTS/ASR config is managed by super-admin in the admin panel, not by end users
```
