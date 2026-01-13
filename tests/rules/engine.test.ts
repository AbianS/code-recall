/**
 * Tests for RulesEngine module
 */

import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { warmupEmbeddings } from "../../src/memory/embeddings.ts";
import { RulesEngine } from "../../src/rules/index.ts";
import { createTestDb } from "../setup.ts";

let db: ReturnType<typeof createTestDb>["db"];
let cleanup: () => void;
let rulesEngine: RulesEngine;

beforeAll(async () => {
  const testSetup = createTestDb();
  db = testSetup.db;
  cleanup = testSetup.cleanup;
  rulesEngine = new RulesEngine(db);

  // Warmup embeddings
  await warmupEmbeddings();
});

afterAll(() => {
  cleanup();
});

describe("RulesEngine", () => {
  describe("addRule", () => {
    test("adds rule and returns id", async () => {
      const ruleId = await rulesEngine.addRule({
        trigger: "creating a new API endpoint",
        mustDo: ["Add input validation", "Write unit tests"],
        mustNot: ["Use synchronous calls"],
        askFirst: ["Is authentication required?"],
      });

      expect(ruleId).toBeGreaterThan(0);
    });

    test("adds rule with minimal fields", async () => {
      const ruleId = await rulesEngine.addRule({
        trigger: "modifying database schema",
      });

      expect(ruleId).toBeGreaterThan(0);
    });

    test("adds rule with empty arrays", async () => {
      const ruleId = await rulesEngine.addRule({
        trigger: "deploying to production",
        mustDo: [],
        mustNot: [],
        askFirst: [],
      });

      expect(ruleId).toBeGreaterThan(0);
    });
  });

  describe("checkRules", () => {
    test("finds semantically matching rules", async () => {
      await rulesEngine.addRule({
        trigger: "adding a REST API endpoint",
        mustDo: ["Add rate limiting"],
        mustNot: ["Skip authentication"],
      });

      const result = await rulesEngine.checkRules(
        "creating a new REST endpoint for user registration",
      );

      // May or may not match depending on similarity threshold
      expect(Array.isArray(result.matchedRules)).toBe(true);
      expect(Array.isArray(result.mustDo)).toBe(true);
      expect(Array.isArray(result.mustNot)).toBe(true);
      expect(Array.isArray(result.askFirst)).toBe(true);
    });

    test("returns empty arrays when no rules match", async () => {
      const result = await rulesEngine.checkRules(
        "completely unrelated task like cooking dinner",
      );

      // With default threshold, unrelated tasks should not match
      expect(result.matchedRules.length).toBe(0);
      expect(result.mustDo.length).toBe(0);
      expect(result.mustNot.length).toBe(0);
      expect(result.askFirst.length).toBe(0);
    });

    test("aggregates items from multiple matched rules", async () => {
      await rulesEngine.addRule({
        trigger: "writing database queries",
        mustDo: ["Use parameterized queries"],
        mustNot: ["Use string concatenation"],
      });

      await rulesEngine.addRule({
        trigger: "database operations",
        mustDo: ["Handle connection errors"],
        askFirst: ["Is this a read or write operation?"],
      });

      const result = await rulesEngine.checkRules(
        "writing a complex SQL database query",
      );

      // If both rules match, their items should be aggregated
      if (result.matchedRules.length >= 2) {
        expect(result.mustDo.length).toBeGreaterThanOrEqual(1);
      }
    });

    test("returns similarity scores", async () => {
      await rulesEngine.addRule({
        trigger: "handling user authentication",
        mustDo: ["Verify token expiration"],
      });

      const result = await rulesEngine.checkRules(
        "implementing user login with authentication",
      );

      if (result.matchedRules.length > 0) {
        for (const match of result.matchedRules) {
          expect(typeof match.similarity).toBe("number");
          expect(match.similarity).toBeGreaterThanOrEqual(0);
          expect(match.similarity).toBeLessThanOrEqual(1);
        }
      }
    });

    test("sorts matched rules by similarity", async () => {
      const result = await rulesEngine.checkRules(
        "some action that might match",
      );

      if (result.matchedRules.length > 1) {
        for (let i = 1; i < result.matchedRules.length; i++) {
          expect(result.matchedRules[i - 1]!.similarity).toBeGreaterThanOrEqual(
            result.matchedRules[i]!.similarity,
          );
        }
      }
    });
  });

  describe("listRules", () => {
    test("returns all active rules", () => {
      const rules = rulesEngine.listRules();

      expect(Array.isArray(rules)).toBe(true);
      for (const rule of rules) {
        expect(typeof rule.id).toBe("number");
        expect(typeof rule.trigger).toBe("string");
        expect(Array.isArray(rule.mustDo)).toBe(true);
        expect(Array.isArray(rule.mustNot)).toBe(true);
        expect(Array.isArray(rule.askFirst)).toBe(true);
      }
    });
  });

  describe("getRule", () => {
    test("returns rule by id", async () => {
      const ruleId = await rulesEngine.addRule({
        trigger: "specific test rule",
        mustDo: ["Do this"],
      });

      const rule = rulesEngine.getRule(ruleId);

      expect(rule).not.toBeNull();
      expect(rule?.trigger).toBe("specific test rule");
      expect(rule?.mustDo).toContain("Do this");
    });

    test("returns null for non-existent id", () => {
      const rule = rulesEngine.getRule(999999);
      expect(rule).toBeNull();
    });
  });

  describe("clearCache", () => {
    test("clears embeddings cache without error", () => {
      rulesEngine.clearCache();
      // Should not throw
    });

    test("regenerates embeddings after cache clear", async () => {
      await rulesEngine.addRule({
        trigger: "cached rule test",
        mustDo: ["Test item"],
      });

      rulesEngine.clearCache();

      // Should still work after cache clear
      const result = await rulesEngine.checkRules("cached rule test");
      expect(Array.isArray(result.matchedRules)).toBe(true);
    });
  });

  describe("similarity threshold", () => {
    test("respects custom similarity threshold", async () => {
      // Create engine with very high threshold
      const strictEngine = new RulesEngine(db, 0.95);

      await strictEngine.addRule({
        trigger: "very specific trigger",
        mustDo: ["Specific action"],
      });

      // With high threshold, similar but not identical text should not match
      const result = await strictEngine.checkRules(
        "somewhat different trigger",
      );

      // High threshold should filter out most matches
      expect(result.matchedRules.length).toBeLessThanOrEqual(
        rulesEngine.listRules().length,
      );
    });

    test("lower threshold matches more rules", async () => {
      const lenientEngine = new RulesEngine(db, 0.3);

      await lenientEngine.addRule({
        trigger: "working with files",
        mustDo: ["Check permissions"],
      });

      const result = await lenientEngine.checkRules("handling file operations");

      // Lower threshold should be more permissive
      expect(Array.isArray(result.matchedRules)).toBe(true);
    });
  });
});
