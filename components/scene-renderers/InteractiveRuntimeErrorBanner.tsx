'use client';

import { useState } from 'react';
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/hooks/use-i18n';
import { formatQualityReason } from '@/lib/i18n/quality-reason';

const RUNTIME_ERROR_PREVIEW_MAX = 180;

function truncateRuntimeErrorPreview(message: string): string {
  const trimmed = message.trim();
  if (trimmed.length <= RUNTIME_ERROR_PREVIEW_MAX) return trimmed;
  return `${trimmed.slice(0, RUNTIME_ERROR_PREVIEW_MAX - 1)}…`;
}

/**
 * Host-side notice for an interactive scene whose iframe already reported a
 * runtime error. It sits over the iframe chrome, outside the sandbox, so the
 * generated page cannot hide or rewrite it.
 *
 * WP1.1 (anti-DOA): the page may look complete but refuse clicks. This banner
 * must stay visible until the user dismisses or the document reloads — never
 * fail silently.
 */
export function InteractiveRuntimeErrorBanner({
  message,
  onDismiss,
  onReload,
}: {
  readonly message: string;
  readonly onDismiss: () => void;
  /** Reload the current interactive document (fixes transient shim/init issues). */
  readonly onReload?: () => void;
}) {
  const { t, locale } = useI18n();
  const [copied, setCopied] = useState(false);
  const displayMessage = formatQualityReason(message, locale);

  return (
    <div
      data-testid="interactive-runtime-error"
      className="pointer-events-auto absolute inset-x-3 bottom-3 z-10"
    >
      <Alert variant="destructive" className="px-3 py-2 shadow-lg">
        <AlertTitle>{t('chat.interactiveRuntimeError.title')}</AlertTitle>
        <AlertDescription className="space-y-1">
          <p className="text-xs">
            {t('chat.interactiveRuntimeError.mayBeUnresponsive') ||
              '此互动页可能无法点击或运行，下面是错误详情。'}
          </p>
          <p className="break-all text-xs opacity-90">
            {truncateRuntimeErrorPreview(displayMessage)}
          </p>
          {displayMessage !== message ? (
            <p className="break-all font-mono text-[10px] opacity-60">
              {truncateRuntimeErrorPreview(message)}
            </p>
          ) : null}
        </AlertDescription>
        <AlertAction>
          {onReload ? (
            <Button
              type="button"
              variant="outline"
              size="xs"
              data-testid="interactive-runtime-error-reload"
              onClick={onReload}
            >
              {t('chat.interactiveRuntimeError.reload') || '重新加载本页'}
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="xs"
            data-testid="interactive-runtime-error-copy"
            onClick={() => {
              void navigator.clipboard?.writeText(message).then(
                () => {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                },
                () => {},
              );
            }}
          >
            {copied ? (t('common.copied') || '已复制') : (t('chat.interactiveRuntimeError.copy') || '复制错误')}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="xs"
            data-testid="interactive-runtime-error-dismiss"
            onClick={onDismiss}
          >
            {t('chat.interactiveRuntimeError.dismiss')}
          </Button>
        </AlertAction>
      </Alert>
    </div>
  );
}
