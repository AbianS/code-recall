/**
 * Migration 0001: Initial Schema
 *
 * Creates the complete initial database schema including:
 * - memories table with FTS5 full-text search
 * - rules table for guardrails
 * - code_entities table for tree-sitter analysis
 * - memory_code_refs junction table
 * - memory_vectors virtual table (sqlite-vec)
 */

import type { Migration } from "./types.ts";

export const migration: Migration = {
  version: 1,
  name: "initial",
  description:
    "Create initial database schema with memories, rules, code entities, and vectors",
  transactional: false, // FTS5 and sqlite-vec tables cannot be created in transactions

  up(ctx) {
    const { db, log, sqliteVecLoaded } = ctx;

    // ============ Core Tables ============

    log("Creating memories table");
    db.exec(`
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
      )
    `);

    log("Creating rules table");
    db.exec(`
      CREATE TABLE IF NOT EXISTS rules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        trigger TEXT NOT NULL,
        must_do TEXT,
        must_not TEXT,
        ask_first TEXT,
        active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `);

    log("Creating code_entities table");
    db.exec(`
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
      )
    `);

    log("Creating memory_code_refs junction table");
    db.exec(`
      CREATE TABLE IF NOT EXISTS memory_code_refs (
        memory_id INTEGER NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
        entity_id INTEGER NOT NULL REFERENCES code_entities(id) ON DELETE CASCADE,
        PRIMARY KEY (memory_id, entity_id)
      )
    `);

    // ============ Full-Text Search ============

    log("Creating FTS5 virtual table for full-text search");
    db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS memories_fts USING fts5(
        content,
        rationale,
        tags,
        content='memories',
        content_rowid='id'
      )
    `);

    log("Creating FTS sync triggers");
    db.exec(`
      CREATE TRIGGER IF NOT EXISTS memories_ai AFTER INSERT ON memories BEGIN
        INSERT INTO memories_fts(rowid, content, rationale, tags)
        VALUES (new.id, new.content, new.rationale, new.tags);
      END
    `);

    db.exec(`
      CREATE TRIGGER IF NOT EXISTS memories_ad AFTER DELETE ON memories BEGIN
        INSERT INTO memories_fts(memories_fts, rowid, content, rationale, tags)
        VALUES('delete', old.id, old.content, old.rationale, old.tags);
      END
    `);

    db.exec(`
      CREATE TRIGGER IF NOT EXISTS memories_au AFTER UPDATE ON memories BEGIN
        INSERT INTO memories_fts(memories_fts, rowid, content, rationale, tags)
        VALUES('delete', old.id, old.content, old.rationale, old.tags);
        INSERT INTO memories_fts(rowid, content, rationale, tags)
        VALUES (new.id, new.content, new.rationale, new.tags);
      END
    `);

    // ============ Vector Search ============

    if (!sqliteVecLoaded) {
      throw new Error(
        "sqlite-vec extension must be loaded before running this migration",
      );
    }

    log("Creating memory_vectors virtual table (sqlite-vec)");
    db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS memory_vectors USING vec0(
        memory_id INTEGER PRIMARY KEY,
        embedding FLOAT[384]
      )
    `);

    // ============ Indexes ============

    log("Creating indexes");
    db.exec(
      "CREATE INDEX IF NOT EXISTS idx_memories_category ON memories(category)",
    );
    db.exec(
      "CREATE INDEX IF NOT EXISTS idx_memories_file_path ON memories(file_path)",
    );
    db.exec(
      "CREATE INDEX IF NOT EXISTS idx_memories_created_at ON memories(created_at)",
    );
    db.exec(
      "CREATE INDEX IF NOT EXISTS idx_memories_archived ON memories(archived)",
    );
    db.exec("CREATE INDEX IF NOT EXISTS idx_rules_active ON rules(active)");
    db.exec(
      "CREATE INDEX IF NOT EXISTS idx_code_entities_file ON code_entities(file_path)",
    );
    db.exec(
      "CREATE INDEX IF NOT EXISTS idx_code_entities_name ON code_entities(name)",
    );
    db.exec(
      "CREATE INDEX IF NOT EXISTS idx_code_entities_type ON code_entities(entity_type)",
    );
    db.exec(
      "CREATE INDEX IF NOT EXISTS idx_code_entities_hash ON code_entities(file_hash)",
    );

    log("Initial schema created successfully");
  },

  // Initial migration cannot be rolled back (would destroy all data)
  down: undefined,
};
