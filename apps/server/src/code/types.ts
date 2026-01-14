/**
 * Types for code-recall Code Analysis module
 */

export type EntityType =
  | "class"
  | "function"
  | "method"
  | "interface"
  | "type"
  | "variable"
  | "import";

export interface CodeEntity {
  type: EntityType;
  name: string;
  qualifiedName: string;
  signature?: string;
  docstring?: string;
  startLine: number;
  endLine: number;
}

export interface AnalysisResult {
  filePath: string;
  fileHash: string;
  language: "typescript" | "javascript";
  entities: CodeEntity[];
  analyzedAt: string;
}

export interface CodeEntityRow {
  id: number;
  file_path: string;
  entity_type: EntityType;
  name: string;
  qualified_name: string | null;
  signature: string | null;
  docstring: string | null;
  start_line: number;
  end_line: number;
  file_hash: string;
  created_at: string;
}

export interface MemoryCodeRefRow {
  memory_id: number;
  entity_id: number;
}

export interface RelatedMemory {
  id: number;
  content: string;
  category: string;
}

export interface AnalyzeStructureResult {
  filePath: string;
  fileHash: string;
  entities: CodeEntity[];
  relatedMemories: RelatedMemory[];
}
