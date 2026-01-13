/**
 * Hybrid Search for code-recall
 *
 * Combines vector similarity, full-text search (BM25), and time decay
 * for optimal semantic memory retrieval.
 */

import type { DatabaseManager, MemoryRow } from "../database/index.ts";
import { generateEmbedding } from "./embeddings.ts";

export interface SearchConfig {
  vectorWeight: number;
  ftsWeight: number;
  recencyWeight: number;
  failureBoost: number;
}

const DEFAULT_CONFIG: SearchConfig = {
  vectorWeight: 0.5,
  ftsWeight: 0.3,
  recencyWeight: 0.15,
  failureBoost: 0.05,
};

export interface SearchResult {
  memory: MemoryRow;
  score: number;
  vectorScore: number;
  ftsScore: number;
  recencyScore: number;
}

/**
 * Calculate time decay score (exponential decay over 30 days).
 * Recent memories score higher.
 */
function calculateRecencyScore(createdAt: string): number {
  const created = new Date(createdAt).getTime();
  const now = Date.now();
  const daysDiff = (now - created) / (1000 * 60 * 60 * 24);

  // Exponential decay with half-life of 7 days
  return Math.exp(-daysDiff / 7);
}

/**
 * Perform hybrid search combining vector similarity, FTS, and recency.
 */
export async function hybridSearch(
  db: DatabaseManager,
  query: string,
  options: {
    limit?: number;
    category?: string;
    filePath?: string;
    config?: Partial<SearchConfig>;
  } = {},
): Promise<SearchResult[]> {
  const config = { ...DEFAULT_CONFIG, ...options.config };
  const limit = options.limit ?? 10;

  // Generate query embedding
  const queryEmbedding = await generateEmbedding(query);

  // Get vector search results
  const vectorResults = db.searchByVector(queryEmbedding, limit * 3);

  // Get FTS results
  let ftsResults: MemoryRow[] = [];
  try {
    // Escape special FTS5 characters
    const escapedQuery = query.replace(/[*":()]/g, " ").trim();
    if (escapedQuery) {
      ftsResults = db.searchByFullText(escapedQuery, limit * 3);
    }
  } catch {
    // FTS query might fail on special characters, continue with vector only
  }

  // Collect all candidate memory IDs
  const candidateIds = new Set<number>();
  for (const vr of vectorResults) {
    candidateIds.add(vr.memory_id);
  }
  for (const fr of ftsResults) {
    candidateIds.add(fr.id);
  }

  // Build score map for vector results
  const vectorScoreMap = new Map<number, number>();
  const maxVectorDistance = Math.max(
    ...vectorResults.map((r) => r.distance),
    1,
  );
  for (const vr of vectorResults) {
    // Convert distance to similarity (1 - normalized distance)
    const similarity = 1 - vr.distance / maxVectorDistance;
    vectorScoreMap.set(vr.memory_id, similarity);
  }

  // Build score map for FTS results
  const ftsScoreMap = new Map<number, number>();
  for (let i = 0; i < ftsResults.length; i++) {
    const ftsResult = ftsResults[i]!;
    // Use position-based scoring (earlier results are better)
    ftsScoreMap.set(ftsResult.id, 1 - i / ftsResults.length);
  }

  // Score all candidates
  const results: SearchResult[] = [];

  for (const memoryId of candidateIds) {
    const memory = db.getMemoryById(memoryId);
    if (!memory) continue;

    // Filter by category if specified
    if (options.category && memory.category !== options.category) continue;

    // Filter by file path if specified
    if (options.filePath && memory.file_path !== options.filePath) continue;

    // Skip archived memories
    if (memory.archived) continue;

    // Calculate component scores
    const vectorScore = vectorScoreMap.get(memoryId) ?? 0;
    const ftsScore = ftsScoreMap.get(memoryId) ?? 0;
    const recencyScore = calculateRecencyScore(memory.created_at);

    // Calculate combined score
    let score =
      config.vectorWeight * vectorScore +
      config.ftsWeight * ftsScore +
      config.recencyWeight * recencyScore;

    // Apply failure boost (1.5x for failed decisions)
    if (memory.worked === 0) {
      score *= 1 + config.failureBoost * 10; // ~1.5x boost
    }

    results.push({
      memory,
      score,
      vectorScore,
      ftsScore,
      recencyScore,
    });
  }

  // Sort by score descending and limit results
  results.sort((a, b) => b.score - a.score);
  return results.slice(0, limit);
}

/**
 * Search memories by file path only.
 */
export function searchByFile(
  db: DatabaseManager,
  filePath: string,
): MemoryRow[] {
  return db.getMemoriesByFilePath(filePath);
}

export { DEFAULT_CONFIG };
