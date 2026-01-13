/**
 * Embeddings Manager for code-recall
 *
 * Generates vector embeddings using @xenova/transformers with the
 * all-MiniLM-L6-v2 model (384 dimensions).
 */

import { type FeatureExtractionPipeline, pipeline } from "@xenova/transformers";

const MODEL_NAME = "Xenova/all-MiniLM-L6-v2";
const EMBEDDING_DIMENSION = 384;

let embeddingPipeline: FeatureExtractionPipeline | null = null;
let isInitializing = false;
let initPromise: Promise<void> | null = null;

/**
 * Initialize the embedding pipeline (lazy loading).
 * Downloads the model on first use (~23MB).
 */
async function initializePipeline(): Promise<void> {
  if (embeddingPipeline) return;

  if (isInitializing && initPromise) {
    await initPromise;
    return;
  }

  isInitializing = true;
  initPromise = (async () => {
    console.error("[code-recall] Loading embedding model...");
    embeddingPipeline = await pipeline("feature-extraction", MODEL_NAME, {
      quantized: true, // Use quantized model for faster inference
    });
    console.error("[code-recall] Embedding model loaded.");
  })();

  await initPromise;
  isInitializing = false;
}

/**
 * Generate embeddings for a single text.
 *
 * @param text - The text to embed
 * @returns Float32Array of 384 dimensions
 */
export async function generateEmbedding(text: string): Promise<Float32Array> {
  await initializePipeline();

  if (!embeddingPipeline) {
    throw new Error("Embedding pipeline not initialized");
  }

  // Truncate text to avoid token limits (model max is 256 tokens)
  const truncatedText = text.slice(0, 8000);

  const output = await embeddingPipeline(truncatedText, {
    pooling: "mean",
    normalize: true,
  });

  // Convert to Float32Array
  const embedding = new Float32Array(EMBEDDING_DIMENSION);
  for (let i = 0; i < EMBEDDING_DIMENSION; i++) {
    embedding[i] = output.data[i];
  }

  return embedding;
}

/**
 * Generate embeddings for multiple texts in batch.
 *
 * @param texts - Array of texts to embed
 * @returns Array of Float32Array embeddings
 */
export async function generateEmbeddings(
  texts: string[],
): Promise<Float32Array[]> {
  await initializePipeline();

  if (!embeddingPipeline) {
    throw new Error("Embedding pipeline not initialized");
  }

  const results: Float32Array[] = [];

  for (const text of texts) {
    const embedding = await generateEmbedding(text);
    results.push(embedding);
  }

  return results;
}

/**
 * Calculate cosine similarity between two embeddings.
 */
export function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length) {
    throw new Error("Embeddings must have the same dimension");
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    const aVal = a[i]!;
    const bVal = b[i]!;
    dotProduct += aVal * bVal;
    normA += aVal * aVal;
    normB += bVal * bVal;
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (normA * normB);
}

/**
 * Pre-warm the embedding pipeline.
 * Call this at server startup for faster first queries.
 */
export async function warmupEmbeddings(): Promise<void> {
  await generateEmbedding("warmup");
}

export { EMBEDDING_DIMENSION };
