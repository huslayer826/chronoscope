import { useState } from "react";
import { motion } from "framer-motion";
import { ChartFrame } from "./ChartFrame";
import { formatHM } from "../../lib/format";
import type { DomainStat } from "../../lib/api";

interface TopSitesBarProps {
  domains: DomainStat[];
  loading?: boolean;
  onSelect?: (domain: DomainStat) => void;
}

function Favicon({ url, domain }: { url?: string; domain: string }) {
  const [failed, setFailed] = useState(false);
  if (!url || failed) {
    return (
      <div className="grid h-5 w-5 shrink-0 place-items-center rounded bg-zinc-800 text-[10px] font-semibold text-zinc-400">
        {domain.charAt(0).toUpperCase()}
      </div>
    );
  }
  return (
    <img
      src={url}
      alt={domain}
      className="h-5 w-5 shrink-0 rounded"
      onError={() => setFailed(true)}
    />
  );
}

export function TopSitesBar({ domains, loading, onSelect }: TopSitesBarProps) {
  const top = domains.slice(0, 10);
  const empty = !loading && top.length === 0;
  const max = top.reduce((m, d) => Math.max(m, d.duration_seconds), 0) || 1;

  return (
    <ChartFrame
      title="Top Sites"
      subtitle="Most-visited domains"
      loading={loading}
      empty={empty}
      height={Math.max(180, top.length * 36 + 16)}
      innerClassName="space-y-2"
    >
      {top.map((d, i) => {
        const widthPct = (d.duration_seconds / max) * 100;
        return (
          <button
            key={d.domain}
            type="button"
            onClick={() => onSelect?.(d)}
            className="group block w-full rounded-md px-1 py-1 text-left transition-colors hover:bg-zinc-900/40"
          >
            <div className="mb-1 flex items-center gap-2 text-xs">
              <Favicon url={d.favicon_url} domain={d.domain} />
              <span className="min-w-0 flex-1 truncate text-zinc-200">{d.domain}</span>
              <span className="shrink-0 font-mono text-[11px] text-zinc-500 tabular-nums">
                {formatHM(d.duration_seconds)}
              </span>
            </div>
            <div className="ml-7 h-1.5 w-[calc(100%-1.75rem)] overflow-hidden rounded-full bg-zinc-900">
              <motion.div
                className="h-full rounded-full bg-zinc-400/80"
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
