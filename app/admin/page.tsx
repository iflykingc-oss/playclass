'use client';

import { useEffect, useMemo, useState } from 'react';
import { safeJson, fmtDate, fmtDay } from '@/components/admin/safe-json';
import { formatCategory, formatOutcome, formatQualityReason } from '@/lib/i18n/quality-reason';
import { useI18n } from '@/lib/hooks/use-i18n';
import { ErrorBoundary } from '@/components/admin/error-boundary';
import {
  Users,
  Building2,
  CreditCard,
  Settings,
  Activity,
  BookOpen,
  Search,
  RefreshCw,
  Ban,
  CheckCircle2,
  KeyRound,
  Trash2,
  Pencil,
  X,
  Download,
  TrendingUp,
  Wallet,
  UserPlus,
  Layers,
  LogOut,
  ShieldCheck,
} from 'lucide-react';

type Tab = 'overview' | 'users' | 'orgs' | 'billing' | 'providers' | 'payment' | 'orders' | 'monitor' | 'courses';

const NAV: { id: Tab; label: string; icon: any; group: string }[] = [
  { id: 'overview', label: '总览', icon: Activity, group: '数据' },
  { id: 'monitor', label: '监控', icon: TrendingUp, group: '数据' },
  { id: 'orders', label: '订单', icon: Wallet, group: '数据' },
  { id: 'users', label: '用户管理', icon: Users, group: '业务' },
  { id: 'orgs', label: '机构管理', icon: Building2, group: '业务' },
  { id: 'courses', label: '课程目录', icon: BookOpen, group: '业务' },
  { id: 'billing', label: '套餐配置', icon: CreditCard, group: '商业化' },
  { id: 'payment', label: '支付配置', icon: CreditCard, group: '商业化' },
  { id: 'providers', label: '模型配置', icon: Settings, group: '系统' },
];

const SIDEBAR_W = 220;

/* ---------- tiny SVG charts (no chart lib) ---------- */
function Sparkline({
  data,
  color = '#7c3aed',
  height = 48,
}: {
  data: number[];
  color?: string;
  height?: number;
}) {
  if (!data.length) return <div style={{ height }} />;
  const max = Math.max(...data, 1);
  const w = 100;
  const step = data.length > 1 ? w / (data.length - 1) : w;
  const points = data
    .map((v, i) => `${(i * step).toFixed(1)},${(height - (v / max) * (height - 6) - 3).toFixed(1)}`)
    .join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${height}`} style={{ width: '100%', height }} preserveAspectRatio="none">
      <polyline fill="none" stroke={color} strokeWidth="2" points={points} />
      <polygon
        fill={`${color}22`}
        points={`0,${height} ${points} ${w},${height}`}
      />
    </svg>
  );
}

function BarChart({ data, color = '#7c3aed', height = 120 }: { data: { label: string; value: number }[]; color?: string; height?: number }) {
  if (!data.length) return <div style={{ height, background: '#f9fafb', borderRadius: 8 }} />;
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height, padding: '8px 0' }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <div
            title={`${d.label}: ${d.value}`}
            style={{
              width: '100%',
              maxWidth: 28,
              height: Math.max(4, (d.value / max) * (height - 28)),
              background: color,
              opacity: 0.85,
              borderRadius: 4,
            }}
          />
          <span style={{ fontSize: 9, color: '#9ca3af', whiteSpace: 'nowrap' }}>{d.label}</span>
        </div>
      ))}
    </div>
  );
}

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
  trend,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: any;
  color: string;
  trend?: number[];
}) {
  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 14,
        padding: 18,
        border: '1px solid #eef0f4',
        boxShadow: '0 1px 2px rgba(16,24,40,.04)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 500 }}>{label}</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#111827', marginTop: 6, letterSpacing: '-0.02em' }}>
            {value}
          </div>
          {sub && <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>{sub}</div>}
        </div>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: `${color}15`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon size={18} color={color} />
        </div>
      </div>
      {trend && trend.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <Sparkline data={trend} color={color} height={36} />
        </div>
      )}
    </div>
  );
}

function SectionCard({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 14,
        border: '1px solid #eef0f4',
        marginBottom: 20,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '14px 18px',
          borderBottom: '1px solid #f3f4f6',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <h3 style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{title}</h3>
        {action}
      </div>
      <div style={{ padding: 18 }}>{children}</div>
    </div>
  );
}

const btn = {
  primary: {
    padding: '8px 14px',
    borderRadius: 8,
    border: 'none',
    background: '#4f46e5',
    color: '#fff',
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 600,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
  },
  ghost: {
    padding: '6px 10px',
    borderRadius: 8,
    border: '1px solid #e5e7eb',
    background: '#fff',
    cursor: 'pointer',
    fontSize: 12,
    color: '#374151',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
  },
  danger: {
    padding: '6px 10px',
    borderRadius: 8,
    border: '1px solid #fecaca',
    background: '#fef2f2',
    cursor: 'pointer',
    fontSize: 12,
    color: '#b91c1c',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
  },
} as const;

const thStyle = {
  textAlign: 'left' as const,
  padding: '10px 12px',
  fontSize: 11,
  fontWeight: 600,
  color: '#6b7280',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.04em',
};

/* ================= page ================= */
export default function AdminPage() {
  const { locale } = useI18n();
  const [tab, setTab] = useState<Tab>('overview');
  const [usersData, setUsersData] = useState<{ users: any[]; total: number; page: number }>({
    users: [],
    total: 0,
    page: 1,
  });
  const [userQuery, setUserQuery] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [userPage, setUserPage] = useState(1);
  const [orgs, setOrgs] = useState<any[]>([]);
  const [monitor, setMonitor] = useState<any>({});
  const [plans, setPlans] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [billingSaved, setBillingSaved] = useState(false);
  const [qualityLog, setQualityLog] = useState<any>({ events: [], byEvent: [], byOutcome: [] });
  const [orders, setOrders] = useState<any[]>([]);
  const [orderStats, setOrderStats] = useState<any>({});
  const [courseList, setCourseList] = useState<any[]>([]);
  const [payConfig, setPayConfig] = useState<any>({});
  const [paySaved, setPaySaved] = useState(false);
  const [section, setSection] = useState('providers');
  const [sectionData, setSectionData] = useState<Record<string, any[]>>({});
  const [presets, setPresets] = useState<Record<string, any>>({});
  const [showForm, setShowForm] = useState(false);
  const [formId, setFormId] = useState('');
  const [formApiKey, setFormApiKey] = useState('');
  const [formBaseUrl, setFormBaseUrl] = useState('');
  const [formModels, setFormModels] = useState('');
  const [editUser, setEditUser] = useState<any>(null);
  const [toast, setToast] = useState('');
  const [busy, setBusy] = useState(false);

  function notify(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  }

  async function loadUsers() {
    const qs = new URLSearchParams({
      q: userQuery,
      plan: userFilter,
      page: String(userPage),
      pageSize: '20',
    });
    const d = await safeJson(`/api/admin/users?${qs}`);
    setUsersData({ users: d?.users || [], total: d?.total ?? 0, page: d?.page ?? userPage });
  }

  async function loadMonitor() {
    const d = await safeJson('/api/admin/monitor');
    setMonitor(d);
  }

  async function loadQuality() {
    try {
      const d = await safeJson<any>('/api/admin/quality?limit=50');
      setQualityLog(d || { events: [], byEvent: [], byOutcome: [] });
    } catch (e) {
      console.error(e);
    }
  }

  async function loadBilling() {
    const d = await safeJson('/api/admin/plans');
    setPlans(d.plans || []);
    setProducts(d.products || []);
  }

  useEffect(() => {
    loadUsers();
    loadMonitor();
    loadBilling();
    loadQuality();
    safeJson<any>('/api/admin/orgs').then((d) => setOrgs(d.orgs || []));
    safeJson<any>('/api/admin/orders').then((d) => {
      setOrders(d.orders || []);
      setOrderStats(d.stats || {});
    });
    safeJson<any>('/api/catalog/list').then((d) => setCourseList(d.courses || []));
    safeJson<any>('/api/admin/payment-config').then(setPayConfig);
    loadProviders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userPage, userFilter]);

  async function loadProviders() {
    try {
      const d = await safeJson('/api/admin/providers/manage');
      setSectionData(d.sections || {});
      setPresets(d.presets || {});
    } catch (e) {
      console.error(e);
    }
  }

  async function userAction(userId: string, action: string, extra: any = {}) {
    setBusy(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action, ...extra }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || 'failed');
      if (d.password) {
        notify(`新密码：${d.password}`);
        await navigator.clipboard?.writeText(d.password).catch(() => {});
      } else {
        notify('已更新');
      }
      await loadUsers();
      setEditUser(null);
    } catch (e: any) {
      notify(e.message || '操作失败');
    }
    setBusy(false);
  }

  async function savePlan(p: any) {
    await fetch('/api/admin/plans', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: p.id,
        type: 'plan',
        monthlyGenerations: Number(p.monthly_generations),
        monthlyVideoClips: Number(p.monthly_video_clips),
        videoExportCredits: Number(p.video_export_credits),
        priceCny: Number(p.price_cny),
        priceUsd: Number(p.price_usd),
        periodDays: Number(p.period_days),
        isActive: !!p.is_active,
      }),
    });
    setBillingSaved(true);
    setTimeout(() => setBillingSaved(false), 1500);
    loadBilling();
    notify('套餐已保存');
  }

  async function saveProduct(p: any) {
    await fetch('/api/admin/plans', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: p.id,
        type: 'product',
        units: Number(p.units),
        priceCny: Number(p.price_cny),
        priceUsd: Number(p.price_usd),
        isActive: !!p.is_active,
      }),
    });
    setBillingSaved(true);
    setTimeout(() => setBillingSaved(false), 1500);
    loadBilling();
    notify('加购包已保存');
  }


  async function markOrderPaid(outTradeNo: string) {
    if (!confirm(`确认将订单 ${outTradeNo} 标记为已支付并升级套餐？`)) return;
    const res = await fetch('/api/admin/orders', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'mark_paid', outTradeNo }),
    });
    const d = await res.json();
    notify(d.error || '已记账并应用套餐');
    fetch('/api/admin/orders').then((r) => r.json()).then((x) => {
      setOrders(x.orders || []);
      setOrderStats(x.stats || {});
    });
    loadUsers();
  }

  async function updateOrg(orgId: string, patch: any) {
    await fetch('/api/admin/orgs', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: orgId, ...patch }),
    });
    safeJson<any>('/api/admin/orgs').then((d) => setOrgs(d.orgs || []));
    notify('机构已更新');
  }

  // series for overview
  const signupSeries = useMemo(() => {
    const map = new Map<string, number>();
    (monitor.dailyUsers || []).forEach((r: any) => {
      map.set(String(r.day).slice(0, 10), Number(r.count));
    });
    return Array.from({ length: 14 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (13 - i));
      const key = d.toISOString().slice(0, 10);
      return map.get(key) ?? 0;
    });
  }, [monitor.dailyUsers]);

  const revenueSeries = useMemo(() => {
    const map = new Map<string, number>();
    (monitor.dailyRevenue || []).forEach((r: any) => {
      map.set(String(r.day).slice(0, 10), Number(r.revenue));
    });
    return Array.from({ length: 14 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (13 - i));
      const key = d.toISOString().slice(0, 10);
      return map.get(key) ?? 0;
    });
  }, [monitor.dailyRevenue]);

  const usageSeries = useMemo(() => {
    const map = new Map<string, number>();
    (monitor.dailyUsage || []).forEach((r: any) => {
      map.set(String(r.day).slice(0, 10), Number(r.count));
    });
    return Array.from({ length: 14 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (13 - i));
      const key = d.toISOString().slice(0, 10);
      return map.get(key) ?? 0;
    });
  }, [monitor.dailyUsage]);

  const hourlyBars = useMemo(() => {
    return (monitor.hourly || []).map((h: any) => ({
      label: String(h.hour).slice(11, 13) + 'h',
      value: Number(h.count),
    }));
  }, [monitor.hourly]);

  const kindBars = useMemo(() => {
    return (monitor.usageByKind || []).map((k: any) => ({
      label: String(k.kind).replace('_', ' '),
      value: Number(k.count),
    }));
  }, [monitor.usageByKind]);

  const stats = monitor.systemStats || {};

  function logout() {
    fetch('/api/admin/logout', { method: 'POST' }).finally(() => {
      window.location.href = '/admin/login';
    });
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f3f4f6' }}>
      {/* Sidebar */}
      <aside
        style={{
          width: SIDEBAR_W,
          background: '#0f172a',
          color: '#cbd5e1',
          display: 'flex',
          flexDirection: 'column',
          position: 'sticky',
          top: 0,
          height: '100vh',
          flexShrink: 0,
        }}
      >
        <div style={{ padding: '20px 18px 12px', borderBottom: '1px solid #1e293b' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ShieldCheck size={16} color="#fff" />
            </div>
            <div>
              <div style={{ fontWeight: 700, color: '#fff', fontSize: 14 }}>playclass</div>
              <div style={{ fontSize: 10, color: '#64748b' }}>管理控制台</div>
            </div>
          </div>
        </div>

        <nav style={{ flex: 1, overflowY: 'auto', padding: '12px 10px' }}>
          {['数据', '业务', '商业化', '系统'].map((group) => (
            <div key={group} style={{ marginBottom: 14 }}>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: '#475569',
                  padding: '4px 10px 6px',
                  letterSpacing: '0.06em',
                }}
              >
                {group}
              </div>
              {NAV.filter((n) => n.group === group).map((n) => {
                const active = tab === n.id;
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => setTab(n.id)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '9px 12px',
                      marginBottom: 2,
                      border: 'none',
                      borderRadius: 8,
                      cursor: 'pointer',
                      fontSize: 13,
                      fontWeight: active ? 600 : 400,
                      background: active ? '#4f46e5' : 'transparent',
                      color: active ? '#fff' : '#94a3b8',
                    }}
                  >
                    <n.icon size={15} />
                    {n.label}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <div style={{ padding: 12, borderTop: '1px solid #1e293b' }}>
          <a
            href="/dashboard"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 12px',
              borderRadius: 8,
              color: '#94a3b8',
              textDecoration: 'none',
              fontSize: 12,
            }}
          >
            <UserPlus size={14} /> 用户工作台
          </a>
          <button
            onClick={logout}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 12px',
              borderRadius: 8,
              border: 'none',
              background: 'transparent',
              color: '#f87171',
              cursor: 'pointer',
              fontSize: 12,
            }}
          >
            <LogOut size={14} /> 退出登录
          </button>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, padding: '28px 32px', maxWidth: 1200, minWidth: 0 }}>
        <ErrorBoundary label="管理后台">
        {/* header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 24,
          }}
        >
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111827', letterSpacing: '-0.02em' }}>
              {NAV.find((n) => n.id === tab)?.label}
            </h1>
            <p style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>
              {tab === 'overview' && '平台核心指标与近 30 天趋势'}
              {tab === 'users' && '查看、搜索并管理用户账号、套餐与配额'}
              {tab === 'monitor' && '用量、会话与活跃用户实时监控'}
              {tab === 'billing' && '套餐次数、视频额度与双币定价'}
              {tab === 'orders' && '支付订单与营收'}
            </p>
          </div>
          <button
            onClick={() => {
              loadUsers();
              loadMonitor();
              loadBilling();
              notify('已刷新');
            }}
            style={btn.ghost}
          >
            <RefreshCw size={13} /> 刷新
          </button>
        </div>


        {/* Always-visible tab strip — easier to hit than sidebar groups */}
        <div
          data-tabs-top
          style={{
            display: 'flex',
            gap: 6,
            flexWrap: 'wrap',
            marginBottom: 20,
            background: '#fff',
            padding: 6,
            borderRadius: 12,
            border: '1px solid #e5e7eb',
          }}
        >
          {NAV.map((n) => {
            const active = tab === n.id;
            return (
              <button
                key={n.id}
                type="button"
                onClick={() => {
                  console.log('[admin] switch tab ->', n.id);
                  setTab(n.id);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 14px',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: active ? 600 : 500,
                  background: active ? '#4f46e5' : '#f3f4f6',
                  color: active ? '#fff' : '#374151',
                }}
              >
                <n.icon size={14} />
                {n.label}
              </button>
            );
          })}
        </div>

        {toast && (
          <div
            style={{
              position: 'fixed',
              top: 20,
              right: 20,
              background: '#111827',
              color: '#fff',
              padding: '10px 16px',
              borderRadius: 10,
              fontSize: 13,
              zIndex: 50,
              boxShadow: '0 8px 24px rgba(0,0,0,.2)',
            }}
          >
            {toast}
          </div>
        )}

        {/* ============ OVERVIEW ============ */}
        {tab === 'overview' && (
          <>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 14,
                marginBottom: 20,
              }}
            >
              <KpiCard
                label="用户总数"
                value={stats.total_users ?? 0}
                sub={`启用 ${stats.active_users ?? 0} · 7日新增 ${stats.new_7d ?? 0}`}
                icon={Users}
                color="#4f46e5"
                trend={signupSeries}
              />
              <KpiCard
                label="营收（¥）"
                value={`¥${Number(stats.total_revenue || 0).toFixed(0)}`}
                sub={`近30天 ¥${Number(stats.revenue_30d || 0).toFixed(0)} · ${stats.paid_orders ?? 0} 单`}
                icon={Wallet}
                color="#059669"
                trend={revenueSeries}
              />
              <KpiCard
                label="30 天操作"
                value={stats.actions_7d ?? 0}
                sub={`24h ${stats.actions_24h ?? 0} · 活跃会话 ${stats.active_sessions ?? 0}`}
                icon={Activity}
                color="#d97706"
                trend={usageSeries}
              />
              <KpiCard
                label="已发布课程"
                value={stats.published_courses ?? 0}
                sub={`机构 ${orgs.length} · 订单 ${stats.paid_orders ?? 0}`}
                icon={Layers}
                color="#db2777"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
              <SectionCard
                title="近 14 天：注册 / 用量"
                action={
                  <div style={{ display: 'flex', gap: 12, fontSize: 11, color: '#6b7280' }}>
                    <span>
                      <i style={{ display: 'inline-block', width: 8, height: 8, background: '#4f46e5', borderRadius: 2 }} /> 注册
                    </span>
                    <span>
                      <i style={{ display: 'inline-block', width: 8, height: 8, background: '#d97706', borderRadius: 2 }} /> 用量
                    </span>
                  </div>
                }
              >
                <div style={{ display: 'grid', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4 }}>新用户</div>
                    <Sparkline data={signupSeries} color="#4f46e5" height={56} />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4 }}>操作量</div>
                    <Sparkline data={usageSeries} color="#d97706" height={56} />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4 }}>营收（¥）</div>
                    <Sparkline data={revenueSeries} color="#059669" height={56} />
                  </div>
                </div>
              </SectionCard>

              <SectionCard title="用量构成（30 天）">
                {kindBars.length === 0 ? (
                  <p style={{ color: '#9ca3af', fontSize: 13, textAlign: 'center', padding: 20 }}>暂无数据</p>
                ) : (
                  <div style={{ display: 'grid', gap: 10 }}>
                    {kindBars.map((k: any) => (
                      <div key={k.label}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                          <span style={{ color: '#374151' }}>{k.label}</span>
                          <span style={{ fontWeight: 600 }}>{k.value}</span>
                        </div>
                        <div style={{ height: 6, background: '#f3f4f6', borderRadius: 3 }}>
                          <div
                            style={{
                              height: '100%',
                              width: `${Math.min(100, (k.value / Math.max(...kindBars.map((x: any) => x.value), 1)) * 100)}%`,
                              background: '#6366f1',
                              borderRadius: 3,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 4 }}>
              <SectionCard title="24 小时操作分布">
                <BarChart data={hourlyBars} color="#6366f1" height={120} />
              </SectionCard>
              <SectionCard title="用量 Top 用户（30 天）">
                {(monitor.topUsers || []).length === 0 ? (
                  <p style={{ color: '#9ca3af', fontSize: 13, textAlign: 'center', padding: 20 }}>暂无数据</p>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr>
                        <th style={{ ...thStyle, padding: '6px 0' }}>用户</th>
                        <th style={{ ...thStyle, padding: '6px 0' }}>套餐</th>
                        <th style={{ ...thStyle, padding: '6px 0', textAlign: 'right' }}>生成</th>
                        <th style={{ ...thStyle, padding: '6px 0', textAlign: 'right' }}>操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(monitor.topUsers || []).slice(0, 8).map((u: any) => (
                        <tr key={u.email}>
                          <td style={{ padding: '6px 0', color: '#111827' }}>{u.email}</td>
                          <td style={{ padding: '6px 0' }}>
                            <span
                              style={{
                                fontSize: 10,
                                padding: '2px 6px',
                                borderRadius: 4,
                                background: '#eef2ff',
                                color: '#4338ca',
                              }}
                            >
                              {u.plan}
                            </span>
                          </td>
                          <td style={{ padding: '6px 0', textAlign: 'right', fontWeight: 600 }}>{u.generations}</td>
                          <td style={{ padding: '6px 0', textAlign: 'right', color: '#6b7280' }}>{u.actions}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </SectionCard>
            </div>
          </>
        )}

        {/* ============ USERS ============ */}
        {tab === 'users' && (
          <>
            <SectionCard
              title={`用户列表（${usersData.total}）`}
              action={
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      background: '#f9fafb',
                      border: '1px solid #e5e7eb',
                      borderRadius: 8,
                      padding: '6px 10px',
                    }}
                  >
                    <Search size={13} color="#9ca3af" />
                    <input
                      value={userQuery}
                      onChange={(e) => setUserQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && loadUsers()}
                      placeholder="搜索邮箱 / 昵称"
                      style={{ border: 'none', outline: 'none', fontSize: 12, background: 'transparent', width: 160 }}
                    />
                  </div>
                  <select
                    value={userFilter}
                    onChange={(e) => {
                      setUserFilter(e.target.value);
                      setUserPage(1);
                    }}
                    style={{
                      padding: '7px 10px',
                      borderRadius: 8,
                      border: '1px solid #e5e7eb',
                      fontSize: 12,
                      background: '#fff',
                    }}
                  >
                    <option value="">全部套餐</option>
                    <option value="free">free</option>
                    <option value="pro_monthly">pro_monthly</option>
                    <option value="pro_plus_monthly">pro_plus_monthly</option>
                    <option value="enterprise_yearly">enterprise_yearly</option>
                  </select>
                  <button onClick={loadUsers} style={btn.primary}>
                    <Search size={13} /> 查询
                  </button>
                  <a href="/api/admin/export?type=users" style={{ ...btn.ghost, textDecoration: 'none' }}>
                    导出 CSV
                  </a>
                </div>
              }
            >
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr>
                      <th style={thStyle}>用户</th>
                      <th style={thStyle}>类型</th>
                      <th style={thStyle}>套餐</th>
                      <th style={thStyle}>用量</th>
                      <th style={thStyle}>付费</th>
                      <th style={thStyle}>状态</th>
                      <th style={thStyle}>注册</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(usersData.users || []).map((u: any) => (
                      <tr key={u.id} style={{ borderTop: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '10px 12px' }}>
                          <div style={{ fontWeight: 600, color: '#111827' }}>{u.name || '-'}</div>
                          <div style={{ fontSize: 11, color: '#6b7280' }}>{u.email}</div>
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <span
                            style={{
                              fontSize: 11,
                              padding: '2px 8px',
                              borderRadius: 999,
                              background: u.account_type === 'org' ? '#fce7f3' : '#e0e7ff',
                              color: u.account_type === 'org' ? '#9d174d' : '#3730a3',
                            }}
                          >
                            {u.account_type === 'org' ? '机构' : '个人'}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <span
                            style={{
                              fontSize: 11,
                              padding: '2px 8px',
                              borderRadius: 999,
                              background: u.plan === 'free' ? '#f3f4f6' : '#dcfce7',
                              color: u.plan === 'free' ? '#6b7280' : '#166534',
                              fontWeight: 600,
                            }}
                          >
                            {u.plan}
                          </span>
                          {u.plan_expires_at && (
                            <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>
                              至 {new Date(u.plan_expires_at).toLocaleDateString()}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <div style={{ fontSize: 12 }}>
                            生成 {u.used_generations ?? 0}/{u.monthly_generations ?? '-'}
                          </div>
                          <div style={{ fontSize: 11, color: '#9ca3af' }}>
                            视频 {u.used_video_clips ?? 0} +{u.bonus_video_clips ?? 0}
                          </div>
                        </td>
                        <td style={{ padding: '10px 12px', fontWeight: 600, color: '#059669' }}>{u.paid_orders ?? 0}</td>
                        <td style={{ padding: '10px 12px' }}>
                          {u.disabled ? (
                            <span style={{ fontSize: 11, color: '#b91c1c', background: '#fef2f2', padding: '2px 8px', borderRadius: 999 }}>
                              已禁用
                            </span>
                          ) : (
                            <span style={{ fontSize: 11, color: '#059669', background: '#ecfdf5', padding: '2px 8px', borderRadius: 999 }}>
                              正常
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '10px 12px', fontSize: 11, color: '#9ca3af' }}>
                          {fmtDay(u.created_at)}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                          <button onClick={() => setEditUser(u)} style={btn.ghost}>
                            <Pencil size={12} /> 管理
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: 14,
                  fontSize: 12,
                  color: '#6b7280',
                }}
              >
                <span>
                  第 {usersData.page} 页 · 共 {usersData.total} 条
                </span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    disabled={userPage <= 1}
                    onClick={() => setUserPage((p) => Math.max(1, p - 1))}
                    style={{ ...btn.ghost, opacity: userPage <= 1 ? 0.4 : 1 }}
                  >
                    上一页
                  </button>
                  <button
                    disabled={userPage * 20 >= usersData.total}
                    onClick={() => setUserPage((p) => p + 1)}
                    style={{ ...btn.ghost, opacity: userPage * 20 >= usersData.total ? 0.4 : 1 }}
                  >
                    下一页
                  </button>
                </div>
              </div>
            </SectionCard>

            {/* user edit drawer / panel */}
            {editUser && (
              <div
                style={{
                  position: 'fixed',
                  inset: 0,
                  background: 'rgba(15,23,42,.45)',
                  display: 'flex',
                  justifyContent: 'flex-end',
                  zIndex: 40,
                }}
                onClick={() => setEditUser(null)}
              >
                <div
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    width: 400,
                    height: '100%',
                    background: '#fff',
                    padding: 24,
                    overflowY: 'auto',
                    boxShadow: '-8px 0 32px rgba(0,0,0,.12)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                    <div>
                      <h3 style={{ fontSize: 16, fontWeight: 700 }}>{editUser.name || editUser.email}</h3>
                      <p style={{ fontSize: 12, color: '#6b7280' }}>{editUser.email}</p>
                    </div>
                    <button onClick={() => setEditUser(null)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}>
                      <X size={18} />
                    </button>
                  </div>

                  <div style={{ display: 'grid', gap: 18 }}>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>套餐</label>
                      <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                        <select
                          defaultValue={editUser.plan}
                          id="plan-select"
                          style={{
                            flex: 1,
                            padding: '8px 10px',
                            borderRadius: 8,
                            border: '1px solid #e5e7eb',
                            fontSize: 13,
                          }}
                        >
                          {['free', 'pro_monthly', 'pro_plus_monthly', 'enterprise_yearly'].map((p) => (
                            <option key={p} value={p}>
                              {p}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => {
                            const plan = (document.getElementById('plan-select') as HTMLSelectElement).value;
                            userAction(editUser.id, 'set_plan', { plan, planDays: 30 });
                          }}
                          style={btn.primary}
                          disabled={busy}
                        >
                          设置
                        </button>
                      </div>
                    </div>

                    <div>
                      <label style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>单用户配额覆盖</label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 6, marginTop: 6 }}>
                        <input id="q-gen" type="number" placeholder="生成" defaultValue={editUser.monthly_generations} style={{ padding: 8, borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }} />
                        <input id="q-vid" type="number" placeholder="视频" style={{ padding: 8, borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }} />
                        <input id="q-exp" type="number" placeholder="导出" style={{ padding: 8, borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }} />
                        <button
                          onClick={() => {
                            const g = (document.getElementById('q-gen') as HTMLInputElement).value;
                            const v = (document.getElementById('q-vid') as HTMLInputElement).value;
                            const x = (document.getElementById('q-exp') as HTMLInputElement).value;
                            userAction(editUser.id, 'set_quota', {
                              monthlyGenerations: g ? Number(g) : undefined,
                              monthlyVideoClips: v ? Number(v) : undefined,
                              videoExportCredits: x ? Number(x) : undefined,
                            });
                          }}
                          style={btn.primary}
                        >
                          保存
                        </button>
                      </div>
                    </div>

                    <div>
                      <label style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>加购余额</label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 6, marginTop: 6 }}>
                        <input id="b-vid" type="number" placeholder="视频包条数" defaultValue={editUser.bonus_video_clips} style={{ padding: 8, borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }} />
                        <input id="b-exp" type="number" placeholder="导出次数" style={{ padding: 8, borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }} />
                        <button
                          onClick={() => {
                            const v = (document.getElementById('b-vid') as HTMLInputElement).value;
                            const x = (document.getElementById('b-exp') as HTMLInputElement).value;
                            userAction(editUser.id, 'grant_bonus', {
                              bonusVideoClips: v ? Number(v) : undefined,
                              bonusVideoExports: x ? Number(x) : undefined,
                            });
                          }}
                          style={btn.primary}
                        >
                          保存
                        </button>
                      </div>
                    </div>

                    <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: 16 }}>
                      <label style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>危险操作</label>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                        <button
                          onClick={() => userAction(editUser.id, 'reset_password')}
                          style={btn.ghost}
                          disabled={busy}
                        >
                          <KeyRound size={12} /> 重置密码
                        </button>
                        <button
                          onClick={() =>
                            userAction(editUser.id, 'toggle_disabled', {
                              disabled: !editUser.disabled,
                              reason: editUser.disabled ? '' : '管理员禁用',
                            })
                          }
                          style={editUser.disabled ? btn.ghost : btn.danger}
                          disabled={busy}
                        >
                          {editUser.disabled ? (
                            <>
                              <CheckCircle2 size={12} /> 解除禁用
                            </>
                          ) : (
                            <>
                              <Ban size={12} /> 禁用账号
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('确认注销该用户？邮箱将被匿名化，操作不可恢复。')) {
                              fetch(`/api/admin/users?userId=${editUser.id}`, { method: 'DELETE' }).then(() => {
                                notify('已注销');
                                setEditUser(null);
                                loadUsers();
                              });
                            }
                          }}
                          style={btn.danger}
                        >
                          <Trash2 size={12} /> 注销账号
                        </button>
                      </div>
                    </div>

                    <div style={{ background: '#f9fafb', borderRadius: 10, padding: 12, fontSize: 12, color: '#6b7280' }}>
                      <div>ID：{editUser.id}</div>
                      <div>总操作：{editUser.total_actions ?? 0}</div>
                      <div>
                        最近活动：
                        {fmtDate(editUser.last_action)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* ============ MONITOR ============ */}
        {tab === 'monitor' && (
          <>
            <SectionCard
              title="质量事件落盘（成功 / 失败 / 降级原因）"
              action={
                <button type="button" onClick={loadQuality} style={btn.ghost}>
                  刷新
                </button>
              }
            >
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 14 }}>
                {(
                  qualityLog.byOutcome ||
                  []
                ).map((o: any) => (
                  <div
                    key={o.outcome}
                    style={{
                      background:
                        o.outcome === 'success'
                          ? '#ecfdf5'
                          : o.outcome === 'degraded'
                            ? '#fffbeb'
                            : '#fef2f2',
                      border: '1px solid #e5e7eb',
                      borderRadius: 10,
                      padding: 12,
                    }}
                  >
                    <div style={{ fontSize: 11, color: '#6b7280' }}>{o.outcome} · 30 天</div>
                    <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>{o.count}</div>
                  </div>
                ))}
                {(qualityLog.byOutcome || []).length === 0 && (
                  <div style={{ gridColumn: '1 / -1', fontSize: 13, color: '#9ca3af' }}>
                    暂无质量事件。生成带 TTS 的课或触发互动错误后会落盘。
                  </div>
                )}
              </div>

              <div style={{ overflowX: 'auto', maxHeight: 360, overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr>
                      <th style={thStyle}>时间</th>
                    <th style={thStyle}>记账</th>
                      <th style={thStyle}>类别</th>
                      <th style={thStyle}>事件</th>
                      <th style={thStyle}>结果</th>
                      <th style={thStyle}>原因 / 降级说明</th>
                      <th style={thStyle}>用户</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(qualityLog.events || []).map((e: any) => (
                      <tr key={e.id} style={{ borderTop: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '8px 10px', color: '#6b7280', whiteSpace: 'nowrap' }}>
                          {fmtDate(e.created_at)}
                        </td>
                        <td style={{ padding: '8px 10px' }}>{formatCategory(e.category, locale)}</td>
                        <td style={{ padding: '8px 10px', fontWeight: 600 }}>{e.event}</td>
                        <td style={{ padding: '8px 10px' }}>
                          <span
                            style={{
                              fontSize: 11,
                              padding: '2px 8px',
                              borderRadius: 999,
                              background:
                                e.outcome === 'success'
                                  ? '#dcfce7'
                                  : e.outcome === 'degraded'
                                    ? '#fef3c7'
                                    : '#fee2e2',
                              color:
                                e.outcome === 'success'
                                  ? '#166534'
                                  : e.outcome === 'degraded'
                                    ? '#92400e'
                                    : '#b91c1c',
                            }}
                          >
                            {formatOutcome(e.outcome, locale)}
                          </span>
                        </td>
                        <td
                          style={{
                            padding: '8px 10px',
                            color: '#4b5563',
                            maxWidth: 360,
                            wordBreak: 'break-word',
                          }}
                        >
                          {formatQualityReason(e.reason, locale)}
                          {e.meta && (e.meta.voice || e.meta.providerId) && (
                            <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
                              音色锁定: {e.meta.providerId || '-'} / {e.meta.voice || '-'}
                            </div>
                          )}
                          {Array.isArray(e.meta?.failures) && e.meta.failures.length > 0 && (
                            <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
                              失败 {e.meta.failures.length} 条 ·{' '}
                              {formatQualityReason(String((e.meta.failures as any)?.[0]?.reason || ''), locale).slice(0, 80)}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '8px 10px', color: '#6b7280' }}>{e.email || e.user_id || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <SectionCard title="24h 操作趋势">
                <BarChart data={hourlyBars} color="#4f46e5" height={140} />
              </SectionCard>
              <SectionCard title="用量类型（30 天）">
                <BarChart data={kindBars} color="#059669" height={140} />
              </SectionCard>
            </div>

            <SectionCard title="用户配额明细">
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr>
                      <th style={thStyle}>用户</th>
                      <th style={thStyle}>套餐</th>
                      <th style={thStyle}>生成用量</th>
                      <th style={thStyle}>视频</th>
                      <th style={thStyle}>总操作</th>
                      <th style={thStyle}>课程</th>
                      <th style={thStyle}>最近活动</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(monitor.userDetail || []).map((u: any) => (
                      <tr key={u.id} style={{ borderTop: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '8px 12px' }}>
                          <div style={{ fontWeight: 500 }}>{u.email}</div>
                          {u.disabled && <span style={{ fontSize: 10, color: '#b91c1c' }}>已禁用</span>}
                        </td>
                        <td style={{ padding: '8px 12px' }}>{u.plan || 'free'}</td>
                        <td style={{ padding: '8px 12px' }}>
                          {u.used_generations ?? 0}/{u.monthly_generations ?? '-'}
                        </td>
                        <td style={{ padding: '8px 12px' }}>{u.used_video_clips ?? 0}</td>
                        <td style={{ padding: '8px 12px' }}>{u.total_actions ?? 0}</td>
                        <td style={{ padding: '8px 12px' }}>{u.courses_published ?? 0}</td>
                        <td style={{ padding: '8px 12px', color: '#6b7280' }}>
                          {fmtDate(u.last_action)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <SectionCard title="活跃会话">
                <div style={{ display: 'grid', gap: 8, maxHeight: 320, overflowY: 'auto' }}>
                  {(monitor.activeSessions || []).map((s: any, i: number) => (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: 12,
                        padding: '8px 10px',
                        background: '#f9fafb',
                        borderRadius: 8,
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 500 }}>{s.email || s.user_id?.slice(0, 10)}</div>
                        <div style={{ color: '#9ca3af', fontSize: 11 }}>{s.ip || '-'}</div>
                      </div>
                      <div style={{ color: '#6b7280', fontSize: 11 }}>
                        {fmtDate(s.created_at)}
                      </div>
                    </div>
                  ))}
                  {(monitor.activeSessions || []).length === 0 && (
                    <p style={{ color: '#9ca3af', textAlign: 'center', padding: 20 }}>暂无活跃会话</p>
                  )}
                </div>
              </SectionCard>

              <SectionCard title="最近操作">
                <div style={{ display: 'grid', gap: 6, maxHeight: 320, overflowY: 'auto' }}>
                  {(monitor.recentUsage || []).map((u: any) => (
                    <div
                      key={u.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: 11,
                        padding: '6px 8px',
                        borderBottom: '1px solid #f3f4f6',
                      }}
                    >
                      <span>
                        <strong>{u.kind}</strong> · {u.email || '-'}
                      </span>
                      <span style={{ color: '#9ca3af' }}>
                        {fmtDate(u.created_at)}
                      </span>
                    </div>
                  ))}
                </div>
              </SectionCard>
            </div>
          </>
        )}

        {/* ============ ORGS ============ */}
        {tab === 'orgs' && (
          <SectionCard title={`机构（${orgs.length}）`}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={thStyle}>机构</th>
                  <th style={thStyle}>套餐</th>
                  <th style={thStyle}>席位</th>
                  <th style={thStyle}>管理员</th>
                </tr>
              </thead>
              <tbody>
                {orgs.map((o: any) => (
                  <tr key={o.id} style={{ borderTop: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '12px', fontWeight: 600 }}>{o.name}</td>
                    <td style={{ padding: '12px' }}>
                      <select
                        value={o.plan}
                        onChange={(e) => updateOrg(o.id, { plan: e.target.value })}
                        style={{ padding: 6, borderRadius: 6, border: '1px solid #e5e7eb', fontSize: 12 }}
                      >
                        <option value="free">free</option>
                        <option value="pro_monthly">pro_monthly</option>
                        <option value="pro_plus_monthly">pro_plus_monthly</option>
                        <option value="enterprise_yearly">enterprise_yearly</option>
                      </select>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <input
                        type="number"
                        min={1}
                        defaultValue={o.seat_count}
                        onBlur={(e) => {
                          const n = Number(e.target.value);
                          if (n > 0 && n !== o.seat_count) updateOrg(o.id, { seatCount: n });
                        }}
                        style={{ width: 70, padding: 6, borderRadius: 6, border: '1px solid #e5e7eb', fontSize: 12 }}
                      />
                      <span style={{ marginLeft: 8, fontSize: 11, color: '#9ca3af' }}>{o.used_seats ?? 0} 已用</span>
                    </td>
                    <td style={{ padding: '12px', color: '#6b7280' }}>{o.owner_email}</td>
                  </tr>
                ))}
                {orgs.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ padding: 32, textAlign: 'center', color: '#9ca3af' }}>
                      暂无机构
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </SectionCard>
        )}

        {/* ============ BILLING ============ */}
        {tab === 'billing' && (
          <>
            {billingSaved && (
              <div
                style={{
                  marginBottom: 12,
                  padding: '10px 14px',
                  background: '#ecfdf5',
                  color: '#065f46',
                  borderRadius: 8,
                  fontSize: 13,
                }}
              >
                已保存
              </div>
            )}
            <SectionCard title="订阅套餐">
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr>
                    <th style={thStyle}>套餐</th>
                    <th style={thStyle}>生成/月</th>
                    <th style={thStyle}>AI 视频</th>
                    <th style={thStyle}>导出</th>
                    <th style={thStyle}>¥</th>
                    <th style={thStyle}>$</th>
                    <th style={thStyle}>天</th>
                    <th style={thStyle}>上架</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {plans.map((p: any, idx: number) => (
                    <tr key={p.id} style={{ borderTop: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '8px 12px', fontWeight: 600 }}>{p.id}</td>
                      {(['monthly_generations', 'monthly_video_clips', 'video_export_credits', 'price_cny', 'price_usd', 'period_days'] as const).map(
                        (field) => (
                          <td key={field} style={{ padding: '4px' }}>
                            <input
                              type="number"
                              value={p[field]}
                              onChange={(e) => {
                                const next = [...plans];
                                next[idx] = { ...p, [field]: e.target.value };
                                setPlans(next);
                              }}
                              style={{ width: 70, padding: 5, borderRadius: 6, border: '1px solid #e5e7eb', fontSize: 12 }}
                            />
                          </td>
                        ),
                      )}
                      <td>
                        <input
                          type="checkbox"
                          checked={!!p.is_active}
                          onChange={(e) => {
                            const next = [...plans];
                            next[idx] = { ...p, is_active: e.target.checked };
                            setPlans(next);
                          }}
                        />
                      </td>
                      <td>
                        <button onClick={() => savePlan(p)} style={btn.primary}>
                          保存
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </SectionCard>

            <SectionCard title="加购包">
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr>
                    <th style={thStyle}>SKU</th>
                    <th style={thStyle}>类型</th>
                    <th style={thStyle}>数量</th>
                    <th style={thStyle}>¥</th>
                    <th style={thStyle}>$</th>
                    <th style={thStyle}>上架</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {products.map((p: any, idx: number) => (
                    <tr key={p.id} style={{ borderTop: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '8px 12px', fontWeight: 600 }}>{p.id}</td>
                      <td style={{ padding: '8px 12px', color: '#6b7280' }}>{p.kind}</td>
                      {(['units', 'price_cny', 'price_usd'] as const).map((field) => (
                        <td key={field} style={{ padding: '4px' }}>
                          <input
                            type="number"
                            value={p[field]}
                            onChange={(e) => {
                              const next = [...products];
                              next[idx] = { ...p, [field]: e.target.value };
                              setProducts(next);
                            }}
                            style={{ width: 70, padding: 5, borderRadius: 6, border: '1px solid #e5e7eb', fontSize: 12 }}
                          />
                        </td>
                      ))}
                      <td>
                        <input
                          type="checkbox"
                          checked={!!p.is_active}
                          onChange={(e) => {
                            const next = [...products];
                            next[idx] = { ...p, is_active: e.target.checked };
                            setProducts(next);
                          }}
                        />
                      </td>
                      <td>
                        <button onClick={() => saveProduct(p)} style={btn.primary}>
                          保存
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </SectionCard>
          </>
        )}

        {/* ============ ORDERS ============ */}
        {tab === 'orders' && (
          <>
            <div style={{ marginBottom: 12, display: 'flex', gap: 8 }}>
              <a href="/api/admin/export?type=orders" style={{ ...btn.ghost, textDecoration: 'none' }}>导出订单 CSV</a>
              <a href="/api/admin/export?type=usage&days=30" style={{ ...btn.ghost, textDecoration: 'none' }}>导出用量 CSV</a>
              <a href="/api/admin/export?type=quality&days=30" style={{ ...btn.ghost, textDecoration: 'none' }}>导出质量 CSV</a>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 16 }}>
              <KpiCard label="订单总数" value={orderStats.total_orders || 0} icon={CreditCard} color="#4f46e5" />
              <KpiCard label="已支付" value={orderStats.paid_orders || 0} icon={CheckCircle2} color="#059669" />
              <KpiCard label="营收（¥）" value={`¥${orderStats.total_revenue || 0}`} icon={Wallet} color="#d97706" />
            </div>
            <SectionCard title="订单列表">
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr>
                    <th style={thStyle}>订单号</th>
                    <th style={thStyle}>用户</th>
                    <th style={thStyle}>商品</th>
                    <th style={thStyle}>金额</th>
                    <th style={thStyle}>状态</th>
                    <th style={thStyle}>时间</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o: any) => (
                    <tr key={o.id} style={{ borderTop: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontSize: 11 }}>{o.out_trade_no?.slice(0, 22)}</td>
                      <td style={{ padding: '10px 12px' }}>{o.email || '-'}</td>
                      <td style={{ padding: '10px 12px' }}>{o.subject}</td>
                      <td style={{ padding: '10px 12px', fontWeight: 600 }}>¥{o.money}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <span
                          style={{
                            fontSize: 11,
                            padding: '2px 8px',
                            borderRadius: 999,
                            background: o.status === 'paid' ? '#dcfce7' : '#f3f4f6',
                            color: o.status === 'paid' ? '#166534' : '#6b7280',
                          }}
                        >
                          {o.status === 'paid' ? '已支付' : o.status}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', color: '#6b7280' }}>
                        {fmtDate(o.created_at)}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        {o.status === 'pending' ? (
                          <button type="button" onClick={() => markOrderPaid(o.out_trade_no)} style={btn.primary}>
                            手动记账
                          </button>
                        ) : (
                          <span style={{ fontSize: 11, color: '#059669' }}>已入账</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {orders.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ padding: 32, textAlign: 'center', color: '#9ca3af' }}>
                        暂无订单
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </SectionCard>
          </>
        )}

        {/* ============ PAYMENT ============ */}
        {tab === 'payment' && (
          <SectionCard title="ZPay 易支付">
            <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 16 }}>
              配置后用户可在工作台发起支付。密钥保存后只显示掩码。
            </p>
            <div style={{ display: 'grid', gap: 12, maxWidth: 480 }}>
              {[
                { key: 'zpay_pid', label: '商户 ID (pid)' },
                { key: 'zpay_key', label: '商户密钥 (key)' },
                { key: 'zpay_api_url', label: '网关地址' },
              ].map((f) => (
                <div key={f.key}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: '#374151' }}>
                    {f.label}
                  </label>
                  <input
                    value={payConfig[f.key] || ''}
                    onChange={(e) => setPayConfig({ ...payConfig, [f.key]: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13 }}
                  />
                </div>
              ))}
              <button
                onClick={async () => {
                  await fetch('/api/admin/payment-config', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payConfig),
                  });
                  setPaySaved(true);
                  setTimeout(() => setPaySaved(false), 2000);
                  notify('支付配置已保存');
                }}
                style={{ ...btn.primary, padding: '10px 18px', width: 'fit-content' }}
              >
                保存配置
              </button>
              {paySaved && <span style={{ color: '#059669', fontSize: 12 }}>已保存</span>}
            </div>
          </SectionCard>
        )}

        {/* ============ PROVIDERS ============ */}
        {tab === 'providers' && (
          <SectionCard
            title="模型服务配置"
            action={
              <button onClick={() => setShowForm(!showForm)} style={btn.primary}>
                {showForm ? '取消' : '添加配置'}
              </button>
            }
          >
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              {[
                ['providers', 'LLM'],
                ['tts', 'TTS'],
                ['asr', 'ASR'],
                ['pdf', 'PDF'],
                ['image', '图像'],
                ['video', '视频'],
                ['web-search', '搜索'],
              ].map(([k, label]) => (
                <button
                  key={k}
                  onClick={() => {
                    setSection(k);
                    setShowForm(false);
                  }}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 999,
                    border: section === k ? '1.5px solid #4f46e5' : '1px solid #e5e7eb',
                    background: section === k ? '#eef2ff' : '#fff',
                    color: section === k ? '#4338ca' : '#6b7280',
                    fontSize: 12,
                    fontWeight: section === k ? 600 : 400,
                    cursor: 'pointer',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {showForm && (
              <div
                style={{
                  background: '#f9fafb',
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 16,
                  display: 'grid',
                  gap: 10,
                }}
              >
                <input
                  value={formId}
                  onChange={(e) => {
                    setFormId(e.target.value);
                    const p = presets[section]?.[e.target.value];
                    if (p) {
                      setFormBaseUrl(p.baseUrl || '');
                      setFormModels((p.models || []).join(', '));
                    }
                  }}
                  placeholder="Provider ID，如 openai / deepseek"
                  style={{ padding: 10, borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13 }}
                />
                <input
                  type="password"
                  value={formApiKey}
                  onChange={(e) => setFormApiKey(e.target.value)}
                  placeholder="API Key"
                  style={{ padding: 10, borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13 }}
                />
                <input
                  value={formBaseUrl}
                  onChange={(e) => setFormBaseUrl(e.target.value)}
                  placeholder="Base URL（可选）"
                  style={{ padding: 10, borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13 }}
                />
                <input
                  value={formModels}
                  onChange={(e) => setFormModels(e.target.value)}
                  placeholder="模型，逗号分隔"
                  style={{ padding: 10, borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13 }}
                />
                <button
                  disabled={!formId || !formApiKey}
                  onClick={async () => {
                    await fetch('/api/admin/providers/manage', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        section,
                        id: formId,
                        apiKey: formApiKey,
                        baseUrl: formBaseUrl,
                        models: formModels.split(',').map((m: string) => m.trim()).filter(Boolean),
                      }),
                    });
                    setShowForm(false);
                    setFormApiKey('');
                    loadProviders();
                    notify('模型配置已保存');
                  }}
                  style={{ ...btn.primary, opacity: !formId || !formApiKey ? 0.5 : 1, width: 'fit-content' }}
                >
                  保存
                </button>
              </div>
            )}

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr>
                  <th style={thStyle}>Provider</th>
                  <th style={thStyle}>Base URL</th>
                  <th style={thStyle}>模型</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {(sectionData[section] || []).map((p: any) => (
                  <tr key={p.id} style={{ borderTop: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 600 }}>{p.id}</td>
                    <td style={{ padding: '10px 12px', color: '#6b7280' }}>{p.baseUrl || '-'}</td>
                    <td style={{ padding: '10px 12px', color: '#6b7280' }}>{(p.models || []).join(', ') || '-'}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                      <button
                        onClick={async () => {
                          await fetch(`/api/admin/providers/manage?section=${section}&id=${p.id}`, { method: 'DELETE' });
                          loadProviders();
                          notify('已删除');
                        }}
                        style={btn.danger}
                      >
                        <Trash2 size={12} /> 删除
                      </button>
                    </td>
                  </tr>
                ))}
                {(sectionData[section] || []).length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ padding: 24, textAlign: 'center', color: '#9ca3af' }}>
                      暂无配置
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </SectionCard>
        )}

        {/* ============ COURSES ============ */}
        {tab === 'courses' && (
          <SectionCard
            title={`课程目录（${courseList.length}）`}
            action={
              <button
                onClick={async () => {
                  if (!confirm('重新导入默认课程目录？会覆盖现有条目。')) return;
                  await fetch('/api/admin/courses-import');
                  const d = await safeJson('/api/catalog/list');
                  setCourseList(d.courses || []);
                  notify('目录已导入');
                }}
                style={btn.primary}
              >
                <Download size={13} /> 重新导入
              </button>
            }
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr>
                  <th style={thStyle}>标题</th>
                  <th style={thStyle}>学科</th>
                  <th style={thStyle}>年级</th>
                  <th style={thStyle}>教材</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {courseList.slice(0, 40).map((c: any) => (
                  <tr key={c.id} style={{ borderTop: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 500 }}>{c.title}</td>
                    <td style={{ padding: '10px 12px' }}>{c.subject}</td>
                    <td style={{ padding: '10px 12px' }}>{c.grade}</td>
                    <td style={{ padding: '10px 12px', color: '#6b7280' }}>{c.textbook || '-'}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                      <button
                        onClick={async () => {
                          if (!confirm('删除该课程条目？')) return;
                          await fetch(`/api/admin/courses?id=${c.id}`, { method: 'DELETE' });
                          setCourseList(courseList.filter((x: any) => x.id !== c.id));
                        }}
                        style={btn.danger}
                      >
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </SectionCard>
        )}
        </ErrorBoundary>
      </main>
    </div>
  );
}
