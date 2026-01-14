use crate::models::DatabaseStats;
use rusqlite::Connection;

pub fn get_stats(path: &str) -> Result<DatabaseStats, String> {
    let conn = Connection::open(path).map_err(|e| format!("Failed to open database: {}", e))?;

    let memory_count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM memories WHERE archived = 0",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0);

    Ok(DatabaseStats { memory_count })
}
