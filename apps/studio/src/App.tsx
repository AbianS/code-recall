import { useCallback, useEffect, useState } from "react";
import "./App.css";
import {
  Footer,
  type Project,
  ProjectList,
  SearchInput,
} from "@/components/launcher";
import {
  addProject,
  getDatabaseStats,
  getProjects,
  openDatabaseDialog,
  type StoredProject,
} from "@/lib/tauri";

function App() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState<
    string | undefined
  >();
  const [isLoading, setIsLoading] = useState(true);

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
        />

        <Footer
          onOpenDatabase={handleOpenDatabase}
          onPreferences={handlePreferences}
          onDocumentation={handleDocumentation}
        />
      </div>
    </div>
  );
}

export default App;
