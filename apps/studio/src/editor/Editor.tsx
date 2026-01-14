import { Database } from "lucide-react";
import { useEffect, useState } from "react";

function Editor() {
  const [projectName, setProjectName] = useState<string>("");
  const [projectPath, setProjectPath] = useState<string>("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const name = params.get("name") || "Unknown Project";
    const path = params.get("path") || "";
    setProjectName(name);
    setProjectPath(path);
  }, []);

  return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-background gap-4">
      <div className="w-16 h-16 rounded-xl border bg-linear-to-br from-primary/20 to-teal-900/20 border-primary/20 text-primary flex items-center justify-center">
        <Database className="w-8 h-8" />
      </div>
      <div className="text-center">
        <h1 className="text-xl font-semibold text-foreground">{projectName}</h1>
        <p className="text-xs text-muted-foreground/60 font-mono mt-1">
          {projectPath}
        </p>
      </div>
    </div>
  );
}

export default Editor;
