/**
 * Database Schema for code-recall
 *
 * Defines the SQL schema for memories, rules, and vector embeddings.
 */

export const SCHEMA_VERSION = 2;

export const SCHEMA_SQL = `
-- Schema version tracking
CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER PRIMARY KEY,
  applied_at TEXT DEFAULT (datetime('now'))
);

-- Main memories table
CREATE TABLE IF NOT EXISTS memories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL CHECK(category IN ('decision', 'pattern', 'warning', 'learning')),
  content TEXT NOT NULL,
  rationale TEXT,
  context TEXT,
  tags TEXT,
  file_path TEXT,
  outcome TEXT,
  worked INTEGER,
  pinned INTEGER DEFAULT 0,
  archived INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Full-text search index
CREATE VIRTUAL TABLE IF NOT EXISTS memories_fts USING fts5(
  content,
  rationale,
  tags,
  content='memories',
  content_rowid='id'
);

-- Triggers to keep FTS in sync
CREATE TRIGGER IF NOT EXISTS memories_ai AFTER INSERT ON memories BEGIN
  INSERT INTO memories_fts(rowid, content, rationale, tags)
  VALUES (new.id, new.content, new.rationale, new.tags);
END;

CREATE TRIGGER IF NOT EXISTS memories_ad AFTER DELETE ON memories BEGIN
  INSERT INTO memories_fts(memories_fts, rowid, content, rationale, tags)
  VALUES('delete', old.id, old.content, old.rationale, old.tags);
END;

CREATE TRIGGER IF NOT EXISTS memories_au AFTER UPDATE ON memories BEGIN
  INSERT INTO memories_fts(memories_fts, rowid, content, rationale, tags)
  VALUES('delete', old.id, old.content, old.rationale, old.tags);
  INSERT INTO memories_fts(rowid, content, rationale, tags)
  VALUES (new.id, new.content, new.rationale, new.tags);
END;

-- Rules table
CREATE TABLE IF NOT EXISTS rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trigger TEXT NOT NULL,
  must_do TEXT,
  must_not TEXT,
  ask_first TEXT,
  active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Code entities table (tree-sitter analysis)
CREATE TABLE IF NOT EXISTS code_entities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  file_path TEXT NOT NULL,
  entity_type TEXT NOT NULL CHECK(entity_type IN ('class', 'function', 'method', 'interface', 'type', 'variable', 'import')),
  name TEXT NOT NULL,
  qualified_name TEXT,
  signature TEXT,
  docstring TEXT,
  start_line INTEGER NOT NULL,
  end_line INTEGER NOT NULL,
  file_hash TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Memory to code entity references
CREATE TABLE IF NOT EXISTS memory_code_refs (
  memory_id INTEGER NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
  entity_id INTEGER NOT NULL REFERENCES code_entities(id) ON DELETE CASCADE,
  PRIMARY KEY (memory_id, entity_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_memories_category ON memories(category);
CREATE INDEX IF NOT EXISTS idx_memories_file_path ON memories(file_path);
CREATE INDEX IF NOT EXISTS idx_memories_created_at ON memories(created_at);
CREATE INDEX IF NOT EXISTS idx_memories_archived ON memories(archived);
CREATE INDEX IF NOT EXISTS idx_rules_active ON rules(active);
CREATE INDEX IF NOT EXISTS idx_code_entities_file ON code_entities(file_path);
CREATE INDEX IF NOT EXISTS idx_code_entities_name ON code_entities(name);
CREATE INDEX IF NOT EXISTS idx_code_entities_type ON code_entities(entity_type);
CREATE INDEX IF NOT EXISTS idx_code_entities_hash ON code_entities(file_hash);
`;

// Vector table is created separately since it requires the extension
export const VECTOR_TABLE_SQL = `
CREATE VIRTUAL TABLE IF NOT EXISTS memory_vectors USING vec0(
  memory_id INTEGER PRIMARY KEY,
  embedding FLOAT[384]
);
`;

export type MemoryCategory = "decision" | "pattern" | "warning" | "learning";

export interface MemoryRow {
  id: number;
  category: MemoryCategory;
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

export type EntityType =
  | "class"
  | "function"
  | "method"
  | "interface"
  | "type"
  | "variable"
  | "import";

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
