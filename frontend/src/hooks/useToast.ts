import { useState, useRef, useCallback } from 'react';

export interface ToastState {
  title: string;
  sub?: string;
}

export function useToast(duration = 5000) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback(
    (title: string, sub?: string) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      setToast({ title, sub });
      timerRef.current = setTimeout(() => {
        setToast(null);
        timerRef.current = null;
      }, duration);
    },
    [duration],
  );

  const hideToast = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setToast(null);
  }, []);

  return { toast, showToast, hideToast };
}
