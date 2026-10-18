# playclass

AI 互动课程生成 SaaS 平台，基于 OpenMAIC v1.1.0 二次开发。

## 功能

- 个人/机构账户（不做 SSO、不做组织架构）
- 三种导出：互动课件 / 互动视频 / 原版带 AI 老师课程
- 课程市场（300+ 结构化课程，覆盖 K12~大学~职业技能）
- MCP Server（在 ChatGPT/Claude/飞书机器人中调用）
- ZPay 易支付接入
- 超管后台（用户/模型/支付/订单/监控/课程管理）
- 中英文切换

## 技术栈

- Next.js 16 + React 19 + TypeScript
- PostgreSQL 16
- Tailwind CSS + shadcn/ui
- pnpm workspace

## 快速开始

```bash
pnpm install
# 配置环境变量 .env.local（至少 DATABASE_URL）
pnpm bootstrap:accounts   # 建表 + 创建本地测试账号（打印密码）
pnpm dev
```

### 本地测试账号（`pnpm bootstrap:accounts` 创建）

| 角色 | 邮箱 | 默认密码 | 入口 |
|---|---|---|---|
| 超管 | `admin@playclass.com` | `Admin123!dev` | `/admin/login` |
| 普通用户 | `test@user.com` | `Test123456!dev` | `/auth/login` |
| 机构用户 | `org@playclass.com` | `Org123456!dev` | `/auth/login`（演示机构 5 席位） |

生产请用环境变量覆盖：`ADMIN_BOOTSTRAP_PASSWORD` / `TEST_USER_PASSWORD` / `ORG_USER_PASSWORD`，再跑 `pnpm bootstrap:accounts`（幂等，会重置密码）。

### 部署

```bash
pnpm bootstrap:accounts
pnpm build && pnpm start

# 或 Docker
docker compose up -d
docker compose --profile video-export up -d   # MP4 渲染服务
```

### 生成质检

```bash
pnpm test:quality         # 离线质检门禁（无需模型 key，已进 CI）
pnpm eval:orchestration   # LLM 评测（需模型 key）
```

CI：`ci.yml` 跑单元测试；`eval-quality.yml` 跑离线质检，配置模型密钥后自动跑 LLM 评测。

## 项目结构

- `app/` — Next.js 应用（页面 + API 路由）
- `platform/` — 平台业务代码（DB、auth、计费）
- `packages/@openmaic/` — 上游核心包（dsl/storage/renderer/generation）
- `components/` — 共享组件
- `lib/` — 工具库

## 升级上游

上游 OpenMAIC 源码在 `upstream-openmaic/`（不在本仓库）。平台业务代码隔离在 `platform/` 和 `app/` 下的 wrapper 层，升级上游时只需 rebase 上游变更，不冲突。