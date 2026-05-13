import type { Summary, TimelineEvent } from "./api";

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
