import { type Project, ProjectCard } from "./project-card";

interface ProjectListProps {
  projects: Project[];
  selectedId?: string;
  onSelect?: (project: Project) => void;
}

export function ProjectList({
  projects,
  selectedId,
  onSelect,
}: ProjectListProps) {
  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="grid grid-cols-12 px-6 py-2 text-[10px] font-mono text-muted-foreground/50 uppercase tracking-wider select-none">
        <div className="col-span-6 pl-1">Project Name</div>
        <div className="col-span-3 text-right">Items</div>
        <div className="col-span-3 text-right pr-1">Status</div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-2">
        <div className="flex flex-col gap-1">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              isSelected={project.id === selectedId}
              onClick={() => onSelect?.(project)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
