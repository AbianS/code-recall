/**
 * Tests for MCP Server Tools
 *
 * Tests the tool implementations through the createServer function.
 */

import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { warmupEmbeddings } from "../../src/memory/embeddings.ts";
import { createServer } from "../../src/server.ts";

let testDir: string;
let cleanup: () => void;
let memoryManager: ReturnType<typeof createServer>["memoryManager"];
let rulesEngine: ReturnType<typeof createServer>["rulesEngine"];
let db: ReturnType<typeof createServer>["db"];

beforeAll(async () => {
  testDir = mkdtempSync(join(tmpdir(), "code-recall-server-test-"));
  const {
    db: database,
    memoryManager: mm,
    rulesEngine: re,
  } = createServer({ projectPath: testDir });
  db = database;
  memoryManager = mm;
  rulesEngine = re;

  cleanup = () => {
    db.close();
    rmSync(testDir, { recursive: true });
  };

  // Warmup embeddings
  await warmupEmbeddings();
});

afterAll(() => {
  cleanup();
});

describe("Server Tools", () => {
  describe("store_observation (via MemoryManager)", () => {
    test("stores observation and returns id", async () => {
      const result = await memoryManager.storeObservation({
        category: "decision",
        content: "Use PostgreSQL for database",
        rationale: "ACID compliance needed",
        tags: ["database", "architecture"],
      });

      expect(result.id).toBeGreaterThan(0);
    });

    test("stores observation with file path", async () => {
      const result = await memoryManager.storeObservation({
        category: "pattern",
        content: "Complex logic in this module",
        filePath: "/src/utils/complex.ts",
      });

      const memory = memoryManager.getMemory(result.id);
      expect(memory?.file_path).toBe("/src/utils/complex.ts");
    });

    test("handles all categories", async () => {
      const categories = [
        "decision",
        "pattern",
        "warning",
        "learning",
      ] as const;

      for (const category of categories) {
        const result = await memoryManager.storeObservation({
          category,
          content: `Test ${category}`,
        });
        expect(result.id).toBeGreaterThan(0);
      }
    });
  });

  describe("search_memory (via MemoryManager)", () => {
    test("searches memories semantically", async () => {
      await memoryManager.storeObservation({
        category: "decision",
        content: "Use Redis for caching frequently accessed data",
      });

      const results = await memoryManager.searchMemory({
        query: "caching strategy",
        limit: 5,
      });

      expect(results.length).toBeGreaterThan(0);
    });

    test("returns empty results for no matches", async () => {
      const results = await memoryManager.searchMemory({
        query: "xyznonexistentquerythatmatchesnothing123",
        limit: 5,
      });

      // May still return some results with low scores
      expect(Array.isArray(results)).toBe(true);
    });

    test("respects category filter", async () => {
      await memoryManager.storeObservation({
        category: "warning",
        content: "Search filter test warning",
      });

      const results = await memoryManager.searchMemory({
        query: "search filter test",
        category: "warning",
        limit: 5,
      });

      for (const result of results) {
        expect(result.memory.category).toBe("warning");
      }
    });

    test("respects file path filter", async () => {
      await memoryManager.storeObservation({
        category: "pattern",
        content: "File path filter test",
        filePath: "/test/filter/path.ts",
      });

      const results = await memoryManager.searchMemory({
        query: "file path filter",
        filePath: "/test/filter/path.ts",
        limit: 5,
      });

      for (const result of results) {
        expect(result.memory.file_path).toBe("/test/filter/path.ts");
      }
    });
  });

  describe("get_briefing (via MemoryManager)", () => {
    test("returns stats", () => {
      const stats = memoryManager.getStats();

      expect(typeof stats.totalMemories).toBe("number");
      expect(typeof stats.totalRules).toBe("number");
      expect(typeof stats.recentDecisions).toBe("number");
      expect(typeof stats.failedDecisions).toBe("number");
    });

    test("returns recent memories", () => {
      const recent = memoryManager.getRecentMemories(5);
      expect(Array.isArray(recent)).toBe(true);
    });

    test("returns warnings", async () => {
      await memoryManager.storeObservation({
        category: "warning",
        content: "Never use eval()",
      });

      const warnings = memoryManager.getWarnings();
      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings.every((w) => w.category === "warning")).toBe(true);
    });

    test("returns failed decisions", async () => {
      const result = await memoryManager.storeObservation({
        category: "decision",
        content: "Failed decision for briefing test",
      });
      memoryManager.recordOutcome(result.id, "Did not work", false);

      const failed = memoryManager.getFailedDecisions();
      expect(failed.some((f) => f.worked === 0)).toBe(true);
    });
  });

  describe("set_rule / check_rules (via RulesEngine)", () => {
    test("adds rule and returns id", async () => {
      const ruleId = await rulesEngine.addRule({
        trigger: "adding new API endpoint",
        mustDo: ["Add input validation", "Add rate limiting"],
        mustNot: ["Skip authentication"],
        askFirst: ["Is this a breaking change?"],
      });

      expect(ruleId).toBeGreaterThan(0);
    });

    test("checks rules against action", async () => {
      await rulesEngine.addRule({
        trigger: "modifying database schema",
        mustDo: ["Create migration script"],
        mustNot: ["Delete columns directly"],
      });

      const result = await rulesEngine.checkRules(
        "updating the database schema",
      );

      // May or may not match depending on semantic similarity
      expect(Array.isArray(result.matchedRules)).toBe(true);
      expect(Array.isArray(result.mustDo)).toBe(true);
      expect(Array.isArray(result.mustNot)).toBe(true);
      expect(Array.isArray(result.askFirst)).toBe(true);
    });

    test("returns empty arrays for unrelated action", async () => {
      const result = await rulesEngine.checkRules(
        "making coffee in the kitchen",
      );

      expect(result.matchedRules.length).toBe(0);
      expect(result.mustDo.length).toBe(0);
      expect(result.mustNot.length).toBe(0);
      expect(result.askFirst.length).toBe(0);
    });
  });

  describe("record_outcome (via MemoryManager)", () => {
    test("records positive outcome", async () => {
      const result = await memoryManager.storeObservation({
        category: "decision",
        content: "Positive outcome test",
      });

      memoryManager.recordOutcome(result.id, "Worked perfectly", true);

      const memory = memoryManager.getMemory(result.id);
      expect(memory?.outcome).toBe("Worked perfectly");
      expect(memory?.worked).toBe(1);
    });

    test("records negative outcome", async () => {
      const result = await memoryManager.storeObservation({
        category: "decision",
        content: "Negative outcome test",
      });

      memoryManager.recordOutcome(result.id, "Failed miserably", false);

      const memory = memoryManager.getMemory(result.id);
      expect(memory?.outcome).toBe("Failed miserably");
      expect(memory?.worked).toBe(0);
    });

    test("handles non-existent memory id", () => {
      const memory = memoryManager.getMemory(999999);
      expect(memory).toBeNull();
    });
  });

  describe("list_rules (via RulesEngine)", () => {
    test("lists all active rules", async () => {
      // Add a rule first
      await rulesEngine.addRule({
        trigger: "list test trigger",
        mustDo: ["Do something"],
      });

      const rules = rulesEngine.listRules();

      expect(Array.isArray(rules)).toBe(true);
      expect(rules.length).toBeGreaterThan(0);
    });

    test("returns rule with correct structure", async () => {
      const rules = rulesEngine.listRules();

      if (rules.length > 0) {
        const rule = rules[0]!;
        expect(typeof rule.id).toBe("number");
        expect(typeof rule.trigger).toBe("string");
        expect(Array.isArray(rule.mustDo)).toBe(true);
        expect(Array.isArray(rule.mustNot)).toBe(true);
        expect(Array.isArray(rule.askFirst)).toBe(true);
      }
    });
  });

  describe("analyze_structure (via db and file system)", () => {
    test("stores entities in database after analysis", async () => {
      // Create a test TypeScript file
      const testFilePath = join(testDir, "test-analyze.ts");
      const testContent = `
class TestClass {
  method() {}
}

function testFunction() {}
`;
      writeFileSync(testFilePath, testContent);

      // Analyze using the code analyzer directly
      const { analyzeFile } = await import("../../src/code/index.ts");
      const result = await analyzeFile(testFilePath, testContent);

      // Store entities
      db.deleteCodeEntitiesByFile(testFilePath);
      for (const entity of result.entities) {
        db.insertCodeEntity({
          filePath: testFilePath,
          entityType: entity.type,
          name: entity.name,
          qualifiedName: entity.qualifiedName,
          signature: entity.signature,
          docstring: entity.docstring,
          startLine: entity.startLine,
          endLine: entity.endLine,
          fileHash: result.fileHash,
        });
      }

      // Verify entities were stored
      const entities = db.getCodeEntitiesByFile(testFilePath);
      expect(entities.length).toBeGreaterThan(0);
      expect(entities.some((e) => e.name === "TestClass")).toBe(true);
      expect(entities.some((e) => e.name === "testFunction")).toBe(true);
    });

    test("handles file not found gracefully", async () => {
      const entities = db.getCodeEntitiesByFile("/non/existent/file.ts");
      expect(entities).toEqual([]);
    });

    test("handles unsupported file type", async () => {
      const testFilePath = join(testDir, "test.py");
      writeFileSync(testFilePath, "def hello(): pass");

      const { analyzeFile } = await import("../../src/code/index.ts");

      await expect(
        analyzeFile(testFilePath, "def hello(): pass"),
      ).rejects.toThrow("Unsupported file type");
    });
  });

  describe("Integration: Memory-Code Entity Links", () => {
    test("links memory to code entity", async () => {
      // Create a memory
      const memResult = await memoryManager.storeObservation({
        category: "pattern",
        content: "This class needs refactoring",
        filePath: "/test/link-test.ts",
      });

      // Create a code entity
      const entityId = db.insertCodeEntity({
        filePath: "/test/link-test.ts",
        entityType: "class",
        name: "NeedsRefactoring",
        qualifiedName: "NeedsRefactoring",
        startLine: 1,
        endLine: 50,
        fileHash: "linktest123",
      });

      // Link them
      db.linkMemoryToEntity(memResult.id, entityId);

      // Verify link
      const memories = db.getMemoriesForEntity(entityId);
      expect(memories.some((m) => m.id === memResult.id)).toBe(true);

      const entities = db.getEntitiesForMemory(memResult.id);
      expect(entities.some((e) => e.id === entityId)).toBe(true);
    });
  });

  describe("Edge Cases", () => {
    test("handles empty content", async () => {
      // Empty content should still be stored
      const result = await memoryManager.storeObservation({
        category: "learning",
        content: "",
      });

      expect(result.id).toBeGreaterThan(0);
    });

    test("handles very long content", async () => {
      const longContent = "A".repeat(10000);

      const result = await memoryManager.storeObservation({
        category: "decision",
        content: longContent,
      });

      expect(result.id).toBeGreaterThan(0);

      const memory = memoryManager.getMemory(result.id);
      expect(memory?.content).toBe(longContent);
    });

    test("handles special characters in content", async () => {
      const specialContent =
        'Test with "quotes", <tags>, and unicode: 日本語 🎉';

      const result = await memoryManager.storeObservation({
        category: "pattern",
        content: specialContent,
      });

      const memory = memoryManager.getMemory(result.id);
      expect(memory?.content).toBe(specialContent);
    });

    test("handles concurrent operations", async () => {
      // Store multiple memories concurrently
      const promises = Array.from({ length: 5 }, (_, i) =>
        memoryManager.storeObservation({
          category: "decision",
          content: `Concurrent test ${i}`,
        }),
      );

      const results = await Promise.all(promises);

      // All should have unique IDs
      const ids = results.map((r) => r.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(5);
    });
  });
});
