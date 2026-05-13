import { useMemo, useState } from "react";
import { ChartFrame } from "./ChartFrame";
import { formatHM } from "../../lib/format";
import type { DayStat } from "../../lib/api";

interface ActivityHeatmapProps {
  byDay: DayStat[];
  days?: number;
  loading?: boolean;
}

const CELL = 12;
const GAP = 3;
const COLS_GAP = 3;

const SCALE: { thresholdHours: number; color: string }[] = [
  { thresholdHours: 0, color: "#18181b" },
  { thresholdHours: 0.5, color: "#0f3d1f" },
  { thresholdHours: 2, color: "#166534" },
  { thresholdHours: 4, color: "#16a34a" },
  { thresholdHours: 6, color: "#22c55e" },
  { thresholdHours: 8, color: "#4ade80" },
];

function colorFor(seconds: number): string {
  const hours = seconds / 3600;
  let pick = SCALE[0].color;
  for (const step of SCALE) {
    if (hours >= step.thresholdHours) pick = step.color;
  }
  return pick;
}

function toLocalDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

interface Cell {
  date: Date;
  key: string;
  seconds: number;
  col: number;
  row: number;
}

export function ActivityHeatmap({ byDay, days = 90, loading }: ActivityHeatmapProps) {
  const [hover, setHover] = useState<Cell | null>(null);

  const { cells, weeks, monthLabels, total } = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of byDay) map.set(d.date, d.duration_seconds);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(today);
    start.setDate(today.getDate() - (days - 1));

    const startDow = start.getDay();
    const startCol = 0;

    const result: Cell[] = [];
    let total = 0;
    let maxCol = 0;
    const monthLabels: { col: number; label: string }[] = [];
    let lastMonth = -1;

    for (let i = 0; i < days; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const dow = d.getDay();
      const col = startCol + Math.floor((i + startDow) / 7);
      const row = dow;
      const key = toLocalDateKey(d);
      const seconds = map.get(key) ?? 0;
      total += seconds;
      result.push({ date: d, key, seconds, col, row });
      maxCol = Math.max(maxCol, col);

      if (d.getMonth() !== lastMonth && d.getDate() <= 7) {
        monthLabels.push({ col, label: MONTH_NAMES[d.getMonth()] });
        lastMonth = d.getMonth();
      }
    }

    return { cells: result, weeks: maxCol + 1, monthLabels, total };
  }, [byDay, days]);

  const empty = !loading && total === 0;
  const width = weeks * (CELL + COLS_GAP);
  const height = 7 * (CELL + GAP) + 20;

  return (
    <ChartFrame
      title="Activity (90 days)"
      subtitle="Daily active time, GitHub-style"
      loading={loading}
      empty={empty}
      height={height + 32}
    >
      <div className="relative overflow-x-auto pb-2">
        <svg width={width} height={height} className="block">
          <g transform="translate(0, 14)">
            {monthLabels.map((m) => (
              <text
                key={`${m.col}-${m.label}`}
                x={m.col * (CELL + COLS_GAP)}
                y={-4}
                fill="#71717a"
                fontSize={10}
                fontFamily="Inter, sans-serif"
              >
                {m.label}
              </text>
            ))}
            {cells.map((c) => (
              <rect
                key={c.key}
                x={c.col * (CELL + COLS_GAP)}
                y={c.row * (CELL + GAP)}
                width={CELL}
                height={CELL}
                rx={2}
                ry={2}
                fill={colorFor(c.seconds)}
                stroke={hover?.key === c.key ? "#71717a" : "transparent"}
                strokeWidth={1}
                onMouseEnter={() => setHover(c)}
                onMouseLeave={() => setHover(null)}
                style={{ cursor: "pointer" }}
              />
            ))}
          </g>
        </svg>

        {hover && (
          <div
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded-md border border-zinc-800 bg-zinc-950/95 px-2 py-1 text-[11px] shadow-lg shadow-black/40"
            style={{
              left: hover.col * (CELL + COLS_GAP) + CELL / 2,
              top: hover.row * (CELL + GAP) + 12,
            }}
          >
            <div className="font-mono text-zinc-100 tabular-nums">
              {hover.seconds === 0 ? "No activity" : formatHM(hover.seconds)}
            </div>
            <div className="text-zinc-500">{hover.key}</div>
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center justify-end gap-2 text-[11px] text-zinc-500">
        <span>Less</span>
        {SCALE.map((s) => (
          <span
            key={s.thresholdHours}
            className="inline-block h-2.5 w-2.5 rounded-sm"
            style={{ backgroundColor: s.color }}
          />
        ))}
        <span>More</span>
      </div>
    </ChartFrame>
  );
}
