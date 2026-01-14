import {
  ArrowLeft,
  Brain,
  FolderOpen,
  GitBranch,
  LayoutDashboard,
  Network,
  ScrollText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { TabId } from "../Editor";

interface SidebarProps {
  projectName: string;
  projectPath: string;
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

const navItems: { id: TabId; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "memory-graph", label: "Memory Graph", icon: Network },
  { id: "rules-engine", label: "Rules Engine", icon: GitBranch },
  { id: "cognitive-logs", label: "Cognitive Logs", icon: ScrollText },
];

export function Sidebar({
  projectName,
  projectPath,
  activeTab,
  onTabChange,
}: SidebarProps) {
  return (
    <aside className="absolute top-6 left-6 bottom-6 w-64 flex flex-col bg-sidebar/90 backdrop-blur-xl border border-sidebar-border rounded-2xl shadow-2xl z-30">
      {/* Header */}
      <div className="p-5 pb-4 border-b border-sidebar-border">
        {/* Logo and app name */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
            <Brain className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-semibold text-foreground tracking-tight">
              Code Recall
            </h1>
            <p className="text-[10px] text-muted-foreground">Studio</p>
          </div>
        </div>

        {/* Project info */}
        <div className="flex flex-col gap-1 mb-4">
          <div className="flex items-center justify-between">
            <span className="text-base font-bold text-foreground tracking-tight leading-none truncate">
              {projectName}
            </span>
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary shadow-[0_0_8px_var(--primary)]" />
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground/80">
            <FolderOpen className="w-3.5 h-3.5" />
            <span className="text-[10px] font-mono truncate">
              {projectPath}
            </span>
          </div>
        </div>

        {/* Switch project button */}
        <button
          type="button"
          className="w-full group flex items-center gap-2 px-3 py-1.5 rounded-lg border border-sidebar-border bg-surface/50 hover:bg-sidebar-accent transition-all"
        >
          <ArrowLeft className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-transform duration-300 group-hover:-translate-x-1" />
          <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground">
            Switch Project
          </span>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 flex flex-col gap-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onTabChange(item.id)}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                isActive
                  ? "bg-primary/10 text-primary border border-primary/20 shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent",
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-sm font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
