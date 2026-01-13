/**
 * DatabaseManager for code-recall
 *
 * Handles SQLite database operations with sqlite-vec for vector search.
 * Uses bun:sqlite with automatic detection of Homebrew SQLite on macOS.
 */

import { Database } from "bun:sqlite";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { MigrationRunner } from "./migrations/index.ts";
import type {
  CodeEntityRow,
  EntityType,
  MemoryCategory,
  MemoryCodeRefRow,
  MemoryRow,
  RuleRow,
} from "./schema.ts";

// Homebrew SQLite paths (macOS only)
const HOMEBREW_SQLITE_PATHS = [
  "/opt/homebrew/opt/sqlite/lib/libsqlite3.dylib", // Apple Silicon
  "/usr/local/opt/sqlite/lib/libsqlite3.dylib", // Intel Mac
];

let sqliteConfigured = false;

/**
 * Configure SQLite for extension support on macOS.
 * Must be called before creating any Database instances.
 */
function configureSQLite(): void {
  if (sqliteConfigured) return;

  const isMacOS = process.platform === "darwin";

  if (isMacOS) {
    // Find Homebrew SQLite
    const homebrewPath = HOMEBREW_SQLITE_PATHS.find((p) => existsSync(p));

    if (homebrewPath) {
      Database.setCustomSQLite(homebrewPath);
      console.error(`[code-recall] Using Homebrew SQLite: ${homebrewPath}`);
    } else {
      throw new Error(
        `[code-recall] SQLite with extension support not found on macOS.\n\n` +
          `The default macOS SQLite doesn't support extensions.\n` +
          `Please install SQLite via Homebrew:\n\n` +
          `    brew install sqlite\n\n` +
          `Then restart the server.`,
      );
    }
  }

  sqliteConfigured = true;
}

export interface DatabaseConfig {
  projectPath: string;
  dbName?: string;
}

export class DatabaseManager {
  private db: Database;
  private projectPath: string;
  private dbPath: string;

  constructor(config: DatabaseConfig) {
    // Configure SQLite before creating database
    configureSQLite();

    this.projectPath = config.projectPath;
    const storageDir = join(this.projectPath, ".code-recall");
    this.dbPath = join(storageDir, config.dbName ?? "memory.db");

    // Ensure storage directory exists
    if (!existsSync(storageDir)) {
      mkdirSync(storageDir, { recursive: true });
    }

    // Initialize database
    this.db = new Database(this.dbPath);

    // Run migrations (handles sqlite-vec loading internally)
    this.runMigrations();
  }

  private runMigrations(): void {
    const runner = new MigrationRunner(this.db, this.dbPath);

    // Load sqlite-vec extension (required for migrations that use it)
    runner.loadSqliteVec();

    // Run all pending migrations
    const results = runner.runAll();

    // Check for failures
    const failed = results.find((r) => !r.success);
    if (failed) {
      throw new Error(
        `[code-recall] Migration ${failed.version} (${failed.name}) failed: ${failed.error?.message}`,
      );
    }
  }

  // ============ Memory Operations ============

  insertMemory(params: {
    category: MemoryCategory;
    content: string;
    rationale?: string;
    context?: string;
    tags?: string[];
    filePath?: string;
  }): number {
    const result = this.db.run(
      `INSERT INTO memories (category, content, rationale, context, tags, file_path)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        params.category,
        params.content,
        params.rationale ?? null,
        params.context ?? null,
        params.tags ? JSON.stringify(params.tags) : null,
        params.filePath ?? null,
      ],
    );
    return Number(result.lastInsertRowid);
  }

  insertMemoryVector(memoryId: number, embedding: Float32Array): void {
    this.db.run(
      "INSERT INTO memory_vectors (memory_id, embedding) VALUES (?, vec_f32(?))",
      [memoryId, embedding],
    );
  }

  getMemoryById(id: number): MemoryRow | null {
    return this.db
      .query("SELECT * FROM memories WHERE id = ?")
      .get(id) as MemoryRow | null;
  }

  getRecentMemories(limit: number = 10): MemoryRow[] {
    return this.db
      .query(
        `SELECT * FROM memories
         WHERE archived = 0
         ORDER BY created_at DESC
         LIMIT ?`,
      )
      .all(limit) as MemoryRow[];
  }

  getMemoriesByCategory(
    category: MemoryCategory,
    limit: number = 50,
  ): MemoryRow[] {
    return this.db
      .query(
        `SELECT * FROM memories
         WHERE category = ? AND archived = 0
         ORDER BY created_at DESC
         LIMIT ?`,
      )
      .all(category, limit) as MemoryRow[];
  }

  getMemoriesByFilePath(filePath: string): MemoryRow[] {
    return this.db
      .query(
        `SELECT * FROM memories
         WHERE file_path = ? AND archived = 0
         ORDER BY created_at DESC`,
      )
      .all(filePath) as MemoryRow[];
  }

  updateMemoryOutcome(id: number, outcome: string, worked: boolean): void {
    this.db.run(
      `UPDATE memories
       SET outcome = ?, worked = ?, updated_at = datetime('now')
       WHERE id = ?`,
      [outcome, worked ? 1 : 0, id],
    );
  }

  // ============ Search Operations ============

  searchByFullText(query: string, limit: number = 10): MemoryRow[] {
    return this.db
      .query(
        `SELECT m.*
         FROM memories m
         JOIN memories_fts fts ON m.id = fts.rowid
         WHERE memories_fts MATCH ?
           AND m.archived = 0
         ORDER BY rank
         LIMIT ?`,
      )
      .all(query, limit) as MemoryRow[];
  }

  searchByVector(
    embedding: Float32Array,
    limit: number = 10,
  ): Array<{ memory_id: number; distance: number }> {
    return this.db
      .query(
        `SELECT memory_id, distance
         FROM memory_vectors
         WHERE embedding MATCH ?
         ORDER BY distance
         LIMIT ?`,
      )
      .all(embedding, limit) as Array<{ memory_id: number; distance: number }>;
  }

  // ============ Rule Operations ============

  insertRule(params: {
    trigger: string;
    mustDo?: string[];
    mustNot?: string[];
    askFirst?: string[];
  }): number {
    const result = this.db.run(
      `INSERT INTO rules (trigger, must_do, must_not, ask_first)
       VALUES (?, ?, ?, ?)`,
      [
        params.trigger,
        params.mustDo ? JSON.stringify(params.mustDo) : null,
        params.mustNot ? JSON.stringify(params.mustNot) : null,
        params.askFirst ? JSON.stringify(params.askFirst) : null,
      ],
    );
    return Number(result.lastInsertRowid);
  }

  getActiveRules(): RuleRow[] {
    return this.db
      .query("SELECT * FROM rules WHERE active = 1")
      .all() as RuleRow[];
  }

  getRuleById(id: number): RuleRow | null {
    return this.db
      .query("SELECT * FROM rules WHERE id = ?")
      .get(id) as RuleRow | null;
  }

  // ============ Code Entity Operations ============

  insertCodeEntity(params: {
    filePath: string;
    entityType: EntityType;
    name: string;
    qualifiedName?: string;
    signature?: string;
    docstring?: string;
    startLine: number;
    endLine: number;
    fileHash: string;
  }): number {
    const result = this.db.run(
      `INSERT INTO code_entities (file_path, entity_type, name, qualified_name, signature, docstring, start_line, end_line, file_hash)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        params.filePath,
        params.entityType,
        params.name,
        params.qualifiedName ?? null,
        params.signature ?? null,
        params.docstring ?? null,
        params.startLine,
        params.endLine,
        params.fileHash,
      ],
    );
    return Number(result.lastInsertRowid);
  }

  getCodeEntitiesByFile(filePath: string): CodeEntityRow[] {
    return this.db
      .query(
        "SELECT * FROM code_entities WHERE file_path = ? ORDER BY start_line",
      )
      .all(filePath) as CodeEntityRow[];
  }

  getCodeEntitiesByHash(fileHash: string): CodeEntityRow[] {
    return this.db
      .query(
        "SELECT * FROM code_entities WHERE file_hash = ? ORDER BY start_line",
      )
      .all(fileHash) as CodeEntityRow[];
  }

  getCodeEntityById(id: number): CodeEntityRow | null {
    return this.db
      .query("SELECT * FROM code_entities WHERE id = ?")
      .get(id) as CodeEntityRow | null;
  }

  deleteCodeEntitiesByFile(filePath: string): void {
    this.db.run("DELETE FROM code_entities WHERE file_path = ?", [filePath]);
  }

  deleteCodeEntitiesByHash(fileHash: string): void {
    this.db.run("DELETE FROM code_entities WHERE file_hash = ?", [fileHash]);
  }

  // ============ Memory-Code Reference Operations ============

  linkMemoryToEntity(memoryId: number, entityId: number): void {
    this.db.run(
      "INSERT OR IGNORE INTO memory_code_refs (memory_id, entity_id) VALUES (?, ?)",
      [memoryId, entityId],
    );
  }

  unlinkMemoryFromEntity(memoryId: number, entityId: number): void {
    this.db.run(
      "DELETE FROM memory_code_refs WHERE memory_id = ? AND entity_id = ?",
      [memoryId, entityId],
    );
  }

  getMemoriesForEntity(entityId: number): MemoryRow[] {
    return this.db
      .query(
        `SELECT m.* FROM memories m
         JOIN memory_code_refs r ON m.id = r.memory_id
         WHERE r.entity_id = ? AND m.archived = 0
         ORDER BY m.created_at DESC`,
      )
      .all(entityId) as MemoryRow[];
  }

  getEntitiesForMemory(memoryId: number): CodeEntityRow[] {
    return this.db
      .query(
        `SELECT e.* FROM code_entities e
         JOIN memory_code_refs r ON e.id = r.entity_id
         WHERE r.memory_id = ?`,
      )
      .all(memoryId) as CodeEntityRow[];
  }

  getMemoriesForFile(filePath: string): MemoryRow[] {
    return this.db
      .query(
        `SELECT DISTINCT m.* FROM memories m
         JOIN memory_code_refs r ON m.id = r.memory_id
         JOIN code_entities e ON r.entity_id = e.id
         WHERE e.file_path = ? AND m.archived = 0
         ORDER BY m.created_at DESC`,
      )
      .all(filePath) as MemoryRow[];
  }

  // ============ Stats ============

  getStats(): {
    totalMemories: number;
    byCategory: Record<string, number>;
    totalRules: number;
    recentDecisions: number;
    failedDecisions: number;
  } {
    const total = this.db
      .query("SELECT COUNT(*) as count FROM memories WHERE archived = 0")
      .get() as { count: number };

    const byCategory = this.db
      .query(
        "SELECT category, COUNT(*) as count FROM memories WHERE archived = 0 GROUP BY category",
      )
      .all() as Array<{ category: string; count: number }>;

    const rules = this.db
      .query("SELECT COUNT(*) as count FROM rules WHERE active = 1")
      .get() as { count: number };

    const recent = this.db
      .query(
        `SELECT COUNT(*) as count FROM memories
         WHERE category = 'decision'
           AND archived = 0
           AND created_at > datetime('now', '-7 days')`,
      )
      .get() as { count: number };

    const failed = this.db
      .query(
        "SELECT COUNT(*) as count FROM memories WHERE worked = 0 AND archived = 0",
      )
      .get() as { count: number };

    return {
      totalMemories: total?.count ?? 0,
      byCategory: Object.fromEntries(
        byCategory.map((r) => [r.category, r.count]),
      ),
      totalRules: rules?.count ?? 0,
      recentDecisions: recent?.count ?? 0,
      failedDecisions: failed?.count ?? 0,
    };
  }

  // ============ Utility ============

  close(): void {
    this.db.close();
  }

  get database(): Database {
    return this.db;
  }

  get path(): string {
    return this.dbPath;
  }
}

export type {
  CodeEntityRow,
  EntityType,
  MemoryCategory,
  MemoryCodeRefRow,
  MemoryRow,
  RuleRow,
};
