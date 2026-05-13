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
import { HourlyAreaChart } from "../components/charts/HourlyAreaChart";
import { TopAppsBar } from "../components/charts/TopAppsBar";
import { TopSitesBar } from "../components/charts/TopSitesBar";
import { CategoryDonut } from "../components/charts/CategoryDonut";
import { ActivityHeatmap } from "../components/charts/ActivityHeatmap";
import { Timeline } from "../components/Timeline";
import {
  getSummary,
  getTodayTimeline,
  type Summary,
  type TimelineEvent,
} from "../lib/api";
import { MOCK_SUMMARY, buildMockTimeline } from "../lib/mocks";

function pickTopApp(summary: Summary) {
  const a = summary.top_apps[0];
  return {
    name: a?.display_name ?? a?.app_name ?? "—",
    seconds: a?.duration_seconds ?? 0,
  };
}

function pickTopSite(summary: Summary) {
  const d = summary.top_domains[0];
  return {
    domain: d?.domain ?? "—",
    seconds: d?.duration_seconds ?? 0,
    faviconUrl: d?.favicon_url,
  };
}

function productivePercent(summary: Summary): number {
  const productive = summary.by_category
    .filter((c) => c.name.toLowerCase().includes("productive") || c.name === "Development")
    .reduce((sum, c) => sum + c.percent, 0);
  if (productive > 0) return Math.round(productive);
  const dev = summary.by_category.find((c) => c.name === "Development");
  return Math.round(dev?.percent ?? 0);
}

export function Dashboard() {
  const [range, setRange] = useState<DateRangeValue>(() => resolvePreset("today"));
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<Summary>(MOCK_SUMMARY);
  const [timeline, setTimeline] = useState<TimelineEvent[]>(() => buildMockTimeline());

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    Promise.allSettled([
      getSummary({ start_ts: range.start_ts, end_ts: range.end_ts }),
      getTodayTimeline(),
    ]).then(([sumRes, tlRes]) => {
      if (cancelled) return;
      if (sumRes.status === "fulfilled" && sumRes.value) {
        setSummary(sumRes.value);
      } else {
        setSummary(MOCK_SUMMARY);
      }
      if (tlRes.status === "fulfilled" && tlRes.value) {
        setTimeline(tlRes.value);
      } else {
        setTimeline(buildMockTimeline());
      }
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [range.start_ts, range.end_ts]);

  const topApp = pickTopApp(summary);
  const topSite = pickTopSite(summary);

  return (
    <>
      <Header title="Dashboard" range={range} onRangeChange={setRange} />
      <div className="space-y-4 p-8">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4"
        >
          <ActiveTimeKpi
            totalSeconds={summary.total_active_seconds}
            deltaPercent={12}
            loading={loading}
          />
          <TopAppKpi name={topApp.name} seconds={topApp.seconds} loading={loading} />
          <TopSiteKpi
            domain={topSite.domain}
            seconds={topSite.seconds}
            faviconUrl={topSite.faviconUrl}
            loading={loading}
          />
          <ProductivityKpi
            productivePercent={productivePercent(summary)}
            loading={loading}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut", delay: 0.05 }}
          className="grid grid-cols-1 gap-4 lg:grid-cols-3"
        >
          <div className="space-y-4 lg:col-span-2">
            <HourlyAreaChart byHour={summary.by_hour} loading={loading} />
            <Timeline events={timeline} loading={loading} />
          </div>

          <div className="space-y-4 lg:col-span-1">
            <TopAppsBar
              apps={summary.top_apps}
              categories={summary.by_category}
              loading={loading}
            />
            <TopSitesBar domains={summary.top_domains} loading={loading} />
            <CategoryDonut categories={summary.by_category} loading={loading} />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
        >
          <ActivityHeatmap byDay={summary.by_day} loading={loading} />
        </motion.div>
      </div>
    </>
  );
}
