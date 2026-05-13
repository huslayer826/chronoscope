use once_cell::sync::Lazy;
use std::sync::RwLock;

use crate::db;

#[derive(Debug, Clone, PartialEq, Eq)]
enum MatchType {
    App,
    Domain,
}

#[derive(Debug, Clone)]
struct CategoryRule {
    match_type: MatchType,
    pattern: String,
    category: String,
    priority: i64,
    id: i64,
}

static RULE_CACHE: Lazy<RwLock<Option<Vec<CategoryRule>>>> = Lazy::new(|| RwLock::new(None));

pub fn categorize(app_name: &str, domain: Option<&str>) -> Option<String> {
    let app_name = app_name.to_ascii_lowercase();
    let domain = domain.map(|domain| domain.to_ascii_lowercase());
    let rules = rules();

    if let Some(domain) = domain.as_deref() {
        if let Some(category) = best_match(&rules, MatchType::Domain, domain) {
            return Some(category);
        }
    }

    best_match(&rules, MatchType::App, &app_name)
}

pub fn reload_rules() {
    let Ok(mut cache) = RULE_CACHE.write() else {
        eprintln!("Failed to reload category rules because the cache lock is poisoned");
        return;
    };

    *cache = load_rules();
}

fn rules() -> Vec<CategoryRule> {
    if let Ok(cache) = RULE_CACHE.read() {
        if let Some(rules) = cache.as_ref() {
            return rules.clone();
        }
    }

    reload_rules();

    RULE_CACHE
        .read()
        .ok()
        .and_then(|cache| cache.clone())
        .unwrap_or_default()
}

fn best_match(rules: &[CategoryRule], match_type: MatchType, value: &str) -> Option<String> {
    rules
        .iter()
        .filter(|rule| rule.match_type == match_type && rule.pattern == value)
        .max_by_key(|rule| (rule.priority, -rule.id))
        .map(|rule| rule.category.clone())
}

fn load_rules() -> Option<Vec<CategoryRule>> {
    let connection = db::connection()?;
    let Ok(connection) = connection.lock() else {
        eprintln!("Failed to load category rules because the database lock is poisoned");
        return None;
    };

    let mut statement = match connection.prepare(
        "
        SELECT category_rules.id, category_rules.match_type, category_rules.pattern, categories.name, category_rules.priority
        FROM category_rules
        INNER JOIN categories ON categories.id = category_rules.category_id
        ORDER BY category_rules.priority DESC, category_rules.id ASC
        ",
    ) {
        Ok(statement) => statement,
        Err(error) => {
            eprintln!("Failed to prepare category rule query: {error}");
            return None;
        }
    };

    let rows = match statement.query_map([], |row| {
        let match_type: String = row.get(1)?;

        Ok(CategoryRule {
            match_type: match match_type.as_str() {
                "domain" => MatchType::Domain,
                _ => MatchType::App,
            },
            pattern: row.get::<_, String>(2)?.to_ascii_lowercase(),
            category: row.get(3)?,
            priority: row.get(4)?,
            id: row.get(0)?,
        })
    }) {
        Ok(rows) => rows,
        Err(error) => {
            eprintln!("Failed to query category rules: {error}");
            return None;
        }
    };

    let mut rules = Vec::new();

    for row in rows {
        match row {
            Ok(rule) => rules.push(rule),
            Err(error) => eprintln!("Skipping invalid category rule: {error}"),
        }
    }

    Some(rules)
}
