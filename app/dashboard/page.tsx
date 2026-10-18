'use client';

import { useState, useEffect } from 'react';
import { useI18n } from '@/lib/hooks/use-i18n';
import { usePptToClassroom } from '@/lib/import/use-ppt-to-classroom';
import { CreateCoursePanel } from '@/components/dashboard/CreateCoursePanel';
import { AccountPanel } from '@/components/dashboard/AccountPanel';
import { BookOpen, Download, Video, Link2, Key, Plus, ExternalLink, Sparkles, Trash2, Copy, Check, Building2, UserPlus, UserMinus } from 'lucide-react';

export default function DashboardPage() {
  const { t, locale, setLocale } = useI18n();
  const isZh = locale === 'zh-CN';
  const L = {
    brand: isZh ? 'playclass' : 'playclass',
    catalog: isZh ? '\u8BFE\u7A0B\u5E02\u573A' : 'Catalog',
    createNew: isZh ? '+ \u521B\u5EFA\u65B0\u8BFE\u7A0B' : '+ New Course',
    title: isZh ? '创作者看板' : 'Creator Dashboard',
    subtitle: isZh ? '管理你的课程、查看配额、配置 AI 工具集成。' : 'Manage courses, quota, and AI tool integrations.',
    tabOverview: isZh ? '概览' : 'Overview',
    tabCourses: isZh ? '已发布课程' : 'Published',
    tabMcp: isZh ? 'MCP API 密钥' : 'MCP API Keys',
    statPublished: isZh ? '已发布课程' : 'Published',
    statUsed: isZh ? '本月已用额度' : 'Used this month',
    statRemaining: isZh ? '\u5269\u4F59\u751F\u6210\u6B21\u6570' : 'Remaining',
    exportTitle: isZh ? '导出方式' : 'Export Formats',
    exportPptx: isZh ? '互动课件' : 'Interactive Slides',
    exportPptxDesc: isZh ? '导出 .pptx，在 PowerPoint 或 Keynote 中编辑，保留互动元素。' : 'Export .pptx with interactive elements preserved.',
    exportVideo: isZh ? '互动视频' : 'Video',
    exportVideoDesc: isZh ? '导出 MP4 格式（含 AI 配音），适合发布到视频平台。' : 'Export MP4 with AI narration for video platforms.',
    exportShare: isZh ? '直播课程链接' : 'Live Link',
    exportShareDesc: isZh ? '发布分享链接，学员可与 AI 老师实时对话互动。' : 'Share link for real-time AI teacher interaction.',
    pricingTitle: isZh ? '套餐与计费' : 'Pricing',
    free: isZh ? '免费版' : 'Free',
    pro: isZh ? '专业版' : 'Pro',
    enterprise: isZh ? '机构版' : 'Enterprise',
    upgrade: isZh ? '立即升级' : 'Upgrade',
    current: isZh ? '当前方案' : 'Current Plan',
    mcpTitle: isZh ? 'MCP 接入' : 'MCP Integration',
    mcpDesc: isZh ? '把课程生成接到豆包、飞书、Claude、ChatGPT。' : 'Connect course generation to Doubao, Feishu, Claude, ChatGPT.',
    noCourses: isZh ? '还没有已发布的课程。去创作页创建第一门课程吧。' : 'No published courses yet. Create your first course.',
    newKeyTitle: isZh ? '你的新密钥（请立即保存）' : 'Your new key (save now)',
    createKey: isZh ? '+ 创建新密钥' : '+ Create Key',
    open: isZh ? '打开' : 'Open',
    paid: isZh ? '需登录' : 'Login required',
    public: isZh ? '公开' : 'Public',
  };
  const [stats, setStats] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [payStatus, setPayStatus] = useState<string | null>(null);
  const [shares, setShares] = useState<any[]>([]);
  const [mcpKeys, setMcpKeys] = useState<any[]>([]);
  const [newKey, setNewKey] = useState('');
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<'overview' | 'create' | 'shares' | 'mcp' | 'org' | 'account'>('overview');
  const { busy: pptBusy, start: pptStart, input: pptInput } = usePptToClassroom();
  const [orgInfo, setOrgInfo] = useState<any>(null);
  const [orgMembers, setOrgMembers] = useState<any[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteToken, setInviteToken] = useState('');
  const [orgMsg, setOrgMsg] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      if (sp.get('paid') === '1') {
        setPayStatus('paid');
        window.history.replaceState({}, '', window.location.pathname);
      } else if (sp.get('payment') === 'pending') {
        setPayStatus('pending');
        window.history.replaceState({}, '', window.location.pathname);
      }
    } catch {
      /* ignore */
    }
    fetch('/api/dashboard/stats').then(r => r.json()).then(setStats);
    fetch('/api/share/list').then(r => r.json()).then(d => setShares(d.shares || []));
    fetch('/api/mcp-keys').then(r => r.json()).then(d => setMcpKeys(d.keys || []));
    fetch('/api/plans').then(r => r.json()).then(d => setPlans(d.plans || []));
    fetch('/api/payment/create').then(r => r.json()).then(d => setProducts(d.products || []));
    fetch('/api/org').then(r => r.json()).then(d => {
      setOrgInfo(d.org ? { ...d.org, isOwner: d.isOwner } : null);
      setOrgMembers(d.members || []);
    });
    fetch('/api/org/webhooks')
      .then((r) => r.json())
      .then((d) => setWebhooks(d.webhooks || []))
      .catch(() => {});
  }, []);

  async function createKey() {
    const res = await fetch('/api/mcp-keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'MCP Key' }),
    });
    const data = await res.json();
    setNewKey(data.key);
    setMcpKeys([{ key: data.key, name: data.name, created_at: new Date().toISOString() }, ...mcpKeys]);
  }

  async function deleteKey(key: string) {
    await fetch(`/api/mcp-keys?key=${encodeURIComponent(key)}`, { method: 'DELETE' });
    setMcpKeys(mcpKeys.filter(k => k.key !== key));
  }

  function copyKey(k: string) {
    navigator.clipboard.writeText(k);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const [payTarget, setPayTarget] = useState<{ plan?: string; product?: string } | null>(null);
  const [cashierUrl, setCashierUrl] = useState<string | null>(null);

  async function pay(plan: string, product?: string, payType: string = 'alipay') {
    try {
      const res = await fetch('/api/payment/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(product ? { product, type: payType } : { plan, type: payType }),
      });
      const text = await res.text();
      let data: any = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = { error: text || (isZh ? '支付服务无响应' : 'Empty payment response') };
      }
      if (data.redirectUrl) {
        // Keep the workbench open: cashier opens in a new tab/popup.
        const win = window.open(data.redirectUrl, '_blank', 'noopener,noreferrer');
        if (!win) {
          // Popup blocked — fall back to same-tab redirect.
          window.location.href = data.redirectUrl;
          return;
        }
        setCashierUrl(data.redirectUrl);
        setPayTarget(null);
      } else {
        alert(data.error || (isZh ? '创建订单失败' : 'Failed to create order'));
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : (isZh ? '创建订单失败' : 'Failed to create order'));
    }
  }

  function openPay(plan?: string, product?: string) {
    setPayTarget({ plan, product });
  }

  if (!stats) return <div style={{ padding: 80, textAlign: 'center', color: '#888' }}>加载中…</div>;
  const remaining = stats.quota.remaining ?? (stats.quota.monthly_generations - stats.quota.used_generations);
  const limit = stats.quota.monthly_generations;
  const pct = limit === -1 ? 0 : Math.min(100, Math.round((stats.quota.used_generations / Math.max(1, limit)) * 100));
  const currency = isZh ? 'CNY' : 'USD';
  const currencySymbol = isZh ? '\u00A5' : '$';

/** Higher number = higher tier. Used so Plus → Pro is a downgrade, not "upgrade". */
const PLAN_RANK: Record<string, number> = {
  free: 0,
  pro_monthly: 1,
  pro_plus_monthly: 2,
  enterprise_yearly: 3,
  enterprise: 3,
};

function planRank(id: string | undefined | null): number {
  if (!id) return 0;
  return PLAN_RANK[id] ?? 0;
}

  const tabs = [
    { id: 'overview', label: L.tabOverview, icon: Sparkles },
    { id: 'create', label: isZh ? '创建课程' : 'Create', icon: Plus },
    { id: 'account', label: isZh ? '账户设置' : 'Account', icon: UserPlus },
    { id: 'shares', label: L.tabCourses, icon: BookOpen },
    { id: 'mcp', label: L.tabMcp, icon: Key },
    ...(orgInfo ? [{ id: 'org' as const, label: isZh ? '机构席位' : 'Org Seats', icon: Building2 }] : []),
  ] as const;

  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fc' }}>
      {stats?.adminPreview ? (
        <div
          style={{
            background: '#fef3c7',
            color: '#92400e',
            padding: '10px 16px',
            fontSize: 13,
            textAlign: 'center',
          }}
        >
          超管预览模式：当前未绑定终端用户账号，数据为空。请登录用户账号查看真实配额与课程。
        </div>
      ) : null}
      {payStatus === 'paid' && (
        <div
          style={{
            background: '#ecfdf5', color: '#065f46', padding: '12px 20px',
            fontSize: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            borderBottom: '1px solid #a7f3d0',
          }}
        >
          <span>
            {isZh
              ? '支付成功！套餐已生效，刷新后可见最新额度。'
              : 'Payment succeeded. Your plan is active.'}
          </span>
          <button
            type="button"
            onClick={() => setPayStatus(null)}
            style={{ border: 'none', background: 'transparent', color: '#065f46', cursor: 'pointer', fontWeight: 600 }}
          >
            ×
          </button>
        </div>
      )}
      {payStatus === 'pending' && (
        <div
          style={{
            background: '#fffbeb', color: '#92400e', padding: '12px 20px',
            fontSize: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            borderBottom: '1px solid #fde68a',
          }}
        >
          <span>
            {isZh
              ? '订单已创建，支付结果确认中。可在「订单」查看；若已扣款请联系管理员补账。'
              : 'Order created. Check Orders; if you were charged, contact support to reconcile.'}
          </span>
          <button
            type="button"
            onClick={() => setPayStatus(null)}
            style={{ border: 'none', background: 'transparent', color: '#92400e', cursor: 'pointer', fontWeight: 600 }}
          >
            ×
          </button>
        </div>
      )}
      {/* Top nav */}
      <nav style={{
        background: '#fff', borderBottom: '1px solid #eef0f4', padding: '0 32px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 60,
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <a href="/" style={{ fontWeight: 700, fontSize: 18, color: '#111', textDecoration: 'none' }}>
            <span style={{ color: '#7c3aed' }}>playclass</span> Studio
          </a>
          <a href="/catalog" style={{ fontSize: 14, color: '#666', textDecoration: 'none' }}>{L.catalog}</a>
          <a href="/orders" style={{ fontSize: 14, color: '#666', textDecoration: 'none' }}>{isZh ? '\u8BA2\u5355' : 'Orders'}</a>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    {isAdmin ? (
            <a
              href="/admin"
              style={{
                padding: '8px 12px', borderRadius: 8, border: '1px solid #c7d2fe',
                background: '#eef2ff', color: '#3730a3', textDecoration: 'none',
                fontSize: 13, fontWeight: 600,
              }}
            >
              {isZh ? '超管后台' : 'Admin console'}
            </a>
          ) : null}
<button onClick={() => setLocale(locale === 'zh-CN' ? 'en-US' : 'zh-CN')} style={{ padding: '6px 12px', border: '1px solid #ddd', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: 13 }}>
            {locale === 'zh-CN' ? 'EN' : '\u4E2D\u6587'}
          </button>
          <button
            type="button"
            onClick={pptStart}
            disabled={pptBusy}
            style={{
              padding: '8px 14px', background: '#fff', color: '#7c3aed',
              border: '1px solid #7c3aed', borderRadius: 8, cursor: 'pointer',
              fontSize: 13, fontWeight: 600, opacity: pptBusy ? 0.6 : 1,
            }}
          >
            {pptBusy ? (isZh ? '解析中…' : 'Reading…') : (isZh ? 'PPT \u8F6C\u4E92\u52A8\u8BFE' : 'PPT \u2192 Interactive')}
          </button>
          <button
            type="button"
            onClick={() => setTab('create')}
            style={{ padding: '8px 16px', background: '#7c3aed', color: '#fff', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 500 }}
          >
            {L.createNew}
          </button>
          {pptInput}
        </div>
      </nav>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }}>
        {/* Welcome */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 4 }}>{L.title}</h1>
          <p style={{ color: '#888', fontSize: 14 }}>{L.subtitle}</p>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 28, background: '#fff', padding: 4, borderRadius: 12, width: 'fit-content', border: '1px solid #eef0f4' }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 18px', border: 'none', cursor: 'pointer',
                borderRadius: 8, fontSize: 14,
                background: tab === t.id ? '#7c3aed' : 'transparent',
                color: tab === t.id ? '#fff' : '#555',
                fontWeight: tab === t.id ? 600 : 400,
                transition: 'all .15s',
              }}>
              <t.icon size={15} />
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'overview' && (
          <>
            {!orgInfo && (
              <div style={{
                background: '#fff', borderRadius: 12, padding: 16, border: '1px solid #eef0f4',
                marginBottom: 20, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap',
              }}>
                <span style={{ fontSize: 13, color: '#666' }}>
                  {isZh ? '有机构邀请码？' : 'Have an org invite token?'}
                </span>
                <input
                  placeholder={isZh ? '粘贴邀请 Token' : 'Paste invite token'}
                  value={inviteToken}
                  onChange={(e) => setInviteToken(e.target.value)}
                  style={{ flex: 1, minWidth: 200, padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 13 }}
                />
                <button
                  onClick={async () => {
                    const res = await fetch('/api/org/accept-invite', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ token: inviteToken }),
                    });
                    const d = await res.json();
                    if (d.ok) {
                      setOrgMsg(isZh ? '已加入机构' : 'Joined org');
                      fetch('/api/org').then(r => r.json()).then(x => {
                        setOrgInfo(x.org ? { ...x.org, isOwner: x.isOwner } : null);
                        setOrgMembers(x.members || []);
                      });
                    } else {
                      setOrgMsg(d.error || '');
                    }
                  }}
                  style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#7c3aed', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
                >
                  {isZh ? '\u52A0\u5165' : 'Join'}
                </button>
                {orgMsg && <span style={{ fontSize: 12, color: '#888' }}>{orgMsg}</span>}
              </div>
            )}
          </>
        )}
        {tab === 'overview' && (
          <>
            {/* Stat cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
              <div style={{
                background: '#fff', borderRadius: 16, padding: 24,
                border: '1px solid #eef0f4',
                boxShadow: '0 1px 3px rgba(0,0,0,.04)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <BookOpen size={16} color="#7c3aed" />
                  <span style={{ fontSize: 13, color: '#888' }}>{L.tabCourses}</span>
                </div>
                <div style={{ fontSize: 36, fontWeight: 700 }}>{stats.coursesPublished}</div>
              </div>
              <div style={{
                background: '#fff', borderRadius: 16, padding: 24,
                border: '1px solid #eef0f4',
                boxShadow: '0 1px 3px rgba(0,0,0,.04)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <Sparkles size={16} color="#f59e0b" />
                  <span style={{ fontSize: 13, color: '#888' }}>{L.statUsed}</span>
                </div>
                <div style={{ fontSize: 36, fontWeight: 700 }}>
                  {stats.quota.used_generations}<span style={{ fontSize: 16, color: '#aaa' }}>/{stats.quota.monthly_generations}</span>
                </div>
                <div style={{ height: 6, background: '#f0f0f0', borderRadius: 3, marginTop: 10 }}>
                  <div style={{ width: `${Math.min(pct,100)}%`, height: '100%', background: pct > 80 ? '#ef4444' : '#f59e0b', borderRadius: 3 }} />
                </div>
              </div>
              <div style={{
                background: '#fff', borderRadius: 16, padding: 24,
                border: '1px solid #eef0f4',
                boxShadow: '0 1px 3px rgba(0,0,0,.04)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <Check size={16} color="#10b981" />
                  <span style={{ fontSize: 13, color: '#888' }}>{L.statRemaining}</span>
                </div>
                <div style={{ fontSize: 36, fontWeight: 700, color: remaining > 0 ? '#10b981' : '#ef4444' }}>{remaining}</div>
                {stats.quota.plan_expires_at && (
                  <div style={{ fontSize: 11, color: '#aaa', marginTop: 6 }}>
                    {isZh ? '套餐到期' : 'Expires'}: {new Date(stats.quota.plan_expires_at).toLocaleDateString()}
                  </div>
                )}
                {stats.quota.video_clips && (
                  <div style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>
                    {isZh ? 'AI 视频' : 'AI video'}: {stats.quota.video_clips.remaining}
                    {stats.quota.video_clips.bonus > 0 ? ` (+${stats.quota.video_clips.bonus})` : ''}
                    {' · '}
                    {isZh ? '导出' : 'Export'}: {stats.quota.video_exports?.remaining ?? 0}
                  </div>
                )}
              </div>
            </div>

            {/* Export methods */}
            <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>{L.exportTitle}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
              {[
                { icon: Download, color: '#7c3aed', title: L.exportPptx, desc: L.exportPptxDesc },
                { icon: Video, color: '#ec4899', title: L.exportVideo, desc: L.exportVideoDesc },
                { icon: Link2, color: '#06b6d4', title: L.exportShare, desc: L.exportShareDesc },
              ].map((e) => (
                <div key={e.title} style={{
                  background: '#fff', borderRadius: 16, padding: 24,
                  border: '1px solid #eef0f4',
                  transition: 'all .2s', cursor: 'pointer',
                }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 10,
                    background: `${e.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginBottom: 14,
                  }}>
                    <e.icon size={20} color={e.color} />
                  </div>
                  <div style={{ fontWeight: 600, marginBottom: 6 }}>{e.title}</div>
                  <p style={{ fontSize: 13, color: '#888', lineHeight: 1.6 }}>{e.desc}</p>
                </div>
              ))}
            </div>

            {/* Pricing plans — live from /api/plans (admin-configurable) */}
            <h2 style={{ fontSize: 16, fontWeight: 600, margin: '32px 0 16px' }}>{L.pricingTitle}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.max(1, plans.length)}, 1fr)`, gap: 16 }}>
              {plans.map((p: any) => {
                const isFree = Number(p.price.CNY) === 0 && Number(p.price.USD) === 0;
                const currentPlan = stats.quota?.plan || 'free';
                const isCurrent = currentPlan === p.id || (isFree && currentPlan === 'free');
                const currentRank = planRank(currentPlan);
                const targetRank = planRank(p.id);
                const isUpgrade = !isCurrent && !isFree && targetRank > currentRank;
                const isDowngrade = !isCurrent && targetRank < currentRank;
                const highlight = p.id === 'pro_monthly';
                const priceVal = currency === 'CNY' ? p.price.CNY : p.price.USD;
                const features = (p.features && (isZh ? p.features.zh : p.features.en)) || [];
                return (
                  <div key={p.id} style={{
                    background: highlight ? 'linear-gradient(135deg, #7c3aed, #6d28d9)' : '#fff',
                    borderRadius: 16, padding: 24,
                    border: highlight ? 'none' : '1px solid #eef0f4',
                    color: highlight ? '#fff' : '#111',
                    position: 'relative',
                  }}>
                    {highlight && <div style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(255,255,255,.2)', padding: '2px 10px', borderRadius: 20, fontSize: 11 }}>推荐</div>}
                    <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 8 }}>{isZh ? p.name.zh : p.name.en}</div>
                    <div style={{ marginBottom: 16 }}>
                      <span style={{ fontSize: 28, fontWeight: 700 }}>{currencySymbol}{priceVal}</span>
                      <span style={{ fontSize: 13, opacity: 0.7 }}>
                        {isFree ? (isZh ? ' 永久免费' : ' free') : p.periodDays >= 365 ? (isZh ? '/年' : '/yr') : (isZh ? '/月' : '/mo')}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 12 }}>
                      {p.monthlyGenerations === -1 ? (isZh ? '不限次数' : 'Unlimited') : (isZh ? `每月 ${p.monthlyGenerations} 次生成` : `${p.monthlyGenerations} generations / mo`)}
                      {p.monthlyVideoClips > 0 && (
                        <div>{isZh ? `AI 视频 ${p.monthlyVideoClips} 条/月` : `${p.monthlyVideoClips} AI video clips / mo`}</div>
                      )}
                      {p.videoExportCredits === -1
                        ? <div>{isZh ? '视频导出不限' : 'Unlimited MP4 exports'}</div>
                        : p.videoExportCredits > 0
                          ? <div>{isZh ? `视频导出 ${p.videoExportCredits} 次/月` : `${p.videoExportCredits} MP4 exports / mo`}</div>
                          : null}
                    </div>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                      {features.map((f: string) => (
                        <li key={f} style={{ fontSize: 13, marginBottom: 6, opacity: 0.9 }}>✓ {f}</li>
                      ))}
                    </ul>
                    {isCurrent && (
                      <div style={{ marginTop: 16, fontSize: 13, opacity: 0.75, fontWeight: 600 }}>
                        {isZh ? '当前方案' : 'Current plan'}
                      </div>
                    )}
                    {isUpgrade && (
                      <button onClick={() => openPay(p.id)}
                        style={{
                          marginTop: 16, width: '100%', padding: '10px',
                          borderRadius: 8, border: 'none', cursor: 'pointer',
                          background: highlight ? '#fff' : '#7c3aed',
                          color: highlight ? '#7c3aed' : '#fff',
                          fontSize: 14, fontWeight: 600,
                        }}>
                        {isZh ? '升级到此套餐' : 'Upgrade'}
                      </button>
                    )}
                    {isDowngrade && (
                      <button
                        onClick={() => openPay(p.id)}
                        style={{
                          marginTop: 16, width: '100%', padding: '10px',
                          borderRadius: 8, border: '1px solid #d1d5db', cursor: 'pointer',
                          background: '#fff', color: '#374151',
                          fontSize: 14, fontWeight: 500,
                        }}
                      >
                        {isZh ? '降级/切换（按周期计费）' : 'Switch plan'}
                      </button>
                    )}
                    {isFree && !isCurrent && (
                      <div style={{ marginTop: 16, fontSize: 12, opacity: 0.65 }}>
                        {isZh ? '可随时降回免费版' : 'You can switch back to Free'}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Add-on packs */}
            {products.length > 0 && (
              <>
                <h2 style={{ fontSize: 16, fontWeight: 600, margin: '28px 0 12px' }}>
                  {isZh ? '\u52A0\u8D2D\u5305\uFF08\u4E0D\u6309\u6708\u6E05\u96F6\uFF09' : 'Add-on packs (never expire)'}
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${products.length}, 1fr)`, gap: 12 }}>
                  {products.map((p: any) => {
                    const priceVal = currency === 'CNY' ? p.price.CNY : p.price.USD;
                    return (
                      <div key={p.id} style={{
                        background: '#fff', borderRadius: 12, padding: 16,
                        border: '1px solid #eef0f4', display: 'flex',
                        justifyContent: 'space-between', alignItems: 'center', gap: 12,
                      }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{isZh ? p.name.zh : p.name.en}</div>
                          <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
                            {currencySymbol}{priceVal}
                          </div>
                        </div>
                        <button onClick={() => openPay(undefined, p.id)}
                          style={{
                            padding: '8px 14px', borderRadius: 8, border: 'none',
                            background: '#7c3aed', color: '#fff', cursor: 'pointer',
                            fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap',
                          }}>
                          {isZh ? '购买' : 'Buy'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </>
        )}

        {tab === 'create' && (
          <CreateCoursePanel />
        )}
        {tab === 'account' && (
          <AccountPanel />
        )}

        {tab === 'org' && orgInfo && (
          <div>
            <div style={{
              background: '#fff', borderRadius: 16, padding: 20, border: '1px solid #eef0f4',
              marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 16 }}>{orgInfo.name}</div>
                <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>
                  {isZh ? '套餐' : 'Plan'}: {orgInfo.plan} · {isZh ? '席位' : 'Seats'}:{' '}
                  {orgInfo.usedSeats}/{orgInfo.seatCount}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 12, color: "#999" }}>
                  {isZh ? "席位（扩容请联系销售）" : "Seats (contact sales to expand)"}
                </div>
              </div>
            </div>

            {orgMsg && (
              <div style={{ marginBottom: 12, padding: '8px 12px', background: '#f0f9ff', borderRadius: 8, fontSize: 13 }}>{orgMsg}</div>
            )}

            <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #eef0f4', overflow: 'hidden', marginBottom: 16 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead><tr style={{ background: '#f8f9fc' }}>
                  <th style={{ textAlign: 'left', padding: '12px 16px', color: '#888' }}>{isZh ? '成员' : 'Member'}</th>
                  <th style={{ textAlign: 'left', padding: '12px 16px', color: '#888' }}>{isZh ? '角色' : 'Role'}</th>
                  <th></th>
                </tr></thead>
                <tbody>
                  {orgMembers.map((m: any) => (
                    <tr key={m.userId} style={{ borderTop: '1px solid #f5f5f5' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 500 }}>{m.name || m.email}</div>
                        <div style={{ fontSize: 12, color: '#999' }}>{m.email}</div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          fontSize: 12, padding: '2px 8px', borderRadius: 4,
                          background: m.role === 'owner' ? '#ede9fe' : '#f3f4f6',
                          color: m.role === 'owner' ? '#6d28d9' : '#555',
                        }}>{m.role}</span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        {m.role !== 'owner' && (
                          <button
                            onClick={async () => {
                              await fetch('/api/org', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ action: 'remove_member', userId: m.userId }),
                              });
                              fetch('/api/org').then(r => r.json()).then(x => { setOrgInfo(x.org ? { ...x.org, isOwner: x.isOwner } : null); setOrgMembers(x.members || []); });
                            }}
                            style={{ padding: '4px 10px', background: '#fee', color: 'crimson', border: '1px solid #fcc', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}
                          >
                            <UserMinus size={13} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ background: '#fff', borderRadius: 16, padding: 20, border: '1px solid #eef0f4' }}>
              <div style={{ fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <UserPlus size={16} /> {isZh ? '邀请成员' : 'Invite member'}
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <input
                  type="email" placeholder={isZh ? '成员邮箱（须已注册）' : 'Member email (must be registered)'}
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  style={{ flex: 1, minWidth: 220, padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd' }}
                />
                <button
                  onClick={async () => {
                    const res = await fetch('/api/org', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ action: 'add_member', email: inviteEmail }),
                    });
                    const d = await res.json();
                    setOrgMsg(d.error || (isZh ? '已加入' : 'Added'));
                    if (!d.error) {
                      setInviteEmail('');
                      fetch('/api/org').then(r => r.json()).then(x => { setOrgInfo(x.org ? { ...x.org, isOwner: x.isOwner } : null); setOrgMembers(x.members || []); });
                    }
                  }}
                  style={{ padding: '10px 18px', borderRadius: 8, border: 'none', background: '#7c3aed', color: '#fff', cursor: 'pointer', fontWeight: 600 }}
                >
                  {isZh ? '加入' : 'Add'}
                </button>
                <button
                  onClick={async () => {
                    const res = await fetch('/api/org', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ action: 'invite', email: inviteEmail }),
                    });
                    const d = await res.json();
                    if (d.invite?.token) {
                      setInviteToken(d.invite.token);
                      setOrgMsg(isZh ? '邀请链接已生成，发给对方即可' : 'Invite token generated');
                    } else {
                      setOrgMsg(d.error || '');
                    }
                  }}
                  style={{ padding: '10px 18px', borderRadius: 8, border: '1px solid #ddd', background: '#fff', cursor: 'pointer' }}
                >
                  {isZh ? '生成邀请' : 'Create invite'}
                </button>
              </div>
              {inviteToken && (
                <div style={{ marginTop: 12, fontSize: 13, wordBreak: 'break-all', background: '#f8f9fc', padding: 12, borderRadius: 8 }}>
                  <div style={{ color: '#888', marginBottom: 4 }}>{isZh ? '邀请 Token（发给对方，登录后在设置里兑换）' : 'Invite token'}</div>
                  <code>{inviteToken}</code>
                  <button
                    onClick={() => { navigator.clipboard.writeText(inviteToken); setOrgMsg(isZh ? '已复制' : 'Copied'); }}
                    style={{ marginLeft: 8, padding: '2px 8px', borderRadius: 4, border: '1px solid #ddd', background: '#fff', cursor: 'pointer', fontSize: 12 }}
                  >
                    <Copy size={12} />
                  </button>
                </div>
              )}
            </div>

            {/* P2: institutional webhook reports */}
            {orgInfo.isOwner && (
              <div style={{ background: '#fff', borderRadius: 16, padding: 20, border: '1px solid #eef0f4', marginTop: 16 }}>
                <div style={{ fontWeight: 600, marginBottom: 8 }}>
                  {isZh ? '机构 Webhook 报表' : 'Org webhook reports'}
                </div>
                <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 12 }}>
                  {isZh
                    ? '将学员/用量/质量 JSON 推送到你的系统（HMAC-SHA256 签名）。'
                    : 'Push learner/usage/quality JSON to your endpoint (HMAC-SHA256 signed).'}
                </p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <input
                    placeholder="https://example.com/hooks/playclass"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    style={{ flex: 1, minWidth: 220, padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 13 }}
                  />
                  <button
                    onClick={async () => {
                      const res = await fetch('/api/org/webhooks', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ url: webhookUrl }),
                      });
                      const d = await res.json();
                      if (d.webhook?.secret) setWebhookSecret(d.webhook.secret);
                      setOrgMsg(d.error || (isZh ? 'Webhook 已保存' : 'Webhook saved'));
                      fetch('/api/org/webhooks').then((r) => r.json()).then((x) => setWebhooks(x.webhooks || []));
                    }}
                    style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: '#7c3aed', color: '#fff', cursor: 'pointer', fontWeight: 600 }}
                  >
                    {isZh ? '保存' : 'Save'}
                  </button>
                  <button
                    onClick={async () => {
                      const res = await fetch('/api/org/webhooks', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'fire', event: 'all' }),
                      });
                      const d = await res.json();
                      setOrgMsg(
                        isZh
                          ? `已触发：成功 ${d.sent ?? 0} 失败 ${d.failed ?? 0}`
                          : `Fired: sent ${d.sent ?? 0} failed ${d.failed ?? 0}`,
                      );
                    }}
                    style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #ddd', background: '#fff', cursor: 'pointer' }}
                  >
                    {isZh ? '测试推送' : 'Test fire'}
                  </button>
                </div>
                {webhookSecret ? (
                  <div style={{ marginTop: 10, fontSize: 12, background: '#f9fafb', padding: 10, borderRadius: 8, wordBreak: 'break-all' }}>
                    {isZh ? '签名密钥（仅显示一次）' : 'Signing secret (shown once)'}:{' '}
                    <code>{webhookSecret}</code>
                  </div>
                ) : null}
                {webhooks.length > 0 && (
                  <ul style={{ marginTop: 12, fontSize: 12, color: '#4b5563', paddingLeft: 16 }}>
                    {webhooks.map((w: any) => (
                      <li key={w.id}>
                        {w.url} · {w.events}
                      </li>
                    ))}
                  </ul>
                )}
                <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                  {[
                    { href: '/api/org/export?type=usage&days=30', label: isZh ? '导出用量 CSV' : 'Usage CSV' },
                    { href: '/api/org/export?type=members', label: isZh ? '导出成员 CSV' : 'Members CSV' },
                    { href: '/api/org/export?type=quality&days=30', label: isZh ? '导出质量 CSV' : 'Quality CSV' },
                  ].map((b) => (
                    <a
                      key={b.href}
                      href={b.href}
                      style={{
                        padding: '6px 12px', borderRadius: 8, border: '1px solid #e5e7eb',
                        fontSize: 12, color: '#374151', textDecoration: 'none', background: '#fff',
                      }}
                    >
                      {b.label}
                    </a>
                  ))}
                </div>
                <p style={{ marginTop: 12, fontSize: 12, color: '#6b7280' }}>
                  <a href="/legal/institutional" target="_blank" style={{ color: '#7c3aed' }}>
                    {isZh ? '机构合规说明 / FERPA' : 'Institutional compliance / FERPA'}
                  </a>
                </p>
              </div>
            )}
          </div>
        )}

        {tab === 'shares' && (
          shares.length === 0 ? (
            <div style={{ background: '#fff', borderRadius: 16, padding: 60, textAlign: 'center', border: '1px solid #eef0f4' }}>
              <BookOpen size={40} color="#ccc" style={{ marginBottom: 16 }} />
              <p style={{ color: '#888' }}>{L.noCourses}</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {shares.map((s: any) => (
                <div key={s.id} style={{
                  background: '#fff', borderRadius: 12, padding: 16,
                  border: '1px solid #eef0f4', display: 'flex',
                  justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: 2 }}>{s.title}</div>
                    <div style={{ fontSize: 12, color: '#888' }}>
                      {s.shareMode === 'login' ? L.paid : L.public} · {new Date(s.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <a href={`/share/${s.id}`} target="_blank"
                    style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#7c3aed', fontSize: 13, textDecoration: 'none' }}>
                    打开 <ExternalLink size={13} />
                  </a>
                </div>
              ))}
            </div>
          )
        )}

        {tab === 'mcp' && (
          <div>
            <div style={{
              background: 'linear-gradient(135deg, #1e1b4b 0%, #4c1d95 100%)',
              borderRadius: 16, padding: 28, color: '#fff', marginBottom: 24,
            }}>
              <h3 style={{ fontSize: 18, marginBottom: 8 }}>{L.mcpTitle}</h3>
              <p style={{ fontSize: 14, opacity: 0.8, lineHeight: 1.6 }}>
                {L.mcpDesc}
              </p>
            </div>

            {/* Config instructions */}
            <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #eef0f4', padding: 24, marginBottom: 20 }}>
              <h4 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>配置方法</h4>

              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#7c3aed', marginBottom: 6 }}>豆包 / 飞书自定义连接器</div>
                <div style={{ fontSize: 13, color: '#555', lineHeight: 1.8 }}>
                  1. 打开豆包 → 设置 → 连接器 → 新建自定义连接器<br/>
                  2. 服务器名称：<code style={{ background: "#f5f5f5", padding: "2px 6px", borderRadius: 4 }}>playclass</code><br/>
                  3. 浼犺緭绫诲瀷：<code style={{ background: "#f5f5f5", padding: "2px 6px", borderRadius: 4 }}>HTTP</code><br/>
                  4. 鏈嶅姟鍣?URL：<code style={{ background: "#f5f5f5", padding: "2px 6px", borderRadius: 4 }}>https://浣犵殑鍩熷悕/api/mcp</code><br/>
                  5. 自定义 Headers 添加：<code style={{ background: "#f5f5f5", padding: "2px 6px", borderRadius: 4 }}>Authorization: Bearer 你的MCP密钥</code>
                </div>
              </div>

              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#06b6d4', marginBottom: 6 }}>WorkBuddy / Claude Desktop</div>
                <div style={{ fontSize: 13, color: '#555', lineHeight: 1.8 }}>
                  在 MCP 配置中添加 streamable HTTP 类型服务器，URL 填上面的地址，Header 同样填 Authorization Bearer。
                </div>
              </div>
            </div>

            {newKey && (
              <div style={{ background: '#f0fdf4', border: '1px solid #86efac', padding: 16, borderRadius: 12, marginBottom: 20 }}>
                <div style={{ fontSize: 13, marginBottom: 6, color: '#166534', fontWeight: 600 }}>{L.newKeyTitle}</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <code style={{ fontSize: 13, wordBreak: 'break-all', flex: 1 }}>{newKey}</code>
                  <button onClick={() => copyKey(newKey)} style={{ padding: '4px 10px', background: '#fff', border: '1px solid #ccc', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>
                    {copied ? '已复制' : '复制'}
                  </button>
                </div>
              </div>
            )}

            <button onClick={createKey}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '10px 20px', background: '#7c3aed', color: '#fff',
                border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 14, marginBottom: 20,
              }}>
              <Plus size={16} /> 创建新密钥
            </button>

            {mcpKeys.length > 0 && (
              <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #eef0f4', overflow: 'hidden' }}>
                {mcpKeys.map((k: any) => (
                  <div key={k.key} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '14px 16px', borderBottom: '1px solid #f5f5f5',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <Key size={16} color="#999" />
                      <div>
                        <code style={{ fontSize: 13 }}>{k.key.slice(0, 24)}…</code>
                        <div style={{ fontSize: 12, color: '#999' }}>
                          {k.name} · 最近使用 {k.last_used_at ? new Date(k.last_used_at).toLocaleDateString() : '从未'}
                        </div>
                      </div>
                    </div>
                    <button onClick={() => deleteKey(k.key)}
                      style={{ padding: '4px 10px', background: '#fee', color: 'crimson', border: '1px solid #fcc', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <footer style={{
        maxWidth: 1100, margin: '0 auto', padding: '24px',
        display: 'flex', gap: 16, fontSize: 12, color: '#999',
      }}>
        <a href="/terms" style={{ color: '#999' }}>{isZh ? '\u670D\u52A1\u6761\u6B3E' : 'Terms'}</a>
        <a href="/privacy" style={{ color: '#999' }}>{isZh ? '\u9690\u79C1\u653F\u7B56' : 'Privacy'}</a>
        <span>© {new Date().getFullYear()} playclass</span>
      </footer>

      {/* Post-cashier: stay in workbench; user returns via tab or this modal */}
      {cashierUrl && !payTarget && (
        <div
          style={{
            position: 'fixed', right: 20, bottom: 20, width: 320, zIndex: 40,
            background: '#fff', borderRadius: 14, padding: 18,
            boxShadow: '0 12px 40px rgba(15,23,42,.18)', border: '1px solid #e5e7eb',
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>
            {isZh ? '支付已在新标签页打开' : 'Checkout opened in a new tab'}
          </div>
          <p style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.6, marginBottom: 12 }}>
            {isZh
              ? '完成付款后回到本页点「我已支付」；若浏览器拦截了新窗口，可点「重新打开收银台」。'
              : 'After paying, return here and click “I paid”. If the tab was blocked, reopen checkout.'}
          </p>
          <div style={{ display: 'grid', gap: 8 }}>
            <button
              type="button"
              onClick={() => {
                setCashierUrl(null);
                window.location.href = '/orders';
              }}
              style={{
                padding: '10px 14px', borderRadius: 10, border: 'none',
                background: '#7c3aed', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 13,
              }}
            >
              {isZh ? '我已支付 · 查看订单' : 'I paid · View orders'}
            </button>
            <button
              type="button"
              onClick={() => window.open(cashierUrl, '_blank', 'noopener,noreferrer')}
              style={{
                padding: '10px 14px', borderRadius: 10, border: '1px solid #e5e7eb',
                background: '#fff', cursor: 'pointer', fontSize: 13,
              }}
            >
              {isZh ? '重新打开收银台' : 'Reopen checkout'}
            </button>
            <button
              type="button"
              onClick={() => setCashierUrl(null)}
              style={{
                padding: '8px 14px', borderRadius: 10, border: 'none',
                background: 'transparent', color: '#6b7280', cursor: 'pointer', fontSize: 12,
              }}
            >
              {isZh ? '继续留在工作台' : 'Stay in workbench'}
            </button>
          </div>
        </div>
      )}

      {/* Payment method chooser: Alipay / WeChat via ZPay */}
      {payTarget && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(15,23,42,.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
          }}
          onClick={() => setPayTarget(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 360, background: '#fff', borderRadius: 16, padding: 24,
              boxShadow: '0 16px 48px rgba(0,0,0,.2)',
            }}
          >
            <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>
              {isZh ? '选择支付方式' : 'Choose payment method'}
            </div>
            <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 16 }}>
              {isZh ? '通过 ZPay 收银台完成支付' : 'Checkout via ZPay'}
            </p>
            <div style={{ display: 'grid', gap: 10 }}>
              <button
                type="button"
                onClick={() => {
                  const t2 = payTarget;
                  setPayTarget(null);
                  void pay(t2.plan || '', t2.product, 'alipay');
                }}
                style={{
                  padding: '14px 16px', borderRadius: 12, border: '1.5px solid #1677ff',
                  background: '#f0f7ff', cursor: 'pointer', textAlign: 'left',
                  fontSize: 14, fontWeight: 600, color: '#1677ff',
                }}
              >
                {isZh ? '支付宝' : 'Alipay'}
                <div style={{ fontSize: 11, fontWeight: 400, color: '#64748b', marginTop: 2 }}>
                  {isZh ? '跳转支付宝扫码/登录付款' : 'Pay with Alipay'}
                </div>
              </button>
              <button
                type="button"
                onClick={() => {
                  const t2 = payTarget;
                  setPayTarget(null);
                  void pay(t2.plan || '', t2.product, 'wxpay');
                }}
                style={{
                  padding: '14px 16px', borderRadius: 12, border: '1.5px solid #07c160',
                  background: '#f0fdf4', cursor: 'pointer', textAlign: 'left',
                  fontSize: 14, fontWeight: 600, color: '#07c160',
                }}
              >
                {isZh ? '微信支付' : 'WeChat Pay'}
                <div style={{ fontSize: 11, fontWeight: 400, color: '#64748b', marginTop: 2 }}>
                  {isZh ? '跳转微信扫码付款' : 'Pay with WeChat'}
                </div>
              </button>
            </div>
            <button
              type="button"
              onClick={() => setPayTarget(null)}
              style={{
                marginTop: 16, width: '100%', padding: '10px', borderRadius: 10,
                border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontSize: 13,
              }}
            >
              {isZh ? '取消' : 'Cancel'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
