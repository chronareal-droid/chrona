"use client";

import { useId, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface TabItem {
  id: string;
  label: string;
  badge?: React.ReactNode;
  content: React.ReactNode;
}

/** Underline tabs with a sliding indicator. Arrow keys move between tabs. */
export function Tabs({ items, initial }: { items: TabItem[]; initial?: string }) {
  const [active, setActive] = useState(initial ?? items[0]?.id);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  const baseId = useId();

  useLayoutEffect(() => {
    const el = refs.current[active];
    if (el) setIndicator({ left: el.offsetLeft, width: el.offsetWidth });
  }, [active]);

  function onKeyDown(e: React.KeyboardEvent) {
    const i = items.findIndex((t) => t.id === active);
    const next = e.key === "ArrowRight" ? i + 1 : e.key === "ArrowLeft" ? i - 1 : -1;
    if (next < 0 || next >= items.length) return;
    e.preventDefault();
    setActive(items[next].id);
    refs.current[items[next].id]?.focus();
  }

  return (
    <div>
      <div role="tablist" className="relative flex gap-6 border-b border-[var(--border)]" onKeyDown={onKeyDown}>
        {items.map((t) => (
          <button
            key={t.id}
            ref={(node) => {
              refs.current[t.id] = node;
            }}
            id={`${baseId}-tab-${t.id}`}
            role="tab"
            type="button"
            aria-selected={active === t.id}
            aria-controls={`${baseId}-panel-${t.id}`}
            tabIndex={active === t.id ? 0 : -1}
            onClick={() => setActive(t.id)}
            className={cn(
              "flex items-center gap-2 pb-3 text-sm transition-colors",
              active === t.id ? "text-[var(--foreground)]" : "text-[var(--muted)] hover:text-[var(--foreground)]",
            )}
          >
            {t.label}
            {t.badge}
          </button>
        ))}
        <span
          aria-hidden="true"
          className="absolute -bottom-px h-[2px] rounded-full bg-[var(--foreground)] transition-[left,width] duration-300 ease-[var(--ease-out-quint)]"
          style={{ left: indicator.left, width: indicator.width }}
        />
      </div>
      {items.map((t) => (
        <div
          key={t.id}
          id={`${baseId}-panel-${t.id}`}
          role="tabpanel"
          aria-labelledby={`${baseId}-tab-${t.id}`}
          hidden={active !== t.id}
          className="animate-slide-up pt-8"
        >
          {active === t.id && t.content}
        </div>
      ))}
    </div>
  );
}
