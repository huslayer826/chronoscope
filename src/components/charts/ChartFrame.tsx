import type { ReactNode } from "react";
import { Card } from "../ui/Card";
import { cn } from "../../lib/cn";

interface ChartFrameProps {
  title: string;
  subtitle?: string;
  loading?: boolean;
  empty?: boolean;
  height?: number;
  right?: ReactNode;
  children: ReactNode;
  innerClassName?: string;
}

export function ChartFrame({
  title,
  subtitle,
  loading,
  empty,
  height = 280,
  right,
  children,
  innerClassName,
}: ChartFrameProps) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-zinc-100">{title}</h3>
          {subtitle && (
            <p className="mt-0.5 text-xs text-zinc-500">{subtitle}</p>
          )}
        </div>
        {right}
      </div>
      <div
        className={cn("mt-4 w-full", innerClassName)}
        style={{ minHeight: height }}
      >
        {loading ? (
          <div
            className="shimmer w-full rounded-lg"
            style={{ height }}
          />
        ) : empty ? (
          <div
            className="grid w-full place-items-center rounded-lg border border-dashed border-zinc-800 text-center text-xs text-zinc-500"
            style={{ height }}
          >
            <p className="max-w-xs px-6">
              No data yet — start using your computer and check back in a few minutes.
            </p>
          </div>
        ) : (
          children
        )}
      </div>
    </Card>
  );
}
