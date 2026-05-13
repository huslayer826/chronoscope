use chrono::{Datelike, Local, Months, NaiveDate, TimeZone};
use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use tauri::AppHandle;
use tauri_plugin_autostart::ManagerExt;

use crate::db;
use crate::tracking;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DateRange {
    pub start_ts: i64,
    pub end_ts: i64,
}

#[derive(Debug, Clone, Serialize)]
pub struct Summary {
    pub total_active_seconds: i64,
    pub top_apps: Vec<AppStat>,
    pub top_domains: Vec<DomainStat>,
    pub by_category: Vec<CategoryStat>,
    pub by_hour: [i64; 24],
    pub by_day: Vec<DayStat>,
}

#[derive(Debug, Clone, Serialize)]
pub struct AppStat {
    pub app_name: String,
    pub display_name: Option<String>,
    pub duration_seconds: i64,
    pub percent: f64,
}

#[derive(Debug, Clone, Serialize)]
pub struct DomainStat {
    pub domain: String,
    pub duration_seconds: i64,
    pub percent: f64,
    pub favicon_url: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct CategoryStat {
    pub name: String,
    pub color: String,
    pub duration_seconds: i64,
    pub percent: f64,
}

#[derive(Debug, Clone, Serialize)]
pub struct DayStat {
    pub date: String,
    pub duration_seconds: i64,
}

#[derive(Debug, Clone, Serialize)]
pub struct TimelineEvent {
    pub start_ts: i64,
    pub end_ts: i64,
    pub app_name: String,
    pub domain: Option<String>,
    pub category: Option<String>,
    pub color: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct Category {
    pub id: i64,
    pub name: String,
    pub color: String,
    pub is_productive: i64,
}

#[derive(Debug, Clone, Serialize)]
pub struct CategoryRule {
    pub id: i64,
    pub match_type: String,
    pub pattern: String,
    pub category_id: i64,
    pub category_name: String,
    pub priority: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NewCategoryRule {
    pub match_type: String,
    pub pattern: String,
    pub category_id: i64,
    pub priority: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Settings {
    pub tracking_enabled: bool,
    pub idle_threshold_seconds: i64,
    pub include_browser_urls: bool,
    pub launch_at_login: bool,
    pub launch_to_tray: bool,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            tracking_enabled: true,
            idle_threshold_seconds: 60,
            include_browser_urls: true,
            launch_at_login: false,
            launch_to_tray: true,
        }
    }
}

#[derive(Debug, Clone, Serialize)]
pub struct MonthlyReport {
    pub year: i32,
    pub month: u32,
    pub month_name: String,
    pub days_in_month: u32,
    pub total_active_seconds: i64,
    pub daily_average_seconds: i64,
    pub most_active_day: Option<DayStat>,
    pub longest_session_seconds: i64,
    pub unique_apps: i64,
    pub unique_websites: i64,
    pub by_category: Vec<CategoryStat>,
    pub top_apps: Vec<AppStat>,
    pub top_domains: Vec<DomainStat>,
    pub by_day: Vec<DayStat>,
    pub by_hour: [i64; 24],
    pub comparison: MonthComparison,
}

#[derive(Debug, Clone, Serialize)]
pub struct MonthComparison {
    pub previous_total_seconds: i64,
    pub previous_productive_seconds: i64,
    pub previous_distracting_seconds: i64,
    pub current_total_seconds: i64,
    pub current_productive_seconds: i64,
    pub current_distracting_seconds: i64,
}

#[tauri::command]
pub async fn get_summary(range: DateRange) -> Summary {
    with_connection(|connection| query_summary(connection, range)).unwrap_or_else(Summary::empty)
}

#[tauri::command]
pub async fn get_today_timeline() -> Vec<TimelineEvent> {
    with_connection(query_today_timeline).unwrap_or_default()
}

#[tauri::command]
pub async fn get_monthly_report(year: i32, month: u32) -> Result<MonthlyReport, String> {
    if !(1..=12).contains(&month) {
        return Err("month must be between 1 and 12".to_string());
    }

    with_connection_result(|connection| build_monthly_report(connection, year, month))
}

#[tauri::command]
pub async fn get_categories() -> Vec<Category> {
    with_connection(query_categories).unwrap_or_default()
}

#[tauri::command]
pub async fn get_category_rules() -> Vec<CategoryRule> {
    with_connection(query_category_rules).unwrap_or_default()
}

#[tauri::command]
pub async fn add_category_rule(rule: NewCategoryRule) -> Result<i64, String> {
    if !matches!(rule.match_type.as_str(), "app" | "domain") {
        return Err("match_type must be 'app' or 'domain'".to_string());
    }

    let pattern = rule.pattern.trim().to_ascii_lowercase();

    if pattern.is_empty() {
        return Err("pattern cannot be empty".to_string());
    }

    let priority = rule.priority.unwrap_or(100);

    let id = with_connection_result(|connection| {
        connection.execute(
            "INSERT INTO category_rules (match_type, pattern, category_id, priority)
             VALUES (?1, ?2, ?3, ?4)",
            params![rule.match_type, pattern, rule.category_id, priority],
        )?;

        Ok(connection.last_insert_rowid())
    })?;

    tracking::reload_rules();
    Ok(id)
}

#[tauri::command]
pub async fn delete_category_rule(id: i64) -> Result<(), String> {
    with_connection_result(|connection| {
        connection.execute("DELETE FROM category_rules WHERE id = ?1", params![id])?;
        Ok(())
    })?;

    tracking::reload_rules();
    Ok(())
}

#[tauri::command]
pub async fn get_settings() -> Settings {
    with_connection(query_settings).unwrap_or_default()
}

#[tauri::command]
pub async fn update_settings(settings: Settings) -> Result<(), String> {
    with_connection_result(|connection| {
        upsert_setting(connection, "tracking_enabled", settings.tracking_enabled)?;
        upsert_setting(
            connection,
            "idle_threshold_seconds",
            settings.idle_threshold_seconds,
        )?;
        upsert_setting(connection, "include_browser_urls", settings.include_browser_urls)?;
        upsert_setting(connection, "launch_at_login", settings.launch_at_login)?;
        upsert_setting(connection, "launch_to_tray", settings.launch_to_tray)?;
        Ok(())
    })
}

#[tauri::command]
pub async fn set_autostart(app: AppHandle, enabled: bool) -> Result<(), String> {
    let autostart = app.autolaunch();

    if enabled {
        autostart.enable().map_err(|error| error.to_string())?;
    } else {
        autostart.disable().map_err(|error| error.to_string())?;
    }

    with_connection_result(|connection| {
        upsert_setting(connection, "launch_at_login", enabled)?;
        Ok(())
    })
}

#[tauri::command]
pub async fn add_category(
    name: String,
    color: String,
    is_productive: i64,
) -> Result<i64, String> {
    let name = name.trim().to_string();
    if name.is_empty() {
        return Err("name cannot be empty".to_string());
    }
    let color = color.trim().to_string();
    if color.is_empty() {
        return Err("color cannot be empty".to_string());
    }

    with_connection_result(|connection| {
        connection.execute(
            "INSERT INTO categories (name, color, is_productive) VALUES (?1, ?2, ?3)",
            params![name, color, is_productive],
        )?;
        Ok(connection.last_insert_rowid())
    })
}

#[tauri::command]
pub async fn update_category(
    id: i64,
    name: String,
    color: String,
    is_productive: i64,
) -> Result<(), String> {
    let name = name.trim().to_string();
    if name.is_empty() {
        return Err("name cannot be empty".to_string());
    }

    with_connection_result(|connection| {
        connection.execute(
            "UPDATE categories SET name = ?2, color = ?3, is_productive = ?4 WHERE id = ?1",
            params![id, name, color, is_productive],
        )?;
        Ok(())
    })?;

    tracking::notify(tracking::TrackingNotification::RulesChanged);
    Ok(())
}

#[tauri::command]
pub async fn delete_category(id: i64) -> Result<(), String> {
    with_connection_result(|connection| {
        connection.execute(
            "DELETE FROM category_rules WHERE category_id = ?1",
            params![id],
        )?;
        connection.execute("DELETE FROM categories WHERE id = ?1", params![id])?;
        Ok(())
    })?;

    tracking::notify(tracking::TrackingNotification::RulesChanged);
    Ok(())
}

#[tauri::command]
pub async fn bulk_add_category_rules(rules: Vec<NewCategoryRule>) -> Result<i64, String> {
    let mut added = 0i64;

    with_connection_result(|connection| {
        for rule in &rules {
            if !matches!(rule.match_type.as_str(), "app" | "domain") {
                continue;
            }

            let pattern = rule.pattern.trim().to_ascii_lowercase();
            if pattern.is_empty() {
                continue;
            }

            let priority = rule.priority.unwrap_or(100);
            let inserted = connection.execute(
                "INSERT OR IGNORE INTO category_rules (match_type, pattern, category_id, priority)
                 VALUES (?1, ?2, ?3, ?4)",
                params![rule.match_type, pattern, rule.category_id, priority],
            )?;
            if inserted > 0 {
                added += 1;
            }
        }
        Ok(())
    })?;

    tracking::notify(tracking::TrackingNotification::RulesChanged);
    Ok(added)
}

#[tauri::command]
pub async fn get_ignored_apps() -> Vec<String> {
    with_connection(|connection| {
        let mut statement =
            connection.prepare("SELECT app_name FROM ignored_apps ORDER BY app_name ASC")?;
        collect_rows(statement.query_map([], |row| row.get::<_, String>(0))?)
    })
    .unwrap_or_default()
}

#[tauri::command]
pub async fn add_ignored_app(name: String) -> Result<(), String> {
    let name = name.trim().to_ascii_lowercase();
    if name.is_empty() {
        return Err("name cannot be empty".to_string());
    }

    with_connection_result(|connection| {
        connection.execute(
            "INSERT OR IGNORE INTO ignored_apps (app_name) VALUES (?1)",
            params![name],
        )?;
        Ok(())
    })?;

    tracking::notify(tracking::TrackingNotification::IgnoreListsChanged);
    Ok(())
}

#[tauri::command]
pub async fn remove_ignored_app(name: String) -> Result<(), String> {
    let name = name.trim().to_ascii_lowercase();

    with_connection_result(|connection| {
        connection.execute(
            "DELETE FROM ignored_apps WHERE app_name = ?1",
            params![name],
        )?;
        Ok(())
    })?;

    tracking::notify(tracking::TrackingNotification::IgnoreListsChanged);
    Ok(())
}

#[tauri::command]
pub async fn get_ignored_domains() -> Vec<String> {
    with_connection(|connection| {
        let mut statement =
            connection.prepare("SELECT domain FROM ignored_domains ORDER BY domain ASC")?;
        collect_rows(statement.query_map([], |row| row.get::<_, String>(0))?)
    })
    .unwrap_or_default()
}

#[tauri::command]
pub async fn add_ignored_domain(domain: String) -> Result<(), String> {
    let domain = domain.trim().to_ascii_lowercase();
    if domain.is_empty() {
        return Err("domain cannot be empty".to_string());
    }

    with_connection_result(|connection| {
        connection.execute(
            "INSERT OR IGNORE INTO ignored_domains (domain) VALUES (?1)",
            params![domain],
        )?;
        Ok(())
    })?;

    tracking::notify(tracking::TrackingNotification::IgnoreListsChanged);
    Ok(())
}

#[tauri::command]
pub async fn remove_ignored_domain(domain: String) -> Result<(), String> {
    let domain = domain.trim().to_ascii_lowercase();

    with_connection_result(|connection| {
        connection.execute(
            "DELETE FROM ignored_domains WHERE domain = ?1",
            params![domain],
        )?;
        Ok(())
    })?;

    tracking::notify(tracking::TrackingNotification::IgnoreListsChanged);
    Ok(())
}

#[tauri::command]
pub async fn export_data_json(path: String) -> Result<i64, String> {
    let events = with_connection_result(query_all_events)?;
    let count = events.len() as i64;
    let json = serde_json::to_string_pretty(&events).map_err(|error| error.to_string())?;
    std::fs::write(&path, json).map_err(|error| error.to_string())?;
    Ok(count)
}

#[tauri::command]
pub async fn export_data_csv(path: String) -> Result<i64, String> {
    let events = with_connection_result(query_all_events)?;
    let mut output = String::new();
    output.push_str(
        "id,start_ts,end_ts,duration_sec,app_name,app_display_name,executable_path,window_title,url,domain,category\n",
    );
    for event in &events {
        output.push_str(&format!(
            "{},{},{},{},{},{},{},{},{},{},{}\n",
            event.id,
            event.start_ts,
            event.end_ts,
            event.duration_sec,
            csv_field(&event.app_name),
            csv_optional(event.app_display_name.as_deref()),
            csv_optional(event.executable_path.as_deref()),
            csv_optional(event.window_title.as_deref()),
            csv_optional(event.url.as_deref()),
            csv_optional(event.domain.as_deref()),
            csv_optional(event.category.as_deref()),
        ));
    }
    std::fs::write(&path, output).map_err(|error| error.to_string())?;
    Ok(events.len() as i64)
}

#[tauri::command]
pub async fn delete_all_data() -> Result<(), String> {
    with_connection_result(|connection| {
        connection.execute("DELETE FROM events", [])?;
        Ok(())
    })
}

#[tauri::command]
pub async fn get_database_path() -> Result<String, String> {
    db::database_path()
        .map(|path| path.to_string_lossy().into_owned())
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn open_database_folder() -> Result<(), String> {
    let path = db::database_path().map_err(|error| error.to_string())?;
    let folder = path
        .parent()
        .ok_or_else(|| "could not resolve data folder".to_string())?;

    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(folder)
            .spawn()
            .map_err(|error| error.to_string())?;
        Ok(())
    }

    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(folder)
            .spawn()
            .map_err(|error| error.to_string())?;
        Ok(())
    }

    #[cfg(all(not(target_os = "windows"), not(target_os = "macos")))]
    {
        let _ = folder;
        Err("not supported on this platform".to_string())
    }
}

impl Summary {
    fn empty() -> Self {
        Self {
            total_active_seconds: 0,
            top_apps: Vec::new(),
            top_domains: Vec::new(),
            by_category: Vec::new(),
            by_hour: [0; 24],
            by_day: Vec::new(),
        }
    }
}

fn with_connection<T>(query: impl FnOnce(&Connection) -> rusqlite::Result<T>) -> Option<T> {
    match with_connection_result(query) {
        Ok(value) => Some(value),
        Err(error) => {
            eprintln!("Command query failed: {error}");
            None
        }
    }
}

fn with_connection_result<T>(
    query: impl FnOnce(&Connection) -> rusqlite::Result<T>,
) -> Result<T, String> {
    let connection = db::connection().ok_or_else(|| "database is unavailable".to_string())?;
    let connection = connection
        .lock()
        .map_err(|_| "database lock is poisoned".to_string())?;

    query(&connection).map_err(|error| error.to_string())
}

fn query_summary(connection: &Connection, range: DateRange) -> rusqlite::Result<Summary> {
    let total_active_seconds = query_total_seconds(connection, &range)?;

    Ok(Summary {
        total_active_seconds,
        top_apps: query_top_apps(connection, &range, total_active_seconds)?,
        top_domains: query_top_domains(connection, &range, total_active_seconds)?,
        by_category: query_by_category(connection, &range, total_active_seconds)?,
        by_hour: query_by_hour(connection, &range)?,
        by_day: query_by_day(connection, &range)?,
    })
}

fn query_total_seconds(connection: &Connection, range: &DateRange) -> rusqlite::Result<i64> {
    connection.query_row(
        "
        SELECT COALESCE(SUM(MAX(0, MIN(end_ts, ?2) - MAX(start_ts, ?1))), 0)
        FROM events
        WHERE end_ts > ?1 AND start_ts < ?2
        ",
        params![range.start_ts, range.end_ts],
        |row| row.get(0),
    )
}

fn query_top_apps(
    connection: &Connection,
    range: &DateRange,
    total: i64,
) -> rusqlite::Result<Vec<AppStat>> {
    let mut statement = connection.prepare(
        "
        SELECT app_name, app_display_name,
               SUM(MAX(0, MIN(end_ts, ?2) - MAX(start_ts, ?1))) AS duration
        FROM events
        WHERE end_ts > ?1 AND start_ts < ?2
        GROUP BY app_name, app_display_name
        HAVING duration > 0
        ORDER BY duration DESC
        LIMIT 10
        ",
    )?;

    collect_rows(statement.query_map(params![range.start_ts, range.end_ts], |row| {
        let duration_seconds: i64 = row.get(2)?;
        Ok(AppStat {
            app_name: row.get(0)?,
            display_name: row.get(1)?,
            duration_seconds,
            percent: percent(duration_seconds, total),
        })
    })?)
}

fn query_top_domains(
    connection: &Connection,
    range: &DateRange,
    total: i64,
) -> rusqlite::Result<Vec<DomainStat>> {
    let mut statement = connection.prepare(
        "
        SELECT domain,
               SUM(MAX(0, MIN(end_ts, ?2) - MAX(start_ts, ?1))) AS duration
        FROM events
        WHERE end_ts > ?1 AND start_ts < ?2
          AND domain IS NOT NULL AND domain != ''
        GROUP BY domain
        HAVING duration > 0
        ORDER BY duration DESC
        LIMIT 10
        ",
    )?;

    collect_rows(statement.query_map(params![range.start_ts, range.end_ts], |row| {
        let domain: String = row.get(0)?;
        let duration_seconds: i64 = row.get(1)?;
        Ok(DomainStat {
            favicon_url: format!("https://www.google.com/s2/favicons?domain={domain}&sz=32"),
            domain,
            duration_seconds,
            percent: percent(duration_seconds, total),
        })
    })?)
}

fn query_by_category(
    connection: &Connection,
    range: &DateRange,
    total: i64,
) -> rusqlite::Result<Vec<CategoryStat>> {
    let mut statement = connection.prepare(
        "
        SELECT COALESCE(events.category, 'Other') AS category_name,
               COALESCE(categories.color, '#64748b') AS color,
               SUM(MAX(0, MIN(events.end_ts, ?2) - MAX(events.start_ts, ?1))) AS duration
        FROM events
        LEFT JOIN categories ON categories.name = COALESCE(events.category, 'Other')
        WHERE events.end_ts > ?1 AND events.start_ts < ?2
        GROUP BY category_name, color
        HAVING duration > 0
        ORDER BY duration DESC
        ",
    )?;

    collect_rows(statement.query_map(params![range.start_ts, range.end_ts], |row| {
        let duration_seconds: i64 = row.get(2)?;
        Ok(CategoryStat {
            name: row.get(0)?,
            color: row.get(1)?,
            duration_seconds,
            percent: percent(duration_seconds, total),
        })
    })?)
}

fn query_by_hour(connection: &Connection, range: &DateRange) -> rusqlite::Result<[i64; 24]> {
    let mut by_hour = [0; 24];
    let mut statement = connection.prepare(
        "
        SELECT CAST(strftime('%H', start_ts, 'unixepoch', 'localtime') AS INTEGER) AS hour,
               SUM(MAX(0, MIN(end_ts, ?2) - MAX(start_ts, ?1))) AS duration
        FROM events
        WHERE end_ts > ?1 AND start_ts < ?2
        GROUP BY hour
        ",
    )?;

    let rows = statement.query_map(params![range.start_ts, range.end_ts], |row| {
        Ok((row.get::<_, i64>(0)?, row.get::<_, i64>(1)?))
    })?;

    for row in rows {
        let (hour, duration) = row?;
        if (0..24).contains(&hour) {
            by_hour[hour as usize] = duration;
        }
    }

    Ok(by_hour)
}

fn query_by_day(connection: &Connection, range: &DateRange) -> rusqlite::Result<Vec<DayStat>> {
    let mut statement = connection.prepare(
        "
        SELECT date(start_ts, 'unixepoch', 'localtime') AS day,
               SUM(MAX(0, MIN(end_ts, ?2) - MAX(start_ts, ?1))) AS duration
        FROM events
        WHERE end_ts > ?1 AND start_ts < ?2
        GROUP BY day
        HAVING duration > 0
        ORDER BY day ASC
        ",
    )?;

    collect_rows(statement.query_map(params![range.start_ts, range.end_ts], |row| {
        Ok(DayStat {
            date: row.get(0)?,
            duration_seconds: row.get(1)?,
        })
    })?)
}

fn query_today_timeline(connection: &Connection) -> rusqlite::Result<Vec<TimelineEvent>> {
    let now = Local::now();
    let start = Local
        .with_ymd_and_hms(now.year(), now.month(), now.day(), 0, 0, 0)
        .single()
        .map(|value| value.timestamp())
        .unwrap_or(0);
    let end = start + 86_400;

    let mut statement = connection.prepare(
        "
        SELECT events.start_ts, events.end_ts, events.app_name, events.domain,
               events.category, categories.color
        FROM events
        LEFT JOIN categories ON categories.name = events.category
        WHERE events.end_ts > ?1 AND events.start_ts < ?2
        ORDER BY events.start_ts ASC
        ",
    )?;

    collect_rows(statement.query_map(params![start, end], |row| {
        Ok(TimelineEvent {
            start_ts: row.get(0)?,
            end_ts: row.get(1)?,
            app_name: row.get(2)?,
            domain: row.get(3)?,
            category: row.get(4)?,
            color: row.get(5)?,
        })
    })?)
}

fn query_categories(connection: &Connection) -> rusqlite::Result<Vec<Category>> {
    let mut statement = connection.prepare(
        "
        SELECT id, name, color, is_productive
        FROM categories
        ORDER BY name ASC
        ",
    )?;

    collect_rows(statement.query_map([], |row| {
        Ok(Category {
            id: row.get(0)?,
            name: row.get(1)?,
            color: row.get(2)?,
            is_productive: row.get(3)?,
        })
    })?)
}

fn query_category_rules(connection: &Connection) -> rusqlite::Result<Vec<CategoryRule>> {
    let mut statement = connection.prepare(
        "
        SELECT category_rules.id, category_rules.match_type, category_rules.pattern,
               category_rules.category_id, categories.name, category_rules.priority
        FROM category_rules
        INNER JOIN categories ON categories.id = category_rules.category_id
        ORDER BY category_rules.priority DESC, category_rules.id ASC
        ",
    )?;

    collect_rows(statement.query_map([], |row| {
        Ok(CategoryRule {
            id: row.get(0)?,
            match_type: row.get(1)?,
            pattern: row.get(2)?,
            category_id: row.get(3)?,
            category_name: row.get(4)?,
            priority: row.get(5)?,
        })
    })?)
}

fn query_settings(connection: &Connection) -> rusqlite::Result<Settings> {
    let mut settings = Settings::default();

    settings.tracking_enabled = get_bool_setting(connection, "tracking_enabled")?
        .unwrap_or(settings.tracking_enabled);
    settings.idle_threshold_seconds = get_i64_setting(connection, "idle_threshold_seconds")?
        .unwrap_or(settings.idle_threshold_seconds);
    settings.include_browser_urls = get_bool_setting(connection, "include_browser_urls")?
        .unwrap_or(settings.include_browser_urls);
    settings.launch_at_login =
        get_bool_setting(connection, "launch_at_login")?.unwrap_or(settings.launch_at_login);
    settings.launch_to_tray =
        get_bool_setting(connection, "launch_to_tray")?.unwrap_or(settings.launch_to_tray);

    Ok(settings)
}

fn get_bool_setting(connection: &Connection, key: &str) -> rusqlite::Result<Option<bool>> {
    Ok(get_setting(connection, key)?.map(|value| value == "true"))
}

fn get_i64_setting(connection: &Connection, key: &str) -> rusqlite::Result<Option<i64>> {
    Ok(get_setting(connection, key)?.and_then(|value| value.parse().ok()))
}

fn get_setting(connection: &Connection, key: &str) -> rusqlite::Result<Option<String>> {
    connection
        .query_row(
            "SELECT value FROM settings WHERE key = ?1",
            params![key],
            |row| row.get(0),
        )
        .optional()
}

fn upsert_setting(
    connection: &Connection,
    key: &str,
    value: impl ToString,
) -> rusqlite::Result<()> {
    connection.execute(
        "
        INSERT INTO settings (key, value) VALUES (?1, ?2)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
        ",
        params![key, value.to_string()],
    )?;

    Ok(())
}

fn collect_rows<T, F>(rows: rusqlite::MappedRows<'_, F>) -> rusqlite::Result<Vec<T>>
where
    F: FnMut(&rusqlite::Row<'_>) -> rusqlite::Result<T>,
{
    let mut values = Vec::new();

    for row in rows {
        values.push(row?);
    }

    Ok(values)
}

fn percent(duration_seconds: i64, total_seconds: i64) -> f64 {
    if total_seconds <= 0 {
        0.0
    } else {
        (duration_seconds as f64 / total_seconds as f64) * 100.0
    }
}

const MONTH_NAMES: [&str; 12] = [
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

fn month_name(month: u32) -> String {
    MONTH_NAMES
        .get(month.saturating_sub(1) as usize)
        .copied()
        .unwrap_or("")
        .to_string()
}

fn month_range(year: i32, month: u32) -> rusqlite::Result<DateRange> {
    let start_date = NaiveDate::from_ymd_opt(year, month, 1).ok_or_else(|| {
        rusqlite::Error::InvalidParameterName(format!("invalid year/month: {year}/{month}"))
    })?;
    let end_date = start_date
        .checked_add_months(Months::new(1))
        .ok_or_else(|| {
            rusqlite::Error::InvalidParameterName(format!("month overflow: {year}/{month}"))
        })?;

    let start_dt = Local
        .from_local_datetime(
            &start_date
                .and_hms_opt(0, 0, 0)
                .expect("hms 0,0,0 is always valid"),
        )
        .single()
        .ok_or_else(|| {
            rusqlite::Error::InvalidParameterName("ambiguous local time at month start".to_string())
        })?;
    let end_dt = Local
        .from_local_datetime(
            &end_date
                .and_hms_opt(0, 0, 0)
                .expect("hms 0,0,0 is always valid"),
        )
        .single()
        .ok_or_else(|| {
            rusqlite::Error::InvalidParameterName("ambiguous local time at month end".to_string())
        })?;

    Ok(DateRange {
        start_ts: start_dt.timestamp(),
        end_ts: end_dt.timestamp(),
    })
}

fn previous_month(year: i32, month: u32) -> (i32, u32) {
    if month == 1 {
        (year - 1, 12)
    } else {
        (year, month - 1)
    }
}

fn days_in_month(year: i32, month: u32) -> u32 {
    let start = match NaiveDate::from_ymd_opt(year, month, 1) {
        Some(value) => value,
        None => return 0,
    };
    let next = match start.checked_add_months(Months::new(1)) {
        Some(value) => value,
        None => return 0,
    };
    next.signed_duration_since(start).num_days() as u32
}

fn build_monthly_report(
    connection: &Connection,
    year: i32,
    month: u32,
) -> rusqlite::Result<MonthlyReport> {
    let range = month_range(year, month)?;
    let (prev_year, prev_month) = previous_month(year, month);
    let prev_range = month_range(prev_year, prev_month)?;

    let summary = query_summary(connection, range.clone())?;

    let dim = days_in_month(year, month);
    let daily_average_seconds = if dim > 0 {
        summary.total_active_seconds / dim as i64
    } else {
        0
    };

    let most_active_day = summary
        .by_day
        .iter()
        .max_by_key(|day| day.duration_seconds)
        .cloned();

    let longest_session_seconds = longest_session(connection, &range)?;
    let unique_apps = unique_app_count(connection, &range)?;
    let unique_websites = unique_domain_count(connection, &range)?;

    let (current_productive, current_distracting, current_total) =
        productive_distracting_total(connection, &range)?;
    let (previous_productive, previous_distracting, previous_total) =
        productive_distracting_total(connection, &prev_range)?;

    Ok(MonthlyReport {
        year,
        month,
        month_name: month_name(month),
        days_in_month: dim,
        total_active_seconds: summary.total_active_seconds,
        daily_average_seconds,
        most_active_day,
        longest_session_seconds,
        unique_apps,
        unique_websites,
        by_category: summary.by_category,
        top_apps: summary.top_apps.into_iter().take(5).collect(),
        top_domains: summary.top_domains.into_iter().take(5).collect(),
        by_day: summary.by_day,
        by_hour: summary.by_hour,
        comparison: MonthComparison {
            previous_total_seconds: previous_total,
            previous_productive_seconds: previous_productive,
            previous_distracting_seconds: previous_distracting,
            current_total_seconds: current_total,
            current_productive_seconds: current_productive,
            current_distracting_seconds: current_distracting,
        },
    })
}

fn longest_session(connection: &Connection, range: &DateRange) -> rusqlite::Result<i64> {
    connection.query_row(
        "
        SELECT COALESCE(MAX(end_ts - start_ts), 0)
        FROM events
        WHERE end_ts > ?1 AND start_ts < ?2
        ",
        params![range.start_ts, range.end_ts],
        |row| row.get(0),
    )
}

fn unique_app_count(connection: &Connection, range: &DateRange) -> rusqlite::Result<i64> {
    connection.query_row(
        "
        SELECT COUNT(DISTINCT app_name)
        FROM events
        WHERE end_ts > ?1 AND start_ts < ?2
        ",
        params![range.start_ts, range.end_ts],
        |row| row.get(0),
    )
}

fn unique_domain_count(connection: &Connection, range: &DateRange) -> rusqlite::Result<i64> {
    connection.query_row(
        "
        SELECT COUNT(DISTINCT domain)
        FROM events
        WHERE end_ts > ?1 AND start_ts < ?2
          AND domain IS NOT NULL AND domain != ''
        ",
        params![range.start_ts, range.end_ts],
        |row| row.get(0),
    )
}

fn productive_distracting_total(
    connection: &Connection,
    range: &DateRange,
) -> rusqlite::Result<(i64, i64, i64)> {
    connection.query_row(
        "
        SELECT
            COALESCE(SUM(CASE WHEN categories.is_productive = 1
                              THEN MAX(0, MIN(events.end_ts, ?2) - MAX(events.start_ts, ?1))
                              ELSE 0 END), 0) AS productive,
            COALESCE(SUM(CASE WHEN categories.is_productive = -1
                              THEN MAX(0, MIN(events.end_ts, ?2) - MAX(events.start_ts, ?1))
                              ELSE 0 END), 0) AS distracting,
            COALESCE(SUM(MAX(0, MIN(events.end_ts, ?2) - MAX(events.start_ts, ?1))), 0) AS total
        FROM events
        LEFT JOIN categories ON categories.name = events.category
        WHERE events.end_ts > ?1 AND events.start_ts < ?2
        ",
        params![range.start_ts, range.end_ts],
        |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
    )
}

#[derive(Debug, Clone, Serialize)]
struct ExportEvent {
    id: i64,
    start_ts: i64,
    end_ts: i64,
    duration_sec: i64,
    app_name: String,
    app_display_name: Option<String>,
    executable_path: Option<String>,
    window_title: Option<String>,
    url: Option<String>,
    domain: Option<String>,
    category: Option<String>,
}

fn query_all_events(connection: &Connection) -> rusqlite::Result<Vec<ExportEvent>> {
    let mut statement = connection.prepare(
        "
        SELECT id, start_ts, end_ts, duration_sec, app_name, app_display_name,
               executable_path, window_title, url, domain, category
        FROM events
        ORDER BY start_ts ASC
        ",
    )?;

    collect_rows(statement.query_map([], |row| {
        Ok(ExportEvent {
            id: row.get(0)?,
            start_ts: row.get(1)?,
            end_ts: row.get(2)?,
            duration_sec: row.get(3)?,
            app_name: row.get(4)?,
            app_display_name: row.get(5)?,
            executable_path: row.get(6)?,
            window_title: row.get(7)?,
            url: row.get(8)?,
            domain: row.get(9)?,
            category: row.get(10)?,
        })
    })?)
}

fn csv_field(value: &str) -> String {
    if value
        .chars()
        .any(|c| c == ',' || c == '"' || c == '\n' || c == '\r')
    {
        format!("\"{}\"", value.replace('"', "\"\""))
    } else {
        value.to_string()
    }
}

fn csv_optional(value: Option<&str>) -> String {
    match value {
        Some(value) => csv_field(value),
        None => String::new(),
    }
}
