use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder};

const LAUNCHER_LABEL: &str = "launcher";
const EDITOR_LABEL: &str = "editor";

pub fn open_editor(app: &AppHandle, project_name: &str, project_path: &str) -> Result<(), String> {
    // Hide launcher window instead of closing
    if let Some(launcher) = app.get_webview_window(LAUNCHER_LABEL) {
        launcher.hide().map_err(|e| e.to_string())?;
    }

    // Check if editor already exists - if so, navigate to new project
    if let Some(editor) = app.get_webview_window(EDITOR_LABEL) {
        let encoded_name = urlencoding::encode(project_name);
        let encoded_path = urlencoding::encode(project_path);

        #[cfg(debug_assertions)]
        let url = format!(
            "http://localhost:1420/editor.html?name={}&path={}",
            encoded_name, encoded_path
        );

        #[cfg(not(debug_assertions))]
        let url = format!(
            "tauri://localhost/editor.html?name={}&path={}",
            encoded_name, encoded_path
        );

        editor
            .set_title(&format!("{} - Code Recall", project_name))
            .map_err(|e| e.to_string())?;
        editor
            .navigate(url.parse().unwrap())
            .map_err(|e| e.to_string())?;
        editor.show().map_err(|e| e.to_string())?;
        editor.set_focus().map_err(|e| e.to_string())?;
        return Ok(());
    }

    // Build editor URL with query params
    let encoded_name = urlencoding::encode(project_name);
    let encoded_path = urlencoding::encode(project_path);

    #[cfg(debug_assertions)]
    let url = format!(
        "http://localhost:1420/editor.html?name={}&path={}",
        encoded_name, encoded_path
    );

    #[cfg(not(debug_assertions))]
    let url = format!(
        "tauri://localhost/editor.html?name={}&path={}",
        encoded_name, encoded_path
    );

    let app_handle = app.clone();

    WebviewWindowBuilder::new(
        app,
        EDITOR_LABEL,
        WebviewUrl::External(url.parse().unwrap()),
    )
    .title(format!("{} - Code Recall", project_name))
    .inner_size(1200.0, 800.0)
    .center()
    .resizable(true)
    .build()
    .map_err(|e| e.to_string())?
    .on_window_event(move |event| {
        if let tauri::WindowEvent::CloseRequested { .. } = event {
            let _ = show_launcher(&app_handle);
        }
    });

    Ok(())
}

fn show_launcher(app: &AppHandle) -> Result<(), String> {
    if let Some(launcher) = app.get_webview_window(LAUNCHER_LABEL) {
        launcher.show().map_err(|e| e.to_string())?;
        launcher.set_focus().map_err(|e| e.to_string())?;
    }
    Ok(())
}
