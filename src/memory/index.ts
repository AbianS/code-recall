/**
 * MemoryManager for code-recall
 *
 * High-level API for storing and retrieving semantic memories.
 */

import type {
  DatabaseManager,
  MemoryCategory,
  MemoryRow,
} from "../database/index.ts";
import {
  EMBEDDING_DIMENSION,
  generateEmbedding,
  warmupEmbeddings,
} from "./embeddings.ts";
import {
  hybridSearch,
  type SearchConfig,
  type SearchResult,
  searchByFile,
} from "./search.ts";

export interface StoreObservationParams {
  category: MemoryCategory;
  content: string;
  rationale?: string;
  context?: string;
  tags?: string[];
  filePath?: string;
}

export interface SearchMemoryParams {
  query: string;
  limit?: number;
  category?: MemoryCategory;
  filePath?: string;
}

export class MemoryManager {
  private db: DatabaseManager;

  constructor(db: DatabaseManager) {
    this.db = db;
  }

  /**
   * Pre-warm the embedding model for faster first queries.
   */
  async warmup(): Promise<void> {
    await warmupEmbeddings();
  }

  /**
   * Store a new observation/memory with its embedding.
   */
  async storeObservation(params: StoreObservationParams): Promise<{
    id: number;
    conflictWarning?: string;
  }> {
    // Check for potential conflicts with existing memories
    let conflictWarning: string | undefined;
    try {
      const similar = await this.searchMemory({
        query: params.content,
        limit: 3,
      });

      // Check if any highly similar memories exist that failed
      for (const result of similar) {
        if (result.score > 0.8 && result.memory.worked === 0) {
          conflictWarning = `Warning: Similar approach was tried before and failed. Memory ID: ${result.memory.id}, Content: "${result.memory.content.slice(0, 100)}..."`;
          break;
        }
      }
    } catch {
      // Ignore search errors during conflict check
    }

    // Insert the memory
    const memoryId = this.db.insertMemory({
      category: params.category,
      content: params.content,
      rationale: params.rationale,
      context: params.context,
      tags: params.tags,
      filePath: params.filePath,
    });

    // Generate and store embedding
    const textToEmbed = [
      params.content,
      params.rationale ?? "",
      params.tags?.join(" ") ?? "",
    ].join(" ");

    const embedding = await generateEmbedding(textToEmbed);
    this.db.insertMemoryVector(memoryId, embedding);

    return { id: memoryId, conflictWarning };
  }

  /**
   * Search memories using hybrid semantic search.
   */
  async searchMemory(params: SearchMemoryParams): Promise<SearchResult[]> {
    return hybridSearch(this.db, params.query, {
      limit: params.limit,
      category: params.category,
      filePath: params.filePath,
    });
  }

  /**
   * Get memories associated with a specific file.
   */
  getMemoriesForFile(filePath: string): MemoryRow[] {
    return searchByFile(this.db, filePath);
  }

  /**
   * Record the outcome of a decision.
   */
  recordOutcome(memoryId: number, outcome: string, worked: boolean): void {
    this.db.updateMemoryOutcome(memoryId, outcome, worked);
  }

  /**
   * Get a memory by ID.
   */
  getMemory(id: number): MemoryRow | null {
    return this.db.getMemoryById(id);
  }

  /**
   * Get recent memories for briefing.
   */
  getRecentMemories(limit: number = 10): MemoryRow[] {
    return this.db.getRecentMemories(limit);
  }

  /**
   * Get memories by category.
   */
  getMemoriesByCategory(
    category: MemoryCategory,
    limit: number = 50,
  ): MemoryRow[] {
    return this.db.getMemoriesByCategory(category, limit);
  }

  /**
   * Get failed decisions (for warnings).
   */
  getFailedDecisions(): MemoryRow[] {
    const decisions = this.db.getMemoriesByCategory("decision");
    return decisions.filter((m) => m.worked === 0);
  }

  /**
   * Get active warnings.
   */
  getWarnings(): MemoryRow[] {
    return this.db.getMemoriesByCategory("warning");
  }

  /**
   * Get database statistics.
   */
  getStats() {
    return this.db.getStats();
  }
}

export type { SearchResult, SearchConfig, MemoryRow, MemoryCategory };
export { EMBEDDING_DIMENSION };
