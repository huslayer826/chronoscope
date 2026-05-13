import { useMemo, useState } from "react";
import { ChartFrame } from "./charts/ChartFrame";
import { formatHM } from "../lib/format";
import type { TimelineEvent } from "../lib/api";

interface TimelineProps {
  events: TimelineEvent[];
  loading?: boolean;
}

const FALLBACK_COLOR = "#52525b";
const HOUR_TICKS = [0, 3, 6, 9, 12, 15, 18, 21, 24];

function fmtClock(ts: number): string {
  const d = new Date(ts);
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

export function Timeline({ events, loading }: TimelineProps) {
  const [hover, setHover] = useState<{ ev: TimelineEvent; x: number } | null>(null);

  const dayStart = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }, []);
  const dayMs = 24 * 60 * 60 * 1000;

  const bars = useMemo(() => {
    return events
      .map((ev) => {
        const left = Math.max(0, ev.start_ts - dayStart) / dayMs;
        const right = Math.min(dayMs, ev.end_ts - dayStart) / dayMs;
        const width = Math.max(0, right - left);
        return { ev, leftPct: left * 100, widthPct: width * 100 };
      })
      .filter((b) => b.widthPct > 0);
  }, [events, dayStart]);

  const empty = !loading && bars.length === 0;

  return (
    <ChartFrame
      title="Today's Timeline"
      subtitle="Sessions across the day"
      loading={loading}
      empty={empty}
      height={140}
    >
      <div className="relative">
        <div className="relative h-10 w-full overflow-hidden rounded-md border border-zinc-900 bg-zinc-950">
          {bars.map((b, i) => (
            <div
              key={i}
              className="absolute top-0 h-full"
              style={{
                left: `${b.leftPct}%`,
                width: `${b.widthPct}%`,
                backgroundColor: b.ev.color ?? FALLBACK_COLOR,
                opacity: hover && hover.ev !== b.ev ? 0.45 : 0.95,
              }}
              onMouseEnter={(e) => {
                const rect = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect();
                const x = e.clientX - rect.left;
                setHover({ ev: b.ev, x });
              }}
              onMouseMove={(e) => {
                const rect = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect();
                const x = e.clientX - rect.left;
                setHover({ ev: b.ev, x });
              }}
              onMouseLeave={() => setHover(null)}
            />
          ))}
        </div>

        <div className="mt-1.5 flex justify-between font-mono text-[10px] text-zinc-500 tabular-nums">
          {HOUR_TICKS.map((h) => (
            <span key={h}>{String(h).padStart(2, "0")}:00</span>
          ))}
        </div>

        {hover && (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-md border border-zinc-800 bg-zinc-950/95 px-3 py-2 text-xs shadow-lg shadow-black/40"
            style={{ left: hover.x, top: -6 }}
          >
            <div className="font-semibold text-zinc-100">{hover.ev.app_name}</div>
            {hover.ev.domain && (
              <div className="text-zinc-400">{hover.ev.domain}</div>
            )}
            <div className="mt-0.5 font-mono text-[11px] text-zinc-500 tabular-nums">
              {fmtClock(hover.ev.start_ts)} – {fmtClock(hover.ev.end_ts)} ·{" "}
              {formatHM(Math.floor((hover.ev.end_ts - hover.ev.start_ts) / 1000))}
            </div>
          </div>
        )}
      </div>
    </ChartFrame>
  );
}
