/**
 * Migration Utilities
 *
 * Helper functions to handle SQLite limitations in migrations.
 * SQLite has limited ALTER TABLE support, so some operations
 * require recreating tables with data preservation.
 */

import type { Database } from "bun:sqlite";

/**
 * Check if a table exists in the database
 */
export function tableExists(db: Database, tableName: string): boolean {
  const result = db
    .query("SELECT name FROM sqlite_master WHERE type='table' AND name=?")
    .get(tableName);
  return result !== null;
}

/**
 * Check if a column exists in a table
 */
export function columnExists(
  db: Database,
  tableName: string,
  columnName: string,
): boolean {
  const columns = db.query(`PRAGMA table_info(${tableName})`).all() as Array<{
    name: string;
  }>;
  return columns.some((c) => c.name === columnName);
}

/**
 * Get all column names for a table
 */
export function getColumns(db: Database, tableName: string): string[] {
  const columns = db.query(`PRAGMA table_info(${tableName})`).all() as Array<{
    name: string;
  }>;
  return columns.map((c) => c.name);
}

/**
 * Get all indexes for a table
 */
export function getIndexes(db: Database, tableName: string): string[] {
  const indexes = db
    .query("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name=?")
    .all(tableName) as Array<{ name: string }>;
  return indexes.map((i) => i.name);
}

/**
 * Add a column to a table (SQLite-compatible)
 * SQLite supports ALTER TABLE ADD COLUMN
 */
export function addColumn(
  db: Database,
  table: string,
  column: string,
  type: string,
  defaultValue?: string | number | null,
): void {
  let sql = `ALTER TABLE ${table} ADD COLUMN ${column} ${type}`;

  if (defaultValue !== undefined) {
    if (defaultValue === null) {
      sql += " DEFAULT NULL";
    } else if (typeof defaultValue === "string") {
      sql += ` DEFAULT '${defaultValue}'`;
    } else {
      sql += ` DEFAULT ${defaultValue}`;
    }
  }

  db.exec(sql);
}

/**
 * Create an index if it doesn't exist
 */
export function createIndex(
  db: Database,
  indexName: string,
  table: string,
  columns: string[],
  unique: boolean = false,
): void {
  const uniqueStr = unique ? "UNIQUE " : "";
  db.exec(
    `CREATE ${uniqueStr}INDEX IF NOT EXISTS ${indexName} ON ${table} (${columns.join(", ")})`,
  );
}

/**
 * Drop an index if it exists
 */
export function dropIndex(db: Database, indexName: string): void {
  db.exec(`DROP INDEX IF EXISTS ${indexName}`);
}

/**
 * Drop a table if it exists
 */
export function dropTable(db: Database, tableName: string): void {
  db.exec(`DROP TABLE IF EXISTS ${tableName}`);
}

/**
 * Recreate a table with a new schema while preserving data.
 *
 * SQLite doesn't support ALTER COLUMN or DROP COLUMN (before 3.35.0).
 * This function handles schema changes by:
 * 1. Creating a temp table with new schema
 * 2. Copying data from old table
 * 3. Dropping old table
 * 4. Renaming temp table
 *
 * @param db - Database instance
 * @param tableName - Name of the table to recreate
 * @param newSchema - Full CREATE TABLE statement for new schema
 * @param columnMapping - Map of old column names to new names (null = drop column)
 */
export function recreateTable(
  db: Database,
  tableName: string,
  newSchema: string,
  columnMapping: Record<string, string | null>,
): void {
  const tempName = `_temp_${tableName}_${Date.now()}`;

  // Get existing columns
  const existingColumns = getColumns(db, tableName);

  // Build column lists for data transfer
  const sourceColumns: string[] = [];
  const targetColumns: string[] = [];

  for (const col of existingColumns) {
    const mappedName = columnMapping[col];
    if (mappedName === undefined) {
      // Column not in mapping, keep as-is
      sourceColumns.push(col);
      targetColumns.push(col);
    } else if (mappedName !== null) {
      // Column renamed
      sourceColumns.push(col);
      targetColumns.push(mappedName);
    }
    // If mappedName === null, column is dropped (not included)
  }

  // Create new table with temp name
  const createNewTable = newSchema.replace(
    new RegExp(`CREATE TABLE\\s+(?:IF NOT EXISTS\\s+)?${tableName}`, "i"),
    `CREATE TABLE ${tempName}`,
  );
  db.exec(createNewTable);

  // Copy data if there are columns to transfer
  if (sourceColumns.length > 0) {
    db.exec(`
      INSERT INTO ${tempName} (${targetColumns.join(", ")})
      SELECT ${sourceColumns.join(", ")}
      FROM ${tableName}
    `);
  }

  // Drop old table and rename
  db.exec(`DROP TABLE ${tableName}`);
  db.exec(`ALTER TABLE ${tempName} RENAME TO ${tableName}`);
}

/**
 * Rebuild an FTS5 index after the underlying table changed
 */
export function rebuildFts5Index(db: Database, ftsTableName: string): void {
  db.exec(`INSERT INTO ${ftsTableName}(${ftsTableName}) VALUES('rebuild')`);
}
