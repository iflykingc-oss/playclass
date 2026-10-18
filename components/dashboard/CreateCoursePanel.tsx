'use client';

import { useEffect, useState } from 'react';
import { useI18n } from '@/lib/hooks/use-i18n';
import { usePptToClassroom } from '@/lib/import/use-ppt-to-classroom';

/**
 * Embedded classroom composer inside the user workbench (Dashboard).
 * Lightweight path: requirement / PPT → generate-classroom job → poll.
 * Advanced slide editing still opens the full `/` workbench if needed.
 */
export function CreateCoursePanel() {
  const { locale } = useI18n();
  const isZh = locale === 'zh-CN';
  const [requirement, setRequirement] = useState('');
  const [enableTts, setEnableTts] = useState(true);
  const [enableImage, setEnableImage] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [job, setJob] = useState<{ jobId: string; pollUrl: string } | null>(null);
  const [status, setStatus] = useState<string>('');
  const { busy: pptBusy, start: pptStart, input: pptInput } = usePptToClassroom();

  useEffect(() => {
    if (!job?.pollUrl) return;
    let cancelled = false;
    const tick = async () => {
      try {
        const res = await fetch(job.pollUrl);
        const d = await res.json();
        if (cancelled) return;
        const st = d?.data?.status || d?.status || '';
        const msg = d?.data?.message || d?.message || '';
        setStatus(msg || st);
        if (st === 'succeeded' || st === 'completed') {
          setStatus(isZh ? '生成完成，可在课程列表或 / 打开编辑' : 'Done — open from courses or /');
          return;
        }
        if (st === 'failed') {
          setError(d?.data?.error || d?.error || (isZh ? '生成失败' : 'Generation failed'));
          return;
        }
      } catch {
        /* retry */
      }
      if (!cancelled) setTimeout(tick, 4000);
    };
    const timer = setTimeout(tick, 2500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [job, isZh]);

  async function startGenerate() {
    setError('');
    if (!requirement.trim()) {
      setError(isZh ? '请填写课程主题或需求' : 'Please enter a topic or requirement');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/generate-classroom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          requirement: requirement.trim(),
          enableTTS: enableTts,
          enableImageGeneration: enableImage,
        }),
      });
      const d = await res.json();
      const jobId = d?.jobId || d?.data?.jobId;
      const pollUrl = d?.pollUrl || d?.data?.pollUrl;
      if (!res.ok || !jobId) {
        throw new Error(d?.error || 'failed');
      }
      setJob({ jobId, pollUrl: pollUrl || `/api/generate-classroom/${jobId}` });
      setStatus(isZh ? '已提交生成任务…' : 'Generation job submitted…');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #eef0f4', padding: 24 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>
        {isZh ? '创建互动课程' : 'Create interactive course'}
      </h2>
      <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16, lineHeight: 1.6 }}>
        {isZh
          ? '在工作台内直接生成，无需离开本页。生成后可在「已发布课程」查看；复杂排版可再用高级工作台微调。'
          : 'Generate without leaving the workbench. After it finishes, open it from Published; use the full workbench for advanced layout.'}
      </p>

      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
        {isZh ? '课程主题 / 教学需求' : 'Topic / requirement'}
      </label>
      <textarea
        value={requirement}
        onChange={(e) => setRequirement(e.target.value)}
        rows={6}
        placeholder={
          isZh
            ? '例如：高中物理「牛顿第二定律」，含演示实验、2 道随堂测验与课堂讨论'
            : 'e.g. High-school physics: Newton’s second law, demo, 2 quizzes, discussion'
        }
        style={{
          width: '100%',
          borderRadius: 12,
          border: '1.5px solid #e5e7eb',
          padding: 14,
          fontSize: 14,
          lineHeight: 1.6,
          resize: 'vertical',
          fontFamily: 'inherit',
        }}
      />

      <div style={{ display: 'flex', gap: 16, marginTop: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
          <input type="checkbox" checked={enableTts} onChange={(e) => setEnableTts(e.target.checked)} />
          {isZh ? 'AI 旁白 (TTS)' : 'AI narration (TTS)'}
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
          <input type="checkbox" checked={enableImage} onChange={(e) => setEnableImage(e.target.checked)} />
          {isZh ? '自动配图' : 'Auto images'}
        </label>
        <div style={{ flex: 1 }} />
        <button
          type="button"
          onClick={pptStart}
          disabled={pptBusy}
          style={{
            padding: '10px 16px',
            borderRadius: 10,
            border: '1px solid #e5e7eb',
            background: '#fff',
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 600,
            color: '#7c3aed',
          }}
        >
          {pptBusy ? (isZh ? '解析中…' : 'Reading…') : isZh ? '从 PPT 导入' : 'From PPT'}
        </button>
        {pptInput}
        <button
          type="button"
          onClick={() => void startGenerate()}
          disabled={busy}
          style={{
            padding: '12px 28px',
            borderRadius: 10,
            border: 'none',
            background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
            color: '#fff',
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
            opacity: busy ? 0.6 : 1,
            boxShadow: '0 4px 14px rgba(124,58,237,.35)',
          }}
        >
          {busy ? (isZh ? '提交中…' : 'Submitting…') : isZh ? '开始生成' : 'Generate'}
        </button>
      </div>

      {error && (
        <div
          style={{
            marginTop: 16,
            padding: '12px 14px',
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

      {job && (
        <div
          style={{
            marginTop: 16,
            padding: '12px 14px',
            borderRadius: 10,
            background: '#f5f3ff',
            border: '1px solid #ddd6fe',
            fontSize: 13,
            color: '#5b21b6',
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 4 }}>
            {isZh ? '生成中 / 任务' : 'Job'}: <code>{job.jobId}</code>
          </div>
          <div style={{ opacity: 0.9 }}>{status || '…'}</div>
          <a
            href="/"
            style={{ display: 'inline-block', marginTop: 10, color: '#7c3aed', fontWeight: 600, fontSize: 12 }}
          >
            {isZh ? '打开高级工作台微调 →' : 'Open advanced workbench →'}
          </a>
        </div>
      )}

      <p style={{ marginTop: 18, fontSize: 12, color: '#9ca3af', lineHeight: 1.6 }}>
        {isZh
          ? '说明：完整幻灯编辑、智能体编排在「高级工作台」；这里负责从需求快速出课，保持在业务工作台内。'
          : 'Note: full slide editing / agent orchestration lives in the advanced workbench. This panel is the fast in-workbench path.'}
      </p>
    </div>
  );
}
