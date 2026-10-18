'use client';

import { useState } from 'react';
import { useI18n } from '@/lib/hooks/use-i18n';
import { ShieldCheck, LogIn } from 'lucide-react';

export default function AdminLoginPage() {
  const { t, locale } = useI18n();
  const isZh = locale === 'zh-CN';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [focus, setFocus] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError('');
    const failsafe = window.setTimeout(() => setLoading(false), 20_000);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || t('common.error'));
        return;
      }
      window.location.assign('/admin');
    } catch {
      setError(isZh ? '网络错误，请重试' : 'Network error');
    } finally {
      window.clearTimeout(failsafe);
      setLoading(false);
    }
  }

  const inputFocus = (name: string) =>
    focus === name
      ? {
          width: '100%',
          padding: '12px 14px',
          borderRadius: 10,
          border: '1.5px solid #7c3aed',
          fontSize: 15,
          outline: 'none',
          boxShadow: '0 0 0 3px rgba(124,58,237,.15)',
        }
      : {
          width: '100%',
          padding: '12px 14px',
          borderRadius: 10,
          border: '1.5px solid #e5e7eb',
          fontSize: 15,
          outline: 'none',
        };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background:
          'radial-gradient(1200px 600px at 20% -10%, rgba(124,58,237,.18), transparent 60%), radial-gradient(900px 500px at 100% 100%, rgba(30,27,75,.12), transparent 55%), #0f172a',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 400,
          background: '#fff',
          borderRadius: 20,
          padding: '40px 36px',
          boxShadow: '0 24px 64px rgba(15,23,42,.35)',
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 14,
            background: 'linear-gradient(135deg, #1e1b4b, #7c3aed)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 20,
          }}
        >
          <ShieldCheck size={22} color="#fff" />
        </div>

        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111', marginBottom: 6, letterSpacing: '-0.02em' }}>
          {isZh ? '超管后台' : 'Admin Console'}
        </h1>
        <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 28, lineHeight: 1.6 }}>
          {isZh ? '仅限平台管理员访问。' : 'Restricted to platform administrators.'}
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label
              style={{
                display: 'block',
                marginBottom: 6,
                fontSize: 13,
                fontWeight: 600,
                color: '#374151',
              }}
            >
              {isZh ? '邮箱' : 'Email'}
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={() => setFocus('email')}
              onBlur={() => setFocus(null)}
              placeholder="admin@example.com"
              style={inputFocus('email')}
            />
          </div>
          <div>
            <label
              style={{
                display: 'block',
                marginBottom: 6,
                fontSize: 13,
                fontWeight: 600,
                color: '#374151',
              }}
            >
              {isZh ? '密码' : 'Password'}
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setFocus('password')}
              onBlur={() => setFocus(null)}
              placeholder="••••••••"
              style={inputFocus('password')}
            />
          </div>

          {error && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 10,
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#b91c1c',
                fontSize: 13,
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '13px 16px',
              borderRadius: 10,
              border: 'none',
              background: 'linear-gradient(135deg, #1e1b4b, #4c1d95)',
              color: '#fff',
              fontSize: 15,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              opacity: loading ? 0.7 : 1,
              boxShadow: '0 4px 14px rgba(30,27,75,.35)',
            }}
          >
            <LogIn size={16} />
            {loading ? (isZh ? '登录中…' : 'Signing in…') : isZh ? '登录' : 'Sign in'}
          </button>
        </form>

        <div style={{ marginTop: 24, textAlign: 'center', fontSize: 13 }}>
          <a href="/auth/login" style={{ color: '#6b7280', textDecoration: 'none' }}>
            ← {isZh ? '返回用户登录' : 'Back to user login'}
          </a>
        </div>
      </div>
    </div>
  );
}
