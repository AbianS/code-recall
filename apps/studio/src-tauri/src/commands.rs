use crate::database;
use crate::models::{DatabaseStats, StoredProject};
use crate::store;
use crate::window;
use tauri::AppHandle;
use tauri_plugin_dialog::DialogExt;

#[tauri::command]
pub async fn open_database_dialog(app: AppHandle) -> Result<Option<String>, String> {
    let file_path = app
        .dialog()
        .file()
        .add_filter("SQLite Database", &["db", "sqlite"])
        .blocking_pick_file();

    match file_path {
        Some(path) => Ok(Some(path.to_string())),
        None => Ok(None),
    }
}

#[tauri::command]
pub fn get_database_stats(path: String) -> Result<DatabaseStats, String> {
    database::get_stats(&path)
}

#[tauri::command]
pub async fn get_projects(app: AppHandle) -> Result<Vec<StoredProject>, String> {
    store::get_all_projects(&app)
}

#[tauri::command]
pub async fn add_project(app: AppHandle, path: String) -> Result<StoredProject, String> {
    store::add_project(&app, path)
}

#[tauri::command]
pub async fn remove_project(app: AppHandle, id: String) -> Result<(), String> {
    store::remove_project(&app, &id)
}

#[tauri::command]
pub fn open_editor_window(
    app: AppHandle,
    project_name: String,
    project_path: String,
) -> Result<(), String> {
    window::open_editor(&app, &project_name, &project_path)
}
