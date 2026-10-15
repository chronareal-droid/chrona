import type { ButtonHTMLAttributes, ReactNode } from 'react';
import type { Level } from '../lib/types';

export function Button({ className = '', variant = 'primary', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' }) {
  const styles =
    variant === 'primary'
      ? 'bg-accent text-accent-ink hover:brightness-110 disabled:opacity-40'
      : 'border border-line text-slate-100 hover:border-accent disabled:opacity-40';
  return (
    <button
      className={`inline-flex min-h-12 items-center justify-center rounded-xl px-5 font-semibold transition ${styles} ${className}`}
      {...props}
    />
  );
}

const LEVEL_STYLE: Record<Level, string> = {
  low: 'bg-low/15 text-low ring-low/40',
  elevated: 'bg-elevated/15 text-elevated ring-elevated/40',
  high: 'bg-high/15 text-high ring-high/40',
};
const LEVEL_TEXT: Record<Level, string> = { low: 'Low', elevated: 'Elevated', high: 'High' };

export function LevelBadge({ level, big = false }: { level: Level; big?: boolean }) {
  return (
    <span className={`print-plain inline-flex shrink-0 items-center whitespace-nowrap rounded-full font-semibold ring-1 ${LEVEL_STYLE[level]} ${big ? 'px-4 py-1.5 text-lg' : 'px-2.5 py-0.5 text-xs'}`}>
      {LEVEL_TEXT[level]}{big ? ' risk' : ''}
    </span>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`print-plain min-w-0 rounded-2xl border border-line bg-panel p-4 [overflow-wrap:anywhere] ${className}`}>{children}</div>;
}

export function Chips<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly { value: T; label: string }[];
  value: T | '';
  onChange: (v: T) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const on = o.value === value;
          return (
            <button
              type="button"
              key={o.value}
              aria-pressed={on}
              onClick={() => onChange(o.value)}
              className={`min-h-10 rounded-full border px-3.5 text-sm transition ${on ? 'border-accent bg-accent text-accent-ink' : 'border-line bg-panel text-slate-200 hover:border-slate-500'}`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export function Prose({ children }: { children: ReactNode }) {
  return <div className="space-y-4 leading-relaxed text-slate-300 [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:text-white [&_h2]:pt-4 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-white [&_li]:ml-5 [&_li]:list-disc [&_a]:text-accent [&_a]:underline">{children}</div>;
}
