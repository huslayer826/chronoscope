import { useEffect, useState, type ReactNode } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { TrendingDown, TrendingUp } from "lucide-react";
import { Card } from "./ui/Card";
import { cn } from "../lib/cn";

interface KpiCardBaseProps {
  label: string;
  loading?: boolean;
  children: ReactNode;
}

export function KpiCard({ label, loading, children }: KpiCardBaseProps) {
  if (loading) {
    return (
      <Card>
        <div className="space-y-3">
          <div className="shimmer h-3 w-24 rounded" />
          <div className="shimmer h-8 w-40 rounded" />
          <div className="shimmer h-3 w-20 rounded" />
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
        {label}
      </div>
      <div className="mt-2">{children}</div>
    </Card>
  );
}

interface DeltaProps {
  value: number;
  suffix?: string;
}

export function Delta({ value, suffix = "vs yesterday" }: DeltaProps) {
  const positive = value >= 0;
  const Icon = positive ? TrendingUp : TrendingDown;
  return (
    <div
      className={cn(
        "mt-2 inline-flex items-center gap-1 text-xs font-medium",
        positive ? "text-emerald-400" : "text-rose-400",
      )}
    >
      <Icon className="h-3 w-3" />
      <span>
        {positive ? "+" : ""}
        {value}%
      </span>
      <span className="text-zinc-500">{suffix}</span>
    </div>
  );
}

interface AnimatedNumberProps {
  to: number;
  format?: (v: number) => string;
  duration?: number;
  className?: string;
}

export function AnimatedNumber({
  to,
  format = (v) => Math.round(v).toLocaleString(),
  duration = 0.9,
  className,
}: AnimatedNumberProps) {
  const mv = useMotionValue(0);
  const rounded = useTransform(mv, (v) => format(v));

  useEffect(() => {
    const controls = animate(mv, to, { duration, ease: "easeOut" });
    return () => controls.stop();
  }, [to, duration, mv]);

  return <motion.span className={className}>{rounded}</motion.span>;
}

interface ActiveTimeKpiProps {
  totalSeconds: number;
  deltaPercent: number;
  loading?: boolean;
}

function formatHMS(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export function ActiveTimeKpi({ totalSeconds, deltaPercent, loading }: ActiveTimeKpiProps) {
  return (
    <KpiCard label="Active Time Today" loading={loading}>
      <div className="font-mono text-3xl font-semibold tracking-tight text-zinc-100 tabular-nums">
        <AnimatedNumber to={totalSeconds} format={formatHMS} />
      </div>
      <Delta value={deltaPercent} />
    </KpiCard>
  );
}

interface TopAppKpiProps {
  name: string;
  seconds: number;
  loading?: boolean;
}

export function TopAppKpi({ name, seconds, loading }: TopAppKpiProps) {
  const initial = name.charAt(0).toUpperCase() || "—";
  return (
    <KpiCard label="Most-Used App" loading={loading}>
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-lg border border-zinc-800 bg-zinc-900 text-sm font-semibold text-zinc-300">
          {initial}
        </div>
        <div className="min-w-0">
          <div className="truncate text-xl font-semibold text-zinc-100">{name}</div>
          <div className="font-mono text-xs text-zinc-500 tabular-nums">
            <AnimatedNumber to={seconds} format={formatHMS} />
          </div>
        </div>
      </div>
    </KpiCard>
  );
}

interface TopSiteKpiProps {
  domain: string;
  seconds: number;
  faviconUrl?: string;
  loading?: boolean;
}

export function TopSiteKpi({ domain, seconds, faviconUrl, loading }: TopSiteKpiProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const fallback = domain.charAt(0).toUpperCase() || "—";
  return (
    <KpiCard label="Most-Visited Site" loading={loading}>
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900 text-sm font-semibold text-zinc-300">
          {faviconUrl && !imgFailed ? (
            <img
              src={faviconUrl}
              alt={domain}
              className="h-6 w-6"
              onError={() => setImgFailed(true)}
            />
          ) : (
            <span>{fallback}</span>
          )}
        </div>
        <div className="min-w-0">
          <div className="truncate text-xl font-semibold text-zinc-100">{domain}</div>
          <div className="font-mono text-xs text-zinc-500 tabular-nums">
            <AnimatedNumber to={seconds} format={formatHMS} />
          </div>
        </div>
      </div>
    </KpiCard>
  );
}

interface ProductivityKpiProps {
  productivePercent: number;
  loading?: boolean;
}

export function ProductivityKpi({ productivePercent, loading }: ProductivityKpiProps) {
  const clamped = Math.max(0, Math.min(100, productivePercent));
  const size = 64;
  const stroke = 6;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  const mv = useMotionValue(0);
  const offset = useTransform(mv, (v) => circumference - (v / 100) * circumference);

  useEffect(() => {
    const controls = animate(mv, clamped, { duration: 1.0, ease: "easeOut" });
    return () => controls.stop();
  }, [clamped, mv]);

  return (
    <KpiCard label="Productivity Score" loading={loading}>
      <div className="flex items-center gap-4">
        <div className="relative" style={{ width: size, height: size }}>
          <svg width={size} height={size} className="-rotate-90">
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="rgb(39 39 42)"
              strokeWidth={stroke}
            />
            <motion.circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="#22c55e"
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={circumference}
              style={{ strokeDashoffset: offset }}
            />
          </svg>
          <div className="absolute inset-0 grid place-items-center font-mono text-sm font-semibold text-zinc-100 tabular-nums">
            <AnimatedNumber to={clamped} format={(v) => `${Math.round(v)}%`} />
          </div>
        </div>
        <div className="text-xs leading-5 text-zinc-400">
          <div>
            <span className="text-emerald-400">●</span> Productive
          </div>
          <div>
            <span className="text-zinc-600">●</span> Distracting
          </div>
        </div>
      </div>
    </KpiCard>
  );
}
