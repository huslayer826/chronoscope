import { useEffect, useRef, useState } from "react";
import { Calendar, ChevronDown } from "lucide-react";
import {
  endOfDay,
  endOfMonth,
  endOfWeek,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
} from "date-fns";
import { cn } from "../lib/cn";

export type RangePreset =
  | "today"
  | "yesterday"
  | "this_week"
  | "this_month"
  | "last_30"
  | "custom";

export interface DateRangeValue {
  preset: RangePreset;
  start_ts: number;
  end_ts: number;
  label: string;
}

const PRESETS: { id: RangePreset; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "this_week", label: "This Week" },
  { id: "this_month", label: "This Month" },
  { id: "last_30", label: "Last 30 Days" },
  { id: "custom", label: "Custom" },
];

export function resolvePreset(preset: RangePreset, now: Date = new Date()): DateRangeValue {
  const label = PRESETS.find((p) => p.id === preset)?.label ?? "Today";
  switch (preset) {
    case "yesterday": {
      const y = subDays(now, 1);
      return {
        preset,
        label,
        start_ts: startOfDay(y).getTime(),
        end_ts: endOfDay(y).getTime(),
      };
    }
    case "this_week":
      return {
        preset,
        label,
        start_ts: startOfWeek(now, { weekStartsOn: 1 }).getTime(),
        end_ts: endOfWeek(now, { weekStartsOn: 1 }).getTime(),
      };
    case "this_month":
      return {
        preset,
        label,
        start_ts: startOfMonth(now).getTime(),
        end_ts: endOfMonth(now).getTime(),
      };
    case "last_30":
      return {
        preset,
        label,
        start_ts: startOfDay(subDays(now, 29)).getTime(),
        end_ts: endOfDay(now).getTime(),
      };
    case "custom":
    case "today":
    default:
      return {
        preset: preset === "custom" ? "custom" : "today",
        label,
        start_ts: startOfDay(now).getTime(),
        end_ts: endOfDay(now).getTime(),
      };
  }
}

interface DateRangePickerProps {
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
}

export function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickAway(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClickAway);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClickAway);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  function selectPreset(p: RangePreset) {
    onChange(resolvePreset(p));
    setOpen(false);
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        className={cn(
          "inline-flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 transition-colors",
          "hover:border-zinc-700 hover:bg-zinc-900",
        )}
      >
        <Calendar className="h-4 w-4 text-zinc-400" />
        <span>{value.label}</span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 text-zinc-500 transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-30 mt-2 w-48 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950 shadow-xl shadow-black/50">
          <ul className="py-1">
            {PRESETS.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => selectPreset(p.id)}
                  className={cn(
                    "block w-full px-3 py-1.5 text-left text-sm transition-colors",
                    value.preset === p.id
                      ? "bg-zinc-900 text-zinc-100"
                      : "text-zinc-300 hover:bg-zinc-900/70",
                  )}
                >
                  {p.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
