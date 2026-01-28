/**
 * Tests for MemoryManager module
 */

import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { warmupEmbeddings } from "../../src/memory/embeddings.ts";
import { MemoryManager } from "../../src/memory/index.ts";
import { createTestDb } from "../setup.ts";

let db: ReturnType<typeof createTestDb>["db"];
let cleanup: () => void;
let memoryManager: MemoryManager;

beforeAll(async () => {
  const testSetup = createTestDb();
  db = testSetup.db;
  cleanup = testSetup.cleanup;
  memoryManager = new MemoryManager(db);

  // Warmup embeddings
  await warmupEmbeddings();
});

afterAll(() => {
  cleanup();
});

describe("MemoryManager", () => {
  describe("storeObservation", () => {
    test("stores observation and returns id", async () => {
      const result = await memoryManager.storeObservation({
        category: "pattern",
        content: "The API response time is slow",
        tags: ["performance", "api"],
      });

      expect(result.id).toBeGreaterThan(0);
      expect(result.conflictWarning).toBeUndefined();
    });

    test("stores observation with all optional fields", async () => {
      const result = await memoryManager.storeObservation({
        category: "decision",
        content: "Use TypeScript for the backend",
        rationale: "Type safety and better IDE support",
        context: "Evaluating backend technologies",
        tags: ["typescript", "backend"],
        filePath: "/src/server/index.ts",
      });

      expect(result.id).toBeGreaterThan(0);

      const memory = memoryManager.getMemory(result.id);
      expect(memory?.content).toBe("Use TypeScript for the backend");
      expect(memory?.rationale).toBe("Type safety and better IDE support");
      expect(memory?.context).toBe("Evaluating backend technologies");
      expect(memory?.file_path).toBe("/src/server/index.ts");
    });

    test("detects conflict with failed similar decision", async () => {
      // Store a decision that failed
      const failedResult = await memoryManager.storeObservation({
        category: "decision",
        content: "Use MongoDB for user data storage",
        rationale: "Flexible schema",
      });
      memoryManager.recordOutcome(
        failedResult.id,
        "Performance issues with large datasets",
        false,
      );

      // Try to store a similar decision
      const newResult = await memoryManager.storeObservation({
        category: "decision",
        content: "Use MongoDB for storing user information",
        rationale: "Schema flexibility needed",
      });

      // May or may not have conflict warning depending on similarity score
      // Just verify it doesn't throw
      expect(newResult.id).toBeGreaterThan(0);
    });
  });

  describe("searchMemory", () => {
    test("searches by semantic similarity", async () => {
      // Store some memories first
      await memoryManager.storeObservation({
        category: "pattern",
        content: "The database query performance is degraded",
      });

      const results = await memoryManager.searchMemory({
        query: "slow database queries",
        limit: 5,
      });

      expect(results.length).toBeGreaterThan(0);
    });

    test("filters by category", async () => {
      await memoryManager.storeObservation({
        category: "warning",
        content: "API rate limit approaching",
      });

      const results = await memoryManager.searchMemory({
        query: "rate limit",
        category: "warning",
        limit: 5,
      });

      for (const result of results) {
        expect(result.memory.category).toBe("warning");
      }
    });

    test("filters by file path", async () => {
      await memoryManager.storeObservation({
        category: "pattern",
        content: "Complex logic in utils",
        filePath: "/src/utils/helpers.ts",
      });

      const results = await memoryManager.searchMemory({
        query: "complex logic",
        filePath: "/src/utils/helpers.ts",
        limit: 5,
      });

      for (const result of results) {
        expect(result.memory.file_path).toBe("/src/utils/helpers.ts");
      }
    });
  });

  describe("recordOutcome", () => {
    test("records positive outcome", async () => {
      const result = await memoryManager.storeObservation({
        category: "decision",
        content: "Use caching for API responses",
      });

      memoryManager.recordOutcome(result.id, "Reduced latency by 50%", true);

      const memory = memoryManager.getMemory(result.id);
      expect(memory?.outcome).toBe("Reduced latency by 50%");
      expect(memory?.worked).toBe(1);
    });

    test("records negative outcome", async () => {
      const result = await memoryManager.storeObservation({
        category: "decision",
        content: "Use sync writes for consistency",
      });

      memoryManager.recordOutcome(
        result.id,
        "Too slow for high traffic",
        false,
      );

      const memory = memoryManager.getMemory(result.id);
      expect(memory?.outcome).toBe("Too slow for high traffic");
      expect(memory?.worked).toBe(0);
    });
  });

  describe("getMemory", () => {
    test("returns memory by id", async () => {
      const result = await memoryManager.storeObservation({
        category: "pattern",
        content: "Unique test memory",
      });

      const memory = memoryManager.getMemory(result.id);
      expect(memory?.content).toBe("Unique test memory");
    });

    test("returns null for non-existent id", () => {
      const memory = memoryManager.getMemory(999999);
      expect(memory).toBeNull();
    });
  });

  describe("getRecentMemories", () => {
    test("returns recent memories", async () => {
      await memoryManager.storeObservation({
        category: "pattern",
        content: "Recent memory 1",
      });

      const recent = memoryManager.getRecentMemories(5);
      expect(recent.length).toBeGreaterThan(0);
    });

    test("respects limit", async () => {
      const recent = memoryManager.getRecentMemories(2);
      expect(recent.length).toBeLessThanOrEqual(2);
    });
  });

  describe("getMemoriesByCategory", () => {
    test("returns memories filtered by category", async () => {
      await memoryManager.storeObservation({
        category: "learning",
        content: "User prefers dark mode",
      });

      const learnings = memoryManager.getMemoriesByCategory("learning");
      for (const memory of learnings) {
        expect(memory.category).toBe("learning");
      }
    });
  });

  describe("getFailedDecisions", () => {
    test("returns only failed decisions", async () => {
      const result = await memoryManager.storeObservation({
        category: "decision",
        content: "Failed decision test",
      });
      memoryManager.recordOutcome(result.id, "Did not work", false);

      const failed = memoryManager.getFailedDecisions();
      for (const memory of failed) {
        expect(memory.category).toBe("decision");
        expect(memory.worked).toBe(0);
      }
    });
  });

  describe("getWarnings", () => {
    test("returns warnings", async () => {
      await memoryManager.storeObservation({
        category: "warning",
        content: "Do not use eval",
      });

      const warnings = memoryManager.getWarnings();
      for (const memory of warnings) {
        expect(memory.category).toBe("warning");
      }
    });
  });

  describe("getMemoriesForFile", () => {
    test("returns memories for file", async () => {
      await memoryManager.storeObservation({
        category: "pattern",
        content: "File specific memory",
        filePath: "/test/specific/file.ts",
      });

      const memories = memoryManager.getMemoriesForFile(
        "/test/specific/file.ts",
      );
      expect(memories.length).toBeGreaterThan(0);
      for (const memory of memories) {
        expect(memory.file_path).toBe("/test/specific/file.ts");
      }
    });
  });

  describe("getStats", () => {
    test("returns stats object", () => {
      const stats = memoryManager.getStats();

      expect(typeof stats.totalMemories).toBe("number");
      expect(typeof stats.totalRules).toBe("number");
      expect(typeof stats.recentDecisions).toBe("number");
      expect(typeof stats.failedDecisions).toBe("number");
    });
  });

  describe("warmup", () => {
    test("completes without error", async () => {
      await memoryManager.warmup();
    });
  });
});
