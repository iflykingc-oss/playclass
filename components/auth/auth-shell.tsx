'use client';

import { useState, type CSSProperties, type ReactNode } from 'react';
import { Sparkles, BookOpen, Video, Link2, ShieldCheck, ArrowRight } from 'lucide-react';

/** Shared auth shell: brand panel + form card. Used by login / register. */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
  isZh,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
  isZh: boolean;
}) {
  const features = isZh
    ? [
        { icon: BookOpen, text: 'AI 互动课件，一键生成' },
        { icon: Video, text: '导出 MP4 视频课 / PPTX' },
        { icon: Link2, text: '在线分享，学员实时互动' },
        { icon: ShieldCheck, text: '机构席位 · 配额可管理' },
      ]
    : [
        { icon: BookOpen, text: 'AI interactive courseware' },
        { icon: Video, text: 'Export MP4 video & PPTX' },
        { icon: Link2, text: 'Share live with learners' },
        { icon: ShieldCheck, text: 'Org seats · usage quotas' },
      ];

  return (
    <div style={styles.shell}>
      {/* Brand panel */}
      <aside style={styles.brand}>
        <div style={styles.brandGlowA} />
        <div style={styles.brandGlowB} />
        <div style={styles.brandInner}>
          <a href="/" style={styles.logo}>
            <span style={styles.logoMark}>
              <Sparkles size={20} />
            </span>
            <span style={styles.logoText}>playclass</span>
          </a>

          <h1 style={styles.brandTitle}>
            {isZh ? (
              <>
                AI 驱动的
                <br />
                互动课程生成平台
              </>
            ) : (
              <>
                AI-Powered
                <br />
                Interactive Course Studio
              </>
            )}
          </h1>
          <p style={styles.brandSub}>
            {isZh
              ? '上传资料或一句话主题，几分钟生成带 AI 老师讲解、测验与互动实验的完整课堂。'
              : 'Drop in materials or a topic — get a full classroom with AI teacher, quizzes and interactive labs in minutes.'}
          </p>

          <ul style={styles.featureList}>
            {features.map((f) => (
              <li key={f.text} style={styles.featureItem}>
                <span style={styles.featureIcon}>
                  <f.icon size={15} />
                </span>
                {f.text}
              </li>
            ))}
          </ul>
        </div>
        <div style={styles.brandFooter}>
          © {new Date().getFullYear()} playclass
          <span style={{ margin: '0 8px', opacity: 0.4 }}>·</span>
          <a href="/terms" style={styles.brandLink}>{isZh ? '服务条款' : 'Terms'}</a>
          <span style={{ margin: '0 8px', opacity: 0.4 }}>·</span>
          <a href="/privacy" style={styles.brandLink}>{isZh ? '隐私' : 'Privacy'}</a>
        </div>
      </aside>

      {/* Form panel */}
      <main style={styles.formPanel}>
        <div style={styles.formCard}>
          <div style={styles.mobileLogo}>
            <span style={{ ...styles.logoMark, width: 36, height: 36 }}>
              <Sparkles size={18} />
            </span>
            <span style={{ fontWeight: 700, fontSize: 18 }}>playclass</span>
          </div>
          <h2 style={styles.formTitle}>{title}</h2>
          <p style={styles.formSub}>{subtitle}</p>
          {children}
          {footer && <div style={styles.formFooter}>{footer}</div>}
        </div>
      </main>
    </div>
  );
}

export const fieldStyle: CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  borderRadius: 10,
  border: '1.5px solid #e5e7eb',
  fontSize: 15,
  background: '#fff',
  color: '#111',
  outline: 'none',
  transition: 'border-color .15s, box-shadow .15s',
};

export const labelStyle: CSSProperties = {
  display: 'block',
  marginBottom: 6,
  fontSize: 13,
  fontWeight: 600,
  color: '#374151',
  letterSpacing: '0.01em',
};

export const primaryBtn: CSSProperties = {
  width: '100%',
  padding: '13px 16px',
  borderRadius: 10,
  border: 'none',
  background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
  color: '#fff',
  fontSize: 15,
  fontWeight: 600,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  boxShadow: '0 4px 14px rgba(124,58,237,.35)',
  transition: 'transform .12s, box-shadow .12s, opacity .12s',
};

export function ErrorBanner({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div
      style={{
        padding: '10px 14px',
        borderRadius: 10,
        background: '#fef2f2',
        border: '1px solid #fecaca',
        color: '#b91c1c',
        fontSize: 13,
        lineHeight: 1.5,
      }}
    >
      {message}
    </div>
  );
}

export function ArrowIcon() {
  return <ArrowRight size={16} />;
}

const styles: Record<string, CSSProperties> = {
  shell: {
    display: 'flex',
    minHeight: '100vh',
    background: '#f8f9fc',
  },
  brand: {
    position: 'relative',
    flex: '1 1 48%',
    background: 'linear-gradient(155deg, #1e1b4b 0%, #4c1d95 48%, #7c3aed 100%)',
    color: '#fff',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    padding: '48px 56px',
    overflow: 'hidden',
  },
  brandGlowA: {
    position: 'absolute',
    width: 420,
    height: 420,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(167,139,250,.35) 0%, transparent 70%)',
    top: -80,
    right: -100,
    pointerEvents: 'none',
  },
  brandGlowB: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(236,72,153,.22) 0%, transparent 70%)',
    bottom: -60,
    left: -80,
    pointerEvents: 'none',
  },
  brandInner: {
    position: 'relative',
    maxWidth: 440,
    paddingTop: 24,
  },
  logo: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 12,
    textDecoration: 'none',
    color: '#fff',
    marginBottom: 40,
  },
  logoMark: {
    width: 42,
    height: 42,
    borderRadius: 12,
    background: 'rgba(255,255,255,.18)',
    border: '1px solid rgba(255,255,255,.25)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 22,
    fontWeight: 700,
    letterSpacing: '-0.02em',
  },
  brandTitle: {
    fontSize: 34,
    fontWeight: 700,
    lineHeight: 1.25,
    letterSpacing: '-0.02em',
    marginBottom: 16,
  },
  brandSub: {
    fontSize: 15,
    lineHeight: 1.75,
    opacity: 0.82,
    marginBottom: 36,
  },
  featureList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  featureItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    fontSize: 14,
    opacity: 0.95,
  },
  featureIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    background: 'rgba(255,255,255,.14)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  brandFooter: {
    position: 'relative',
    fontSize: 12,
    opacity: 0.55,
    paddingTop: 24,
  },
  brandLink: {
    color: '#fff',
    textDecoration: 'none',
  },
  formPanel: {
    flex: '1 1 52%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 32px',
  },
  formCard: {
    width: '100%',
    maxWidth: 400,
  },
  mobileLogo: {
    display: 'none',
    alignItems: 'center',
    gap: 10,
    marginBottom: 28,
    color: '#111',
  },
  formTitle: {
    fontSize: 28,
    fontWeight: 700,
    letterSpacing: '-0.02em',
    color: '#111',
    marginBottom: 8,
  },
  formSub: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 28,
    lineHeight: 1.6,
  },
  formFooter: {
    marginTop: 24,
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
};

// Responsive tweak via injected style tag (keeps this file dependency-free)
export const AUTH_RESPONSIVE_CSS = `
@media (max-width: 900px) {
  [data-auth-shell] aside { display: none !important; }
  [data-auth-shell] main { padding: 32px 20px !important; }
  [data-auth-mobile-logo] { display: flex !important; }
}
`;
