mod active_window;

pub use active_window::{get_active_window, ActiveWindowInfo};

pub fn start_polling_loop() {
    tokio::spawn(async {
        let mut interval = tokio::time::interval(std::time::Duration::from_millis(1000));

        loop {
            interval.tick().await;

            if let Some(active_window) = get_active_window() {
                println!("{active_window:?}");
            }
        }
    });
}
