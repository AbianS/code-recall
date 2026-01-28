import { Database } from "bun:sqlite";
import { existsSync } from "node:fs";
import { join } from "node:path";
import type { CodeEntityRow, MemoryRow, RuleRow, Stats } from "../types.ts";

const HOMEBREW_SQLITE_PATHS = [
  "/opt/homebrew/opt/sqlite/lib/libsqlite3.dylib",
  "/usr/local/opt/sqlite/lib/libsqlite3.dylib",
];

let sqliteConfigured = false;

function configureSQLite(): void {
  if (sqliteConfigured) return;
  if (process.platform === "darwin") {
    const path = HOMEBREW_SQLITE_PATHS.find((p) => existsSync(p));
    if (path) {
      Database.setCustomSQLite(path);
    }
  }
  sqliteConfigured = true;
}

export class DataStore {
  private db: Database;
  readonly dbPath: string;

  constructor(projectPath: string) {
    configureSQLite();
    this.dbPath = join(projectPath, ".code-recall", "memory.db");
    if (!existsSync(this.dbPath)) {
      throw new Error(
        `No code-recall database found at ${this.dbPath}\nRun the code-recall MCP server first to initialize the database.`,
      );
    }
    this.db = new Database(this.dbPath, { readonly: true });
  }

  // --- Memories ---

  getRecentMemories(limit = 50): MemoryRow[] {
    return this.db
      .query(
        "SELECT * FROM memories WHERE archived = 0 ORDER BY created_at DESC LIMIT ?",
      )
      .all(limit) as MemoryRow[];
  }

  getMemoriesByCategory(category: string, limit = 50): MemoryRow[] {
    return this.db
      .query(
        "SELECT * FROM memories WHERE category = ? AND archived = 0 ORDER BY created_at DESC LIMIT ?",
      )
      .all(category, limit) as MemoryRow[];
  }

  getMemoryById(id: number): MemoryRow | null {
    return (
      (this.db
        .query("SELECT * FROM memories WHERE id = ?")
        .get(id) as MemoryRow | null) ?? null
    );
  }

  getFailedMemories(limit = 20): MemoryRow[] {
    return this.db
      .query(
        "SELECT * FROM memories WHERE worked = 0 AND archived = 0 ORDER BY updated_at DESC LIMIT ?",
      )
      .all(limit) as MemoryRow[];
  }

  getPinnedMemories(): MemoryRow[] {
    return this.db
      .query(
        "SELECT * FROM memories WHERE pinned = 1 AND archived = 0 ORDER BY created_at DESC",
      )
      .all() as MemoryRow[];
  }

  searchByFullText(query: string, limit = 20): MemoryRow[] {
    return this.db
      .query(
        `SELECT m.* FROM memories m
				 JOIN memories_fts fts ON m.id = fts.rowid
				 WHERE memories_fts MATCH ? AND m.archived = 0
				 ORDER BY rank
				 LIMIT ?`,
      )
      .all(query, limit) as MemoryRow[];
  }

  getMemoriesByFilePath(filePath: string): MemoryRow[] {
    return this.db
      .query(
        "SELECT * FROM memories WHERE file_path = ? AND archived = 0 ORDER BY created_at DESC",
      )
      .all(filePath) as MemoryRow[];
  }

  // --- Rules ---

  getActiveRules(): RuleRow[] {
    return this.db
      .query("SELECT * FROM rules WHERE active = 1 ORDER BY created_at DESC")
      .all() as RuleRow[];
  }

  getRuleById(id: number): RuleRow | null {
    return (
      (this.db
        .query("SELECT * FROM rules WHERE id = ?")
        .get(id) as RuleRow | null) ?? null
    );
  }

  // --- Code Entities ---

  getCodeEntitiesByFile(filePath: string): CodeEntityRow[] {
    return this.db
      .query(
        "SELECT * FROM code_entities WHERE file_path = ? ORDER BY start_line ASC",
      )
      .all(filePath) as CodeEntityRow[];
  }

  getDistinctEntityFiles(): string[] {
    const rows = this.db
      .query(
        "SELECT DISTINCT file_path FROM code_entities ORDER BY file_path ASC",
      )
      .all() as Array<{ file_path: string }>;
    return rows.map((r) => r.file_path);
  }

  // --- Stats ---

  getStats(): Stats {
    const total = (
      this.db
        .query("SELECT COUNT(*) as count FROM memories WHERE archived = 0")
        .get() as { count: number }
    ).count;

    const categories = this.db
      .query(
        "SELECT category, COUNT(*) as count FROM memories WHERE archived = 0 GROUP BY category",
      )
      .all() as Array<{ category: string; count: number }>;

    const byCategory: Record<string, number> = {};
    for (const row of categories) {
      byCategory[row.category] = row.count;
    }

    const totalRules = (
      this.db
        .query("SELECT COUNT(*) as count FROM rules WHERE active = 1")
        .get() as { count: number }
    ).count;

    const recentDecisions = (
      this.db
        .query(
          "SELECT COUNT(*) as count FROM memories WHERE category = 'decision' AND archived = 0 AND created_at >= datetime('now', '-7 days')",
        )
        .get() as { count: number }
    ).count;

    const failedDecisions = (
      this.db
        .query(
          "SELECT COUNT(*) as count FROM memories WHERE worked = 0 AND archived = 0",
        )
        .get() as { count: number }
    ).count;

    const totalWarnings = (
      this.db
        .query(
          "SELECT COUNT(*) as count FROM memories WHERE category = 'warning' AND archived = 0",
        )
        .get() as { count: number }
    ).count;

    return {
      totalMemories: total,
      byCategory,
      totalRules,
      recentDecisions,
      failedDecisions,
      totalWarnings,
    };
  }

  close(): void {
    this.db.close();
  }
}
