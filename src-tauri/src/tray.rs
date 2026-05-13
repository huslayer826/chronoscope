use chrono::{Datelike, Local, TimeZone};
use rusqlite::params;
use tauri::image::Image;
use tauri::menu::{IsMenuItem, Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIcon, TrayIconBuilder, TrayIconEvent};
use tauri::{App, AppHandle, Manager};

use crate::{db, tracking};

const TRAY_ID: &str = "main";
const ACTIVE_TOOLTIP: &str = "ChronoScope - Tracking active";
const PAUSED_TOOLTIP: &str = "ChronoScope - Tracking paused";

pub struct TrayState {
    tray: TrayIcon,
    today_item: MenuItem,
    pause_item: MenuItem,
}

pub fn setup(app: &mut App) -> tauri::Result<()> {
    let open_dashboard =
        MenuItem::with_id(app, "open_dashboard", "Open Dashboard", true, None::<&str>)?;
    let today_item = MenuItem::with_id(app, "today_total", "Today: 0m", false, None::<&str>)?;
    let separator_one = PredefinedMenuItem::separator(app)?;
    let pause_item =
        MenuItem::with_id(app, "toggle_tracking", "Pause Tracking", true, None::<&str>)?;
    let open_data_folder =
        MenuItem::with_id(app, "open_data_folder", "Open Data Folder", true, None::<&str>)?;
    let separator_two = PredefinedMenuItem::separator(app)?;
    let quit = MenuItem::with_id(app, "quit", "Quit ChronoScope", true, None::<&str>)?;

    let menu_items: [&dyn IsMenuItem<tauri::Wry>; 7] = [
        &open_dashboard,
        &today_item,
        &separator_one,
        &pause_item,
        &open_data_folder,
        &separator_two,
        &quit,
    ];

    let menu = Menu::with_items(app, &menu_items)?;

    let tray = app.tray_by_id(TRAY_ID).unwrap_or_else(|| {
        TrayIconBuilder::with_id(TRAY_ID)
            .icon(app.default_window_icon().expect("default app icon missing").clone())
            .tooltip(ACTIVE_TOOLTIP)
            .show_menu_on_left_click(false)
            .build(app)
            .expect("failed to build tray icon")
    });

    tray.set_menu(Some(menu))?;
    tray.set_show_menu_on_left_click(false)?;
    tray.set_tooltip(Some(ACTIVE_TOOLTIP))?;
    tray.on_menu_event(handle_menu_event);
    tray.on_tray_icon_event(|tray, event| {
        if let TrayIconEvent::Click {
            button: MouseButton::Left,
            button_state: MouseButtonState::Up,
            ..
        } = event
        {
            show_dashboard(tray.app_handle());
        }
    });

    let state = TrayState {
        tray: tray.clone(),
        today_item: today_item.clone(),
        pause_item: pause_item.clone(),
    };

    app.manage(state);
    update_tray_labels(app.handle());
    start_tray_refresh_loop(app.handle().clone());

    if launch_to_tray() {
        if let Some(window) = app.get_webview_window("main") {
            let _ = window.hide();
        }
    } else {
        show_dashboard(app.handle());
    }

    Ok(())
}

pub fn show_dashboard(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
    }
}

fn handle_menu_event(app: &AppHandle, event: tauri::menu::MenuEvent) {
    match event.id().as_ref() {
        "open_dashboard" => show_dashboard(app),
        "toggle_tracking" => toggle_tracking(app),
        "open_data_folder" => open_data_folder(),
        "quit" => app.exit(0),
        _ => {}
    }
}

fn toggle_tracking(app: &AppHandle) {
    let paused = !tracking::is_tracking_paused();
    tracking::set_tracking_paused(paused);

    if let Some(state) = app.try_state::<TrayState>() {
        let _ = state
            .pause_item
            .set_text(if paused { "Resume Tracking" } else { "Pause Tracking" });
        let _ = state
            .tray
            .set_tooltip(Some(if paused { PAUSED_TOOLTIP } else { ACTIVE_TOOLTIP }));

        if paused {
            if let Ok(icon) = paused_icon() {
                let _ = state.tray.set_icon(Some(icon));
            }
        } else {
            let _ = state.tray.set_icon(app.default_window_icon().cloned());
        }
    }
}

fn start_tray_refresh_loop(app: AppHandle) {
    tokio::spawn(async move {
        let mut interval = tokio::time::interval(std::time::Duration::from_secs(30));

        loop {
            interval.tick().await;
            update_tray_labels(&app);
        }
    });
}

fn update_tray_labels(app: &AppHandle) {
    if let Some(state) = app.try_state::<TrayState>() {
        let total = today_active_seconds();
        let status = if tracking::is_tracking_paused() {
            "paused"
        } else {
            "active"
        };
        let _ = state
            .today_item
            .set_text(format!("Today: {}", format_duration(total)));
        let _ = state
            .tray
            .set_tooltip(Some(format!("ChronoScope - Tracking {status}")));
    }
}

fn today_active_seconds() -> i64 {
    let now = Local::now();
    let start = Local
        .with_ymd_and_hms(now.year(), now.month(), now.day(), 0, 0, 0)
        .single()
        .map(|value| value.timestamp())
        .unwrap_or(0);
    let end = start + 86_400;

    let Some(connection) = db::connection() else {
        return 0;
    };
    let Ok(connection) = connection.lock() else {
        return 0;
    };

    connection
        .query_row(
            "
            SELECT COALESCE(SUM(MAX(0, MIN(end_ts, ?2) - MAX(start_ts, ?1))), 0)
            FROM events
            WHERE end_ts > ?1 AND start_ts < ?2
            ",
            params![start, end],
            |row| row.get(0),
        )
        .unwrap_or(0)
}

fn format_duration(total_seconds: i64) -> String {
    let minutes = (total_seconds / 60).max(0);
    let hours = minutes / 60;
    let minutes = minutes % 60;

    if hours > 0 {
        format!("{hours}h {minutes}m")
    } else {
        format!("{minutes}m")
    }
}

fn open_data_folder() {
    let Some(path) = dirs::data_dir().map(|path| path.join("ChronoScope")) else {
        eprintln!("Could not resolve ChronoScope data folder");
        return;
    };

    if let Err(error) = std::fs::create_dir_all(&path) {
        eprintln!("Could not create ChronoScope data folder: {error}");
        return;
    }

    #[cfg(windows)]
    if let Err(error) = std::process::Command::new("explorer").arg(path).spawn() {
        eprintln!("Could not open ChronoScope data folder: {error}");
    }

    #[cfg(not(windows))]
    if let Err(error) = std::process::Command::new("open").arg(path).spawn() {
        eprintln!("Could not open ChronoScope data folder: {error}");
    }
}

fn launch_to_tray() -> bool {
    let Some(connection) = db::connection() else {
        return true;
    };
    let Ok(connection) = connection.lock() else {
        return true;
    };

    connection
        .query_row(
            "SELECT value FROM settings WHERE key = 'launch_to_tray'",
            [],
            |row| row.get::<_, String>(0),
        )
        .map(|value| value == "true")
        .unwrap_or(true)
}

fn paused_icon() -> tauri::Result<Image<'static>> {
    Image::from_bytes(include_bytes!("../icons/tray-paused.png"))
}
