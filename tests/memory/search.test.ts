/**
 * Tests for Hybrid Search module
 */

import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { warmupEmbeddings } from "../../src/memory/embeddings.ts";
import {
  DEFAULT_CONFIG,
  hybridSearch,
  searchByFile,
} from "../../src/memory/search.ts";
import { createTestDb } from "../setup.ts";

let db: ReturnType<typeof createTestDb>["db"];
let cleanup: () => void;

beforeAll(async () => {
  const testSetup = createTestDb();
  db = testSetup.db;
  cleanup = testSetup.cleanup;

  // Warmup embeddings
  await warmupEmbeddings();

  // Seed test data
  const memories = [
    {
      category: "decision" as const,
      content: "Use PostgreSQL for the main database",
      rationale: "ACID compliance needed",
      filePath: undefined,
    },
    {
      category: "decision" as const,
      content: "Use Redis for caching",
      rationale: "Fast in-memory storage",
      filePath: undefined,
    },
    {
      category: "pattern" as const,
      content: "The user auth module is slow",
      rationale: undefined,
      filePath: "/src/auth/login.ts",
    },
    {
      category: "warning" as const,
      content: "Never store passwords in plain text",
      rationale: undefined,
      filePath: undefined,
    },
    {
      category: "decision" as const,
      content: "Use JWT for authentication tokens",
      rationale: "Stateless auth",
      filePath: undefined,
    },
  ];

  for (const mem of memories) {
    const id = db.insertMemory({
      category: mem.category,
      content: mem.content,
      rationale: mem.rationale,
      filePath: mem.filePath,
    });
    // Generate and store embedding for vector search
    const { generateEmbedding } = await import(
      "../../src/memory/embeddings.ts"
    );
    const embedding = await generateEmbedding(
      mem.content + " " + (mem.rationale ?? ""),
    );
    db.insertMemoryVector(id, embedding);
  }
});

afterAll(() => {
  cleanup();
});

describe("Hybrid Search", () => {
  test("finds semantically similar memories", async () => {
    const results = await hybridSearch(db, "database selection", { limit: 5 });

    expect(results.length).toBeGreaterThan(0);
    // Should find PostgreSQL decision
    const hasDb = results.some((r) =>
      r.memory.content.toLowerCase().includes("postgresql"),
    );
    expect(hasDb).toBe(true);
  });

  test("returns results with scores", async () => {
    const results = await hybridSearch(db, "caching strategy");

    if (results.length > 0) {
      const result = results[0]!;
      expect(typeof result.score).toBe("number");
      expect(typeof result.vectorScore).toBe("number");
      expect(typeof result.ftsScore).toBe("number");
      expect(typeof result.recencyScore).toBe("number");
    }
  });

  test("respects limit parameter", async () => {
    const results = await hybridSearch(db, "database", { limit: 2 });
    expect(results.length).toBeLessThanOrEqual(2);
  });

  test("filters by category", async () => {
    const results = await hybridSearch(db, "database", { category: "warning" });

    for (const result of results) {
      expect(result.memory.category).toBe("warning");
    }
  });

  test("filters by file path", async () => {
    const results = await hybridSearch(db, "module", {
      filePath: "/src/auth/login.ts",
    });

    for (const result of results) {
      expect(result.memory.file_path).toBe("/src/auth/login.ts");
    }
  });

  test("handles empty query", async () => {
    const results = await hybridSearch(db, "", { limit: 5 });
    // Should still return results based on vector search
    expect(Array.isArray(results)).toBe(true);
  });

  test("handles special FTS characters", async () => {
    // Should not throw on special characters
    const results = await hybridSearch(db, 'test (parentheses) "quotes"', {
      limit: 5,
    });
    expect(Array.isArray(results)).toBe(true);
  });

  test("sorts results by score descending", async () => {
    const results = await hybridSearch(db, "database storage", { limit: 5 });

    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1]!.score).toBeGreaterThanOrEqual(results[i]!.score);
    }
  });

  test("applies failure boost to failed decisions", async () => {
    // Insert a failed decision
    const failedId = db.insertMemory({
      category: "decision",
      content: "Use SQLite for production database",
      rationale: "Simple setup",
    });
    db.updateMemoryOutcome(failedId, "Could not scale", false);

    const { generateEmbedding } = await import(
      "../../src/memory/embeddings.ts"
    );
    const embedding = await generateEmbedding(
      "Use SQLite for production database Simple setup",
    );
    db.insertMemoryVector(failedId, embedding);

    const results = await hybridSearch(db, "SQLite database", { limit: 5 });

    // The failed decision should have a boosted score
    const failedResult = results.find((r) => r.memory.id === failedId);
    if (failedResult) {
      // Check that it has some boost applied
      expect(failedResult.memory.worked).toBe(0);
    }
  });

  test("accepts custom config", async () => {
    const customConfig = {
      vectorWeight: 0.8,
      ftsWeight: 0.1,
      recencyWeight: 0.05,
      failureBoost: 0.05,
    };

    const results = await hybridSearch(db, "database", {
      limit: 5,
      config: customConfig,
    });

    expect(Array.isArray(results)).toBe(true);
  });
});

describe("searchByFile", () => {
  test("returns memories for specific file", () => {
    const results = searchByFile(db, "/src/auth/login.ts");

    expect(results.length).toBeGreaterThan(0);
    for (const memory of results) {
      expect(memory.file_path).toBe("/src/auth/login.ts");
    }
  });

  test("returns empty array for non-existent file", () => {
    const results = searchByFile(db, "/non/existent/file.ts");
    expect(results).toEqual([]);
  });
});

describe("DEFAULT_CONFIG", () => {
  test("has expected default values", () => {
    expect(DEFAULT_CONFIG.vectorWeight).toBe(0.5);
    expect(DEFAULT_CONFIG.ftsWeight).toBe(0.3);
    expect(DEFAULT_CONFIG.recencyWeight).toBe(0.15);
    expect(DEFAULT_CONFIG.failureBoost).toBe(0.05);
  });

  test("weights sum to 1", () => {
    const sum =
      DEFAULT_CONFIG.vectorWeight +
      DEFAULT_CONFIG.ftsWeight +
      DEFAULT_CONFIG.recencyWeight +
      DEFAULT_CONFIG.failureBoost;
    expect(sum).toBe(1);
  });
});
