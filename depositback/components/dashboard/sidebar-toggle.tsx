"use client";

import { useState, useEffect } from "react";

/**
 * Dispatches a custom event to toggle the sidebar.
 * Listens for sidebar state changes to swap between hamburger and X.
 */
export function SidebarToggle() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      setOpen((e as CustomEvent).detail?.open ?? false);
    };
    window.addEventListener("sidebar-state", handler);
    return () => window.removeEventListener("sidebar-state", handler);
  }, []);

  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent("toggle-sidebar"))}
      className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface)] active:bg-[var(--surface)] transition-colors"
      aria-label={open ? "Close menu" : "Open menu"}
      aria-expanded={open}
    >
      <svg className="h-[15px] w-[15px]" fill="none" viewBox="0 0 15 15" stroke="currentColor" aria-hidden="true">
        {open ? (
          <path strokeLinecap="round" strokeWidth={1.25} d="M3.5 3.5l8 8M11.5 3.5l-8 8" />
        ) : (
          <path strokeLinecap="round" strokeWidth={1.25} d="M2 4.5h11M2 7.5h11M2 10.5h11" />
        )}
      </svg>
    </button>
  );
}
