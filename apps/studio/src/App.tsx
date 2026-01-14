import { useState } from "react";
import "./App.css";
import {
  Footer,
  type Project,
  ProjectList,
  SearchInput,
} from "@/components/launcher";

const mockProjects: Project[] = [
  {
    id: "1",
    name: "personal-assistant-v2",
    path: "~/dev/projects/ai-assistant",
    vectorCount: 12405,
    status: "active",
  },
  {
    id: "2",
    name: "trading-bot-alpha",
    path: "~/work/fintech/bots/alpha",
    vectorCount: 8902,
    status: "idle",
  },
  {
    id: "3",
    name: "research-agent-01",
    path: "~/uni/research/agent-data",
    vectorCount: 0,
    status: "sync",
    syncProgress: 66,
  },
  {
    id: "4",
    name: "debug-logs-january",
    path: "~/system/logs/january.db",
    vectorCount: 450,
    status: "archived",
  },
  {
    id: "5",
    name: "legacy-backup-2023",
    path: "~/backups/legacy.db",
    vectorCount: 42000,
    status: "offline",
  },
];

function App() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("1");

  const filteredProjects = mockProjects.filter(
    (project) =>
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.path.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleOpenDatabase = () => {
    console.log("Open database dialog");
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
