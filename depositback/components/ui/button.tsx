"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { buttonClass, type Size, type Variant } from "./button-class";

export { buttonClass };

/** Pulls the element a few pixels toward the pointer. Small enough to feel tactile, not gimmicky. */
const MAGNET_STRENGTH = 0.18;
const MAGNET_MAX = 5;

function magnetMove(e: React.PointerEvent<HTMLElement>) {
  if (e.pointerType !== "mouse") return;
  const el = e.currentTarget;
  const r = el.getBoundingClientRect();
  const clamp = (n: number) => Math.max(-MAGNET_MAX, Math.min(MAGNET_MAX, n * MAGNET_STRENGTH));
  el.style.translate = `${clamp(e.clientX - r.left - r.width / 2)}px ${clamp(e.clientY - r.top - r.height / 2)}px`;
}

function magnetLeave(e: React.PointerEvent<HTMLElement>) {
  e.currentTarget.style.translate = "0 0";
}

const MAGNET_TRANSITION =
  "[transition:translate_250ms_var(--ease-out-quint),background-color_200ms,opacity_200ms,transform_150ms]";

interface CommonProps {
  variant?: Variant;
  size?: Size;
  magnetic?: boolean;
  className?: string;
  children: React.ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  magnetic,
  className,
  children,
  ...props
}: CommonProps & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      onPointerMove={magnetic ? magnetMove : undefined}
      onPointerLeave={magnetic ? magnetLeave : undefined}
      className={buttonClass(variant, size, cn(magnetic && MAGNET_TRANSITION, className))}
      {...props}
    >
      {children}
    </button>
  );
}

export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  magnetic,
  className,
  children,
  ...props
}: CommonProps & { href: string; prefetch?: boolean; target?: string; rel?: string }) {
  return (
    <Link
      href={href}
      onPointerMove={magnetic ? magnetMove : undefined}
      onPointerLeave={magnetic ? magnetLeave : undefined}
      className={buttonClass(variant, size, cn(magnetic && MAGNET_TRANSITION, className))}
      {...props}
    >
      {children}
    </Link>
  );
}

/** Arrow that nudges forward when its parent button is hovered. */
export function Arrow({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      className={cn("h-3.5 w-3.5 transition-transform duration-300 ease-[var(--ease-out-quint)] group-hover/btn:translate-x-0.5", className)}
    >
      <path d="M3 8h9.5M8.5 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={cn("h-4 w-4 animate-spin", className)} aria-hidden="true">
      <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2" />
      <path d="M14 8a6 6 0 0 0-6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
