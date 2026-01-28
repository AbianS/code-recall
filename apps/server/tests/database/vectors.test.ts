/**
 * Tests for Database Vector Operations
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

describe("Vector Operations", () => {
  describe("insertMemoryVector", () => {
    test("inserts vector for memory", () => {
      const memoryId = db.insertMemory({
        category: "pattern",
        content: "Test memory for vector",
      });

      const vector = new Float32Array(384).fill(0.1);
      db.insertMemoryVector(memoryId, vector);

      // Verify by searching
      const results = db.searchByVector(vector, 5);
      const found = results.some((r) => r.memory_id === memoryId);
      expect(found).toBe(true);
    });

    test("handles normalized vectors", () => {
      const memoryId = db.insertMemory({
        category: "decision",
        content: "Normalized vector test",
      });

      // Create normalized vector (unit length)
      const vector = new Float32Array(384);
      const value = 1 / Math.sqrt(384);
      vector.fill(value);

      db.insertMemoryVector(memoryId, vector);

      const results = db.searchByVector(vector, 5);
      expect(results.length).toBeGreaterThan(0);
    });

    test("handles vectors with various values", () => {
      const memoryId = db.insertMemory({
        category: "pattern",
        content: "Various values vector",
      });

      const vector = new Float32Array(384);
      for (let i = 0; i < 384; i++) {
        vector[i] = (i % 10) / 10 - 0.5; // Values between -0.5 and 0.4
      }

      db.insertMemoryVector(memoryId, vector);

      const results = db.searchByVector(vector, 5);
      expect(results.some((r) => r.memory_id === memoryId)).toBe(true);
    });
  });

  describe("searchByVector", () => {
    test("returns results sorted by distance", () => {
      // Insert multiple vectors with different values
      for (let i = 0; i < 5; i++) {
        const memoryId = db.insertMemory({
          category: "learning",
          content: `Distance test memory ${i}`,
        });

        const vector = new Float32Array(384).fill(i * 0.1);
        db.insertMemoryVector(memoryId, vector);
      }

      const queryVector = new Float32Array(384).fill(0.2);
      const results = db.searchByVector(queryVector, 10);

      // Results should be sorted by distance (ascending)
      for (let i = 1; i < results.length; i++) {
        const prev = results[i - 1];
        const curr = results[i];
        if (prev && curr) {
          expect(prev.distance).toBeLessThanOrEqual(curr.distance);
        }
      }
    });

    test("respects limit parameter", () => {
      const vector = new Float32Array(384).fill(0.5);
      const results = db.searchByVector(vector, 3);

      expect(results.length).toBeLessThanOrEqual(3);
    });

    test("returns memory_id and distance", () => {
      const memoryId = db.insertMemory({
        category: "pattern",
        content: "Structure test",
      });

      const vector = new Float32Array(384).fill(0.3);
      db.insertMemoryVector(memoryId, vector);

      const results = db.searchByVector(vector, 5);

      expect(results.length).toBeGreaterThan(0);
      const first = results[0];
      expect(first).toBeDefined();
      expect(typeof first?.memory_id).toBe("number");
      expect(typeof first?.distance).toBe("number");
    });

    test("handles zero vector query", () => {
      const zeroVector = new Float32Array(384).fill(0);
      const results = db.searchByVector(zeroVector, 5);

      expect(Array.isArray(results)).toBe(true);
    });

    test("finds exact match with zero distance", () => {
      const memoryId = db.insertMemory({
        category: "learning",
        content: "Exact match test",
      });

      const vector = new Float32Array(384);
      for (let i = 0; i < 384; i++) {
        vector[i] = Math.sin(i);
      }

      db.insertMemoryVector(memoryId, vector);

      const results = db.searchByVector(vector, 5);
      const match = results.find((r) => r.memory_id === memoryId);

      expect(match).toBeDefined();
      expect(match?.distance).toBeLessThan(0.001); // Very small distance
    });
  });

  describe("vector dimension validation", () => {
    test("accepts 384-dimensional vector", () => {
      const memoryId = db.insertMemory({
        category: "pattern",
        content: "Dimension test",
      });

      const vector = new Float32Array(384).fill(0.1);

      // Should not throw
      db.insertMemoryVector(memoryId, vector);
    });
  });
});
