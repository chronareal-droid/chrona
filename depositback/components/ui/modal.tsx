"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/** Centered dialog on desktop, bottom sheet on mobile. Escape and backdrop close it. */
export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    panel.current?.querySelector<HTMLElement>("button, [href], input")?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <div
      className={cn("fixed inset-0 z-[120] flex items-end justify-center sm:items-center", !open && "pointer-events-none")}
      aria-hidden={!open}
    >
      <div
        className={cn(
          "absolute inset-0 bg-[var(--foreground)]/25 backdrop-blur-[2px] transition-opacity duration-300",
          open ? "opacity-100" : "opacity-0",
        )}
        onClick={onClose}
      />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "relative w-full max-w-md rounded-t-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-[var(--shadow-float)] transition-[opacity,transform] duration-300 ease-[var(--ease-out-quint)] sm:rounded-2xl sm:p-7",
          open ? "translate-y-0 scale-100 opacity-100" : "translate-y-6 opacity-0 sm:translate-y-2 sm:scale-[0.97]",
        )}
      >
        <h2 className="display text-[1.9rem]">{title}</h2>
        {children}
      </div>
    </div>
  );
}
