import { CornerDownLeft, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Search projects, memories, or paths...",
  className,
  autoFocus = true,
}: SearchInputProps) {
  return (
    <div className={cn("relative group", className)}>
      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
        <Search className="w-5 h-5 text-muted-foreground/60 group-focus-within:text-primary transition-colors" />
      </div>
      <Input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="w-full bg-input border-border text-foreground text-base rounded-xl py-6 pl-12 pr-12 focus:ring-2 focus:ring-ring focus:border-primary/50 placeholder:text-muted-foreground/40 transition-all shadow-inner"
      />
      <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
        <div className="w-6 h-6 flex items-center justify-center rounded border border-border bg-muted/50">
          <CornerDownLeft className="w-3.5 h-3.5 text-muted-foreground" />
        </div>
      </div>
    </div>
  );
}
