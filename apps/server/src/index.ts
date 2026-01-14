#!/usr/bin/env bun
/**
 * code-recall - MCP Server Entry Point
 *
 * Ultra-fast semantic memory for AI agents.
 */

import { startServer } from "./server.ts";

// Determine project path from environment or current directory
const projectPath = process.env.CODE_RECALL_PROJECT_PATH ?? process.cwd();

// Start the server
startServer({ projectPath }).catch((error) => {
  console.error("[code-recall] Fatal error:", error);
  process.exit(1);
});
