/**
 * Tests for the Migration System
 */

import { Database } from "bun:sqlite";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  CURRENT_SCHEMA_VERSION,
  MigrationRunner,
} from "../../src/database/migrations/index.ts";
import {
  columnExists,
  getColumns,
  tableExists,
} from "../../src/database/migrations/utils.ts";

// Configure SQLite for tests (only if not already configured)
// This must be called before any Database is created
const HOMEBREW_SQLITE_PATHS = [
  "/opt/homebrew/opt/sqlite/lib/libsqlite3.dylib",
  "/usr/local/opt/sqlite/lib/libsqlite3.dylib",
];

let sqliteConfigured = false;

function configureSQLiteOnce(): void {
  if (sqliteConfigured) return;

  const isMacOS = process.platform === "darwin";
  if (isMacOS) {
    const homebrewPath = HOMEBREW_SQLITE_PATHS.find((p: string) =>
      existsSync(p),
    );
    if (homebrewPath) {
      try {
        Database.setCustomSQLite(homebrewPath);
      } catch {
        // SQLite already loaded by another test file, ignore
      }
    }
  }
  sqliteConfigured = true;
}

configureSQLiteOnce();

describe("MigrationRunner", () => {
  let dir: string;
  let dbPath: string;
  let db: Database;
  let runner: MigrationRunner;
  const logs: string[] = [];

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "migration-test-"));
    dbPath = join(dir, "test.db");
    db = new Database(dbPath);
    logs.length = 0;
    runner = new MigrationRunner(db, dbPath, (msg) => logs.push(msg));
  });

  afterEach(() => {
    db.close();
    rmSync(dir, { recursive: true });
  });

  describe("getCurrentVersion", () => {
    test("returns 0 for new database", () => {
      expect(runner.getCurrentVersion()).toBe(0);
    });

    test("creates _migrations table if not exists", () => {
      runner.getCurrentVersion();
      expect(tableExists(db, "_migrations")).toBe(true);
    });
  });

  describe("getPendingMigrations", () => {
    test("returns all migrations for new database", () => {
      const pending = runner.getPendingMigrations();
      expect(pending.length).toBeGreaterThan(0);
      expect(pending[0]?.version).toBe(1);
    });

    test("returns empty array when all migrations applied", () => {
      runner.loadSqliteVec();
      runner.runAll();
      const pending = runner.getPendingMigrations();
      expect(pending.length).toBe(0);
    });
  });

  describe("runAll", () => {
    test("applies all pending migrations", () => {
      runner.loadSqliteVec();
      const results = runner.runAll();

      expect(results.length).toBeGreaterThan(0);
      expect(results.every((r) => r.success)).toBe(true);
      expect(runner.getCurrentVersion()).toBe(CURRENT_SCHEMA_VERSION);
    });

    test("creates all expected tables", () => {
      runner.loadSqliteVec();
      runner.runAll();

      expect(tableExists(db, "memories")).toBe(true);
      expect(tableExists(db, "memories_fts")).toBe(true);
      expect(tableExists(db, "rules")).toBe(true);
      expect(tableExists(db, "code_entities")).toBe(true);
      expect(tableExists(db, "memory_code_refs")).toBe(true);
      expect(tableExists(db, "memory_vectors")).toBe(true);
    });

    test("creates memories table with correct columns", () => {
      runner.loadSqliteVec();
      runner.runAll();

      const columns = getColumns(db, "memories");
      expect(columns).toContain("id");
      expect(columns).toContain("category");
      expect(columns).toContain("content");
      expect(columns).toContain("rationale");
      expect(columns).toContain("tags");
      expect(columns).toContain("file_path");
      expect(columns).toContain("outcome");
      expect(columns).toContain("worked");
      expect(columns).toContain("pinned");
      expect(columns).toContain("archived");
      expect(columns).toContain("created_at");
      expect(columns).toContain("updated_at");
    });

    test("returns empty array when no migrations pending", () => {
      runner.loadSqliteVec();
      runner.runAll();

      const secondRun = runner.runAll();
      expect(secondRun.length).toBe(0);
    });

    test("records migrations in _migrations table", () => {
      runner.loadSqliteVec();
      runner.runAll();

      const records = runner.getAppliedMigrations();
      expect(records.length).toBe(CURRENT_SCHEMA_VERSION);
      const firstRecord = records[0];
      expect(firstRecord).toBeDefined();
      expect(firstRecord?.version).toBe(1);
      expect(firstRecord?.name).toBe("initial");
      expect(firstRecord?.checksum).toBeTruthy();
      expect(firstRecord?.execution_time_ms).toBeGreaterThanOrEqual(0);
    });

    test("logs migration progress", () => {
      runner.loadSqliteVec();
      runner.runAll();

      expect(logs.some((l) => l.includes("Running migration"))).toBe(true);
      expect(logs.some((l) => l.includes("Completed"))).toBe(true);
    });
  });

  describe("legacy schema migration", () => {
    test("migrates from old schema_version to _migrations", () => {
      // Simulate old schema_version table
      db.exec(`
        CREATE TABLE schema_version (
          version INTEGER PRIMARY KEY,
          applied_at TEXT DEFAULT (datetime('now'))
        )
      `);
      db.run("INSERT INTO schema_version (version) VALUES (?)", [2]);

      // Create the tables that would exist in the old system
      db.exec(`
        CREATE TABLE memories (
          id INTEGER PRIMARY KEY,
          category TEXT NOT NULL,
          content TEXT NOT NULL,
          rationale TEXT,
          context TEXT,
          tags TEXT,
          file_path TEXT,
          outcome TEXT,
          worked INTEGER,
          pinned INTEGER DEFAULT 0,
          archived INTEGER DEFAULT 0,
          created_at TEXT,
          updated_at TEXT
        )
      `);

      // Create a new runner and check migration
      const newRunner = new MigrationRunner(db, dbPath, (msg) =>
        logs.push(msg),
      );
      newRunner.loadSqliteVec();

      const version = newRunner.getCurrentVersion();

      // Should have migrated to new system
      expect(tableExists(db, "_migrations")).toBe(true);
      expect(tableExists(db, "schema_version")).toBe(false);
      expect(version).toBe(1); // v1 should be marked as applied
    });
  });
});

describe("Migration Utils", () => {
  let dir: string;
  let dbPath: string;
  let db: Database;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "utils-test-"));
    dbPath = join(dir, "test.db");
    db = new Database(dbPath);
  });

  afterEach(() => {
    db.close();
    rmSync(dir, { recursive: true });
  });

  describe("tableExists", () => {
    test("returns false for non-existent table", () => {
      expect(tableExists(db, "nonexistent")).toBe(false);
    });

    test("returns true for existing table", () => {
      db.exec("CREATE TABLE test_table (id INTEGER)");
      expect(tableExists(db, "test_table")).toBe(true);
    });
  });

  describe("columnExists", () => {
    beforeEach(() => {
      db.exec("CREATE TABLE test_table (id INTEGER, name TEXT)");
    });

    test("returns false for non-existent column", () => {
      expect(columnExists(db, "test_table", "nonexistent")).toBe(false);
    });

    test("returns true for existing column", () => {
      expect(columnExists(db, "test_table", "id")).toBe(true);
      expect(columnExists(db, "test_table", "name")).toBe(true);
    });
  });

  describe("getColumns", () => {
    test("returns all column names", () => {
      db.exec("CREATE TABLE test_table (id INTEGER, name TEXT, value REAL)");
      const columns = getColumns(db, "test_table");
      expect(columns).toEqual(["id", "name", "value"]);
    });
  });
});

describe("DatabaseManager with Migrations", () => {
  test("initializes database with migrations", () => {
    const dir = mkdtempSync(join(tmpdir(), "dbmanager-test-"));
    const testDbPath = join(dir, "test.db");

    // Use raw database with MigrationRunner to test the flow
    // without conflicting with SQLite configuration
    const testDb = new Database(testDbPath);
    const testRunner = new MigrationRunner(testDb, testDbPath);
    testRunner.loadSqliteVec();
    testRunner.runAll();

    // Verify tables exist
    expect(tableExists(testDb, "memories")).toBe(true);
    expect(tableExists(testDb, "_migrations")).toBe(true);

    testDb.close();
    rmSync(dir, { recursive: true });
  });
});
