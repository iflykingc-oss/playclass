'use client';

import { useState, useCallback } from 'react';

type ToastType = 'success' | 'error' | 'info';
interface Toast { id: number; type: ToastType; message: string; }

let addToast: ((type: ToastType, message: string) => void) | null = null;

export function toast(type: ToastType, message: string) {
  if (addToast) addToast(type, message);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  addToast = useCallback((type: ToastType, message: string) => {
    const id = Date.now() + Math.random();
    setToasts(t => [...t, { id, type, message }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3000);
  }, []);

  const colors: Record<ToastType, string> = {
    success: '#10b981',
    error: '#ef4444',
    info: '#3b82f6',
  };

  return (
    <>
      {children}
      <div style={{
        position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
        display: 'flex', flexDirection: 'column', gap: 8,
      }}>
        {toasts.map(t => (
          <div key={t.id} style={{
            background: '#1f2937', color: '#fff', padding: '12px 20px',
            borderRadius: 10, fontSize: 14, boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            borderLeft: `4px solid ${colors[t.type]}`,
          }}>
            {t.message}
          </div>
        ))}
      </div>
    </>
  );
}
