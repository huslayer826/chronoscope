use crate::db::{insert_event, Event};
use crate::ws::server::get_active_tab_for_browser;

use super::{categorize, extract_domain, ActiveWindowInfo};

const MIN_SESSION_SECONDS: i64 = 2;

#[derive(Debug, Clone)]
struct CurrentSession {
    app_name: String,
    executable_path: String,
    window_title: String,
    url: Option<String>,
    domain: Option<String>,
    start_ts: i64,
    last_seen_ts: i64,
}

#[derive(Debug, Default)]
pub struct SessionBuilder {
    current: Option<CurrentSession>,
}

impl SessionBuilder {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn tick(&mut self, active_window: Option<ActiveWindowInfo>, is_inactive: bool) {
        if is_inactive {
            self.flush();
            return;
        }

        let Some(active_window) = active_window else {
            self.flush();
            return;
        };

        match self.current.as_mut() {
            Some(current) if current.matches(&active_window) => {
                current.last_seen_ts = active_window.timestamp;
            }
            Some(_) => {
                self.flush();
                self.start(active_window);
            }
            None => self.start(active_window),
        }
    }

    fn start(&mut self, active_window: ActiveWindowInfo) {
        let browser_tab = get_active_tab_for_browser(&active_window.process_name);
        let url = browser_tab.and_then(|tab| tab.url);
        let domain = url.as_deref().and_then(extract_domain);

        self.current = Some(CurrentSession {
            app_name: active_window.process_name,
            executable_path: active_window.executable_path,
            window_title: active_window.window_title,
            url,
            domain,
            start_ts: active_window.timestamp,
            last_seen_ts: active_window.timestamp,
        });
    }

    fn flush(&mut self) {
        let Some(current) = self.current.take() else {
            return;
        };

        let duration_sec = current.last_seen_ts.saturating_sub(current.start_ts);

        if duration_sec < MIN_SESSION_SECONDS {
            return;
        }

        let category = categorize(&current.app_name, current.domain.as_deref());

        let event = Event {
            start_ts: current.start_ts,
            end_ts: current.last_seen_ts,
            duration_sec,
            app_name: current.app_name.clone(),
            app_display_name: None,
            executable_path: Some(current.executable_path),
            window_title: Some(current.window_title),
            url: current.url,
            domain: current.domain,
            category,
        };

        if insert_event(&event) {
            println!("Committed: {} for {}s", current.app_name, duration_sec);
        }
    }
}

impl CurrentSession {
    fn matches(&self, active_window: &ActiveWindowInfo) -> bool {
        self.app_name == active_window.process_name
            && self.window_title == active_window.window_title
            && self.url == get_active_tab_for_browser(&active_window.process_name).and_then(|tab| tab.url)
    }
}
