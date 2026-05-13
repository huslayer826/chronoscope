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
        ",
    )
}
