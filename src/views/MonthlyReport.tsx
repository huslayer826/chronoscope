import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  FileImage,
  FileText,
  Flame,
  Hash,
  Loader2,
  Sparkles,
} from "lucide-react";
import { Header } from "../components/Header";
import { Card } from "../components/ui/Card";
import { cn } from "../lib/cn";
import { formatHM } from "../lib/format";
import { getMonthlyReport, type MonthlyReport as MonthlyReportData } from "../lib/api";
import { buildMockMonthlyReport } from "../lib/mocks";
import { exportNodeAsPdf, exportNodeAsPng } from "../lib/export";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function previousCompleteMonth(now: Date = new Date()): { year: number; month: number } {
  const m = now.getMonth();
  if (m === 0) return { year: now.getFullYear() - 1, month: 12 };
  return { year: now.getFullYear(), month: m };
}

function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const idx = year * 12 + (month - 1) + delta;
  const y = Math.floor(idx / 12);
  const m = (idx % 12) + 1;
  return { year: y, month: m };
}

function formatDayLabel(iso: string): string {
  const [y, m, d] = iso.split("-").map((s) => parseInt(s, 10));
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function deltaPercent(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return ((current - previous) / previous) * 100;
}

export function MonthlyReport() {
  const initial = useMemo(() => previousCompleteMonth(), []);
  const [year, setYear] = useState(initial.year);
  const [month, setMonth] = useState(initial.month);
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<MonthlyReportData | null>(null);
  const [exporting, setExporting] = useState<"png" | "pdf" | null>(null);

  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getMonthlyReport(year, month)
      .then((r) => {
        if (cancelled) return;
        setReport(r);
      })
      .catch(() => {
        if (cancelled) return;
        setReport(buildMockMonthlyReport(year, month));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [year, month]);

  function goPrev() {
    const next = shiftMonth(year, month, -1);
    setYear(next.year);
    setMonth(next.month);
  }
  function goNext() {
    const next = shiftMonth(year, month, 1);
    setYear(next.year);
    setMonth(next.month);
  }

  async function handleExport(kind: "png" | "pdf") {
    if (!reportRef.current || exporting) return;
    const slug = `chronoscope-${year}-${String(month).padStart(2, "0")}`;
    setExporting(kind);
    try {
      if (kind === "png") {
        await exportNodeAsPng(reportRef.current, `${slug}.png`);
      } else {
        await exportNodeAsPdf(reportRef.current, `${slug}.pdf`);
      }
    } catch (err) {
      console.error("export failed", err);
    } finally {
      setExporting(null);
    }
  }

  const monthName = report?.month_name ?? MONTH_NAMES[month - 1] ?? "";

  return (
    <>
      <Header
        title="Monthly Report"
        subtitle="A polished snapshot you can share"
        right={
          <div className="flex items-center gap-2">
            <MonthSelector
              year={year}
              month={month}
              onPrev={goPrev}
              onNext={goNext}
            />
            <ExportButton
              icon={FileImage}
              label="PNG"
              busy={exporting === "png"}
              disabled={!report || loading || exporting !== null}
              onClick={() => handleExport("png")}
            />
            <ExportButton
              icon={FileText}
              label="PDF"
              busy={exporting === "pdf"}
              disabled={!report || loading || exporting !== null}
              onClick={() => handleExport("pdf")}
            />
          </div>
        }
      />

      <div className="p-8">
        <div className="mx-auto max-w-[1200px]">
          {loading && !report ? (
            <LoadingShell />
          ) : report ? (
            <div
              ref={reportRef}
              className="space-y-6 rounded-2xl bg-[#0a0a0b] p-10"
              style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}
            >
              <ReportHeader monthName={monthName} year={year} />
              <SummaryGrid report={report} />
              <CategorySection report={report} />
              <TopListsSection report={report} />
              <DailyBreakdown report={report} />
              <HourPattern report={report} />
              <ComparisonCard report={report} />
              <ReportFooter />
            </div>
          ) : (
            <Card>
              <div className="text-sm text-zinc-400">No data available.</div>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}

interface MonthSelectorProps {
  year: number;
  month: number;
  onPrev: () => void;
  onNext: () => void;
}

function MonthSelector({ year, month, onPrev, onNext }: MonthSelectorProps) {
  return (
    <div className="flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-950">
      <button
        type="button"
        onClick={onPrev}
        className="grid h-8 w-8 place-items-center text-zinc-400 transition-colors hover:bg-zinc-900 hover:text-zinc-100"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <div className="min-w-[140px] px-2 text-center font-mono text-sm tabular-nums text-zinc-200">
        {MONTH_NAMES[month - 1]} {year}
      </div>
      <button
        type="button"
        onClick={onNext}
        className="grid h-8 w-8 place-items-center text-zinc-400 transition-colors hover:bg-zinc-900 hover:text-zinc-100"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

interface ExportButtonProps {
  icon: typeof Download;
  label: string;
  onClick: () => void;
  busy?: boolean;
  disabled?: boolean;
}

function ExportButton({ icon: Icon, label, onClick, busy, disabled }: ExportButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 transition-colors",
        "hover:border-zinc-700 hover:bg-zinc-900",
        "disabled:cursor-not-allowed disabled:opacity-50",
      )}
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin text-zinc-400" /> : <Icon className="h-4 w-4 text-zinc-400" />}
      <span>{label}</span>
    </button>
  );
}

function ReportHeader({ monthName, year }: { monthName: string; year: number }) {
  return (
    <div className="border-b border-zinc-900 pb-8">
      <div className="text-xs font-medium uppercase tracking-[0.2em] text-emerald-400">
        ChronoScope · Monthly Recap
      </div>
      <h1
        className="mt-4 font-mono text-5xl font-semibold leading-tight tracking-tight text-zinc-50 md:text-6xl"
        style={{ fontFamily: '"JetBrains Mono", ui-monospace, Menlo, monospace' }}
      >
        Your {monthName} in Numbers
      </h1>
      <div className="mt-3 font-mono text-lg text-zinc-500" style={{ fontFamily: '"JetBrains Mono", ui-monospace, Menlo, monospace' }}>
        {year}
      </div>
    </div>
  );
}

function ReportFooter() {
  return (
    <div className="border-t border-zinc-900 pt-6 text-center text-[11px] uppercase tracking-[0.2em] text-zinc-600">
      Generated with ChronoScope
    </div>
  );
}

function SummaryGrid({ report }: { report: MonthlyReportData }) {
  const stats: StatCardProps[] = [
    {
      label: "Total hours",
      value: formatHM(report.total_active_seconds),
      hint: `${report.days_in_month} days tracked`,
      icon: Clock,
    },
    {
      label: "Daily average",
      value: formatHM(report.daily_average_seconds),
      hint: "Across full month",
      icon: Sparkles,
    },
    {
      label: "Most active day",
      value: report.most_active_day ? formatHM(report.most_active_day.duration_seconds) : "—",
      hint: report.most_active_day ? formatDayLabel(report.most_active_day.date) : "No activity",
      icon: Flame,
    },
    {
      label: "Longest session",
      value: formatHM(report.longest_session_seconds),
      hint: "Single uninterrupted block",
      icon: ArrowUpRight,
    },
    {
      label: "Unique apps",
      value: String(report.unique_apps),
      hint: "Distinct apps used",
      icon: Hash,
    },
    {
      label: "Unique websites",
      value: String(report.unique_websites),
      hint: "Distinct domains visited",
      icon: Hash,
    },
  ];

  return (
    <section>
      <SectionHeading
        eyebrow="At a glance"
        title="Summary"
        description="Headline numbers from the month."
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>
    </section>
  );
}

interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
  icon: typeof Clock;
}

function StatCard({ label, value, hint, icon: Icon }: StatCardProps) {
  return (
    <Card>
      <div className="flex items-start justify-between">
        <div className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
          {label}
        </div>
        <Icon className="h-4 w-4 text-zinc-600" />
      </div>
      <div
        className="mt-2 font-mono text-3xl font-semibold tracking-tight text-zinc-50 tabular-nums"
        style={{ fontFamily: '"JetBrains Mono", ui-monospace, Menlo, monospace' }}
      >
        {value}
      </div>
      {hint && <div className="mt-1 text-xs text-zinc-500">{hint}</div>}
    </Card>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-4">
      <div className="text-[11px] font-medium uppercase tracking-[0.2em] text-emerald-400">
        {eyebrow}
      </div>
      <h2 className="mt-1.5 text-xl font-semibold tracking-tight text-zinc-100">
        {title}
      </h2>
      {description && <p className="mt-1 text-sm text-zinc-500">{description}</p>}
    </div>
  );
}

function CategorySection({ report }: { report: MonthlyReportData }) {
  const data = report.by_category;
  return (
    <section>
      <SectionHeading
        eyebrow="Where you spent your time"
        title="Categories"
        description="How your month broke down across activities."
      />
      <Card>
        <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-[1fr_1fr]">
          <div className="relative" style={{ height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0a0a0bf2",
                    border: "1px solid #27272a",
                    borderRadius: "6px",
                    fontSize: "12px",
                  }}
                  formatter={((value: unknown, _name: unknown, item: unknown) => {
                    const seconds = Number(value) || 0;
                    const payload = (item as { payload: { name: string; percent: number } }).payload;
                    return [`${formatHM(seconds)} (${payload.percent.toFixed(0)}%)`, payload.name];
                  }) as never}
                />
                <Pie
                  data={data}
                  dataKey="duration_seconds"
                  nameKey="name"
                  innerRadius={90}
                  outerRadius={140}
                  paddingAngle={2}
                  stroke="none"
                  isAnimationActive
                  animationDuration={650}
                >
                  {data.map((c) => (
                    <Cell key={c.name} fill={c.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-zinc-500">Total</div>
                <div
                  className="mt-1 font-mono text-2xl font-semibold text-zinc-50 tabular-nums"
                  style={{ fontFamily: '"JetBrains Mono", ui-monospace, Menlo, monospace' }}
                >
                  {formatHM(report.total_active_seconds)}
                </div>
              </div>
            </div>
          </div>
          <ul className="space-y-3">
            {data.map((c) => (
              <li
                key={c.name}
                className="flex items-center justify-between gap-4 border-b border-zinc-900 pb-3 last:border-b-0 last:pb-0"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className="inline-block h-3 w-3 shrink-0 rounded-sm"
                    style={{ backgroundColor: c.color }}
                  />
                  <span className="truncate text-sm font-medium text-zinc-100">{c.name}</span>
                </div>
                <div className="shrink-0 text-right">
                  <div
                    className="font-mono text-sm text-zinc-200 tabular-nums"
                    style={{ fontFamily: '"JetBrains Mono", ui-monospace, Menlo, monospace' }}
                  >
                    {formatHM(c.duration_seconds)}
                  </div>
                  <div className="text-[11px] text-zinc-500">{c.percent.toFixed(0)}%</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </Card>
    </section>
  );
}

function TopListsSection({ report }: { report: MonthlyReportData }) {
  return (
    <section>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <TopAppsList report={report} />
        <TopSitesList report={report} />
      </div>
    </section>
  );
}

function TopAppsList({ report }: { report: MonthlyReportData }) {
  const apps = report.top_apps.slice(0, 5);
  return (
    <div>
      <SectionHeading eyebrow="Top performers" title="Your top 5 apps" />
      <Card>
        <ol className="space-y-3">
          {apps.length === 0 ? (
            <li className="text-sm text-zinc-500">No apps tracked.</li>
          ) : (
            apps.map((a, i) => (
              <li key={a.app_name} className="flex items-center gap-4">
                <RankBadge n={i + 1} />
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-zinc-800 bg-zinc-900 text-sm font-semibold text-zinc-300">
                  {(a.display_name ?? a.app_name).charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-zinc-100">
                    {a.display_name ?? a.app_name}
                  </div>
                  <div
                    className="font-mono text-xs text-zinc-500 tabular-nums"
                    style={{ fontFamily: '"JetBrains Mono", ui-monospace, Menlo, monospace' }}
                  >
                    {formatHM(a.duration_seconds)} · {a.percent.toFixed(0)}%
                  </div>
                </div>
              </li>
            ))
          )}
        </ol>
      </Card>
    </div>
  );
}

function TopSitesList({ report }: { report: MonthlyReportData }) {
  const sites = report.top_domains.slice(0, 5);
  return (
    <div>
      <SectionHeading eyebrow="Top performers" title="Your top 5 websites" />
      <Card>
        <ol className="space-y-3">
          {sites.length === 0 ? (
            <li className="text-sm text-zinc-500">No websites tracked.</li>
          ) : (
            sites.map((d, i) => (
              <li key={d.domain} className="flex items-center gap-4">
                <RankBadge n={i + 1} />
                <div className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900 text-sm font-semibold text-zinc-300">
                  <DomainFavicon url={d.favicon_url} domain={d.domain} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-zinc-100">{d.domain}</div>
                  <div
                    className="font-mono text-xs text-zinc-500 tabular-nums"
                    style={{ fontFamily: '"JetBrains Mono", ui-monospace, Menlo, monospace' }}
                  >
                    {formatHM(d.duration_seconds)} · {d.percent.toFixed(0)}%
                  </div>
                </div>
              </li>
            ))
          )}
        </ol>
      </Card>
    </div>
  );
}

function DomainFavicon({ url, domain }: { url?: string; domain: string }) {
  const [failed, setFailed] = useState(false);
  if (!url || failed) return <span>{domain.charAt(0).toUpperCase()}</span>;
  return <img src={url} alt={domain} className="h-5 w-5" onError={() => setFailed(true)} />;
}

function RankBadge({ n }: { n: number }) {
  return (
    <div
      className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-zinc-900 font-mono text-[11px] font-semibold text-zinc-400 tabular-nums"
      style={{ fontFamily: '"JetBrains Mono", ui-monospace, Menlo, monospace' }}
    >
      {n}
    </div>
  );
}

function DailyBreakdown({ report }: { report: MonthlyReportData }) {
  const data = report.by_day.map((d) => ({
    day: parseInt(d.date.slice(-2), 10),
    hours: +(d.duration_seconds / 3600).toFixed(2),
    date: d.date,
  }));

  return (
    <section>
      <SectionHeading
        eyebrow="Day by day"
        title="Daily breakdown"
        description="Hours of activity per day."
      />
      <Card>
        <div style={{ width: "100%", height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid stroke="#1f1f23" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="day"
                tick={{ fill: "#71717a", fontSize: 11, fontFamily: "JetBrains Mono" }}
                tickLine={false}
                axisLine={{ stroke: "#27272a" }}
                interval={Math.max(0, Math.floor(data.length / 15) - 1)}
              />
              <YAxis
                tick={{ fill: "#71717a", fontSize: 11, fontFamily: "JetBrains Mono" }}
                tickLine={false}
                axisLine={false}
                width={32}
                tickFormatter={(v: number) => `${v}h`}
              />
              <Tooltip
                cursor={{ fill: "#18181b" }}
                contentStyle={{
                  backgroundColor: "#0a0a0bf2",
                  border: "1px solid #27272a",
                  borderRadius: "6px",
                  fontSize: "12px",
                }}
                formatter={((value: unknown) => [`${(Number(value) || 0).toFixed(2)} h`, "Active"]) as never}
                labelFormatter={(_, payload) => {
                  const d = payload?.[0]?.payload as { date?: string } | undefined;
                  return d?.date ? formatDayLabel(d.date) : "";
                }}
              />
              <Bar dataKey="hours" fill="#22c55e" radius={[3, 3, 0, 0]} isAnimationActive animationDuration={650} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </section>
  );
}

function HourPattern({ report }: { report: MonthlyReportData }) {
  const data = report.by_hour.map((seconds, hour) => ({
    hour: `${hour}`,
    minutes: Math.round(seconds / 60),
  }));

  return (
    <section>
      <SectionHeading
        eyebrow="Daily rhythm"
        title="Hour-of-day pattern"
        description="When your active hours happen across the day."
      />
      <Card>
        <div style={{ width: "100%", height: 320 }}>
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={data} outerRadius="80%">
              <PolarGrid stroke="#27272a" />
              <PolarAngleAxis
                dataKey="hour"
                tick={{ fill: "#71717a", fontSize: 11, fontFamily: "JetBrains Mono" }}
              />
              <PolarRadiusAxis
                tick={{ fill: "#52525b", fontSize: 10 }}
                axisLine={false}
                tickFormatter={(v: number) => `${v}m`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0a0a0bf2",
                  border: "1px solid #27272a",
                  borderRadius: "6px",
                  fontSize: "12px",
                }}
                formatter={((value: unknown) => [`${Number(value) || 0} min`, "Active"]) as never}
                labelFormatter={(label) => `${label}:00`}
              />
              <Radar
                name="Minutes"
                dataKey="minutes"
                stroke="#22c55e"
                fill="#22c55e"
                fillOpacity={0.25}
                isAnimationActive
                animationDuration={650}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </section>
  );
}

function ComparisonCard({ report }: { report: MonthlyReportData }) {
  const c = report.comparison;
  const rows: ComparisonRow[] = [
    {
      label: "Total time",
      current: c.current_total_seconds,
      previous: c.previous_total_seconds,
      upIsGood: null,
    },
    {
      label: "Productive time",
      current: c.current_productive_seconds,
      previous: c.previous_productive_seconds,
      upIsGood: true,
    },
    {
      label: "Distracting time",
      current: c.current_distracting_seconds,
      previous: c.previous_distracting_seconds,
      upIsGood: false,
    },
  ];

  return (
    <section>
      <SectionHeading
        eyebrow="Trend"
        title="Compared to last month"
        description="How this month stacks up against the previous one."
      />
      <Card>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {rows.map((r) => (
            <ComparisonItem key={r.label} {...r} />
          ))}
        </div>
      </Card>
    </section>
  );
}

interface ComparisonRow {
  label: string;
  current: number;
  previous: number;
  upIsGood: boolean | null;
}

function ComparisonItem({ label, current, previous, upIsGood }: ComparisonRow) {
  const delta = deltaPercent(current, previous);
  const hasPrev = previous > 0;
  let arrowColor = "text-zinc-400";
  let Arrow = ArrowRight;
  if (delta !== null) {
    if (delta > 0.5) {
      Arrow = ArrowUpRight;
      arrowColor =
        upIsGood === null ? "text-zinc-300" : upIsGood ? "text-emerald-400" : "text-rose-400";
    } else if (delta < -0.5) {
      Arrow = ArrowDownRight;
      arrowColor =
        upIsGood === null ? "text-zinc-300" : upIsGood ? "text-rose-400" : "text-emerald-400";
    }
  }

  return (
    <div className="rounded-lg border border-zinc-900 bg-zinc-950/60 p-4">
      <div className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
        {label}
      </div>
      <div className="mt-2 flex items-baseline gap-3">
        <div
          className="font-mono text-2xl font-semibold text-zinc-50 tabular-nums"
          style={{ fontFamily: '"JetBrains Mono", ui-monospace, Menlo, monospace' }}
        >
          {formatHM(current)}
        </div>
        <div className={cn("inline-flex items-center gap-1 text-xs font-medium", arrowColor)}>
          <Arrow className="h-3.5 w-3.5" />
          <span>
            {delta === null ? "—" : `${delta >= 0 ? "+" : ""}${delta.toFixed(0)}%`}
          </span>
        </div>
      </div>
      <div className="mt-1 text-xs text-zinc-500">
        {hasPrev ? `vs ${formatHM(previous)} last month` : "no previous data"}
      </div>
    </div>
  );
}

function LoadingShell() {
  return (
    <div className="space-y-6 rounded-2xl bg-[#0a0a0b] p-10">
      <div className="shimmer h-16 w-2/3 rounded-lg" />
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="shimmer h-28 rounded-xl" />
        ))}
      </div>
      <div className="shimmer h-80 rounded-xl" />
      <div className="grid grid-cols-2 gap-6">
        <div className="shimmer h-64 rounded-xl" />
        <div className="shimmer h-64 rounded-xl" />
      </div>
      <div className="shimmer h-64 rounded-xl" />
    </div>
  );
}
