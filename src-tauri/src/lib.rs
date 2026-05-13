mod commands;
mod db;
mod tracking;
mod ws;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|_app| {
            let browser_state = ws::server::create_browser_state();
            ws::server::start_server(browser_state);
            tracking::start_polling_loop();
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_summary,
            commands::get_today_timeline,
            commands::get_monthly_report,
            commands::get_categories,
            commands::get_category_rules,
            commands::add_category_rule,
            commands::delete_category_rule,
            commands::get_settings,
            commands::update_settings,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
