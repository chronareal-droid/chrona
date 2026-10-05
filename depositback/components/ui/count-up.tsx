"use client";

import { useEffect, useRef, useState } from "react";
import { formatUsd } from "@/lib/deposit-laws";

/**
 * Money that counts to its value. Animates from the previous value on change,
 * so editing a field makes the total "roll". Instant under reduced motion.
 */
export function CountUp({
  value,
  duration = 900,
  className,
}: {
  value: number;
  duration?: number;
  className?: string;
}) {
  const [display, setDisplay] = useState(value);
  const from = useRef(0);
  const shown = useRef(0);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      shown.current = value;
      setDisplay(value);
      return;
    }
    from.current = shown.current;
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 4);
      const next = from.current + (value - from.current) * eased;
      shown.current = next;
      setDisplay(next);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);

  return (
    <span className={className} aria-label={formatUsd(value)}>
      <span aria-hidden="true">{formatUsd(Math.round(display))}</span>
    </span>
  );
}
