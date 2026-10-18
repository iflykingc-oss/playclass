'use client';

import { useEffect, useState } from 'react';
import { useI18n } from '@/lib/hooks/use-i18n';

/** Account & session panel inside the user workbench. */
export function AccountPanel() {
  const { locale } = useI18n();
  const isZh = locale === 'zh-CN';
  const [me, setMe] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => {
        setMe(d.user || null);
        setIsAdmin(!!d.isAdmin);
      })
      .catch(() => {
        setMe(null);
        setIsAdmin(false);
      });
  }, []);

  async function logout() {
    setLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
    } catch {
      /* ignore */
    }
    window.location.href = '/auth/login';
  }

  const btnBase: React.CSSProperties = {
    padding: '11px 22px',
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 600,
    textDecoration: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    cursor: 'pointer',
    border: '1px solid #e5e7eb',
    background: '#fff',
    color: '#374151',
  };

  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 16,
        border: '1px solid #eef0f4',
        padding: 24,
        maxWidth: 560,
      }}
    >
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>
        {isZh ? '账户与设置' : 'Account & settings'}
      </h2>
      <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 20 }}>
        {isZh ? '查看登录信息，或退出当前账户。' : 'Review your session and sign out.'}
      </p>

      <div
        style={{
          display: 'grid',
          gap: 12,
          background: '#f9fafb',
          borderRadius: 12,
          padding: 16,
          border: '1px solid #f3f4f6',
        }}
      >
        <Row label={isZh ? '邮箱' : 'Email'} value={me?.email || '—'} />
        <Row label={isZh ? '昵称' : 'Name'} value={me?.name || '—'} />
        <Row
          label={isZh ? '类型' : 'Type'}
          value={
            me?.account_type === 'org'
              ? isZh
                ? '机构'
                : 'Organization'
              : isZh
                ? '个人'
                : 'Personal'
          }
        />
        <Row label="ID" value={me?.id || '—'} mono />
        <Row
          label={isZh ? '权限' : 'Role'}
          value={isAdmin ? (isZh ? '超级管理员' : 'Admin') : isZh ? '普通用户' : 'Member'}
        />
      </div>

      <div style={{ display: 'flex', gap: 12, marginTop: 20, flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => void logout()}
          disabled={loggingOut}
          style={{
            ...btnBase,
            border: '1px solid #fecaca',
            background: '#fef2f2',
            color: '#b91c1c',
            opacity: loggingOut ? 0.6 : 1,
          }}
        >
          {loggingOut
            ? isZh
              ? '正在退出…'
              : 'Signing out…'
            : isZh
              ? '退出登录'
              : 'Sign out'}
        </button>
        {isAdmin ? (
          <a href="/admin" style={{ ...btnBase, border: '1px solid #c7d2fe', background: '#eef2ff', color: '#3730a3' }}>
            {isZh ? '超管后台' : 'Admin console'}
          </a>
        ) : null}
        <a href="/auth/login" style={btnBase}>
          {isZh ? '切换账号' : 'Switch account'}
        </a>
      </div>

      <p style={{ marginTop: 18, fontSize: 12, color: '#9ca3af', lineHeight: 1.6 }}>
        {isZh
          ? '仅超级管理员可见「超管后台」。密钥见 MCP 页签；套餐与订单见概览。'
          : 'Admin console is visible to super-admins only. Keys are under MCP; plans/orders on Overview.'}
      </p>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 13 }}>
      <span style={{ color: '#6b7280' }}>{label}</span>
      <span
        style={{
          fontWeight: 600,
          color: '#111827',
          fontFamily: mono ? 'ui-monospace, monospace' : undefined,
          textAlign: 'right',
          wordBreak: 'break-all',
        }}
      >
        {value}
      </span>
    </div>
  );
}
