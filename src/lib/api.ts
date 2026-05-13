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
  launch_to_tray: boolean;
}

export interface MonthlyReport {
  year: number;
  month: number;
  month_name: string;
  days_in_month: number;
  total_active_seconds: number;
  daily_average_seconds: number;
  most_active_day: DayStat | null;
  longest_session_seconds: number;
  unique_apps: number;
  unique_websites: number;
  by_category: CategoryStat[];
  top_apps: AppStat[];
  top_domains: DomainStat[];
  by_day: DayStat[];
  by_hour: number[];
  comparison: MonthComparison;
}

export interface MonthComparison {
  previous_total_seconds: number;
  previous_productive_seconds: number;
  previous_distracting_seconds: number;
  current_total_seconds: number;
  current_productive_seconds: number;
  current_distracting_seconds: number;
}

export function getSummary(range: DateRange): Promise<Summary> {
  return invoke("get_summary", { range });
}

export function getTodayTimeline(): Promise<TimelineEvent[]> {
  return invoke("get_today_timeline");
}

export function getMonthlyReport(year: number, month: number): Promise<MonthlyReport> {
  return invoke("get_monthly_report", { year, month });
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

export function setAutostart(enabled: boolean): Promise<void> {
  return invoke("set_autostart", { enabled });
}

export function addCategory(
  name: string,
  color: string,
  isProductive: number,
): Promise<number> {
  return invoke("add_category", { name, color, isProductive });
}

export function updateCategory(
  id: number,
  name: string,
  color: string,
  isProductive: number,
): Promise<void> {
  return invoke("update_category", { id, name, color, isProductive });
}

export function deleteCategory(id: number): Promise<void> {
  return invoke("delete_category", { id });
}

export function bulkAddCategoryRules(rules: NewCategoryRule[]): Promise<number> {
  return invoke("bulk_add_category_rules", { rules });
}

export function getIgnoredApps(): Promise<string[]> {
  return invoke("get_ignored_apps");
}

export function addIgnoredApp(name: string): Promise<void> {
  return invoke("add_ignored_app", { name });
}

export function removeIgnoredApp(name: string): Promise<void> {
  return invoke("remove_ignored_app", { name });
}

export function getIgnoredDomains(): Promise<string[]> {
  return invoke("get_ignored_domains");
}

export function addIgnoredDomain(domain: string): Promise<void> {
  return invoke("add_ignored_domain", { domain });
}

export function removeIgnoredDomain(domain: string): Promise<void> {
  return invoke("remove_ignored_domain", { domain });
}

export function exportDataJson(path: string): Promise<number> {
  return invoke("export_data_json", { path });
}

export function exportDataCsv(path: string): Promise<number> {
  return invoke("export_data_csv", { path });
}

export function deleteAllData(): Promise<void> {
  return invoke("delete_all_data");
}

export function getDatabasePath(): Promise<string> {
  return invoke("get_database_path");
}

export function openDatabaseFolder(): Promise<void> {
  return invoke("open_database_folder");
}
