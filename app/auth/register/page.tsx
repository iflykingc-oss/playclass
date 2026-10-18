'use client';

import { useState } from 'react';
import { useI18n } from '@/lib/hooks/use-i18n';
import {
  AuthShell,
  ErrorBanner,
  fieldStyle,
  labelStyle,
  primaryBtn,
  AUTH_RESPONSIVE_CSS,
} from '@/components/auth/auth-shell';

export default function RegisterPage() {
  const { t, locale } = useI18n();
  const isZh = locale === 'zh-CN';
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [accountType, setAccountType] = useState<'personal' | 'org'>('personal');
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [focus, setFocus] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!agreed) {
      setError(isZh ? '请先同意服务条款与隐私政策' : 'Please agree to the Terms and Privacy Policy');
      return;
    }
    if (loading) return;
    setLoading(true);
    setError('');
    const failsafe = window.setTimeout(() => setLoading(false), 20_000);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ name, email, password, accountType }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || t('common.error'));
        return;
      }
      window.location.assign('/dashboard');
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

  const seg = (active: boolean): React.CSSProperties => ({
    flex: 1,
    padding: '10px 12px',
    borderRadius: 8,
    border: 'none',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 600,
    background: active ? '#7c3aed' : 'transparent',
    color: active ? '#fff' : '#6b7280',
    transition: 'all .15s',
  });

  return (
    <>
      <style>{AUTH_RESPONSIVE_CSS}</style>
      <AuthShell
        isZh={isZh}
        title={isZh ? '创建账户' : 'Create your account'}
        subtitle={
          isZh
            ? '免费开始，每月 3 次 AI 课程生成。'
            : 'Start free — 3 AI course generations every month.'
        }
        footer={
          <>
            {isZh ? '已有账号？' : 'Already have an account?'}{' '}
            <a href="/auth/login" style={{ color: '#7c3aed', fontWeight: 600, textDecoration: 'none' }}>
              {isZh ? '去登录' : 'Sign in'}
            </a>
          </>
        }
      >
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={labelStyle}>{isZh ? '昵称' : 'Name'}</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              onFocus={() => setFocus('name')}
              onBlur={() => setFocus(null)}
              placeholder={isZh ? '你的名字' : 'Your name'}
              style={inputFocus('name')}
            />
          </div>

          <div>
            <label style={labelStyle}>{isZh ? '邮箱' : 'Email'}</label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={() => setFocus('email')}
              onBlur={() => setFocus(null)}
              placeholder="you@example.com"
              style={inputFocus('email')}
            />
          </div>

          <div>
            <label style={labelStyle}>{isZh ? '密码（至少 8 位）' : 'Password (min 8 chars)'}</label>
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setFocus('password')}
              onBlur={() => setFocus(null)}
              placeholder="••••••••"
              style={inputFocus('password')}
            />
          </div>

          <div>
            <label style={labelStyle}>{isZh ? '账户类型' : 'Account type'}</label>
            <div
              style={{
                display: 'flex',
                gap: 4,
                padding: 4,
                background: '#f3f4f6',
                borderRadius: 10,
              }}
            >
              <button type="button" onClick={() => setAccountType('personal')} style={seg(accountType === 'personal')}>
                {isZh ? '个人' : 'Personal'}
              </button>
              <button type="button" onClick={() => setAccountType('org')} style={seg(accountType === 'org')}>
                {isZh ? '机构' : 'Organization'}
              </button>
            </div>
          </div>

          <label
            style={{
              display: 'flex',
              gap: 10,
              alignItems: 'flex-start',
              fontSize: 13,
              color: '#4b5563',
              lineHeight: 1.55,
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              style={{ marginTop: 3, width: 16, height: 16, accentColor: '#7c3aed' }}
            />
            <span>
              {isZh ? '我已阅读并同意' : 'I agree to the'}{' '}
              <a href="/terms" target="_blank" style={{ color: '#7c3aed', fontWeight: 600 }}>
                {isZh ? '服务条款' : 'Terms of Service'}
              </a>{' '}
              {isZh ? '与' : 'and'}{' '}
              <a href="/privacy" target="_blank" style={{ color: '#7c3aed', fontWeight: 600 }}>
                {isZh ? '隐私政策' : 'Privacy Policy'}
              </a>
            </span>
          </label>

          <ErrorBanner message={error} />

          <button type="submit" disabled={loading || !agreed} style={{ ...primaryBtn, opacity: loading || !agreed ? 0.55 : 1 }}>
            {loading ? (isZh ? '创建中…' : 'Creating…') : isZh ? '免费注册' : 'Create account'}
          </button>
        </form>
      </AuthShell>
    </>
  );
}
