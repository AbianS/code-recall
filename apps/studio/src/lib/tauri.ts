import { invoke } from "@tauri-apps/api/core";

export interface StoredProject {
  id: string;
  name: string;
  path: string;
}

export interface DatabaseStats {
  memory_count: number;
}

export async function openDatabaseDialog(): Promise<string | null> {
  return invoke<string | null>("open_database_dialog");
}

export async function getDatabaseStats(path: string): Promise<DatabaseStats> {
  return invoke<DatabaseStats>("get_database_stats", { path });
}

export async function getProjects(): Promise<StoredProject[]> {
  return invoke<StoredProject[]>("get_projects");
}

export async function addProject(path: string): Promise<StoredProject> {
  return invoke<StoredProject>("add_project", { path });
}

export async function removeProject(id: string): Promise<void> {
  return invoke<void>("remove_project", { id });
}

export async function openEditorWindow(
  projectName: string,
  projectPath: string,
): Promise<void> {
  return invoke<void>("open_editor_window", {
    projectName,
    projectPath,
  });
}
