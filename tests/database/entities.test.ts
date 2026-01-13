/**
 * Tests for Database Code Entity Operations
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

describe("Code Entity Operations", () => {
  describe("insertCodeEntity", () => {
    test("inserts entity and returns id", () => {
      const entityId = db.insertCodeEntity({
        filePath: "/src/test.ts",
        entityType: "function",
        name: "testFunction",
        qualifiedName: "testFunction",
        signature: "function testFunction(): void",
        docstring: "A test function",
        startLine: 1,
        endLine: 5,
        fileHash: "abc123",
      });

      expect(entityId).toBeGreaterThan(0);
    });

    test("inserts entity with minimal fields", () => {
      const entityId = db.insertCodeEntity({
        filePath: "/src/minimal.ts",
        entityType: "class",
        name: "MinimalClass",
        qualifiedName: "MinimalClass",
        startLine: 1,
        endLine: 10,
        fileHash: "def456",
      });

      expect(entityId).toBeGreaterThan(0);
    });

    test("handles all entity types", () => {
      const types = [
        "class",
        "function",
        "method",
        "interface",
        "type",
        "variable",
        "import",
      ] as const;

      for (const type of types) {
        const entityId = db.insertCodeEntity({
          filePath: "/src/types.ts",
          entityType: type,
          name: `Test${type}`,
          qualifiedName: `Test${type}`,
          startLine: 1,
          endLine: 1,
          fileHash: "type123",
        });

        expect(entityId).toBeGreaterThan(0);
      }
    });
  });

  describe("getCodeEntitiesByFile", () => {
    test("returns entities for file", () => {
      const filePath = "/src/entities-test-file.ts";
      const hash = "entities123";

      db.insertCodeEntity({
        filePath: filePath,
        entityType: "class",
        name: "TestClass",
        qualifiedName: "TestClass",
        startLine: 1,
        endLine: 10,
        fileHash: hash,
      });

      db.insertCodeEntity({
        filePath: filePath,
        entityType: "function",
        name: "testFunc",
        qualifiedName: "testFunc",
        startLine: 15,
        endLine: 20,
        fileHash: hash,
      });

      const entities = db.getCodeEntitiesByFile(filePath);

      expect(entities.length).toBe(2);
      expect(entities.every((e) => e.file_path === filePath)).toBe(true);
    });

    test("returns empty array for non-existent file", () => {
      const entities = db.getCodeEntitiesByFile("/non/existent/file.ts");
      expect(entities).toEqual([]);
    });
  });

  describe("getCodeEntitiesByHash", () => {
    test("returns entities for hash", () => {
      const hash = "unique-hash-123";

      db.insertCodeEntity({
        filePath: "/src/hash-test.ts",
        entityType: "interface",
        name: "TestInterface",
        qualifiedName: "TestInterface",
        startLine: 1,
        endLine: 5,
        fileHash: hash,
      });

      const entities = db.getCodeEntitiesByHash(hash);

      expect(entities.length).toBeGreaterThan(0);
      expect(entities.every((e) => e.file_hash === hash)).toBe(true);
    });

    test("returns empty array for non-existent hash", () => {
      const entities = db.getCodeEntitiesByHash("non-existent-hash");
      expect(entities).toEqual([]);
    });
  });

  describe("deleteCodeEntitiesByFile", () => {
    test("deletes all entities for file", () => {
      const filePath = "/src/to-delete.ts";

      db.insertCodeEntity({
        filePath: filePath,
        entityType: "class",
        name: "ToDelete",
        qualifiedName: "ToDelete",
        startLine: 1,
        endLine: 5,
        fileHash: "delete123",
      });

      expect(db.getCodeEntitiesByFile(filePath).length).toBeGreaterThan(0);

      db.deleteCodeEntitiesByFile(filePath);

      expect(db.getCodeEntitiesByFile(filePath).length).toBe(0);
    });

    test("does not affect other files", () => {
      const filePath1 = "/src/keep.ts";
      const filePath2 = "/src/remove.ts";

      db.insertCodeEntity({
        filePath: filePath1,
        entityType: "function",
        name: "keepFunc",
        qualifiedName: "keepFunc",
        startLine: 1,
        endLine: 3,
        fileHash: "keep123",
      });

      db.insertCodeEntity({
        filePath: filePath2,
        entityType: "function",
        name: "removeFunc",
        qualifiedName: "removeFunc",
        startLine: 1,
        endLine: 3,
        fileHash: "remove123",
      });

      db.deleteCodeEntitiesByFile(filePath2);

      expect(db.getCodeEntitiesByFile(filePath1).length).toBeGreaterThan(0);
      expect(db.getCodeEntitiesByFile(filePath2).length).toBe(0);
    });
  });

  describe("deleteCodeEntitiesByHash", () => {
    test("deletes all entities for hash", () => {
      const hash = "hash-to-delete";

      db.insertCodeEntity({
        filePath: "/src/hash-delete.ts",
        entityType: "type",
        name: "DeleteType",
        qualifiedName: "DeleteType",
        startLine: 1,
        endLine: 1,
        fileHash: hash,
      });

      expect(db.getCodeEntitiesByHash(hash).length).toBeGreaterThan(0);

      db.deleteCodeEntitiesByHash(hash);

      expect(db.getCodeEntitiesByHash(hash).length).toBe(0);
    });
  });

  describe("Memory-Entity Links", () => {
    test("links memory to entity", () => {
      const memoryId = db.insertMemory({
        category: "pattern",
        content: "This function is complex",
      });

      const entityId = db.insertCodeEntity({
        filePath: "/src/link-test.ts",
        entityType: "function",
        name: "complexFunc",
        qualifiedName: "complexFunc",
        startLine: 1,
        endLine: 50,
        fileHash: "link123",
      });

      // Should not throw
      db.linkMemoryToEntity(memoryId, entityId);
    });

    test("getMemoriesForEntity returns linked memories", () => {
      const memoryId = db.insertMemory({
        category: "decision",
        content: "Refactor this class",
      });

      const entityId = db.insertCodeEntity({
        filePath: "/src/memories-for-entity.ts",
        entityType: "class",
        name: "RefactorMe",
        qualifiedName: "RefactorMe",
        startLine: 1,
        endLine: 100,
        fileHash: "mfe123",
      });

      db.linkMemoryToEntity(memoryId, entityId);

      const memories = db.getMemoriesForEntity(entityId);

      expect(memories.length).toBeGreaterThan(0);
      expect(memories.some((m) => m.id === memoryId)).toBe(true);
    });

    test("getEntitiesForMemory returns linked entities", () => {
      const memoryId = db.insertMemory({
        category: "warning",
        content: "These functions have bugs",
      });

      const entityId1 = db.insertCodeEntity({
        filePath: "/src/efm1.ts",
        entityType: "function",
        name: "buggyFunc1",
        qualifiedName: "buggyFunc1",
        startLine: 1,
        endLine: 10,
        fileHash: "efm123",
      });

      const entityId2 = db.insertCodeEntity({
        filePath: "/src/efm2.ts",
        entityType: "function",
        name: "buggyFunc2",
        qualifiedName: "buggyFunc2",
        startLine: 1,
        endLine: 10,
        fileHash: "efm456",
      });

      db.linkMemoryToEntity(memoryId, entityId1);
      db.linkMemoryToEntity(memoryId, entityId2);

      const entities = db.getEntitiesForMemory(memoryId);

      expect(entities.length).toBe(2);
    });

    test("returns empty arrays when no links exist", () => {
      const memoryId = db.insertMemory({
        category: "learning",
        content: "Unlinked memory",
      });

      const entityId = db.insertCodeEntity({
        filePath: "/src/unlinked.ts",
        entityType: "variable",
        name: "unlinkedVar",
        qualifiedName: "unlinkedVar",
        startLine: 1,
        endLine: 1,
        fileHash: "unlinked123",
      });

      expect(db.getEntitiesForMemory(memoryId)).toEqual([]);
      expect(db.getMemoriesForEntity(entityId)).toEqual([]);
    });
  });
});
