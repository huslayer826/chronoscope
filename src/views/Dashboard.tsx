import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Header } from "../components/Header";
import {
  ActiveTimeKpi,
  ProductivityKpi,
  TopAppKpi,
  TopSiteKpi,
} from "../components/KpiCard";
import { resolvePreset, type DateRangeValue } from "../components/DateRangePicker";
import { getSummary, type Summary } from "../lib/api";

interface DashboardKpis {
  totalSeconds: number;
  deltaPercent: number;
  topApp: { name: string; seconds: number };
  topSite: { domain: string; seconds: number; faviconUrl?: string };
  productivePercent: number;
}

const MOCK_KPIS: DashboardKpis = {
  totalSeconds: 4 * 3600 + 32 * 60 + 15,
  deltaPercent: 12,
  topApp: { name: "Visual Studio Code", seconds: 2 * 3600 + 14 * 60 },
  topSite: {
    domain: "github.com",
    seconds: 47 * 60,
    faviconUrl: "https://www.google.com/s2/favicons?domain=github.com&sz=64",
  },
  productivePercent: 78,
};

function summaryToKpis(summary: Summary | null): DashboardKpis {
  if (!summary) return MOCK_KPIS;
  const topApp = summary.top_apps[0];
  const topDomain = summary.top_domains[0];
  const productive = summary.by_category
    .filter((c) => c.name.toLowerCase().includes("productive"))
    .reduce((sum, c) => sum + c.percent, 0);
  return {
    totalSeconds: summary.total_active_seconds,
    deltaPercent: 0,
    topApp: {
      name: topApp?.display_name ?? topApp?.app_name ?? "—",
      seconds: topApp?.duration_seconds ?? 0,
    },
    topSite: {
      domain: topDomain?.domain ?? "—",
      seconds: topDomain?.duration_seconds ?? 0,
      faviconUrl: topDomain?.favicon_url,
    },
    productivePercent: Math.round(productive),
  };
}

export function Dashboard() {
  const [range, setRange] = useState<DateRangeValue>(() => resolvePreset("today"));
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<DashboardKpis>(MOCK_KPIS);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getSummary({ start_ts: range.start_ts, end_ts: range.end_ts })
      .then((summary) => {
        if (cancelled) return;
        setKpis(summaryToKpis(summary));
      })
      .catch(() => {
        if (cancelled) return;
        setKpis(MOCK_KPIS);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [range.start_ts, range.end_ts]);

  return (
    <>
      <Header title="Dashboard" range={range} onRangeChange={setRange} />
      <div className="p-8">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4"
        >
          <ActiveTimeKpi
            totalSeconds={kpis.totalSeconds}
            deltaPercent={kpis.deltaPercent}
            loading={loading}
          />
          <TopAppKpi
            name={kpis.topApp.name}
            seconds={kpis.topApp.seconds}
            loading={loading}
          />
          <TopSiteKpi
            domain={kpis.topSite.domain}
            seconds={kpis.topSite.seconds}
            faviconUrl={kpis.topSite.faviconUrl}
            loading={loading}
          />
          <ProductivityKpi
            productivePercent={kpis.productivePercent}
            loading={loading}
          />
        </motion.div>
      </div>
    </>
  );
}
