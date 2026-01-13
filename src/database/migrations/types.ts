/**
 * Migration System Types
 *
 * Defines interfaces for the database migration system.
 */

import type { Database } from "bun:sqlite";

/**
 * Context passed to migration functions
 */
export interface MigrationContext {
  /** The SQLite database instance */
  db: Database;
  /** Whether sqlite-vec extension is loaded */
  sqliteVecLoaded: boolean;
  /** Logging function (writes to stderr) */
  log: (msg: string) => void;
}

/**
 * A database migration
 */
export interface Migration {
  /** Sequential version number (1, 2, 3, ...) */
  version: number;
  /** Short name for the migration (e.g., 'initial', 'add_priority') */
  name: string;
  /** Human-readable description of what this migration does */
  description: string;

  /**
   * Apply the migration (move forward)
   */
  up(ctx: MigrationContext): void;

  /**
   * Rollback the migration (move backward)
   * Optional - some migrations cannot be rolled back
   */
  down?(ctx: MigrationContext): void;

  /**
   * Whether this migration can run inside a transaction
   * Set to false for FTS5 and sqlite-vec virtual tables
   * @default true
   */
  transactional?: boolean;
}

/**
 * Record of an applied migration stored in _migrations table
 */
export interface MigrationRecord {
  version: number;
  name: string;
  applied_at: string;
  checksum: string;
  execution_time_ms: number;
}

/**
 * Result of running a migration
 */
export interface MigrationResult {
  success: boolean;
  version: number;
  name: string;
  error?: Error;
  executionTimeMs: number;
}
