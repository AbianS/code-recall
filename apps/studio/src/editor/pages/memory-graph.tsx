import { Network } from "lucide-react";

export function MemoryGraph() {
  return (
    <div className="h-full w-full flex flex-col items-center justify-center gap-4 bg-surface">
      <div className="w-16 h-16 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
        <Network className="w-8 h-8 text-primary" />
      </div>
      <h1 className="text-2xl font-semibold text-foreground">Memory Graph</h1>
      <p className="text-sm text-muted-foreground">
        Visual representation of memories and connections
      </p>
    </div>
  );
}
