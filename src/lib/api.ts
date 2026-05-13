import { invoke } from "@tauri-apps/api/core";

export interface DateRange {
  start_ts: number;
  end_ts: number;
}

export interface Summary {
  total_active_seconds: number;
  top_apps: AppStat[];
  top_domains: DomainStat[];
  by_category: CategoryStat[];
  by_hour: number[];
  by_day: DayStat[];
}

export interface AppStat {
  app_name: string;
  display_name: string | null;
  duration_seconds: number;
  percent: number;
}

export interface DomainStat {
  domain: string;
  duration_seconds: number;
  percent: number;
  favicon_url: string;
}

export interface CategoryStat {
  name: string;
  color: string;
  duration_seconds: number;
  percent: number;
}

export interface DayStat {
  date: string;
  duration_seconds: number;
}

export interface TimelineEvent {
  start_ts: number;
  end_ts: number;
  app_name: string;
  domain: string | null;
  category: string | null;
  color: string | null;
}

export interface Category {
  id: number;
  name: string;
  color: string;
  is_productive: number;
}

export interface CategoryRule {
  id: number;
  match_type: "app" | "domain";
  pattern: string;
  category_id: number;
  category_name: string;
  priority: number;
}

export interface NewCategoryRule {
  match_type: "app" | "domain";
  pattern: string;
  category_id: number;
  priority?: number;
}

export interface Settings {
  tracking_enabled: boolean;
  idle_threshold_seconds: number;
  include_browser_urls: boolean;
  launch_at_login: boolean;
}

export function getSummary(range: DateRange): Promise<Summary> {
  return invoke("get_summary", { range });
}

export function getTodayTimeline(): Promise<TimelineEvent[]> {
  return invoke("get_today_timeline");
}

export function getCategories(): Promise<Category[]> {
  return invoke("get_categories");
}

export function getCategoryRules(): Promise<CategoryRule[]> {
  return invoke("get_category_rules");
}

export function addCategoryRule(rule: NewCategoryRule): Promise<number> {
  return invoke("add_category_rule", { rule });
}

export function deleteCategoryRule(id: number): Promise<void> {
  return invoke("delete_category_rule", { id });
}

export function getSettings(): Promise<Settings> {
  return invoke("get_settings");
}

export function updateSettings(settings: Settings): Promise<void> {
  return invoke("update_settings", { settings });
}
