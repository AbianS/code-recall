import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type ProjectStatus = "active" | "idle" | "sync" | "archived" | "offline";

interface StatusBadgeProps {
  status: ProjectStatus;
  className?: string;
}

const statusConfig: Record<
  ProjectStatus,
  {
    label: string;
    className: string;
    showPulse?: boolean;
    showSpinner?: boolean;
  }
> = {
  active: {
    label: "Active",
    className: "bg-green-500/10 border-green-500/20 text-green-400",
    showPulse: true,
  },
  idle: {
    label: "Idle",
    className: "bg-muted/50 border-border text-muted-foreground",
  },
  sync: {
    label: "Sync",
    className: "bg-blue-500/10 border-blue-500/20 text-blue-400",
    showSpinner: true,
  },
  archived: {
    label: "Archived",
    className: "bg-muted/50 border-border text-muted-foreground",
  },
  offline: {
    label: "Offline",
    className: "bg-muted/50 border-border text-muted-foreground",
  },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-1 rounded border text-[10px] font-medium",
        config.className,
        className,
      )}
    >
      {config.showPulse && (
        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
      )}
      {config.showSpinner && <Loader2 className="w-2.5 h-2.5 animate-spin" />}
      {config.label}
    </span>
  );
}
