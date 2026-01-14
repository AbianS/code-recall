/**
 * MCP Server for code-recall
 *
 * Exposes memory and rules tools via the Model Context Protocol.
 */

import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  analyzeFile,
  type EntityType,
  formatAnalysisResult,
} from "./code/index.ts";
import { DatabaseManager } from "./database/index.ts";
import { MemoryManager } from "./memory/index.ts";
import { RulesEngine } from "./rules/index.ts";

const VERSION = "0.1.0";

export interface ServerConfig {
  projectPath: string;
}

export function createServer(config: ServerConfig) {
  // Initialize managers
  const db = new DatabaseManager({ projectPath: config.projectPath });
  const memoryManager = new MemoryManager(db);
  const rulesEngine = new RulesEngine(db);

  // Create MCP server
  const server = new McpServer(
    {
      name: "code-recall",
      version: VERSION,
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  // ============ Tool: store_observation ============
  server.registerTool(
    "store_observation",
    {
      title: "Store Observation",
      description:
        "Store a new observation, decision, pattern, warning, or learning in memory. Returns the memory ID and warns if similar failed approaches exist.",
      inputSchema: {
        category: z
          .enum(["decision", "pattern", "warning", "learning"])
          .describe("Type of observation"),
        content: z.string().describe("The main content of the observation"),
        rationale: z.string().optional().describe("Why this decision was made"),
        context: z.string().optional().describe("Additional context"),
        tags: z
          .array(z.string())
          .optional()
          .describe("Tags for categorization"),
        file_path: z.string().optional().describe("Associated file path"),
      },
    },
    async (args) => {
      const result = await memoryManager.storeObservation({
        category: args.category,
        content: args.content,
        rationale: args.rationale,
        context: args.context,
        tags: args.tags,
        filePath: args.file_path,
      });

      let responseText = `Stored observation with ID: ${result.id}`;
      if (result.conflictWarning) {
        responseText += `\n\n⚠️ ${result.conflictWarning}`;
      }

      return {
        content: [{ type: "text", text: responseText }],
      };
    },
  );

  // ============ Tool: search_memory ============
  server.registerTool(
    "search_memory",
    {
      title: "Search Memory",
      description:
        "Search memories using semantic similarity. Returns relevant decisions, patterns, warnings, and learnings.",
      inputSchema: {
        query: z.string().describe("Search query"),
        limit: z
          .number()
          .optional()
          .default(10)
          .describe("Maximum results to return"),
        category: z
          .enum(["decision", "pattern", "warning", "learning"])
          .optional()
          .describe("Filter by category"),
        file_path: z.string().optional().describe("Filter by file path"),
      },
    },
    async (args) => {
      const results = await memoryManager.searchMemory({
        query: args.query,
        limit: args.limit,
        category: args.category,
        filePath: args.file_path,
      });

      if (results.length === 0) {
        return {
          content: [{ type: "text", text: "No relevant memories found." }],
        };
      }

      const formatted = results
        .map((r, i) => {
          const mem = r.memory;
          const tags = mem.tags ? JSON.parse(mem.tags).join(", ") : "";
          const outcome =
            mem.worked === 0
              ? "❌ FAILED"
              : mem.worked === 1
                ? "✅ WORKED"
                : "⏳ PENDING";

          return `## ${i + 1}. [${mem.category.toUpperCase()}] (ID: ${mem.id})
**Content:** ${mem.content}
${mem.rationale ? `**Rationale:** ${mem.rationale}` : ""}
${tags ? `**Tags:** ${tags}` : ""}
${mem.file_path ? `**File:** ${mem.file_path}` : ""}
**Outcome:** ${outcome}
**Score:** ${(r.score * 100).toFixed(1)}%
**Created:** ${mem.created_at}`;
        })
        .join("\n\n---\n\n");

      return {
        content: [
          {
            type: "text",
            text: `Found ${results.length} relevant memories:\n\n${formatted}`,
          },
        ],
      };
    },
  );

  // ============ Tool: get_briefing ============
  server.registerTool(
    "get_briefing",
    {
      title: "Get Briefing",
      description:
        "Get a session start briefing with recent decisions, active warnings, failed approaches, and optionally pre-fetch context for focus areas.",
      inputSchema: {
        focus_areas: z
          .array(z.string())
          .optional()
          .describe("Topics to pre-fetch context for"),
      },
    },
    async (args) => {
      const stats = memoryManager.getStats();
      const recentDecisions = memoryManager.getRecentMemories(5);
      const warnings = memoryManager.getWarnings();
      const failedDecisions = memoryManager.getFailedDecisions();

      let briefing = `# Session Briefing

## Database Stats
- Total memories: ${stats.totalMemories}
- Active rules: ${stats.totalRules}
- Recent decisions (7 days): ${stats.recentDecisions}
- Failed decisions: ${stats.failedDecisions}

## Categories
${Object.entries(stats.byCategory)
  .map(([cat, count]) => `- ${cat}: ${count}`)
  .join("\n")}
`;

      if (warnings.length > 0) {
        briefing += `\n## ⚠️ Active Warnings
${warnings.map((w) => `- ${w.content}`).join("\n")}
`;
      }

      if (failedDecisions.length > 0) {
        briefing += `\n## ❌ Failed Approaches to Avoid
${failedDecisions
  .slice(0, 5)
  .map((d) => `- ${d.content}${d.outcome ? ` (${d.outcome})` : ""}`)
  .join("\n")}
`;
      }

      if (recentDecisions.length > 0) {
        briefing += `\n## Recent Decisions
${recentDecisions.map((d) => `- [${d.category}] ${d.content.slice(0, 100)}...`).join("\n")}
`;
      }

      // Pre-fetch context for focus areas
      if (args.focus_areas && args.focus_areas.length > 0) {
        briefing += `\n## Focus Area Context\n`;
        for (const area of args.focus_areas) {
          const results = await memoryManager.searchMemory({
            query: area,
            limit: 3,
          });
          if (results.length > 0) {
            briefing += `\n### ${area}
${results.map((r) => `- ${r.memory.content.slice(0, 150)}...`).join("\n")}
`;
          }
        }
      }

      return {
        content: [{ type: "text", text: briefing }],
      };
    },
  );

  // ============ Tool: set_rule ============
  server.registerTool(
    "set_rule",
    {
      title: "Set Rule",
      description:
        "Create a new rule/guardrail. Rules are matched semantically against actions to enforce must-do, must-not, and ask-first requirements.",
      inputSchema: {
        trigger: z
          .string()
          .describe(
            'Action pattern that triggers this rule (e.g., "adding API endpoint")',
          ),
        must_do: z
          .array(z.string())
          .optional()
          .describe("Things that must be done"),
        must_not: z
          .array(z.string())
          .optional()
          .describe("Things that must not be done"),
        ask_first: z
          .array(z.string())
          .optional()
          .describe("Questions to consider before proceeding"),
      },
    },
    async (args) => {
      const ruleId = await rulesEngine.addRule({
        trigger: args.trigger,
        mustDo: args.must_do,
        mustNot: args.must_not,
        askFirst: args.ask_first,
      });

      return {
        content: [
          {
            type: "text",
            text: `Rule created with ID: ${ruleId}\n\nTrigger: "${args.trigger}"\nMust do: ${args.must_do?.join(", ") || "none"}\nMust not: ${args.must_not?.join(", ") || "none"}\nAsk first: ${args.ask_first?.join(", ") || "none"}`,
          },
        ],
      };
    },
  );

  // ============ Tool: check_rules ============
  server.registerTool(
    "check_rules",
    {
      title: "Check Rules",
      description:
        "Check what rules apply to a given action. Uses semantic matching to find relevant guardrails.",
      inputSchema: {
        action: z.string().describe("The action you are about to take"),
      },
    },
    async (args) => {
      const result = await rulesEngine.checkRules(args.action);

      if (result.matchedRules.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: `No rules matched for action: "${args.action}"`,
            },
          ],
        };
      }

      let response = `# Rules for: "${args.action}"\n\n`;

      if (result.mustDo.length > 0) {
        response += `## ✅ MUST DO\n${result.mustDo.map((r) => `- ${r}`).join("\n")}\n\n`;
      }

      if (result.mustNot.length > 0) {
        response += `## ❌ MUST NOT\n${result.mustNot.map((r) => `- ${r}`).join("\n")}\n\n`;
      }

      if (result.askFirst.length > 0) {
        response += `## ❓ ASK FIRST\n${result.askFirst.map((r) => `- ${r}`).join("\n")}\n\n`;
      }

      response += `## Matched Rules\n${result.matchedRules.map((m) => `- "${m.rule.trigger}" (${(m.similarity * 100).toFixed(0)}% match)`).join("\n")}`;

      return {
        content: [{ type: "text", text: response }],
      };
    },
  );

  // ============ Tool: record_outcome ============
  server.registerTool(
    "record_outcome",
    {
      title: "Record Outcome",
      description:
        "Record whether a decision worked or failed. Failed decisions are boosted in future searches.",
      inputSchema: {
        memory_id: z.number().describe("ID of the memory to update"),
        outcome: z.string().describe("Description of the outcome"),
        worked: z.boolean().describe("Whether the approach worked"),
      },
    },
    async (args) => {
      const memory = memoryManager.getMemory(args.memory_id);
      if (!memory) {
        return {
          content: [
            {
              type: "text",
              text: `Memory with ID ${args.memory_id} not found.`,
            },
          ],
        };
      }

      memoryManager.recordOutcome(args.memory_id, args.outcome, args.worked);

      const status = args.worked ? "✅ WORKED" : "❌ FAILED";
      return {
        content: [
          {
            type: "text",
            text: `Outcome recorded for memory ${args.memory_id}:\nStatus: ${status}\nOutcome: ${args.outcome}`,
          },
        ],
      };
    },
  );

  // ============ Tool: list_rules ============
  server.registerTool(
    "list_rules",
    {
      title: "List Rules",
      description: "List all active rules/guardrails.",
      inputSchema: {},
    },
    async () => {
      const rules = rulesEngine.listRules();

      if (rules.length === 0) {
        return {
          content: [{ type: "text", text: "No rules configured." }],
        };
      }

      const formatted = rules
        .map((r) => {
          return `## Rule ${r.id}
**Trigger:** ${r.trigger}
**Must do:** ${r.mustDo.join(", ") || "none"}
**Must not:** ${r.mustNot.join(", ") || "none"}
**Ask first:** ${r.askFirst.join(", ") || "none"}
**Created:** ${r.createdAt}`;
        })
        .join("\n\n---\n\n");

      return {
        content: [
          {
            type: "text",
            text: `# Active Rules (${rules.length})\n\n${formatted}`,
          },
        ],
      };
    },
  );

  // ============ Tool: analyze_structure ============
  server.registerTool(
    "analyze_structure",
    {
      title: "Analyze Code Structure",
      description:
        "Analyze a source file and extract its structure (classes, functions, methods, interfaces, types). Useful for understanding code organization before making changes.",
      inputSchema: {
        file_path: z
          .string()
          .describe(
            "Path to the file to analyze (relative to project root or absolute)",
          ),
        include_types: z
          .array(
            z.enum([
              "class",
              "function",
              "method",
              "interface",
              "type",
              "variable",
              "import",
            ]),
          )
          .optional()
          .describe("Types of entities to include (default: all)"),
      },
    },
    async (args) => {
      // Resolve file path
      const filePath = args.file_path.startsWith("/")
        ? args.file_path
        : resolve(config.projectPath, args.file_path);

      // Check if file exists
      if (!existsSync(filePath)) {
        return {
          content: [{ type: "text", text: `File not found: ${filePath}` }],
        };
      }

      try {
        // Read file content
        const file = Bun.file(filePath);
        const source = await file.text();

        // Analyze the file
        const result = await analyzeFile(filePath, source, {
          includeTypes: args.include_types as EntityType[] | undefined,
        });

        // Store entities in database
        db.deleteCodeEntitiesByFile(filePath);
        for (const entity of result.entities) {
          db.insertCodeEntity({
            filePath: result.filePath,
            entityType: entity.type,
            name: entity.name,
            qualifiedName: entity.qualifiedName,
            signature: entity.signature,
            docstring: entity.docstring,
            startLine: entity.startLine,
            endLine: entity.endLine,
            fileHash: result.fileHash,
          });
        }

        // Get related memories for this file
        const relatedMemories = db.getMemoriesForFile(filePath);

        // Format response
        let response = formatAnalysisResult(result);

        if (relatedMemories.length > 0) {
          response += `\n## Related Memories (${relatedMemories.length})\n`;
          for (const mem of relatedMemories.slice(0, 5)) {
            const status =
              mem.worked === 0 ? "❌" : mem.worked === 1 ? "✅" : "⏳";
            response += `- ${status} [${mem.category}] ${mem.content.slice(0, 100)}...\n`;
          }
        }

        return {
          content: [{ type: "text", text: response }],
        };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        return {
          content: [{ type: "text", text: `Error analyzing file: ${message}` }],
        };
      }
    },
  );

  return { server, db, memoryManager, rulesEngine };
}

export async function startServer(config: ServerConfig) {
  const { server, memoryManager } = createServer(config);

  // Warmup embeddings
  console.error("[code-recall] Warming up embeddings...");
  await memoryManager.warmup();

  // Connect to stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error("[code-recall] Server started and connected via stdio");

  return server;
}
