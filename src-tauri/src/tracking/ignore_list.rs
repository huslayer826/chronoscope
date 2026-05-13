use once_cell::sync::Lazy;
use std::collections::HashSet;
use std::sync::RwLock;

use crate::db;

#[derive(Debug, Default, Clone)]
struct IgnoreSet {
    apps: HashSet<String>,
    domains: HashSet<String>,
}

static CACHE: Lazy<RwLock<IgnoreSet>> = Lazy::new(|| RwLock::new(load_from_db().unwrap_or_default()));

pub fn reload() {
    let updated = load_from_db().unwrap_or_default();
    if let Ok(mut cache) = CACHE.write() {
        *cache = updated;
    } else {
        eprintln!("Failed to reload ignore lists: cache lock is poisoned");
    }
}

pub fn is_app_ignored(app_name: &str) -> bool {
    let key = app_name.to_ascii_lowercase();
    CACHE
        .read()
        .map(|cache| cache.apps.contains(&key))
        .unwrap_or(false)
}

pub fn is_domain_ignored(domain: &str) -> bool {
    let key = domain.to_ascii_lowercase();
    CACHE
        .read()
        .map(|cache| cache.domains.contains(&key))
        .unwrap_or(false)
}

fn load_from_db() -> Option<IgnoreSet> {
    let connection = db::connection()?;
    let connection = match connection.lock() {
        Ok(value) => value,
        Err(_) => {
            eprintln!("Failed to load ignore lists: database lock is poisoned");
            return None;
        }
    };

    let mut apps = HashSet::new();
    if let Ok(mut statement) = connection.prepare("SELECT app_name FROM ignored_apps") {
        if let Ok(rows) = statement.query_map([], |row| row.get::<_, String>(0)) {
            for row in rows.flatten() {
                apps.insert(row.to_ascii_lowercase());
            }
        }
    }

    let mut domains = HashSet::new();
    if let Ok(mut statement) = connection.prepare("SELECT domain FROM ignored_domains") {
        if let Ok(rows) = statement.query_map([], |row| row.get::<_, String>(0)) {
            for row in rows.flatten() {
                domains.insert(row.to_ascii_lowercase());
            }
        }
    }

    Some(IgnoreSet { apps, domains })
}
