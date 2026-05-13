import type { MonthlyReport, Summary, TimelineEvent } from "./api";

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

const CATEGORY_COLORS = {
  Development: "#22c55e",
  Communication: "#3b82f6",
  Design: "#a855f7",
  Entertainment: "#f59e0b",
  Other: "#71717a",
};

export const MOCK_SUMMARY: Summary = {
  total_active_seconds: 4 * 3600 + 32 * 60 + 15,
  top_apps: [
    { app_name: "Code.exe", display_name: "Visual Studio Code", duration_seconds: 8042, percent: 49 },
    { app_name: "chrome.exe", display_name: "Google Chrome", duration_seconds: 4210, percent: 26 },
    { app_name: "slack.exe", display_name: "Slack", duration_seconds: 1820, percent: 11 },
    { app_name: "figma.exe", display_name: "Figma", duration_seconds: 1240, percent: 8 },
    { app_name: "terminal.exe", display_name: "Terminal", duration_seconds: 720, percent: 4 },
    { app_name: "spotify.exe", display_name: "Spotify", duration_seconds: 420, percent: 2 },
    { app_name: "notion.exe", display_name: "Notion", duration_seconds: 300, percent: 1.8 },
    { app_name: "obs64.exe", display_name: "OBS Studio", duration_seconds: 180, percent: 1.1 },
    { app_name: "discord.exe", display_name: "Discord", duration_seconds: 110, percent: 0.7 },
    { app_name: "explorer.exe", display_name: "File Explorer", duration_seconds: 80, percent: 0.5 },
  ],
  top_domains: [
    { domain: "github.com", duration_seconds: 2820, percent: 33, favicon_url: "https://www.google.com/s2/favicons?domain=github.com&sz=64" },
    { domain: "linear.app", duration_seconds: 1640, percent: 19, favicon_url: "https://www.google.com/s2/favicons?domain=linear.app&sz=64" },
    { domain: "stackoverflow.com", duration_seconds: 1100, percent: 13, favicon_url: "https://www.google.com/s2/favicons?domain=stackoverflow.com&sz=64" },
    { domain: "tailwindcss.com", duration_seconds: 760, percent: 9, favicon_url: "https://www.google.com/s2/favicons?domain=tailwindcss.com&sz=64" },
    { domain: "youtube.com", duration_seconds: 620, percent: 7, favicon_url: "https://www.google.com/s2/favicons?domain=youtube.com&sz=64" },
    { domain: "mail.google.com", duration_seconds: 540, percent: 6, favicon_url: "https://www.google.com/s2/favicons?domain=mail.google.com&sz=64" },
    { domain: "figma.com", duration_seconds: 410, percent: 5, favicon_url: "https://www.google.com/s2/favicons?domain=figma.com&sz=64" },
    { domain: "notion.so", duration_seconds: 290, percent: 3, favicon_url: "https://www.google.com/s2/favicons?domain=notion.so&sz=64" },
    { domain: "developer.mozilla.org", duration_seconds: 220, percent: 2.5, favicon_url: "https://www.google.com/s2/favicons?domain=developer.mozilla.org&sz=64" },
    { domain: "docs.rs", duration_seconds: 150, percent: 1.7, favicon_url: "https://www.google.com/s2/favicons?domain=docs.rs&sz=64" },
  ],
  by_category: [
    { name: "Development", color: CATEGORY_COLORS.Development, duration_seconds: 9800, percent: 60 },
    { name: "Communication", color: CATEGORY_COLORS.Communication, duration_seconds: 2600, percent: 16 },
    { name: "Design", color: CATEGORY_COLORS.Design, duration_seconds: 1640, percent: 10 },
    { name: "Entertainment", color: CATEGORY_COLORS.Entertainment, duration_seconds: 1240, percent: 8 },
    { name: "Other", color: CATEGORY_COLORS.Other, duration_seconds: 1040, percent: 6 },
  ],
  by_hour: [
    0, 0, 0, 0, 0, 0, 0, 5, 18, 42, 51, 47, 28, 36, 49, 55, 41, 33, 22, 14, 8, 3, 0, 0,
  ],
  by_day: buildMockByDay(),
};

function buildMockByDay() {
  const days: { date: string; duration_seconds: number }[] = [];
  const today = new Date();
  for (let i = 89; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
    const base = isWeekend ? 1200 : 6000;
    const noise = Math.floor(Math.random() * 6000);
    const dur = Math.random() < 0.08 ? 0 : base + noise;
    days.push({ date: iso, duration_seconds: dur });
  }
  return days;
}

export function buildMockTimeline(): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const blocks: { hour: number; mins: number; app: string; domain: string | null; cat: keyof typeof CATEGORY_COLORS }[] = [
    { hour: 8, mins: 35, app: "Visual Studio Code", domain: null, cat: "Development" },
    { hour: 9, mins: 25, app: "Google Chrome", domain: "github.com", cat: "Development" },
    { hour: 10, mins: 40, app: "Visual Studio Code", domain: null, cat: "Development" },
    { hour: 11, mins: 20, app: "Slack", domain: null, cat: "Communication" },
    { hour: 12, mins: 30, app: "Google Chrome", domain: "youtube.com", cat: "Entertainment" },
    { hour: 13, mins: 45, app: "Visual Studio Code", domain: null, cat: "Development" },
    { hour: 14, mins: 35, app: "Figma", domain: null, cat: "Design" },
    { hour: 15, mins: 25, app: "Google Chrome", domain: "linear.app", cat: "Development" },
    { hour: 16, mins: 30, app: "Slack", domain: null, cat: "Communication" },
    { hour: 17, mins: 20, app: "Spotify", domain: null, cat: "Entertainment" },
  ];
  for (const b of blocks) {
    const begin = new Date(start);
    begin.setHours(b.hour, 0, 0, 0);
    const end = new Date(begin.getTime() + b.mins * 60 * 1000);
    events.push({
      start_ts: begin.getTime(),
      end_ts: end.getTime(),
      app_name: b.app,
      domain: b.domain,
      category: b.cat,
      color: CATEGORY_COLORS[b.cat],
    });
  }
  return events;
}

export function buildMockMonthlyReport(year: number, month: number): MonthlyReport {
  const daysInMonth = new Date(year, month, 0).getDate();
  const byDay: { date: string; duration_seconds: number }[] = [];
  let total = 0;
  let mostActiveIdx = 0;
  let mostActiveDuration = 0;

  for (let d = 1; d <= daysInMonth; d++) {
    const dt = new Date(year, month - 1, d);
    const iso = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const isWeekend = dt.getDay() === 0 || dt.getDay() === 6;
    const base = isWeekend ? 1800 : 6600;
    const noise = Math.floor(Math.random() * 7000);
    const duration = Math.random() < 0.05 ? 0 : base + noise;
    byDay.push({ date: iso, duration_seconds: duration });
    total += duration;
    if (duration > mostActiveDuration) {
      mostActiveDuration = duration;
      mostActiveIdx = d - 1;
    }
  }

  const byHour = Array.from({ length: 24 }, (_, h) => {
    if (h < 7 || h > 22) return Math.floor(Math.random() * 200);
    const peak = h >= 9 && h <= 17 ? 3500 : 1500;
    return Math.floor(peak * (0.5 + Math.random() * 0.5));
  });

  const prevTotal = Math.floor(total * (0.8 + Math.random() * 0.3));
  const productive = Math.floor(total * 0.62);
  const distracting = Math.floor(total * 0.18);
  const prevProductive = Math.floor(prevTotal * 0.55);
  const prevDistracting = Math.floor(prevTotal * 0.22);

  return {
    year,
    month,
    month_name: MONTH_NAMES[month - 1] ?? "",
    days_in_month: daysInMonth,
    total_active_seconds: total,
    daily_average_seconds: Math.floor(total / daysInMonth),
    most_active_day: byDay[mostActiveIdx] ?? null,
    longest_session_seconds: 2 * 3600 + 47 * 60,
    unique_apps: 23,
    unique_websites: 87,
    by_category: MOCK_SUMMARY.by_category.map((c) => ({
      ...c,
      duration_seconds: Math.floor(total * (c.percent / 100)),
    })),
    top_apps: MOCK_SUMMARY.top_apps.slice(0, 5).map((a) => ({
      ...a,
      duration_seconds: Math.floor(total * (a.percent / 100)),
    })),
    top_domains: MOCK_SUMMARY.top_domains.slice(0, 5).map((d) => ({
      ...d,
      duration_seconds: Math.floor(total * (d.percent / 100)),
    })),
    by_day: byDay,
    by_hour: byHour,
    comparison: {
      previous_total_seconds: prevTotal,
      previous_productive_seconds: prevProductive,
      previous_distracting_seconds: prevDistracting,
      current_total_seconds: total,
      current_productive_seconds: productive,
      current_distracting_seconds: distracting,
    },
  };
}
