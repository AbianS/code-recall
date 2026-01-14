import { useEffect, useState } from "react";
import { Sidebar } from "./components/sidebar";
import { CognitiveLogs } from "./pages/cognitive-logs";
import { MemoryGraph } from "./pages/memory-graph";
import { Overview } from "./pages/overview";
import { RulesEngine } from "./pages/rules-engine";

export type TabId =
  | "overview"
  | "memory-graph"
  | "rules-engine"
  | "cognitive-logs";

function Editor() {
  const [projectName, setProjectName] = useState<string>("");
  const [projectPath, setProjectPath] = useState<string>("");
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const name = params.get("name") || "Unknown Project";
    const path = params.get("path") || "";
    setProjectName(name);
    setProjectPath(path);
  }, []);

  const renderContent = () => {
    switch (activeTab) {
      case "overview":
        return <Overview />;
      case "memory-graph":
        return <MemoryGraph />;
      case "rules-engine":
        return <RulesEngine />;
      case "cognitive-logs":
        return <CognitiveLogs />;
      default:
        return <Overview />;
    }
  };

  return (
    <div className="h-screen w-full relative bg-surface overflow-hidden">
      {/* Main content area */}
      <main className="absolute inset-0">{renderContent()}</main>

      {/* Floating sidebar */}
      <Sidebar
        projectName={projectName}
        projectPath={projectPath}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
    </div>
  );
}

export default Editor;
