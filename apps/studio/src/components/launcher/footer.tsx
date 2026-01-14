import { FolderOpen, HelpCircle, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

interface FooterProps {
  onOpenDatabase?: () => void;
  onPreferences?: () => void;
  onDocumentation?: () => void;
  className?: string;
}

export function Footer({
  onOpenDatabase,
  onPreferences,
  onDocumentation,
  className,
}: FooterProps) {
  return (
    <div
      className={cn(
        "p-4 bg-black/20 border-t border-border shrink-0",
        className,
      )}
    >
      <button
        type="button"
        onClick={onOpenDatabase}
        className="w-full group flex items-center justify-center gap-2 py-2.5 rounded-lg border border-dashed border-border hover:border-primary/40 hover:bg-primary/5 transition-all mb-4"
      >
        <FolderOpen className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
        <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">
          Open Existing Database
        </span>
      </button>

      <div className="flex justify-between items-center text-[10px] text-muted-foreground">
        <div className="flex gap-4">
          <button
            type="button"
            onClick={onPreferences}
            className="hover:text-foreground cursor-pointer transition-colors flex items-center gap-1.5"
          >
            <Settings className="w-3 h-3" />
            Preferences
          </button>
          <button
            type="button"
            onClick={onDocumentation}
            className="hover:text-foreground cursor-pointer transition-colors flex items-center gap-1.5"
          >
            <HelpCircle className="w-3 h-3" />
            Documentation
          </button>
        </div>

        <div className="flex gap-3 font-mono opacity-50">
          <span className="flex items-center gap-1">
            <kbd className="bg-muted/50 px-1 py-0.5 rounded text-[9px] min-w-4 text-center border border-border">
              ↑
            </kbd>
            <kbd className="bg-muted/50 px-1 py-0.5 rounded text-[9px] min-w-4 text-center border border-border">
              ↓
            </kbd>
            Navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="bg-muted/50 px-1.5 py-0.5 rounded text-[9px] border border-border">
              Enter
            </kbd>
            Select
          </span>
        </div>
      </div>
    </div>
  );
}
