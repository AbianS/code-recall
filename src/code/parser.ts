/**
 * Tree-sitter Parser initialization for code-recall
 *
 * Uses web-tree-sitter (WASM) for cross-platform compatibility.
 */

import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Language, Parser, type Tree } from "web-tree-sitter";

const __dirname = dirname(fileURLToPath(import.meta.url));

let parserInstance: Parser | null = null;
let isInitializing = false;
let initPromise: Promise<void> | null = null;

// Language cache
const languageCache = new Map<string, Language>();

// Paths to WASM files
const WASM_PATHS = {
  parser: resolve(
    __dirname,
    "../../node_modules/web-tree-sitter/web-tree-sitter.wasm",
  ),
  typescript: resolve(
    __dirname,
    "../../node_modules/tree-sitter-typescript/tree-sitter-typescript.wasm",
  ),
  tsx: resolve(
    __dirname,
    "../../node_modules/tree-sitter-typescript/tree-sitter-tsx.wasm",
  ),
  javascript: resolve(
    __dirname,
    "../../node_modules/tree-sitter-javascript/tree-sitter-javascript.wasm",
  ),
};

/**
 * Initialize the tree-sitter parser with WASM support.
 */
async function initializeParser(): Promise<void> {
  if (parserInstance) return;

  if (isInitializing && initPromise) {
    await initPromise;
    return;
  }

  isInitializing = true;
  initPromise = (async () => {
    await Parser.init({
      locateFile: () => WASM_PATHS.parser,
    });
    parserInstance = new Parser();
  })();

  await initPromise;
  isInitializing = false;
}

/**
 * Get the parser instance (initializes if needed).
 */
export async function getParser(): Promise<Parser> {
  await initializeParser();
  if (!parserInstance) {
    throw new Error("Parser not initialized");
  }
  return parserInstance;
}

/**
 * Load a language grammar.
 */
export async function loadLanguage(
  language: "typescript" | "tsx" | "javascript",
): Promise<Language> {
  await initializeParser();

  const cached = languageCache.get(language);
  if (cached) return cached;

  const wasmPath = WASM_PATHS[language];
  const lang = await Language.load(wasmPath);
  languageCache.set(language, lang);

  return lang;
}

/**
 * Parse source code and return the syntax tree.
 */
export async function parseCode(
  source: string,
  language: "typescript" | "tsx" | "javascript",
): Promise<Tree> {
  const parser = await getParser();
  const lang = await loadLanguage(language);

  parser.setLanguage(lang);
  const tree = parser.parse(source);
  if (!tree) {
    throw new Error("Failed to parse source code");
  }
  return tree;
}

/**
 * Detect language from file extension.
 */
export function detectLanguage(
  filePath: string,
): "typescript" | "tsx" | "javascript" | null {
  const ext = filePath.toLowerCase().split(".").pop();

  switch (ext) {
    case "ts":
      return "typescript";
    case "tsx":
      return "tsx";
    case "js":
    case "mjs":
    case "cjs":
      return "javascript";
    case "jsx":
      return "javascript"; // JSX uses javascript grammar
    default:
      return null;
  }
}

// Re-export types for use in other modules
export type { Tree, Language };
export { Parser };
