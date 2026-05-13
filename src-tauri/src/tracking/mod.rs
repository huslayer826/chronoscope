mod active_window;
mod categorizer;
mod domain;
mod idle;
mod ignore_list;
mod session;
mod session_builder;

use std::sync::atomic::{AtomicBool, Ordering};

use once_cell::sync::Lazy;
use tokio::sync::broadcast;

pub use active_window::{get_active_window, ActiveWindowInfo};
pub use categorizer::{categorize, reload_rules};
pub use domain::extract_domain;
pub use idle::{get_idle_seconds, IDLE_THRESHOLD_SECONDS};
pub use ignore_list::{is_app_ignored, is_domain_ignored, reload as reload_ignore_lists};
pub use session::{is_locked, refresh_lock_state};

static TRACKING_PAUSED: AtomicBool = AtomicBool::new(false);

#[derive(Debug, Clone, Copy)]
pub enum TrackingNotification {
    RulesChanged,
    IgnoreListsChanged,
}

static NOTIFICATIONS: Lazy<broadcast::Sender<TrackingNotification>> = Lazy::new(|| {
    let (tx, _) = broadcast::channel(16);
    tx
});

pub fn notify(event: TrackingNotification) {
    let _ = NOTIFICATIONS.send(event);
}

pub fn is_tracking_paused() -> bool {
    TRACKING_PAUSED.load(Ordering::Relaxed)
}

pub fn set_tracking_paused(paused: bool) {
    TRACKING_PAUSED.store(paused, Ordering::Relaxed);
}

pub fn start_polling_loop() {
    tokio::spawn(async {
        let mut rx = NOTIFICATIONS.subscribe();
        loop {
            match rx.recv().await {
                Ok(TrackingNotification::RulesChanged) => reload_rules(),
                Ok(TrackingNotification::IgnoreListsChanged) => reload_ignore_lists(),
                Err(broadcast::error::RecvError::Lagged(_)) => {
                    reload_rules();
                    reload_ignore_lists();
                }
                Err(broadcast::error::RecvError::Closed) => break,
            }
        }
    });

    tokio::spawn(async {
        let mut interval = tokio::time::interval(std::time::Duration::from_millis(1000));
        let mut session_builder = session_builder::SessionBuilder::new();

        loop {
            interval.tick().await;

            if is_tracking_paused() {
                session_builder.tick(None, true);
                continue;
            }

            let idle_seconds = get_idle_seconds();
            let locked = refresh_lock_state();
            let is_inactive = idle_seconds >= IDLE_THRESHOLD_SECONDS || locked || is_locked();
            let active_window = if is_inactive { None } else { get_active_window() };

            session_builder.tick(active_window, is_inactive);
        }
    });
}
