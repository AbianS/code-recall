import { LayoutDashboard } from "lucide-react";

export function Overview() {
  return (
    <div className="h-full w-full flex flex-col items-center justify-center gap-4 bg-surface">
      <div className="w-16 h-16 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
        <LayoutDashboard className="w-8 h-8 text-primary" />
      </div>
      <h1 className="text-2xl font-semibold text-foreground">Overview</h1>
      <p className="text-sm text-muted-foreground">
        Project dashboard and statistics
      </p>
    </div>
  );
}
