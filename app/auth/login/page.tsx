'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useI18n } from '@/lib/hooks/use-i18n';
import {
  AuthShell,
  ErrorBanner,
  fieldStyle,
  labelStyle,
  primaryBtn,
  AUTH_RESPONSIVE_CSS,
} from '@/components/auth/auth-shell';

function LoginInner() {
  const { locale } = useI18n();
  const isZh = locale === 'zh-CN';
  const router = useRouter();
  const params = useSearchParams();
  const redirect = params.get('redirect') || '/dashboard';
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

    // Safety: never leave the button spinning forever.
    const failsafe = window.setTimeout(() => setLoading(false), 20_000);

    try {
      // 1) Platform user login first (the common path).
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ email, password }),
      });
      if (res.ok) {
        // Full navigation: more reliable than router.push after cookie set,
        // and avoids hanging on a client-side transition.
        window.location.assign(redirect);
        return;
      }

      // 2) Fall back to super-admin login (same form, separate cookie).
      const adminRes = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ email, password }),
      });
      if (adminRes.ok) {
        window.location.assign('/admin');
        return;
      }

      let msg = isZh ? '邮箱或密码错误' : 'Invalid email or password';
      try {
        const data = await res.json();
        if (data?.error) msg = data.error;
      } catch {
        /* keep default */
      }
      setError(msg);
    } catch {
      setError(isZh ? '网络错误，请重试' : 'Network error, please retry');
    } finally {
      window.clearTimeout(failsafe);
      setLoading(false);
    }
  }

  const inputFocus = (name: string) =>
    focus === name
      ? { ...fieldStyle, borderColor: '#7c3aed', boxShadow: '0 0 0 3px rgba(124,58,237,.15)' }
      : fieldStyle;

  return (
    <>
      <style>{AUTH_RESPONSIVE_CSS}</style>
      <AuthShell
        isZh={isZh}
        title={isZh ? '欢迎回来' : 'Welcome back'}
        subtitle={isZh ? '登录你的账户，继续创作课程。' : 'Sign in to continue creating.'}
        footer={
          <>
            {isZh ? '还没有账号？' : "Don't have an account?"}{' '}
            <a href="/auth/register" style={{ color: '#7c3aed', fontWeight: 600, textDecoration: 'none' }}>
              {isZh ? '免费注册' : 'Sign up free'}
            </a>
          </>
        }
      >
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={labelStyle}>{isZh ? '邮箱' : 'Email'}</label>
            <input
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={() => setFocus('email')}
              onBlur={() => setFocus(null)}
              style={inputFocus('email')}
            />
          </div>
          <div>
            <label style={labelStyle}>{isZh ? '密码' : 'Password'}</label>
            <input
              type="password"
              required
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setFocus('password')}
              onBlur={() => setFocus(null)}
              style={inputFocus('password')}
            />
          </div>

          <ErrorBanner message={error} />

          <button type="submit" disabled={loading} style={{ ...primaryBtn, opacity: loading ? 0.7 : 1 }}>
            {loading ? (isZh ? '登录中…' : 'Signing in…') : isZh ? '登录' : 'Sign in'}
          </button>

          <p style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', lineHeight: 1.6, margin: 0 }}>
            {isZh
              ? '管理员账号也可从这里登录，将自动跳转超管后台。'
              : 'Admin accounts sign in here too — you will be redirected to the console.'}
          </p>
        </form>
      </AuthShell>
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888' }}>
          …
        </div>
      }
    >
      <LoginInner />
    </Suspense>
  );
}
