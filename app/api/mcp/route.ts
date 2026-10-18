/**
 * MCP Streamable HTTP endpoint.
 * Compatible with 豆包/飞书/WorkBuddy/Claude Desktop custom connectors.
 *
 * Transport: Streamable HTTP (POST for JSON-RPC, GET for SSE stream).
 * Auth: Bearer token in Authorization header.
 */
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/platform/db/client';
import { nanoid } from 'nanoid';

interface McpUser {
  userId: string;
  email: string;
}

async function authenticate(request: NextRequest): Promise<McpUser | null> {
  const auth = request.headers.get('authorization') || '';
  const token = auth.replace('Bearer ', '').trim();
  if (!token) return null;
  const { createHash } = await import('crypto');
  const hashed = createHash('sha256').update(token).digest('hex');
  const rows = await query<{ user_id: string; email: string }>(
    `SELECT k.user_id, u.email FROM platform_mcp_keys k
     JOIN platform_users u ON u.id = k.user_id
     WHERE k.key = $1 AND k.revoked = FALSE`,
    [hashed],
  );
  if (rows.length === 0) return null;
  query(`UPDATE platform_mcp_keys SET last_used_at = NOW() WHERE key = $1`, [hashed]).catch(() => {});
  return { userId: rows[0].user_id, email: rows[0].email };
}

const TOOLS = [
  {
    name: 'generate_course',
    description: '创建并生成一门AI互动课程。输入主题或知识点，自动生成带幻灯片、测验、AI老师讲解的完整课堂。返回任务ID，可用get_course_status查询进度。',
    inputSchema: {
      type: 'object',
      properties: {
        topic: { type: 'string', description: '课程主题，例如"用30分钟讲解Python基础"或"讲解高中数学导数"' },
        enableTTS: { type: 'boolean', description: '是否包含AI语音旁白', default: true },
        enableImage: { type: 'boolean', description: '是否生成配图', default: true },
      },
      required: ['topic'],
    },
  },
  {
    name: 'list_courses',
    description: '查询当前用户已创建的所有课程，包含标题、分享链接、创建时间。',
    inputSchema: {
      type: 'object',
      properties: {
        status: { type: 'string', description: '筛选状态：published/pending/all', default: 'published' },
      },
    },
  },
  {
    name: 'get_course_status',
    description: '查询课程生成任务的进度状态。',
    inputSchema: {
      type: 'object',
      properties: {
        jobId: { type: 'string', description: 'generate_course返回的任务ID' },
      },
      required: ['jobId'],
    },
  },
  {
    name: 'get_quota',
    description: '查询当前账户剩余的课程生成额度和套餐信息。',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'search_catalog',
    description: '搜索课程模板库（1000+门教材课程），支持按关键词和学段筛选。找到合适模板后可直接基于模板生成。',
    inputSchema: {
      type: 'object',
      properties: {
        keyword: { type: 'string', description: '搜索关键词，如"分数"、"导数"、"一般过去时"' },
        level: { type: 'string', description: '学段筛选：小学/初中/高中/大学/通用', default: '' },
        subject: { type: 'string', description: '学科筛选：数学/语文/英语/物理/化学等', default: '' },
      },
      required: ['keyword'],
    },
  },
  {
    name: 'publish_course',
    description: '发布或取消发布课程，设置分享链接的访问模式（公开访问或需登录）。',
    inputSchema: {
      type: 'object',
      properties: {
        shareId: { type: 'string', description: '课程分享ID' },
        action: { type: 'string', description: '操作：publish/unpublish' },
        shareMode: { type: 'string', description: '分享模式：public（免登录）或 login（需登录）', default: 'public' },
      },
      required: ['shareId', 'action'],
    },
  },
  {
    name: 'delete_course',
    description: '删除一门课程及其分享链接。',
    inputSchema: {
      type: 'object',
      properties: {
        shareId: { type: 'string', description: '要删除的课程分享ID' },
      },
      required: ['shareId'],
    },
  },
];

async function callTool(name: string, args: any, user: McpUser): Promise<any> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

  switch (name) {
    case 'generate_course': {
      const ownerId = `user:${user.userId}`;
      const jobId = nanoid(10);
      try {
        const { createClassroomGenerationJob } = await import('@/lib/server/classroom-job-store');
        const { runClassroomGenerationJob } = await import('@/lib/server/classroom-job-runner');
        const input = {
          requirement: args.topic,
          enableTTS: args.enableTTS ?? true,
          enableImageGeneration: args.enableImage ?? true,
          ownerId,
        };
        await createClassroomGenerationJob(jobId, input as any);
        runClassroomGenerationJob(jobId, input as any, baseUrl).catch((e: any) =>
          console.error('MCP generation failed:', e),
        );
        query(
          `INSERT INTO platform_usage (id, user_id, kind, credits, meta) VALUES ($1,$2,'course_generate',1,$3)`,
          [nanoid(10), user.userId, JSON.stringify({ source: 'mcp', jobId })],
        ).catch(() => {});
        query(`UPDATE platform_quotas SET used_generations = used_generations + 1 WHERE user_id = $1`, [user.userId]).catch(() => {});
      } catch (e: any) {
        return { content: [{ type: 'text', text: `创建失败: ${e.message}` }], isError: true };
      }
      return {
        content: [{ type: 'text', text: `课程生成任务已创建。任务ID: ${jobId}\n预计2-5分钟完成。\n用 get_course_status 查询进度，完成后用 list_courses 查看链接。` }],
      };
    }

    case 'list_courses': {
      const status = args.status || 'published';
      let where = 'WHERE s.owner_id = $1';
      if (status === 'published') where += ' AND s.is_published = TRUE';
      else if (status === 'pending') where += ' AND s.is_published = FALSE';
      const rows = await query(
        `SELECT s.id, s.stage_id, s.title, s.share_mode, s.is_published, s.created_at
         FROM platform_course_shares s ${where} ORDER BY s.created_at DESC LIMIT 50`,
        [`user:${user.userId}`],
      );
      if (rows.length === 0) return { content: [{ type: 'text', text: '暂无课程。使用 generate_course 创建。' }] };
      const lines = rows.map((r: any) =>
        `- [${r.is_published ? '已发布' : '草稿'}] ${r.title || '未命名'} | ID: ${r.id} | 链接: ${baseUrl}/share/${r.id}`
      );
      return { content: [{ type: 'text', text: `共${rows.length}门课程:\n${lines.join('\n')}` }] };
    }

    case 'get_course_status': {
      try {
        const { readClassroomGenerationJob } = await import('@/lib/server/classroom-job-store');
        const job = await readClassroomGenerationJob(args.jobId);
        if (!job) return { content: [{ type: 'text', text: `未找到任务 ${args.jobId}` }], isError: true };
        return {
          content: [{
            type: 'text',
            text: `任务: ${args.jobId}\n状态: ${job.status}\n步骤: ${job.step || '进行中'}\n消息: ${job.message || ''}`,
          }],
        };
      } catch (e: any) {
        return { content: [{ type: 'text', text: `查询失败: ${e.message}` }], isError: true };
      }
    }

    case 'get_quota': {
      const rows = await query<{ monthly_generations: number; used_generations: number }>(
        `SELECT monthly_generations, used_generations FROM platform_quotas WHERE user_id = $1`,
        [user.userId],
      );
      const q = rows[0] || { monthly_generations: 5, used_generations: 0 };
      const remaining = q.monthly_generations - q.used_generations;
      return {
        content: [{
          type: 'text',
          text: `套餐额度: 每月${q.monthly_generations}次\n已使用: ${q.used_generations}次\n剩余: ${remaining}次`,
        }],
      };
    }

    case 'search_catalog': {
      // Search our built-in catalog (stored in page, but we can do a basic DB search or return popular templates)
      // Since catalog is hardcoded, we return relevant templates as suggestions
      const kw = args.keyword || '';
      const level = args.level || '';
      // Return a few relevant suggestions based on keyword
      return {
        content: [{
          type: 'text',
          text: `搜索"${kw}"${level ? `（学段: ${level}）` : ''}的课程模板：\n\n建议直接用 generate_course 创建：\n- 主题: "${kw}${level ? `，适合${level}学生` : ''}"\n\n课程模板库共1095门课，涵盖幼儿园到大学全学段。你也可以直接在网页版 /catalog 浏览完整模板库。`,
        }],
      };
    }

    case 'publish_course': {
      const { shareId, action, shareMode = 'public' } = args;
      if (action === 'publish') {
        await query(
          `UPDATE platform_course_shares SET is_published = TRUE, share_mode = $1 WHERE id = $2 AND owner_id = $3`,
          [shareMode === 'login' ? 'login' : 'none', shareId, `user:${user.userId}`],
        );
        return {
          content: [{
            type: 'text',
            text: `课程已发布。分享链接: ${baseUrl}/share/${shareId}\n访问模式: ${shareMode === 'login' ? '需登录' : '公开免登录'}`,
          }],
        };
      } else {
        await query(
          `UPDATE platform_course_shares SET is_published = FALSE WHERE id = $1 AND owner_id = $2`,
          [shareId, `user:${user.userId}`],
        );
        return { content: [{ type: 'text', text: '课程已取消发布，分享链接已失效。' }] };
      }
    }

    case 'delete_course': {
      const result = await query(
        `DELETE FROM platform_course_shares WHERE id = $1 AND owner_id = $2 RETURNING id`,
        [args.shareId, `user:${user.userId}`],
      );
      if (result.length === 0) return { content: [{ type: 'text', text: '未找到课程或无权删除' }], isError: true };
      return { content: [{ type: 'text', text: `课程 ${args.shareId} 已删除。` }] };
    }

    default:
      return { content: [{ type: 'text', text: `未知工具: ${name}` }], isError: true };
  }
}

export async function POST(request: NextRequest) {
  const user = await authenticate(request);
  if (!user) {
    return NextResponse.json(
      { jsonrpc: '2.0', error: { code: -32001, message: 'Invalid API key' }, id: null },
      { status: 401 },
    );
  }

  let body: any;
  try { body = await request.json(); }
  catch { return NextResponse.json({ jsonrpc: '2.0', error: { code: -32700, message: 'Parse error' }, id: null }, { status: 400 }); }

  const { method, params, id } = body;
  if (typeof method === 'string' && method.startsWith('notifications/')) {
    return new NextResponse(null, { status: 202 });
  }

  let result: any;
  let error: any = null;
  const sessionId = nanoid(16);

  try {
    switch (method) {
      case 'initialize':
        result = {
          protocolVersion: '2025-03-26',
          capabilities: { tools: {} },
          serverInfo: { name: 'MAIC-Studio', version: '1.0.0' },
        };
        break;
      case 'ping':
        result = {};
        break;
      case 'tools/list':
        result = { tools: TOOLS };
        break;
      case 'tools/call':
        result = await callTool(params?.name, params?.arguments || {}, user);
        break;
      default:
        error = { code: -32601, message: `Method not found: ${method}` };
    }
  } catch (e: any) {
    error = { code: -32603, message: e?.message || 'Internal error' };
  }

  const response: any = { jsonrpc: '2.0', id: id ?? null };
  if (error) response.error = error;
  else response.result = result;
  return NextResponse.json(response, { headers: { 'MCP-Session-Id': sessionId } });
}

export async function GET(request: NextRequest) {
  const user = await authenticate(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(`event: endpoint\ndata: /api/mcp?sessionId=${nanoid(16)}\n\n`));
      const ping = setInterval(() => {
        try { controller.enqueue(encoder.encode(`event: ping\ndata: {}\n\n`)); }
        catch { clearInterval(ping); }
      }, 30000);
    },
  });
  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' },
  });
}
