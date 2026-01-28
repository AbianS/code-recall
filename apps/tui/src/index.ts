#!/usr/bin/env bun
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { createCliRenderer } from "@opentui/core";
import { App } from "./app.ts";
import { DataStore } from "./data/store.ts";

function getProjectPath(): string {
  // Check CLI args
  const args = process.argv.slice(2);
  const projectIdx = args.indexOf("--project");
  if (projectIdx >= 0 && args[projectIdx + 1]) {
    return resolve(args[projectIdx + 1]!);
  }

  // Check env var
  if (process.env.CODE_RECALL_PROJECT_PATH) {
    return resolve(process.env.CODE_RECALL_PROJECT_PATH);
  }

  // Default to cwd
  return process.cwd();
}

async function main() {
  const projectPath = getProjectPath();
  const dbPath = `${projectPath}/.code-recall/memory.db`;

  if (!existsSync(dbPath)) {
    console.error(
      `\n  Error: No code-recall database found.\n\n` +
        `  Looked at: ${dbPath}\n\n` +
        `  Run the code-recall MCP server first to initialize the database,\n` +
        `  or specify a project path:\n\n` +
        `    code-recall-tui --project /path/to/project\n`,
    );
    process.exit(1);
  }

  let store: DataStore;
  try {
    store = new DataStore(projectPath);
  } catch (err) {
    console.error(
      `\n  Error: Could not open database.\n  ${err instanceof Error ? err.message : err}\n`,
    );
    process.exit(1);
  }

  const renderer = await createCliRenderer({
    exitOnCtrlC: true,
  });

  const app = new App(renderer, store, projectPath);
  app.start();
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
