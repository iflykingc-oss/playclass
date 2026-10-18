'use client';

import { useI18n } from '@/lib/hooks/use-i18n';
import { Sparkles, BookOpen, Video, Link2, Users, GraduationCap, ArrowRight, Check } from 'lucide-react';

export default function WelcomePage() {
  const { locale, setLocale } = useI18n();
  const isZh = locale === 'zh-CN';

  return (
    <div style={{ minHeight: '100vh', background: '#0f0a2e', color: '#fff', fontFamily: 'system-ui' }}>
      {/* Nav */}
      <nav style={{
        padding: '20px 48px', display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', position: 'sticky', top: 0, background: 'rgba(15,10,46,0.9)', backdropFilter: 'blur(10px)', zIndex: 10,
      }}>
        <div style={{ fontWeight: 800, fontSize: 22 }}>
          <span style={{ color: '#a78bfa' }}>playclass</span> Studio
        </div>
        <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          <a href="/catalog" style={{ color: '#c4b5fd', textDecoration: 'none', fontSize: 14 }}>{isZh ? '课程市场' : 'Catalog'}</a>
          <a href="/dashboard" style={{ color: '#c4b5fd', textDecoration: 'none', fontSize: 14 }}>{isZh ? '工作台' : 'Dashboard'}</a>
          <button onClick={() => setLocale(isZh ? 'en-US' : 'zh-CN')}
            style={{ padding: '6px 14px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer', fontSize: 13 }}>
            {isZh ? 'EN' : '中文'}
          </button>
          <a href="/auth/login" style={{ padding: '8px 20px', background: '#7c3aed', borderRadius: 8, color: '#fff', textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>
            {isZh ? '开始使用' : 'Get Started'}
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ textAlign: 'center', padding: '100px 24px 80px' }}>
        <div style={{
          display: 'inline-block', padding: '6px 16px', borderRadius: 20,
          background: 'rgba(124,58,237,0.2)', color: '#a78bfa', fontSize: 13, marginBottom: 24,
        }}>
          {isZh ? '✨ AI 驱动的互动课堂生成平台' : '✨ AI-Powered Interactive Classroom'}
        </div>
        <h1 style={{ fontSize: 52, fontWeight: 800, lineHeight: 1.1, maxWidth: 800, margin: '0 auto 24px' }}>
          {isZh ? '一句话生成完整互动课程' : 'Generate Complete Interactive Courses with One Prompt'}
        </h1>
        <p style={{ fontSize: 18, color: '#a5a3c7', maxWidth: 600, margin: '0 auto 40px', lineHeight: 1.6 }}>
          {isZh
            ? '输入主题，AI 自动生成带幻灯片、测验、白板推演、AI老师和AI同学的完整课堂。支持导出PPT、视频和在线分享链接。'
            : 'Type a topic, and AI generates slides, quizzes, whiteboard demos, AI teachers and classmates. Export as PPT, video, or share online.'}
        </p>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
          <a href="/auth/register" style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '14px 32px',
            background: '#7c3aed', borderRadius: 10, color: '#fff', textDecoration: 'none',
            fontSize: 16, fontWeight: 600,
          }}>
            {isZh ? '免费开始创作' : 'Start Free'} <ArrowRight size={18} />
          </a>
          <a href="/catalog" style={{
            padding: '14px 32px', background: 'rgba(255,255,255,0.1)', borderRadius: 10,
            color: '#fff', textDecoration: 'none', fontSize: 16,
          }}>
            {isZh ? '浏览1000+课程模板' : 'Browse 1000+ Templates'}
          </a>
        </div>
      </section>

      {/* Features */}
      <section style={{ padding: '60px 48px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
          {[
            { icon: Sparkles, title: isZh ? '一键生成' : 'One-Click Generate', desc: isZh ? '输入主题或上传PDF，3分钟生成完整互动课堂' : 'Type a topic or upload PDF, get a full classroom in 3 minutes' },
            { icon: Users, title: isZh ? '多智能体' : 'Multi-Agent', desc: isZh ? 'AI老师讲解、AI助教答疑、AI同学参与讨论' : 'AI teacher teaches, TA helps, classmates discuss' },
            { icon: BookOpen, title: isZh ? '互动课件' : 'Interactive Slides', desc: isZh ? '幻灯片+测验+白板+模拟实验，不是简单录播' : 'Slides + quizzes + whiteboard + simulations' },
            { icon: Video, title: isZh ? '视频导出' : 'Video Export', desc: isZh ? '导出带AI配音的MP4视频，发布到任何平台' : 'Export MP4 with AI narration to any platform' },
            { icon: Link2, title: isZh ? '在线分享' : 'Share Link', desc: isZh ? '生成链接，学生与AI老师实时对话' : 'Share link for real-time AI interaction' },
            { icon: GraduationCap, title: isZh ? '教材同步' : 'Textbook Aligned', desc: isZh ? '1000+门K12教材章节模板，按年级学科筛选' : '1000+ K-12 textbook templates by grade' },
          ].map((f) => (
            <div key={f.title} style={{
              background: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 28,
              border: '1px solid rgba(255,255,255,0.08)',
            }}>
              <f.icon size={28} color="#a78bfa" style={{ marginBottom: 16 }} />
              <h3 style={{ fontSize: 17, marginBottom: 8 }}>{f.title}</h3>
              <p style={{ fontSize: 14, color: '#a5a3c7', lineHeight: 1.5 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing preview */}
      <section style={{ padding: '60px 48px', maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
        <h2 style={{ fontSize: 32, fontWeight: 700, marginBottom: 16 }}>{isZh ? '简单透明的定价' : 'Simple Pricing'}</h2>
        <p style={{ color: '#a5a3c7', marginBottom: 40 }}>{isZh ? '免费开始，按需升级' : 'Start free, upgrade when needed'}</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, textAlign: 'left' }}>
          {[
            { name: isZh ? '免费版' : 'Free', price: '¥0', features: isZh ? ['每月5次生成', '互动课件导出', '在线分享'] : ['5 generations/mo', 'PPTX export', 'Share link'] },
            { name: isZh ? '专业版' : 'Pro', price: '¥49/月', features: isZh ? ['每月100次', '视频导出', '无水印'] : ['100/mo', 'Video export', 'No watermark'], highlight: true },
            { name: isZh ? '机构版' : 'Enterprise', price: '¥999/年', features: isZh ? ['按席位计费', '团队共享', 'API接入'] : ['Per seat', 'Team sharing', 'API access'] },
          ].map((p) => (
            <div key={p.name} style={{
              background: p.highlight ? 'linear-gradient(135deg,#7c3aed,#6d28d9)' : 'rgba(255,255,255,0.05)',
              borderRadius: 16, padding: 28, border: p.highlight ? 'none' : '1px solid rgba(255,255,255,0.08)',
            }}>
              <div style={{ fontSize: 14, opacity: 0.8, marginBottom: 4 }}>{p.name}</div>
              <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 16 }}>{p.price}</div>
              {p.features.map((f) => <div key={f} style={{ fontSize: 13, opacity: 0.8, marginBottom: 6 }}>✓ {f}</div>)}
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ textAlign: 'center', padding: '80px 24px' }}>
        <h2 style={{ fontSize: 32, fontWeight: 700, marginBottom: 16 }}>{isZh ? '准备好让AI帮你备课了吗？' : 'Ready to let AI prepare your lessons?'}</h2>
        <a href="/auth/register" style={{
          display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 40px',
          background: '#7c3aed', borderRadius: 10, color: '#fff', textDecoration: 'none',
          fontSize: 16, fontWeight: 600, marginTop: 16,
        }}>
          {isZh ? '立即免费注册' : 'Sign Up Free'} <ArrowRight size={18} />
        </a>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.08)', padding: '24px 48px', textAlign: 'center', color: '#6b6890', fontSize: 13 }}>
        playclass · {isZh ? '基于开源项目 Openplayclass' : 'Powered by Openplayclass'} · © 2026
      </footer>
    </div>
  );
}
