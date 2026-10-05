import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { DEPOSIT_LAWS } from "@/lib/deposit-laws";

/** Label + control + optional hint. Labels are small mono caps, like a form you'd file. */
export function Field({
  label,
  htmlFor,
  hint,
  className,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="eyebrow mb-2 block">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1.5 text-xs leading-relaxed text-[var(--muted)]">{hint}</p>}
    </div>
  );
}

export function MoneyInput({
  id,
  value,
  onChange,
  placeholder,
  ...props
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-sm text-[var(--faint)]">
        $
      </span>
      <input
        id={id}
        type="number"
        inputMode="decimal"
        min={0}
        step="0.01"
        className="field figure pl-7"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        {...props}
      />
    </div>
  );
}

export function Select({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select className={cn("field", className)} {...props}>
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]"
        aria-hidden="true"
      />
    </div>
  );
}

export function StateSelect({
  value,
  onChange,
  id,
}: {
  value: string;
  onChange: (code: string) => void;
  id?: string;
}) {
  return (
    <Select id={id} value={value} onChange={(e) => onChange(e.target.value)} required>
      <option value="">Choose a state</option>
      {DEPOSIT_LAWS.map((law) => (
        <option key={law.code} value={law.code}>
          {law.name}
        </option>
      ))}
    </Select>
  );
}
