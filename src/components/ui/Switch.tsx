import { cn } from "../../lib/cn";

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  id?: string;
}

export function Switch({ checked, onChange, disabled, label, id }: SwitchProps) {
  return (
    <label
      className={cn(
        "inline-flex items-center gap-3",
        disabled && "cursor-not-allowed opacity-50",
      )}
      htmlFor={id}
    >
      <span
        className={cn(
          "relative inline-block h-5 w-9 shrink-0 rounded-full transition-colors",
          checked ? "bg-emerald-500" : "bg-zinc-700",
        )}
      >
        <span
          className={cn(
            "absolute left-0.5 top-0.5 inline-block h-4 w-4 rounded-full bg-white shadow transition-transform",
            checked && "translate-x-4",
          )}
        />
        <input
          id={id}
          type="checkbox"
          className="absolute inset-0 cursor-pointer opacity-0"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.currentTarget.checked)}
        />
      </span>
      {label && <span className="text-sm text-zinc-200">{label}</span>}
    </label>
  );
}
