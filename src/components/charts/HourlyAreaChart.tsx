import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartFrame } from "./ChartFrame";
import { formatHour } from "../../lib/format";

interface HourlyAreaChartProps {
  byHour: number[];
  loading?: boolean;
  height?: number;
}

interface TooltipPayloadItem {
  payload: { hour: number; minutes: number };
}

function HourTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayloadItem[] }) {
  if (!active || !payload || !payload.length) return null;
  const { hour, minutes } = payload[0].payload;
  return (
    <div className="rounded-md border border-zinc-800 bg-zinc-950/95 px-3 py-2 text-xs shadow-lg shadow-black/40">
      <div className="text-zinc-400">{formatHour(hour)}</div>
      <div className="mt-0.5 font-mono font-semibold text-zinc-100 tabular-nums">
        {minutes.toFixed(0)} min
      </div>
    </div>
  );
}

export function HourlyAreaChart({ byHour, loading, height = 280 }: HourlyAreaChartProps) {
  const data = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    minutes: byHour[hour] ?? 0,
  }));
  const empty = !loading && data.every((d) => d.minutes === 0);

  return (
    <ChartFrame
      title="Activity by Hour"
      subtitle="Minutes of active time per hour"
      loading={loading}
      empty={empty}
      height={height}
    >
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 12, right: 12, left: -8, bottom: 0 }}>
          <defs>
            <linearGradient id="hourFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22c55e" stopOpacity={0.45} />
              <stop offset="100%" stopColor="#22c55e" stopOpacity={0.04} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#1f1f23" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="hour"
            tick={{ fill: "#71717a", fontSize: 11, fontFamily: "JetBrains Mono" }}
            tickLine={false}
            axisLine={{ stroke: "#27272a" }}
            interval={2}
            tickFormatter={(v: number) => `${v}`}
          />
          <YAxis
            tick={{ fill: "#71717a", fontSize: 11, fontFamily: "JetBrains Mono" }}
            tickLine={false}
            axisLine={false}
            width={32}
          />
          <Tooltip
            cursor={{ stroke: "#3f3f46", strokeDasharray: "3 3" }}
            content={<HourTooltip />}
          />
          <Area
            type="monotone"
            dataKey="minutes"
            stroke="#22c55e"
            strokeWidth={2}
            strokeOpacity={1}
            fill="url(#hourFill)"
            fillOpacity={1}
            isAnimationActive
            animationDuration={650}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
