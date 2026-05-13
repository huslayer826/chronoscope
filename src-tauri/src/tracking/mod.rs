mod active_window;
mod domain;
mod idle;
mod session;
mod session_builder;

pub use active_window::{get_active_window, ActiveWindowInfo};
pub use domain::extract_domain;
pub use idle::{get_idle_seconds, IDLE_THRESHOLD_SECONDS};
pub use session::{is_locked, refresh_lock_state};

pub fn start_polling_loop() {
    tokio::spawn(async {
        let mut interval = tokio::time::interval(std::time::Duration::from_millis(1000));
        let mut session_builder = session_builder::SessionBuilder::new();

        loop {
            interval.tick().await;

            let idle_seconds = get_idle_seconds();
            let locked = refresh_lock_state();
            let is_inactive = idle_seconds >= IDLE_THRESHOLD_SECONDS || locked || is_locked();
            let active_window = if is_inactive { None } else { get_active_window() };

            session_builder.tick(active_window, is_inactive);
        }
    });
}
