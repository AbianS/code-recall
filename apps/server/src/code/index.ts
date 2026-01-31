/**
 * CodeAnalyzer for code-recall
 *
 * Analyzes source code files using tree-sitter to extract
 * structural information (classes, functions, methods, etc.).
 */

import { createHash } from "node:crypto";
import { extractJavaScriptEntities } from "./extractors/javascript.ts";
import { extractRustEntities } from "./extractors/rust.ts";
import { extractTypeScriptEntities } from "./extractors/typescript.ts";
import { detectLanguage, parseCode } from "./parser.ts";
import type { AnalysisResult, CodeEntity, EntityType } from "./types.ts";

export interface AnalyzeOptions {
  includeTypes?: EntityType[];
}

/**
 * Analyze a source file and extract code entities.
 */
export async function analyzeFile(
  filePath: string,
  source: string,
  options: AnalyzeOptions = {},
): Promise<AnalysisResult> {
  const language = detectLanguage(filePath);

  if (!language) {
    throw new Error(`Unsupported file type: ${filePath}`);
  }

  // Calculate file hash for change detection
  const fileHash = createHash("sha256")
    .update(source)
    .digest("hex")
    .slice(0, 16);

  // Parse the source code
  const tree = await parseCode(source, language);

  // Extract entities based on language
  let entities: CodeEntity[];
  if (language === "javascript") {
    entities = extractJavaScriptEntities(tree, source);
  } else if (language === "rust") {
    entities = extractRustEntities(tree, source);
  } else {
    // TypeScript and TSX use the TypeScript extractor
    entities = extractTypeScriptEntities(tree, source);
  }

  // Filter by entity types if specified
  if (options.includeTypes && options.includeTypes.length > 0) {
    const types = options.includeTypes;
    entities = entities.filter((e) => types.includes(e.type));
  }

  return {
    filePath,
    fileHash,
    language: language === "tsx" ? "typescript" : language,
    entities,
    analyzedAt: new Date().toISOString(),
  };
}

/**
 * Get a summary of the code structure for display.
 */
export function formatAnalysisResult(result: AnalysisResult): string {
  const lines: string[] = [];

  lines.push(`File: ${result.filePath}`);
  lines.push(`Language: ${result.language}`);
  lines.push(`Hash: ${result.fileHash}`);
  lines.push(`Entities: ${result.entities.length}`);
  lines.push("");

  // Group entities by type
  const byType = new Map<EntityType, CodeEntity[]>();
  for (const entity of result.entities) {
    const list = byType.get(entity.type) || [];
    list.push(entity);
    byType.set(entity.type, list);
  }

  const typeOrder: EntityType[] = [
    "class",
    "struct",
    "enum",
    "trait",
    "impl",
    "interface",
    "type",
    "function",
    "method",
    "mod",
    "macro",
    "variable",
    "import",
  ];

  for (const type of typeOrder) {
    const entities = byType.get(type);
    if (!entities || entities.length === 0) continue;

    lines.push(
      `## ${type.charAt(0).toUpperCase() + type.slice(1)}s (${entities.length})`,
    );

    for (const entity of entities) {
      const loc = `L${entity.startLine}-${entity.endLine}`;
      lines.push(`  - ${entity.qualifiedName} [${loc}]`);
      if (entity.signature) {
        lines.push(`    ${entity.signature}`);
      }
    }
    lines.push("");
  }

  return lines.join("\n");
}

// Re-export types
export type {
  AnalysisResult,
  AnalyzeStructureResult,
  CodeEntity,
  CodeEntityRow,
  EntityType,
  MemoryCodeRefRow,
  RelatedMemory,
} from "./types.ts";
