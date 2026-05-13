import { motion } from "framer-motion";
import { ChartFrame } from "./ChartFrame";
import { formatHM } from "../../lib/format";
import type { AppStat, CategoryStat } from "../../lib/api";

interface TopAppsBarProps {
  apps: AppStat[];
  categories?: CategoryStat[];
  loading?: boolean;
  onSelect?: (app: AppStat) => void;
}

function buildCategoryLookup(_categories?: CategoryStat[]): Record<string, string> {
  return {};
}

const FALLBACK_COLOR = "#52525b";

export function TopAppsBar({ apps, categories, loading, onSelect }: TopAppsBarProps) {
  const top = apps.slice(0, 10);
  const empty = !loading && top.length === 0;
  const max = top.reduce((m, a) => Math.max(m, a.duration_seconds), 0) || 1;
  const colorLookup = buildCategoryLookup(categories);

  return (
    <ChartFrame
      title="Top Apps"
      subtitle="Most-used applications"
      loading={loading}
      empty={empty}
      height={Math.max(180, top.length * 32 + 16)}
      innerClassName="space-y-2"
    >
      {top.map((app, i) => {
        const color = colorLookup[app.app_name] ?? FALLBACK_COLOR;
        const widthPct = (app.duration_seconds / max) * 100;
        const name = app.display_name ?? app.app_name;
        return (
          <button
            key={app.app_name}
            type="button"
            onClick={() => onSelect?.(app)}
            className="group block w-full rounded-md px-1 py-1 text-left transition-colors hover:bg-zinc-900/40"
          >
            <div className="mb-1 flex items-baseline justify-between gap-3 text-xs">
              <span className="truncate text-zinc-200">{name}</span>
              <span className="shrink-0 font-mono text-[11px] text-zinc-500 tabular-nums">
                {formatHM(app.duration_seconds)}
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-900">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: color }}
                initial={{ width: 0 }}
                animate={{ width: `${widthPct}%` }}
                transition={{ duration: 0.7, ease: "easeOut", delay: i * 0.04 }}
              />
            </div>
          </button>
        );
      })}
    </ChartFrame>
  );
}
