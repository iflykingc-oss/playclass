'use client';

import { useCallback, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useI18n } from '@/lib/hooks/use-i18n';
import { buildPptInteractRequirement } from '@/lib/server/ppt-interact';

/**
 * WP2.6: one-click PPT → interactive classroom.
 * Extract slide text via /api/extract-document, then start generate-classroom
 * with a structure-preserving interact prompt.
 */
export function usePptToClassroom() {
  const { locale, t } = useI18n();
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const start = useCallback(() => inputRef.current?.click(), []);

  const onFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file) return;
      if (!/\.(pptx?|ppt)$/i.test(file.name)) {
        toast.error(t('import.pptxOnly') || 'Please choose a .pptx file');
        return;
      }
      setBusy(true);
      const toastId = toast.loading(t('import.extracting') || 'Reading slides…');
      try {
        const form = new FormData();
        form.append('file', file);
        const extractRes = await fetch('/api/extract-document', {
          method: 'POST',
          body: form,
        });
        const extract = await extractRes.json().catch(() => ({}));
        const slideText: string =
          extract?.content?.text ||
          extract?.text ||
          extract?.data?.text ||
          extract?.result?.text ||
          '';

        const requirement = buildPptInteractRequirement({
          fileName: file.name,
          slideText,
          locale,
        });

        const genRes = await fetch('/api/generate-classroom', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({
            requirement,
            enableTTS: true,
            enableImageGeneration: true,
          }),
        });
        const gen = await genRes.json().catch(() => ({}));
        // apiSuccess flattens: { success, jobId, pollUrl, ... }
        const jobId = gen?.jobId || gen?.data?.jobId || gen?.generation?.jobId || '';
        const pollUrl = gen?.pollUrl || gen?.data?.pollUrl || gen?.generation?.pollUrl || '';
        if (!genRes.ok || (!jobId && !pollUrl)) {
          throw new Error(gen?.error || 'Generation failed');
        }
        toast.success(t('import.pptInteractStarted') || 'Interactive classroom generation started');
        window.location.href = `/generation-preview?job=${encodeURIComponent(String(jobId))}`;
      } catch (err) {
        console.error(err);
        toast.error(
          (t('import.pptInteractFailed') || 'Failed to start interactive conversion') +
            (err instanceof Error ? `: ${err.message}` : ''),
        );
      } finally {
        toast.dismiss(toastId);
        setBusy(false);
      }
    },
    [locale, t],
  );

  const input = (
    <input
      ref={inputRef}
      type="file"
      accept=".pptx,.ppt,application/vnd.openxmlformats-officedocument.presentationml.presentation"
      style={{ display: 'none' }}
      onChange={(e) => void onFile(e)}
    />
  );

  return { busy, start, input };
}
