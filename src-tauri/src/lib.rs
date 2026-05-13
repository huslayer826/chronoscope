mod db;
mod tracking;
mod ws;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|_app| {
            let browser_state = ws::server::create_browser_state();
            ws::server::start_server(browser_state);
            tracking::start_polling_loop();
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
