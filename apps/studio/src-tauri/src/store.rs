use crate::models::StoredProject;
use std::path::Path;
use tauri::AppHandle;
use tauri_plugin_store::StoreExt;
use uuid::Uuid;

const STORE_PATH: &str = "projects.json";
const PROJECTS_KEY: &str = "projects";

/// Extracts the project name from a database path.
/// Given: /path/to/my-project/.code-recall/memory.db
/// Returns: my-project
pub fn extract_project_name(db_path: &str) -> String {
    Path::new(db_path)
        .parent() // .code-recall/
        .and_then(|p| p.parent()) // my-project/
        .and_then(|p| p.file_name())
        .and_then(|n| n.to_str())
        .unwrap_or("Unknown")
        .to_string()
}

pub fn get_all_projects(app: &AppHandle) -> Result<Vec<StoredProject>, String> {
    let store = app
        .store(STORE_PATH)
        .map_err(|e| format!("Failed to open store: {}", e))?;

    let projects: Vec<StoredProject> = store
        .get(PROJECTS_KEY)
        .and_then(|v| serde_json::from_value(v).ok())
        .unwrap_or_default();

    Ok(projects)
}

pub fn add_project(app: &AppHandle, path: String) -> Result<StoredProject, String> {
    let name = extract_project_name(&path);

    let project = StoredProject {
        id: Uuid::new_v4().to_string(),
        name,
        path,
    };

    let store = app
        .store(STORE_PATH)
        .map_err(|e| format!("Failed to open store: {}", e))?;

    let mut projects: Vec<StoredProject> = store
        .get(PROJECTS_KEY)
        .and_then(|v| serde_json::from_value(v).ok())
        .unwrap_or_default();

    if projects.iter().any(|p| p.path == project.path) {
        return Err("Project already exists".to_string());
    }

    projects.push(project.clone());

    store.set(
        PROJECTS_KEY,
        serde_json::to_value(&projects).map_err(|e| e.to_string())?,
    );
    store
        .save()
        .map_err(|e| format!("Failed to save store: {}", e))?;

    Ok(project)
}

pub fn remove_project(app: &AppHandle, id: &str) -> Result<(), String> {
    let store = app
        .store(STORE_PATH)
        .map_err(|e| format!("Failed to open store: {}", e))?;

    let mut projects: Vec<StoredProject> = store
        .get(PROJECTS_KEY)
        .and_then(|v| serde_json::from_value(v).ok())
        .unwrap_or_default();

    projects.retain(|p| p.id != id);

    store.set(
        PROJECTS_KEY,
        serde_json::to_value(&projects).map_err(|e| e.to_string())?,
    );
    store
        .save()
        .map_err(|e| format!("Failed to save store: {}", e))?;

    Ok(())
}
