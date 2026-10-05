import { DEPOSIT_LAWS } from "@/lib/deposit-laws";

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
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="field"
      required
    >
      <option value="">Choose your state</option>
      {DEPOSIT_LAWS.map((law) => (
        <option key={law.code} value={law.code}>
          {law.name}
        </option>
      ))}
    </select>
  );
}
