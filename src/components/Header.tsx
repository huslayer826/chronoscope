import type { ReactNode } from "react";
import { DateRangePicker, type DateRangeValue } from "./DateRangePicker";

interface HeaderProps {
  title: string;
  subtitle?: string;
  range?: DateRangeValue;
  onRangeChange?: (value: DateRangeValue) => void;
  right?: ReactNode;
}

export function Header({ title, subtitle, range, onRangeChange, right }: HeaderProps) {
  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-zinc-900 bg-[#0a0a0b]/80 px-8 backdrop-blur">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-zinc-100">
          {title}
        </h1>
        {subtitle && (
          <p className="text-xs text-zinc-500">{subtitle}</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        {right}
        {range && onRangeChange && (
          <DateRangePicker value={range} onChange={onRangeChange} />
        )}
      </div>
    </header>
  );
}
