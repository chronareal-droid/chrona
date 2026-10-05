"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme-provider";

/** Sun/moon swap with a rotate-and-fade so the change reads as one motion. */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const dark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(dark ? "light" : "dark")}
      className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-[var(--muted)] transition-colors hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
      aria-label={`Switch to ${dark ? "light" : "dark"} mode`}
    >
      <Sun
        className={`absolute h-[17px] w-[17px] transition-all duration-500 ease-[var(--ease-out-quint)] ${dark ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-50 opacity-0"}`}
        strokeWidth={1.6}
        aria-hidden="true"
      />
      <Moon
        className={`absolute h-[17px] w-[17px] transition-all duration-500 ease-[var(--ease-out-quint)] ${dark ? "rotate-90 scale-50 opacity-0" : "rotate-0 scale-100 opacity-100"}`}
        strokeWidth={1.6}
        aria-hidden="true"
      />
    </button>
  );
}
