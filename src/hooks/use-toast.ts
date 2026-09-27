import { useCallback, useRef, useState } from "react";
import type { ToastState, ToastTone } from "./Toast";

export function useToast(autoDismissMs = 4000) {
  const [toast, setToast] = useState<ToastState>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback(
    (title: string, message?: string, tone: ToastTone = "info") => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      setToast({ title, message, tone });
      timerRef.current = setTimeout(() => setToast(null), autoDismissMs);
    },
    [autoDismissMs]
  );

  const clearToast = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    setToast(null);
  }, []);

  return { toast, showToast, clearToast };
}