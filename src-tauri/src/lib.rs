mod commands;
mod db;
mod tray;
mod tracking;
mod ws;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            tray::show_dashboard(app);
        }))
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            tray::setup(app)?;
            let browser_state = ws::server::create_browser_state();
            ws::server::start_server(browser_state);
            tracking::start_polling_loop();
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
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
            commands::set_autostart,
            commands::add_category,
            commands::update_category,
            commands::delete_category,
            commands::bulk_add_category_rules,
            commands::get_ignored_apps,
            commands::add_ignored_app,
            commands::remove_ignored_app,
            commands::get_ignored_domains,
            commands::add_ignored_domain,
            commands::remove_ignored_domain,
            commands::export_data_json,
            commands::export_data_csv,
            commands::delete_all_data,
            commands::get_database_path,
            commands::open_database_folder,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
