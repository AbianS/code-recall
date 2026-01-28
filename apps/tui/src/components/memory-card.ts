import type { MemoryRow } from "../types.ts";
import { categoryLabel } from "./category-badge.ts";
import { outcomeLabel } from "./outcome-badge.ts";

export function formatMemoryOption(memory: MemoryRow) {
  const badge = categoryLabel(memory.category);
  const content =
    memory.content.length > 60
      ? `${memory.content.slice(0, 57)}...`
      : memory.content;

  const parts: string[] = [];
  if (memory.tags) {
    try {
      const tags = JSON.parse(memory.tags) as string[];
      if (tags.length > 0) parts.push(`Tags: ${tags.join(", ")}`);
    } catch {}
  }
  if (memory.file_path) {
    parts.push(`File: ${memory.file_path}`);
  }
  parts.push(outcomeLabel(memory.worked));

  return {
    name: `[${badge}] ${content}`,
    description: parts.join("  |  "),
    value: memory.id,
  };
}
