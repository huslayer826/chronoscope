use once_cell::sync::Lazy;
use rusqlite::{params, Connection};
use std::error::Error;
use std::fs;
use std::io;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};

#[derive(Debug, Clone)]
pub struct Event {
    pub start_ts: i64,
    pub end_ts: i64,
    pub duration_sec: i64,
    pub app_name: String,
    pub app_display_name: Option<String>,
    pub executable_path: Option<String>,
    pub window_title: Option<String>,
    pub url: Option<String>,
    pub domain: Option<String>,
    pub category: Option<String>,
}

static DB: Lazy<Option<Arc<Mutex<Connection>>>> = Lazy::new(|| match open_database() {
    Ok(connection) => Some(Arc::new(Mutex::new(connection))),
    Err(error) => {
        eprintln!("Failed to initialize ChronoScope database: {error}");
        None
    }
});

pub fn connection() -> Option<Arc<Mutex<Connection>>> {
    DB.as_ref().cloned()
}

pub fn insert_event(event: &Event) -> bool {
    let Some(connection) = connection() else {
        eprintln!("Skipping event insert because the database is unavailable");
        return false;
    };

    let Ok(connection) = connection.lock() else {
        eprintln!("Skipping event insert because the database lock is poisoned");
        return false;
    };

    if let Err(error) = connection.execute(
        "INSERT INTO events (
            start_ts,
            end_ts,
            duration_sec,
            app_name,
            app_display_name,
            executable_path,
            window_title,
            url,
            domain,
            category
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
        params![
            event.start_ts,
            event.end_ts,
            event.duration_sec,
            event.app_name.as_str(),
            event.app_display_name.as_deref(),
            event.executable_path.as_deref(),
            event.window_title.as_deref(),
            event.url.as_deref(),
            event.domain.as_deref(),
            event.category.as_deref(),
        ],
    ) {
        eprintln!("Failed to insert ChronoScope event: {error}");
        return false;
    }

    true
}

fn open_database() -> Result<Connection, Box<dyn Error + Send + Sync>> {
    let path = database_path()?;

    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }

    let connection = Connection::open(path)?;
    initialize_schema(&connection)?;
    Ok(connection)
}

fn database_path() -> Result<PathBuf, Box<dyn Error + Send + Sync>> {
    let data_dir = dirs::data_dir().ok_or_else(|| {
        io::Error::new(io::ErrorKind::NotFound, "could not resolve data directory")
    })?;
    Ok(data_dir.join("ChronoScope").join("data.db"))
}

fn initialize_schema(connection: &Connection) -> rusqlite::Result<()> {
    connection.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS events (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          start_ts INTEGER NOT NULL,
          end_ts INTEGER NOT NULL,
          duration_sec INTEGER NOT NULL,
          app_name TEXT NOT NULL,
          app_display_name TEXT,
          executable_path TEXT,
          window_title TEXT,
          url TEXT,
          domain TEXT,
          category TEXT
        );

        CREATE INDEX IF NOT EXISTS idx_events_start ON events(start_ts);
        CREATE INDEX IF NOT EXISTS idx_events_domain ON events(domain);

        CREATE TABLE IF NOT EXISTS categories (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT UNIQUE NOT NULL,
          color TEXT NOT NULL,
          is_productive INTEGER NOT NULL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS category_rules (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          match_type TEXT NOT NULL CHECK(match_type IN ('app','domain')),
          pattern TEXT NOT NULL,
          category_id INTEGER NOT NULL REFERENCES categories(id),
          priority INTEGER NOT NULL DEFAULT 100
        );

        CREATE UNIQUE INDEX IF NOT EXISTS idx_category_rules_unique
        ON category_rules(match_type, pattern, category_id);

        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );

        INSERT OR IGNORE INTO categories (name, color, is_productive) VALUES
          ('Development', '#22c55e', 1),
          ('Productivity', '#3b82f6', 1),
          ('Communication', '#8b5cf6', 0),
          ('Social Media', '#f43f5e', -1),
          ('Entertainment', '#f97316', -1),
          ('News & Reading', '#eab308', 0),
          ('Shopping', '#ec4899', -1),
          ('Other', '#64748b', 0);

        INSERT OR IGNORE INTO settings (key, value) VALUES
          ('tracking_enabled', 'true'),
          ('idle_threshold_seconds', '60'),
          ('include_browser_urls', 'true'),
          ('launch_at_login', 'false');

        INSERT OR IGNORE INTO category_rules (match_type, pattern, category_id, priority)
        SELECT 'app', 'code.exe', id, 100 FROM categories WHERE name = 'Development';
        INSERT OR IGNORE INTO category_rules (match_type, pattern, category_id, priority)
        SELECT 'app', 'devenv.exe', id, 100 FROM categories WHERE name = 'Development';
        INSERT OR IGNORE INTO category_rules (match_type, pattern, category_id, priority)
        SELECT 'app', 'idea64.exe', id, 100 FROM categories WHERE name = 'Development';
        INSERT OR IGNORE INTO category_rules (match_type, pattern, category_id, priority)
        SELECT 'app', 'pycharm64.exe', id, 100 FROM categories WHERE name = 'Development';
        INSERT OR IGNORE INTO category_rules (match_type, pattern, category_id, priority)
        SELECT 'app', 'terminal.exe', id, 100 FROM categories WHERE name = 'Development';
        INSERT OR IGNORE INTO category_rules (match_type, pattern, category_id, priority)
        SELECT 'app', 'wt.exe', id, 100 FROM categories WHERE name = 'Development';
        INSERT OR IGNORE INTO category_rules (match_type, pattern, category_id, priority)
        SELECT 'app', 'cmd.exe', id, 100 FROM categories WHERE name = 'Development';
        INSERT OR IGNORE INTO category_rules (match_type, pattern, category_id, priority)
        SELECT 'app', 'powershell.exe', id, 100 FROM categories WHERE name = 'Development';

        INSERT OR IGNORE INTO category_rules (match_type, pattern, category_id, priority)
        SELECT 'app', 'notion.exe', id, 100 FROM categories WHERE name = 'Productivity';
        INSERT OR IGNORE INTO category_rules (match_type, pattern, category_id, priority)
        SELECT 'app', 'obsidian.exe', id, 100 FROM categories WHERE name = 'Productivity';
        INSERT OR IGNORE INTO category_rules (match_type, pattern, category_id, priority)
        SELECT 'app', 'excel.exe', id, 100 FROM categories WHERE name = 'Productivity';
        INSERT OR IGNORE INTO category_rules (match_type, pattern, category_id, priority)
        SELECT 'app', 'word.exe', id, 100 FROM categories WHERE name = 'Productivity';
        INSERT OR IGNORE INTO category_rules (match_type, pattern, category_id, priority)
        SELECT 'app', 'winword.exe', id, 100 FROM categories WHERE name = 'Productivity';
        INSERT OR IGNORE INTO category_rules (match_type, pattern, category_id, priority)
        SELECT 'app', 'powerpnt.exe', id, 100 FROM categories WHERE name = 'Productivity';

        INSERT OR IGNORE INTO category_rules (match_type, pattern, category_id, priority)
        SELECT 'app', 'slack.exe', id, 100 FROM categories WHERE name = 'Communication';
        INSERT OR IGNORE INTO category_rules (match_type, pattern, category_id, priority)
        SELECT 'app', 'discord.exe', id, 100 FROM categories WHERE name = 'Communication';
        INSERT OR IGNORE INTO category_rules (match_type, pattern, category_id, priority)
        SELECT 'app', 'teams.exe', id, 100 FROM categories WHERE name = 'Communication';
        INSERT OR IGNORE INTO category_rules (match_type, pattern, category_id, priority)
        SELECT 'app', 'zoom.exe', id, 100 FROM categories WHERE name = 'Communication';
        INSERT OR IGNORE INTO category_rules (match_type, pattern, category_id, priority)
        SELECT 'app', 'telegram.exe', id, 100 FROM categories WHERE name = 'Communication';

        INSERT OR IGNORE INTO category_rules (match_type, pattern, category_id, priority)
        SELECT 'domain', 'youtube.com', id, 100 FROM categories WHERE name = 'Entertainment';
        INSERT OR IGNORE INTO category_rules (match_type, pattern, category_id, priority)
        SELECT 'domain', 'netflix.com', id, 100 FROM categories WHERE name = 'Entertainment';
        INSERT OR IGNORE INTO category_rules (match_type, pattern, category_id, priority)
        SELECT 'domain', 'twitch.tv', id, 100 FROM categories WHERE name = 'Entertainment';
        INSERT OR IGNORE INTO category_rules (match_type, pattern, category_id, priority)
        SELECT 'domain', 'hulu.com', id, 100 FROM categories WHERE name = 'Entertainment';
        INSERT OR IGNORE INTO category_rules (match_type, pattern, category_id, priority)
        SELECT 'domain', 'disneyplus.com', id, 100 FROM categories WHERE name = 'Entertainment';

        INSERT OR IGNORE INTO category_rules (match_type, pattern, category_id, priority)
        SELECT 'domain', 'twitter.com', id, 100 FROM categories WHERE name = 'Social Media';
        INSERT OR IGNORE INTO category_rules (match_type, pattern, category_id, priority)
        SELECT 'domain', 'x.com', id, 100 FROM categories WHERE name = 'Social Media';
        INSERT OR IGNORE INTO category_rules (match_type, pattern, category_id, priority)
        SELECT 'domain', 'instagram.com', id, 100 FROM categories WHERE name = 'Social Media';
        INSERT OR IGNORE INTO category_rules (match_type, pattern, category_id, priority)
        SELECT 'domain', 'facebook.com', id, 100 FROM categories WHERE name = 'Social Media';
        INSERT OR IGNORE INTO category_rules (match_type, pattern, category_id, priority)
        SELECT 'domain', 'tiktok.com', id, 100 FROM categories WHERE name = 'Social Media';
        INSERT OR IGNORE INTO category_rules (match_type, pattern, category_id, priority)
        SELECT 'domain', 'reddit.com', id, 100 FROM categories WHERE name = 'Social Media';

        INSERT OR IGNORE INTO category_rules (match_type, pattern, category_id, priority)
        SELECT 'domain', 'github.com', id, 100 FROM categories WHERE name = 'Development';
        INSERT OR IGNORE INTO category_rules (match_type, pattern, category_id, priority)
        SELECT 'domain', 'gitlab.com', id, 100 FROM categories WHERE name = 'Development';
        INSERT OR IGNORE INTO category_rules (match_type, pattern, category_id, priority)
        SELECT 'domain', 'stackoverflow.com', id, 100 FROM categories WHERE name = 'Development';
        INSERT OR IGNORE INTO category_rules (match_type, pattern, category_id, priority)
        SELECT 'domain', 'docs.python.org', id, 100 FROM categories WHERE name = 'Development';
        INSERT OR IGNORE INTO category_rules (match_type, pattern, category_id, priority)
        SELECT 'domain', 'developer.mozilla.org', id, 100 FROM categories WHERE name = 'Development';

        INSERT OR IGNORE INTO category_rules (match_type, pattern, category_id, priority)
        SELECT 'domain', 'amazon.com', id, 100 FROM categories WHERE name = 'Shopping';
        INSERT OR IGNORE INTO category_rules (match_type, pattern, category_id, priority)
        SELECT 'domain', 'ebay.com', id, 100 FROM categories WHERE name = 'Shopping';
        INSERT OR IGNORE INTO category_rules (match_type, pattern, category_id, priority)
        SELECT 'domain', 'etsy.com', id, 100 FROM categories WHERE name = 'Shopping';
        ",
    )
}
