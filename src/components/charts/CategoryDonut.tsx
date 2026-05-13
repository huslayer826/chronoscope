import { useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { ChartFrame } from "./ChartFrame";
import { formatHM } from "../../lib/format";
import type { CategoryStat } from "../../lib/api";

interface CategoryDonutProps {
  categories: CategoryStat[];
  loading?: boolean;
  height?: number;
}

interface DonutTooltipPayload {
  payload: { name: string; color: string; duration_seconds: number; percent: number };
}

function DonutTooltip({ active, payload }: { active?: boolean; payload?: DonutTooltipPayload[] }) {
  if (!active || !payload || !payload.length) return null;
  const slice = payload[0].payload;
  return (
    <div className="rounded-md border border-zinc-800 bg-zinc-950/95 px-3 py-2 text-xs shadow-lg shadow-black/40">
      <div className="flex items-center gap-2">
        <span
          className="inline-block h-2 w-2 rounded-full"
          style={{ backgroundColor: slice.color }}
        />
        <span className="text-zinc-200">{slice.name}</span>
      </div>
      <div className="mt-1 font-mono text-zinc-100 tabular-nums">
        {formatHM(slice.duration_seconds)}{" "}
        <span className="text-zinc-500">({slice.percent.toFixed(0)}%)</span>
      </div>
    </div>
  );
}

export function CategoryDonut({ categories, loading, height = 240 }: CategoryDonutProps) {
  const [active, setActive] = useState<number | null>(null);
  const empty = !loading && categories.length === 0;
  const total = categories.reduce((sum, c) => sum + c.duration_seconds, 0);

  return (
    <ChartFrame
      title="Categories"
      subtitle="Time by category"
      loading={loading}
      empty={empty}
      height={height}
    >
      <div className="flex items-center gap-4">
        <div className="relative" style={{ width: 180, height }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip content={<DonutTooltip />} />
              <Pie
                data={categories}
                dataKey="duration_seconds"
                nameKey="name"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={2}
                stroke="none"
                onMouseEnter={(_, idx) => setActive(idx)}
                onMouseLeave={() => setActive(null)}
                isAnimationActive
                animationDuration={650}
              >
                {categories.map((c, i) => (
                  <Cell
                    key={c.name}
                    fill={c.color}
                    fillOpacity={active === null || active === i ? 1 : 0.4}
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-zinc-500">
                Total
              </div>
              <div className="font-mono text-sm font-semibold text-zinc-100 tabular-nums">
                {formatHM(total)}
              </div>
            </div>
          </div>
        </div>

        <ul className="flex-1 space-y-1.5 text-xs">
          {categories.map((c, i) => (
            <li
              key={c.name}
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
              className="flex items-center justify-between gap-3 rounded px-1.5 py-1 transition-colors hover:bg-zinc-900/40"
            >
              <div className="flex items-center gap-2">
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: c.color }}
                />
                <span className="text-zinc-200">{c.name}</span>
              </div>
              <span className="font-mono text-[11px] text-zinc-500 tabular-nums">
                {c.percent.toFixed(0)}%
              </span>
            </li>
          ))}
        </ul>
      </div>
    </ChartFrame>
  );
}
