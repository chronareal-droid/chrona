"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast";

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

const PRESETS = [
  { label: "Keepsit Green", value: "#0b8f52" },
  { label: "Indigo", value: "#5b4cff" },
  { label: "Blue", value: "#2563eb" },
  { label: "Violet", value: "#7c3aed" },
  { label: "Pink", value: "#ec4899" },
  { label: "Red", value: "#ef4444" },
  { label: "Orange", value: "#f97316" },
  { label: "Amber", value: "#f59e0b" },
  { label: "Emerald", value: "#10b981" },
  { label: "Teal", value: "#14b8a6" },
  { label: "Cyan", value: "#06b6d4" },
];

function lightenHex(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const mix = (c: number) => Math.round(c + (255 - c) * 0.3);
  return `#${mix(r).toString(16).padStart(2, "0")}${mix(g).toString(16).padStart(2, "0")}${mix(b).toString(16).padStart(2, "0")}`;
}

export function AccentColorPicker({ currentColor }: { currentColor: string | null }) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [selected, setSelected] = useState(currentColor ?? PRESETS[0].value);
  const [custom, setCustom] = useState("");

  const activeColor = custom && HEX_RE.test(custom) ? custom : selected;

  function applyPreview(hex: string) {
    const root = document.documentElement;
    root.style.setProperty("--accent", hex);
    root.style.setProperty("--accent-dark", lightenHex(hex));
    if (root.classList.contains("dark")) {
      root.style.setProperty("--accent", lightenHex(hex));
    }
  }

  function handlePresetClick(hex: string) {
    setSelected(hex);
    setCustom("");
    applyPreview(hex);
  }

  function handleCustomChange(value: string) {
    setCustom(value);
    if (HEX_RE.test(value)) {
      applyPreview(value);
    }
  }

  async function handleSave() {
    startTransition(async () => {
      const res = await fetch("/api/config/accent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ color: activeColor }),
      });

      if (res.ok) {
        toast("Accent color saved", "success");
        router.refresh();
      } else {
        toast("Failed to save accent color", "error");
      }
    });
  }

  return (
    <div className="space-y-4">
      {/* Preset swatches */}
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((preset) => (
          <button
            key={preset.value}
            type="button"
            title={preset.label}
            aria-label={`Select ${preset.label} accent color`}
            onClick={() => handlePresetClick(preset.value)}
            className="relative h-8 w-8 rounded-full border-2 transition-transform hover:scale-110"
            style={{
              backgroundColor: preset.value,
              borderColor:
                activeColor === preset.value
                  ? "var(--foreground)"
                  : "transparent",
            }}
          >
            {activeColor === preset.value && (
              <svg
                className="absolute inset-0 m-auto h-3.5 w-3.5 text-white"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={3}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4.5 12.75l6 6 9-13.5"
                />
              </svg>
            )}
          </button>
        ))}
      </div>

      {/* Custom hex input */}
      <div className="flex items-center gap-2">
        <div
          className="h-8 w-8 shrink-0 rounded-full border border-[var(--border)]"
          style={{ backgroundColor: activeColor }}
        />
        <input
          type="text"
          value={custom}
          onChange={(e) => handleCustomChange(e.target.value)}
          placeholder="#5b4cff"
          aria-label="Custom hex color"
          maxLength={7}
          spellCheck={false}
          className="w-28 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-mono placeholder:text-[var(--muted)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
        />
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="rounded-lg bg-[var(--accent)] px-3.5 py-1.5 text-xs font-medium text-[var(--accent-foreground)] transition-opacity hover:opacity-80 disabled:opacity-40"
        >
          {isPending ? "Saving\u2026" : "Save"}
        </button>
      </div>

      {/* Live preview */}
      <div className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
        <div
          className="h-5 w-5 shrink-0 rounded"
          style={{ backgroundColor: activeColor }}
        />
        <span className="text-xs text-[var(--muted)]">
          Preview: buttons and accents will use this color
        </span>
      </div>
    </div>
  );
}
