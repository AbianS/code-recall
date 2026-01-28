import type { BoxRenderable, CliRenderer, KeyEvent } from "@opentui/core";
import type { DataStore } from "./data/store.ts";

export type ScreenName =
  | "dashboard"
  | "memories"
  | "memory-detail"
  | "rules"
  | "rule-detail"
  | "entities"
  | "search";

export interface Screen {
  readonly name: ScreenName;
  mount(container: BoxRenderable): void;
  destroy(): void;
  onKeypress?(key: KeyEvent): boolean;
}

export interface NavigateParams {
  memoryId?: number;
  ruleId?: number;
  category?: string;
  filePath?: string;
  searchQuery?: string;
}

export interface ScreenEntry {
  name: ScreenName;
  params?: NavigateParams;
}

export interface AppContext {
  renderer: CliRenderer;
  store: DataStore;
  navigateTo(screen: ScreenName, params?: NavigateParams): void;
  goBack(): void;
}

// Database row types (standalone, no server dependency)
export interface MemoryRow {
  id: number;
  category: "decision" | "pattern" | "warning" | "learning";
  content: string;
  rationale: string | null;
  context: string | null;
  tags: string | null;
  file_path: string | null;
  outcome: string | null;
  worked: number | null;
  pinned: number;
  archived: number;
  created_at: string;
  updated_at: string;
}

export interface RuleRow {
  id: number;
  trigger: string;
  must_do: string | null;
  must_not: string | null;
  ask_first: string | null;
  active: number;
  created_at: string;
  updated_at: string;
}

export interface CodeEntityRow {
  id: number;
  file_path: string;
  entity_type: string;
  name: string;
  qualified_name: string | null;
  signature: string | null;
  docstring: string | null;
  start_line: number;
  end_line: number;
  file_hash: string;
  created_at: string;
}

export interface Stats {
  totalMemories: number;
  byCategory: Record<string, number>;
  totalRules: number;
  recentDecisions: number;
  failedDecisions: number;
  totalWarnings: number;
}
