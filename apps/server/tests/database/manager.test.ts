/**
 * Database Manager Tests
 */

import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { createTestDb } from "../setup.ts";

let db: ReturnType<typeof createTestDb>["db"];
let cleanup: () => void;

beforeAll(() => {
  const testSetup = createTestDb();
  db = testSetup.db;
  cleanup = testSetup.cleanup;
});

afterAll(() => {
  cleanup();
});

describe("Memory CRUD", () => {
  test("inserts and retrieves a memory", () => {
    const id = db.insertMemory({
      category: "decision",
      content: "Use JWT tokens for authentication",
      rationale: "Stateless auth for horizontal scaling",
      tags: ["auth", "architecture"],
    });

    expect(id).toBeGreaterThan(0);

    const memory = db.getMemoryById(id);
    expect(memory).not.toBeNull();
    expect(memory?.content).toBe("Use JWT tokens for authentication");
    expect(memory?.category).toBe("decision");
  });

  test("retrieves recent memories", () => {
    const recent = db.getRecentMemories(10);
    expect(recent.length).toBeGreaterThan(0);
  });

  test("retrieves memories by category", () => {
    const decisions = db.getMemoriesByCategory("decision");
    expect(decisions.length).toBeGreaterThan(0);
    expect(decisions.every((m) => m.category === "decision")).toBe(true);
  });

  test("updates memory outcome", () => {
    const id = db.insertMemory({
      category: "decision",
      content: "Test decision for outcome update",
    });

    db.updateMemoryOutcome(id, "It worked great!", true);

    const memory = db.getMemoryById(id);
    expect(memory?.outcome).toBe("It worked great!");
    expect(memory?.worked).toBe(1);
  });

  test("handles null memory ID gracefully", () => {
    const memory = db.getMemoryById(999999);
    expect(memory).toBeNull();
  });

  test("inserts memory with file_path", () => {
    const id = db.insertMemory({
      category: "pattern",
      content: "This function has complex logic",
      filePath: "/src/utils/complex.ts",
    });

    const memory = db.getMemoryById(id);
    expect(memory?.file_path).toBe("/src/utils/complex.ts");
  });

  test("inserts memory with all optional fields", () => {
    const id = db.insertMemory({
      category: "decision",
      content: "Full featured memory",
      rationale: "Testing all fields",
      tags: ["test", "full"],
      filePath: "/test/path.ts",
    });

    // Set outcome via update
    db.updateMemoryOutcome(id, "Initial outcome", true);

    const memory = db.getMemoryById(id);
    expect(memory?.content).toBe("Full featured memory");
    expect(memory?.rationale).toBe("Testing all fields");
    expect(memory?.outcome).toBe("Initial outcome");
    expect(memory?.worked).toBe(1);
    expect(memory?.file_path).toBe("/test/path.ts");
  });
});

describe("Rule CRUD", () => {
  test("inserts and retrieves rules", () => {
    const ruleId = db.insertRule({
      trigger: "adding new API endpoint",
      mustDo: ["Add rate limiting", "Write integration test"],
      mustNot: ["Use synchronous database calls"],
      askFirst: ["Is this a breaking change?"],
    });

    expect(ruleId).toBeGreaterThan(0);

    const rules = db.getActiveRules();
    expect(rules.length).toBeGreaterThan(0);

    const rule = db.getRuleById(ruleId);
    expect(rule).not.toBeNull();
    expect(rule?.trigger).toBe("adding new API endpoint");
  });

  test("handles rule with empty arrays", () => {
    const ruleId = db.insertRule({
      trigger: "simple rule",
      mustDo: [],
      mustNot: [],
      askFirst: [],
    });

    const rule = db.getRuleById(ruleId);
    expect(rule?.trigger).toBe("simple rule");
  });

  test("handles null rule ID gracefully", () => {
    const rule = db.getRuleById(999999);
    expect(rule).toBeNull();
  });

  test("gets rule by ID", () => {
    const ruleId = db.insertRule({
      trigger: "get by id test",
      mustDo: ["something"],
    });

    const rule = db.getRuleById(ruleId);
    expect(rule?.trigger).toBe("get by id test");
    expect(rule?.active).toBe(1);
  });
});

describe("Stats", () => {
  test("returns correct stats", () => {
    const stats = db.getStats();

    expect(stats.totalMemories).toBeGreaterThan(0);
    expect(stats.totalRules).toBeGreaterThan(0);
    expect(typeof stats.recentDecisions).toBe("number");
    expect(typeof stats.failedDecisions).toBe("number");
  });

  test("stats include category breakdown", () => {
    // Insert memories with different categories
    db.insertMemory({ category: "pattern", content: "Test pattern" });
    db.insertMemory({ category: "warning", content: "Test warning" });

    const stats = db.getStats();
    expect(typeof stats.totalMemories).toBe("number");
  });
});

describe("Full-Text Search", () => {
  test("searches memories by content", () => {
    db.insertMemory({
      category: "pattern",
      content: "The zebra module has performance issues",
    });

    const results = db.searchByFullText("zebra");
    expect(results.some((m) => m.content.includes("zebra"))).toBe(true);
  });

  test("returns empty array for no matches", () => {
    const results = db.searchByFullText("xyznonexistenttermxyz");
    expect(results).toEqual([]);
  });
});
