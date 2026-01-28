/**
 * RulesEngine for code-recall
 *
 * Manages decision rules and semantic matching for guardrails.
 */

import type { DatabaseManager, RuleRow } from "../database/index.ts";
import { cosineSimilarity, generateEmbedding } from "../memory/embeddings.ts";

export interface Rule {
  id: number;
  trigger: string;
  mustDo: string[];
  mustNot: string[];
  askFirst: string[];
  createdAt: string;
}

export interface RuleMatch {
  rule: Rule;
  similarity: number;
}

export interface CheckRulesResult {
  matchedRules: RuleMatch[];
  mustDo: string[];
  mustNot: string[];
  askFirst: string[];
}

// Cache for rule embeddings
const ruleEmbeddingsCache = new Map<number, Float32Array>();

function parseRule(row: RuleRow): Rule {
  return {
    id: row.id,
    trigger: row.trigger,
    mustDo: row.must_do ? JSON.parse(row.must_do) : [],
    mustNot: row.must_not ? JSON.parse(row.must_not) : [],
    askFirst: row.ask_first ? JSON.parse(row.ask_first) : [],
    createdAt: row.created_at,
  };
}

export class RulesEngine {
  private db: DatabaseManager;
  private similarityThreshold: number;

  constructor(db: DatabaseManager, similarityThreshold: number = 0.6) {
    this.db = db;
    this.similarityThreshold = similarityThreshold;
  }

  /**
   * Add a new rule.
   */
  async addRule(params: {
    trigger: string;
    mustDo?: string[];
    mustNot?: string[];
    askFirst?: string[];
  }): Promise<number> {
    const ruleId = this.db.insertRule({
      trigger: params.trigger,
      mustDo: params.mustDo,
      mustNot: params.mustNot,
      askFirst: params.askFirst,
    });

    // Pre-cache the embedding
    const embedding = await generateEmbedding(params.trigger);
    ruleEmbeddingsCache.set(ruleId, embedding);

    return ruleId;
  }

  /**
   * Check rules against an action using semantic matching.
   */
  async checkRules(action: string): Promise<CheckRulesResult> {
    const rules = this.db.getActiveRules();

    if (rules.length === 0) {
      return {
        matchedRules: [],
        mustDo: [],
        mustNot: [],
        askFirst: [],
      };
    }

    // Generate action embedding
    const actionEmbedding = await generateEmbedding(action);

    // Find matching rules
    const matchedRules: RuleMatch[] = [];

    for (const ruleRow of rules) {
      // Get or generate rule embedding
      let ruleEmbedding = ruleEmbeddingsCache.get(ruleRow.id);
      if (!ruleEmbedding) {
        ruleEmbedding = await generateEmbedding(ruleRow.trigger);
        ruleEmbeddingsCache.set(ruleRow.id, ruleEmbedding);
      }

      // Calculate similarity
      const similarity = cosineSimilarity(actionEmbedding, ruleEmbedding);

      if (similarity >= this.similarityThreshold) {
        matchedRules.push({
          rule: parseRule(ruleRow),
          similarity,
        });
      }
    }

    // Sort by similarity (highest first)
    matchedRules.sort((a, b) => b.similarity - a.similarity);

    // Aggregate all must_do, must_not, ask_first from matched rules
    const mustDo = new Set<string>();
    const mustNot = new Set<string>();
    const askFirst = new Set<string>();

    for (const match of matchedRules) {
      for (const item of match.rule.mustDo) mustDo.add(item);
      for (const item of match.rule.mustNot) mustNot.add(item);
      for (const item of match.rule.askFirst) askFirst.add(item);
    }

    return {
      matchedRules,
      mustDo: [...mustDo],
      mustNot: [...mustNot],
      askFirst: [...askFirst],
    };
  }

  /**
   * List all active rules.
   */
  listRules(): Rule[] {
    return this.db.getActiveRules().map(parseRule);
  }

  /**
   * Get a specific rule by ID.
   */
  getRule(id: number): Rule | null {
    const row = this.db.getRuleById(id);
    return row ? parseRule(row) : null;
  }

  /**
   * Clear the rule embeddings cache.
   */
  clearCache(): void {
    ruleEmbeddingsCache.clear();
  }
}

export type { RuleRow };
