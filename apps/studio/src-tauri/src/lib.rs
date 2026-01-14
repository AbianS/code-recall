mod commands;
mod database;
mod models;
mod store;
mod window;

use commands::{
    add_project, get_database_stats, get_projects, open_database_dialog, open_editor_window,
    remove_project,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            open_database_dialog,
            get_database_stats,
            get_projects,
            add_project,
            remove_project,
            open_editor_window
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
