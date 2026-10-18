import { NextResponse } from 'next/server';
import { isAdminSession } from '@/platform/admin/auth';
import { reloadServerProviders } from '@/lib/server/provider-config';
import { promises as fs } from 'fs';
import path from 'path';
import yaml from 'js-yaml';

const PROVIDERS_FILE = path.join(process.cwd(), 'server-providers.yml');

// Capability sections in server-providers.yml
const SECTIONS = ['providers', 'tts', 'asr', 'pdf', 'image', 'video', 'web-search'] as const;
type Section = typeof SECTIONS[number];

// Provider presets per section
export const PRESETS: Record<Section, Record<string, { label: string; baseUrl?: string; models?: string[] }>> = {
  providers: {
    deepseek: { label: 'DeepSeek', baseUrl: 'https://api.deepseek.com/v1', models: ['deepseek-chat', 'deepseek-reasoner'] },
    doubao: { label: '豆包 (火山引擎)', baseUrl: 'https://ark.cn-beijing.volces.com/api/v3', models: ['doubao-pro-4k', 'doubao-pro-32k'] },
    kimi: { label: 'Kimi (Moonshot)', baseUrl: 'https://api.moonshot.cn/v1', models: ['moonshot-v1-8k', 'moonshot-v1-32k'] },
    qwen: { label: '通义千问 (Qwen)', baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', models: ['qwen-turbo', 'qwen-plus', 'qwen-max'] },
    glm: { label: '智谱 GLM', baseUrl: 'https://open.bigmodel.cn/api/paas/v4', models: ['glm-4-plus', 'glm-4-flash'] },
    minimax: { label: 'MiniMax', baseUrl: 'https://api.minimax.chat/v1', models: ['abab6.5s-chat'] },
    openai: { label: 'OpenAI', baseUrl: 'https://api.openai.com/v1', models: ['gpt-4o', 'gpt-4o-mini'] },
    anthropic: { label: 'Anthropic (Claude)', baseUrl: 'https://api.anthropic.com/v1', models: ['claude-sonnet-4-20250514'] },
    google: { label: 'Google (Gemini)', baseUrl: 'https://generativelanguage.googleapis.com/v1beta', models: ['gemini-2.0-flash'] },
    openrouter: { label: 'OpenRouter', baseUrl: 'https://openrouter.ai/api/v1', models: ['openai/gpt-4o'] },
    siliconflow: { label: '硅基流动', baseUrl: 'https://api.siliconflow.cn/v1', models: ['Qwen/Qwen2.5-72B-Instruct'] },
  },
  tts: {
    'openai-tts': { label: 'OpenAI TTS', baseUrl: 'https://api.openai.com/v1' },
    'doubao-tts': { label: '豆包语音', baseUrl: 'https://ark.cn-beijing.volces.com/api/v3' },
    'qwen-tts': { label: '通义语音', baseUrl: 'https://dashscope.aliyuncs.com/api/v1' },
    'minimax-tts': { label: 'MiniMax 语音', baseUrl: 'https://api.minimax.chat/v1' },
    'elevenlabs-tts': { label: 'ElevenLabs', baseUrl: 'https://api.elevenlabs.io/v1' },
    'glm-tts': { label: '智谱语音' },
    'azure-tts': { label: 'Azure TTS' },
  },
  asr: {
    'openai-whisper': { label: 'OpenAI Whisper', baseUrl: 'https://api.openai.com/v1' },
    'qwen-asr': { label: '通义听悟', baseUrl: 'https://dashscope.aliyuncs.com/api/v1' },
    'azure-asr': { label: 'Azure Speech' },
  },
  pdf: {
    unpdf: { label: 'unpdf (内置)' },
    mineru: { label: 'MinerU 本地解析' },
    'mineru-cloud': { label: 'MinerU 云端', baseUrl: 'https://mineru.net/api/v4' },
    alidocmind: { label: '阿里云文档智能' },
  },
  image: {
    seedream: { label: 'Seedream (即梦)', baseUrl: 'https://ark.cn-beijing.volces.com/api/v3' },
    'openai-image': { label: 'OpenAI DALL-E', baseUrl: 'https://api.openai.com/v1' },
    'qwen-image': { label: '通义万相', baseUrl: 'https://dashscope.aliyuncs.com/api/v1' },
    'nano-banana': { label: 'Nano Banana' },
    'minimax-image': { label: 'MiniMax 图像' },
  },
  video: {
    seedance: { label: 'Seedance (即梦视频)', baseUrl: 'https://ark.cn-beijing.volces.com/api/v3' },
    kling: { label: '可灵 (Kling)' },
    veo: { label: 'Google Veo' },
    'minimax-video': { label: 'MiniMax 视频' },
  },
  'web-search': {
    tavily: { label: 'Tavily', baseUrl: 'https://api.tavily.com' },
    bocha: { label: '博查搜索' },
    brave: { label: 'Brave Search', baseUrl: 'https://api.search.brave.com' },
    exa: { label: 'Exa', baseUrl: 'https://api.exa.ai' },
    baidu: { label: '百度搜索' },
  },
};

async function readYaml(): Promise<any> {
  try {
    const content = await fs.readFile(PROVIDERS_FILE, 'utf-8');
    return yaml.load(content) || {};
  } catch {
    return {};
  }
}

async function writeYaml(data: any) {
  const content = yaml.dump(data, { lineWidth: 120, noRefs: true });
  await fs.writeFile(PROVIDERS_FILE, content, 'utf-8');
  reloadServerProviders();
}

function maskKey(key: string): string {
  if (!key) return '';
  return key.slice(0, 8) + '••••';
}

// GET: all sections' providers
export async function GET(request: Request) {
  if (!(await isAdminSession(request))) {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }
  const data = await readYaml();
  const result: Record<string, any> = {};
  for (const section of SECTIONS) {
    const entries = data[section] || {};
    result[section] = Object.entries(entries).map(([id, cfg]: [string, any]) => ({
      id,
      label: PRESETS[section]?.[id]?.label || id,
      apiKey: maskKey(cfg.apiKey || ''),
      baseUrl: cfg.baseUrl || '',
      models: cfg.models || [],
      enabled: cfg.enabled !== false,
    }));
  }
  return NextResponse.json({ sections: result, presets: PRESETS });
}

// POST: add/update a provider in a section
export async function POST(request: Request) {
  if (!(await isAdminSession(request))) {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }
  const body = await request.json();
  const { section, id, apiKey, baseUrl, models } = body;
  if (!section || !SECTIONS.includes(section) || !id || !apiKey) {
    return NextResponse.json({ error: 'section, id, apiKey required' }, { status: 400 });
  }
  const data = await readYaml();
  if (!data[section]) data[section] = {};
  data[section][id] = {
    apiKey,
    ...(baseUrl ? { baseUrl } : {}),
    ...(models?.length ? { models } : {}),
  };
  await writeYaml(data);
  return NextResponse.json({ ok: true });
}

// DELETE: remove a provider
export async function DELETE(request: Request) {
  if (!(await isAdminSession(request))) {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }
  const { searchParams } = new URL(request.url);
  const section = searchParams.get('section');
  const id = searchParams.get('id');
  if (!section || !id) {
    return NextResponse.json({ error: 'section and id required' }, { status: 400 });
  }
  const data = await readYaml();
  if (data[section] && data[section][id]) {
    delete data[section][id];
  }
  await writeYaml(data);
  return NextResponse.json({ ok: true });
}
