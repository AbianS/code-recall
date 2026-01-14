import { Database, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { type ProjectStatus, StatusBadge } from "./status-badge";

export interface Project {
  id: string;
  name: string;
  path: string;
  vectorCount: number;
  status: ProjectStatus;
}

interface ProjectCardProps {
  project: Project;
  isSelected?: boolean;
  onClick?: () => void;
  onDelete?: () => void;
}

function formatVectorCount(count: number): string {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(count >= 10000 ? 0 : 1)}k`;
  }
  return count.toLocaleString();
}

export function ProjectCard({
  project,
  isSelected,
  onClick,
  onDelete,
}: ProjectCardProps) {
  const isActive = project.status === "active";

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.();
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group grid grid-cols-12 items-center p-2.5 rounded-lg border transition-all duration-150 text-left w-full",
        "focus:outline-none focus:ring-1 focus:ring-primary/40",
        isSelected
          ? "bg-white/4 border-primary/40"
          : "border-transparent hover:bg-white/3 hover:border-border",
      )}
    >
      <div className="col-span-5 flex items-center gap-3 overflow-hidden">
        <div
          className={cn(
            "w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 shadow-sm transition-colors",
            isActive
              ? "bg-linear-to-br from-primary/20 to-teal-900/20 border-primary/20 text-primary"
              : "bg-secondary border-border text-muted-foreground group-hover:text-foreground",
          )}
        >
          <Database className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <span
            className={cn(
              "text-sm truncate block",
              isActive
                ? "font-semibold text-foreground"
                : "font-medium text-muted-foreground group-hover:text-foreground",
            )}
          >
            {project.name}
          </span>
          <p className="text-[10px] text-muted-foreground/50 truncate font-mono">
            {project.path}
          </p>
        </div>
      </div>

      <div className="col-span-2 text-right">
        <span
          className={cn(
            "text-xs font-mono",
            isActive ? "text-foreground" : "text-muted-foreground",
          )}
        >
          {formatVectorCount(project.vectorCount)}
        </span>
        <span className="text-[9px] text-muted-foreground/50 block">
          vectors
        </span>
      </div>

      <div className="col-span-3 flex justify-end">
        <StatusBadge status={project.status} />
      </div>

      <div className="col-span-2 flex justify-end">
        <button
          type="button"
          onClick={handleDelete}
          className="p-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </button>
  );
}
