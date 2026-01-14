import { useCallback, useEffect, useState } from "react";
import "./App.css";
import {
  Footer,
  type Project,
  ProjectList,
  SearchInput,
} from "@/components/launcher";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  addProject,
  getDatabaseStats,
  getProjects,
  openDatabaseDialog,
  removeProject,
  type StoredProject,
} from "@/lib/tauri";

function App() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState<
    string | undefined
  >();
  const [isLoading, setIsLoading] = useState(true);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

  const loadProjects = useCallback(async () => {
    try {
      const storedProjects = await getProjects();

      const projectsWithStats = await Promise.all(
        storedProjects.map(async (stored: StoredProject): Promise<Project> => {
          try {
            const stats = await getDatabaseStats(stored.path);
            return {
              id: stored.id,
              name: stored.name,
              path: stored.path,
              vectorCount: stats.memory_count,
              status: "idle",
            };
          } catch {
            return {
              id: stored.id,
              name: stored.name,
              path: stored.path,
              vectorCount: 0,
              status: "idle",
            };
          }
        }),
      );

      setProjects(projectsWithStats);

      if (projectsWithStats.length > 0 && !selectedProjectId) {
        setSelectedProjectId(projectsWithStats[0].id);
      }
    } catch (error) {
      console.error("Failed to load projects:", error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedProjectId]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const filteredProjects = projects.filter(
    (project) =>
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.path.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleOpenDatabase = async () => {
    try {
      const path = await openDatabaseDialog();
      if (path) {
        const newProject = await addProject(path);
        const stats = await getDatabaseStats(path);

        const project: Project = {
          id: newProject.id,
          name: newProject.name,
          path: newProject.path,
          vectorCount: stats.memory_count,
          status: "idle",
        };

        setProjects((prev) => [...prev, project]);
        setSelectedProjectId(project.id);
      }
    } catch (error) {
      console.error("Failed to add project:", error);
    }
  };

  const handleDeleteProject = (project: Project) => {
    setProjectToDelete(project);
  };

  const handleConfirmDelete = async () => {
    if (!projectToDelete) return;

    try {
      await removeProject(projectToDelete.id);
      setProjects((prev) => prev.filter((p) => p.id !== projectToDelete.id));

      if (selectedProjectId === projectToDelete.id) {
        const remaining = projects.filter((p) => p.id !== projectToDelete.id);
        setSelectedProjectId(remaining[0]?.id);
      }
    } catch (error) {
      console.error("Failed to delete project:", error);
    } finally {
      setProjectToDelete(null);
    }
  };

  const handlePreferences = () => {
    console.log("Open preferences");
  };

  const handleDocumentation = () => {
    console.log("Open documentation");
  };

  const handleSelectProject = (project: Project) => {
    setSelectedProjectId(project.id);
  };

  if (isLoading) {
    return (
      <div className="h-screen w-full overflow-hidden flex flex-col bg-background items-center justify-center">
        <p className="text-muted-foreground text-sm">Loading...</p>
      </div>
    );
  }

  return (
    <div className="h-screen w-full overflow-hidden flex flex-col bg-background">
      <div className="flex flex-col h-full overflow-hidden">
        <div className="p-5 pb-2">
          <SearchInput value={searchQuery} onChange={setSearchQuery} />
        </div>

        <ProjectList
          projects={filteredProjects}
          selectedId={selectedProjectId}
          onSelect={handleSelectProject}
          onDelete={handleDeleteProject}
        />

        <Footer
          onOpenDatabase={handleOpenDatabase}
          onPreferences={handlePreferences}
          onDocumentation={handleDocumentation}
        />
      </div>

      <AlertDialog
        open={projectToDelete !== null}
        onOpenChange={(open) => !open && setProjectToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove project?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove <strong>{projectToDelete?.name}</strong> from the
              list. The database file will not be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default App;
