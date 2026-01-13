/**
 * Tests for Embeddings module
 */

import { beforeAll, describe, expect, test } from "bun:test";
import {
  cosineSimilarity,
  EMBEDDING_DIMENSION,
  generateEmbedding,
  generateEmbeddings,
  warmupEmbeddings,
} from "../../src/memory/embeddings.ts";

describe("Embeddings", () => {
  // Warmup the model before tests (downloads ~23MB on first run)
  beforeAll(async () => {
    await warmupEmbeddings();
  });

  describe("generateEmbedding", () => {
    test("generates embedding with correct dimension", async () => {
      const embedding = await generateEmbedding("Hello world");

      expect(embedding).toBeInstanceOf(Float32Array);
      expect(embedding.length).toBe(EMBEDDING_DIMENSION);
      expect(embedding.length).toBe(384);
    });

    test("generates non-zero embeddings", async () => {
      const embedding = await generateEmbedding("Test text");

      // At least some values should be non-zero
      const hasNonZero = embedding.some((v) => v !== 0);
      expect(hasNonZero).toBe(true);
    });

    test("generates different embeddings for different texts", async () => {
      const embedding1 = await generateEmbedding("The quick brown fox");
      const embedding2 = await generateEmbedding("Machine learning algorithms");

      // Compare first few values - they should be different
      let samCount = 0;
      for (let i = 0; i < 10; i++) {
        const val1 = embedding1[i] ?? 0;
        const val2 = embedding2[i] ?? 0;
        if (Math.abs(val1 - val2) < 0.001) {
          samCount++;
        }
      }
      expect(samCount).toBeLessThan(10); // Most values should differ
    });

    test("generates similar embeddings for similar texts", async () => {
      const embedding1 = await generateEmbedding("The cat sat on the mat");
      const embedding2 = await generateEmbedding("A cat is sitting on a mat");

      const similarity = cosineSimilarity(embedding1, embedding2);
      expect(similarity).toBeGreaterThan(0.7); // Should be quite similar
    });

    test("handles empty string", async () => {
      const embedding = await generateEmbedding("");

      expect(embedding).toBeInstanceOf(Float32Array);
      expect(embedding.length).toBe(EMBEDDING_DIMENSION);
    });

    test("truncates very long text", async () => {
      // Create text longer than 8000 chars
      const longText = "a".repeat(10000);
      const embedding = await generateEmbedding(longText);

      expect(embedding).toBeInstanceOf(Float32Array);
      expect(embedding.length).toBe(EMBEDDING_DIMENSION);
    });

    test("handles special characters", async () => {
      const embedding = await generateEmbedding(
        'Hello! @#$%^&*()_+ "quotes" 日本語',
      );

      expect(embedding).toBeInstanceOf(Float32Array);
      expect(embedding.length).toBe(EMBEDDING_DIMENSION);
    });

    test("handles unicode and emojis", async () => {
      const embedding = await generateEmbedding("Hello 世界 🌍 Привет");

      expect(embedding).toBeInstanceOf(Float32Array);
      expect(embedding.length).toBe(EMBEDDING_DIMENSION);
    });
  });

  describe("generateEmbeddings", () => {
    test("generates embeddings for multiple texts", async () => {
      const texts = ["First text", "Second text", "Third text"];
      const embeddings = await generateEmbeddings(texts);

      expect(embeddings.length).toBe(3);
      for (const embedding of embeddings) {
        expect(embedding).toBeInstanceOf(Float32Array);
        expect(embedding.length).toBe(EMBEDDING_DIMENSION);
      }
    });

    test("handles empty array", async () => {
      const embeddings = await generateEmbeddings([]);
      expect(embeddings).toEqual([]);
    });

    test("handles single text", async () => {
      const embeddings = await generateEmbeddings(["Only one"]);
      expect(embeddings.length).toBe(1);
      expect(embeddings[0]).toBeInstanceOf(Float32Array);
    });
  });

  describe("cosineSimilarity", () => {
    test("returns 1 for identical vectors", () => {
      const vec = new Float32Array([1, 2, 3, 4, 5]);
      const similarity = cosineSimilarity(vec, vec);
      expect(similarity).toBeCloseTo(1, 5);
    });

    test("returns 0 for orthogonal vectors", () => {
      const vec1 = new Float32Array([1, 0, 0]);
      const vec2 = new Float32Array([0, 1, 0]);
      const similarity = cosineSimilarity(vec1, vec2);
      expect(similarity).toBeCloseTo(0, 5);
    });

    test("returns -1 for opposite vectors", () => {
      const vec1 = new Float32Array([1, 2, 3]);
      const vec2 = new Float32Array([-1, -2, -3]);
      const similarity = cosineSimilarity(vec1, vec2);
      expect(similarity).toBeCloseTo(-1, 5);
    });

    test("handles zero vectors", () => {
      const vec1 = new Float32Array([0, 0, 0]);
      const vec2 = new Float32Array([1, 2, 3]);
      const similarity = cosineSimilarity(vec1, vec2);
      expect(similarity).toBe(0);
    });

    test("is symmetric", () => {
      const vec1 = new Float32Array([1, 2, 3]);
      const vec2 = new Float32Array([4, 5, 6]);
      expect(cosineSimilarity(vec1, vec2)).toBeCloseTo(
        cosineSimilarity(vec2, vec1),
        10,
      );
    });

    test("throws for different dimensions", () => {
      const vec1 = new Float32Array([1, 2, 3]);
      const vec2 = new Float32Array([1, 2, 3, 4]);
      expect(() => cosineSimilarity(vec1, vec2)).toThrow(
        "Embeddings must have the same dimension",
      );
    });

    test("handles normalized vectors", () => {
      // Normalized vectors (length = 1)
      const vec1 = new Float32Array([0.6, 0.8, 0]);
      const vec2 = new Float32Array([0.8, 0.6, 0]);
      const similarity = cosineSimilarity(vec1, vec2);
      // dot product of normalized vectors = cosine
      expect(similarity).toBeCloseTo(0.96, 2);
    });
  });

  describe("warmupEmbeddings", () => {
    test("completes without error", async () => {
      // Should not throw
      await warmupEmbeddings();
    });
  });

  describe("EMBEDDING_DIMENSION", () => {
    test("is 384", () => {
      expect(EMBEDDING_DIMENSION).toBe(384);
    });
  });
});
