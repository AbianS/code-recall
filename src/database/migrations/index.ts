/**
 * MigrationRunner
 *
 * Handles database schema migrations for code-recall.
 * Migrations run automatically on startup, transparent to the user.
 */

import type { Database } from "bun:sqlite";
import * as sqliteVec from "sqlite-vec";
// Import all migrations
import { migration as m0001 } from "./0001_initial.ts";
import type {
  Migration,
  MigrationContext,
  MigrationRecord,
  MigrationResult,
} from "./types.ts";
import { tableExists } from "./utils.ts";

// Registry of all migrations in order
const MIGRATIONS: Migration[] = [
  m0001,
  // Add new migrations here
].sort((a, b) => a.version - b.version);

/**
 * Get the current schema version (latest migration version)
 */
export const CURRENT_SCHEMA_VERSION =
  MIGRATIONS.length > 0 ? (MIGRATIONS[MIGRATIONS.length - 1]?.version ?? 0) : 0;

export class MigrationRunner {
  private db: Database;
  private dbPath: string;
  private sqliteVecLoaded: boolean = false;
  private log: (msg: string) => void;

  constructor(db: Database, dbPath: string, logger?: (msg: string) => void) {
    this.db = db;
    this.dbPath = dbPath;
    this.log = logger ?? ((msg) => console.error(`[migration] ${msg}`));
  }

  /**
   * Load sqlite-vec extension if not already loaded
   */
  loadSqliteVec(): void {
    if (!this.sqliteVecLoaded) {
      sqliteVec.load(this.db);
      this.sqliteVecLoaded = true;
    }
  }

  /**
   * Ensure migration tracking table exists
   */
  private ensureMigrationTable(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS _migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TEXT DEFAULT (datetime('now')),
        checksum TEXT NOT NULL,
        execution_time_ms INTEGER NOT NULL
      )
    `);
  }

  /**
   * Handle migration from old schema_version system to new _migrations system
   */
  private handleLegacySchema(): void {
    // Check if old schema_version table exists
    const hasOldSchema = tableExists(this.db, "schema_version");
    const hasNewMigrations = tableExists(this.db, "_migrations");
    const hasMemoriesTable = tableExists(this.db, "memories");

    if (hasOldSchema && !hasNewMigrations && hasMemoriesTable) {
      this.log(
        "Detected legacy schema_version system, migrating to _migrations...",
      );

      // Create new migrations table
      this.ensureMigrationTable();

      // Mark v1 as already applied (since the database exists)
      const firstMigration = MIGRATIONS[0];
      if (!firstMigration) {
        throw new Error("No migrations defined");
      }
      const checksum = this.calculateChecksum(firstMigration);
      this.db.run(
        "INSERT INTO _migrations (version, name, checksum, execution_time_ms) VALUES (?, ?, ?, ?)",
        [1, "initial", checksum, 0],
      );

      // Drop old schema_version table
      this.db.exec("DROP TABLE schema_version");

      this.log("Legacy migration complete. Now using _migrations table.");
    }
  }

  /**
   * Get the current schema version
   */
  getCurrentVersion(): number {
    this.handleLegacySchema();
    this.ensureMigrationTable();

    const result = this.db
      .query("SELECT MAX(version) as version FROM _migrations")
      .get() as { version: number | null };

    return result?.version ?? 0;
  }

  /**
   * Get all applied migrations
   */
  getAppliedMigrations(): MigrationRecord[] {
    this.ensureMigrationTable();
    return this.db
      .query("SELECT * FROM _migrations ORDER BY version")
      .all() as MigrationRecord[];
  }

  /**
   * Get pending migrations
   */
  getPendingMigrations(): Migration[] {
    const currentVersion = this.getCurrentVersion();
    return MIGRATIONS.filter((m) => m.version > currentVersion);
  }

  /**
   * Calculate checksum for a migration (hash of the up function code)
   */
  private calculateChecksum(migration: Migration): string {
    const content = migration.up.toString();
    return Bun.hash(content).toString(16);
  }

  /**
   * Run a single migration
   */
  private runMigration(migration: Migration): MigrationResult {
    const startTime = performance.now();
    const ctx: MigrationContext = {
      db: this.db,
      sqliteVecLoaded: this.sqliteVecLoaded,
      log: this.log,
    };

    this.log(`Running migration ${migration.version}: ${migration.name}`);
    this.log(`  ${migration.description}`);

    try {
      // Handle transactional vs non-transactional migrations
      if (migration.transactional !== false) {
        this.db.exec("BEGIN IMMEDIATE");
        try {
          migration.up(ctx);

          // Record the migration
          this.db.run(
            "INSERT INTO _migrations (version, name, checksum, execution_time_ms) VALUES (?, ?, ?, ?)",
            [
              migration.version,
              migration.name,
              this.calculateChecksum(migration),
              Math.round(performance.now() - startTime),
            ],
          );

          this.db.exec("COMMIT");
        } catch (error) {
          this.db.exec("ROLLBACK");
          throw error;
        }
      } else {
        // Non-transactional (FTS5, sqlite-vec tables cannot be created in transactions)
        migration.up(ctx);

        // Record the migration separately
        this.db.run(
          "INSERT INTO _migrations (version, name, checksum, execution_time_ms) VALUES (?, ?, ?, ?)",
          [
            migration.version,
            migration.name,
            this.calculateChecksum(migration),
            Math.round(performance.now() - startTime),
          ],
        );
      }

      const executionTimeMs = Math.round(performance.now() - startTime);
      this.log(`  Completed in ${executionTimeMs}ms`);

      return {
        success: true,
        version: migration.version,
        name: migration.name,
        executionTimeMs,
      };
    } catch (error) {
      const executionTimeMs = Math.round(performance.now() - startTime);
      this.log(`  FAILED: ${error}`);

      return {
        success: false,
        version: migration.version,
        name: migration.name,
        error: error as Error,
        executionTimeMs,
      };
    }
  }

  /**
   * Run all pending migrations
   */
  runAll(): MigrationResult[] {
    this.ensureMigrationTable();
    const pending = this.getPendingMigrations();
    const results: MigrationResult[] = [];

    if (pending.length === 0) {
      this.log("Database schema is up to date");
      return results;
    }

    this.log(`Found ${pending.length} pending migration(s)`);

    for (const migration of pending) {
      const result = this.runMigration(migration);
      results.push(result);

      if (!result.success) {
        this.log(
          `Migration ${migration.version} failed, stopping migration process`,
        );
        break;
      }
    }

    if (results.length > 0 && results.every((r) => r.success)) {
      this.log(`Successfully applied ${results.length} migration(s)`);
    }

    return results;
  }

  /**
   * Rollback the last N migrations
   */
  rollback(count: number = 1): MigrationResult[] {
    const applied = this.getAppliedMigrations().reverse();
    const results: MigrationResult[] = [];

    for (let i = 0; i < Math.min(count, applied.length); i++) {
      const record = applied[i];
      if (!record) continue;

      const migration = MIGRATIONS.find((m) => m.version === record.version);

      if (!migration) {
        this.log(`Warning: Migration ${record.version} not found in registry`);
        continue;
      }

      if (!migration.down) {
        this.log(
          `Migration ${record.version} cannot be rolled back (no down method)`,
        );
        break;
      }

      const startTime = performance.now();
      const ctx: MigrationContext = {
        db: this.db,
        sqliteVecLoaded: this.sqliteVecLoaded,
        log: this.log,
      };

      this.log(
        `Rolling back migration ${migration.version}: ${migration.name}`,
      );

      try {
        if (migration.transactional !== false) {
          this.db.exec("BEGIN IMMEDIATE");
          migration.down(ctx);
          this.db.run("DELETE FROM _migrations WHERE version = ?", [
            migration.version,
          ]);
          this.db.exec("COMMIT");
        } else {
          migration.down(ctx);
          this.db.run("DELETE FROM _migrations WHERE version = ?", [
            migration.version,
          ]);
        }

        results.push({
          success: true,
          version: migration.version,
          name: migration.name,
          executionTimeMs: Math.round(performance.now() - startTime),
        });

        this.log(`  Rolled back successfully`);
      } catch (error) {
        if (migration.transactional !== false) {
          this.db.exec("ROLLBACK");
        }

        results.push({
          success: false,
          version: migration.version,
          name: migration.name,
          error: error as Error,
          executionTimeMs: Math.round(performance.now() - startTime),
        });

        this.log(`  Rollback FAILED: ${error}`);
        break;
      }
    }

    return results;
  }
}
