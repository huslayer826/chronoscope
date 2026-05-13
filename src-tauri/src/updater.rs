use serde::Serialize;
use tauri::{AppHandle, Emitter};
use tauri_plugin_updater::UpdaterExt;

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateAvailable {
    pub version: String,
    pub current_version: String,
}

pub fn check_on_startup(app: AppHandle) {
    tauri::async_runtime::spawn(async move {
        match check_for_update(app.clone()).await {
            Ok(Some(update)) => {
                let _ = app.emit("update_available", update);
            }
            Ok(None) => {}
            Err(error) => eprintln!("[Updater] Update check failed: {error}"),
        }
    });
}

async fn check_for_update(
    app: AppHandle,
) -> tauri_plugin_updater::Result<Option<UpdateAvailable>> {
    let update = app.updater()?.check().await?;

    Ok(update.map(|update| UpdateAvailable {
        version: update.version,
        current_version: update.current_version,
    }))
}
