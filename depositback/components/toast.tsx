"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { Check, Info, X } from "lucide-react";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

const DURATION_MS = 4000;

const ToastContext = createContext<{
  toast: (message: string, type?: ToastType) => void;
}>({
  toast: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: ToastType = "info") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev.slice(-2), { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, DURATION_MS);
  }, []);

  function dismiss(id: string) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-4 bottom-4 z-[150] flex flex-col items-center gap-2 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:items-end"
        aria-live="polite"
        role="status"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            style={{ animation: "toast-in 360ms var(--ease-spring) both" }}
            className="pointer-events-auto relative flex w-full max-w-sm items-center gap-3 overflow-hidden rounded-xl bg-[var(--foreground)] py-3 pl-3.5 pr-2.5 text-[var(--background)] shadow-[var(--shadow-float)]"
          >
            <span
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                t.type === "success"
                  ? "bg-[var(--accent)] text-[var(--accent-foreground)]"
                  : t.type === "error"
                    ? "bg-[var(--stamp)] text-white"
                    : "bg-[var(--background)]/15"
              }`}
            >
              {t.type === "success" ? (
                <Check className="h-3 w-3" strokeWidth={3} aria-hidden="true" />
              ) : t.type === "error" ? (
                <X className="h-3 w-3" strokeWidth={3} aria-hidden="true" />
              ) : (
                <Info className="h-3 w-3" strokeWidth={2.5} aria-hidden="true" />
              )}
            </span>
            <p className="flex-1 text-sm font-medium">{t.message}</p>
            <button
              onClick={() => dismiss(t.id)}
              className="rounded-md p-1 opacity-50 transition-opacity hover:opacity-100"
              aria-label="Dismiss notification"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
            <span
              aria-hidden="true"
              className="absolute bottom-0 left-0 h-px w-full origin-left bg-[var(--background)]/30"
              style={{ animation: `draw ${DURATION_MS}ms linear reverse both` }}
            />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
