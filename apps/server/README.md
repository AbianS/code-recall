<div align="center">

<img width="1536" height="1024" alt="portada" src="https://github.com/user-attachments/assets/04e1f95a-1239-42b1-bd23-c4bbe273452b" />


**Semantic memory for AI coding agents**

Give your AI assistant persistent memory that learns from your project's history.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Bun](https://img.shields.io/badge/Bun-1.0+-black?logo=bun)](https://bun.sh)
[![MCP](https://img.shields.io/badge/MCP-Compatible-green)](https://modelcontextprotocol.io)

[Features](#features) • [Installation](#installation) • [Quick Start](#quick-start) • [Tools](#mcp-tools) • [Best Practices](#best-practices) • [Architecture](#architecture)

</div>

---

## The Problem

AI coding assistants are incredibly powerful, but they have a critical limitation: **they forget everything between sessions**. Every time you start a new conversation, your AI assistant has no memory of:

- Past architectural decisions and *why* they were made
- Patterns that work well in your codebase
- Approaches that failed and should be avoided
- Project-specific rules and guardrails

You end up repeating context, re-explaining decisions, and sometimes watching the AI make the same mistakes twice.

### Why not just use CLAUDE.md?

The typical solution is adding context to `.md` files. **It doesn't scale:**

- Context window has limits — your instructions compete with actual code
- Loads everything even when you only need part of it
- No semantic search ("state management" won't find "Zustand")
- Can't learn from failures or evolve automatically

## The Solution

**code-recall** is an [MCP server](https://modelcontextprotocol.io) that gives AI agents persistent, semantic memory. It stores observations, decisions, and learnings in a local SQLite database with vector search capabilities, allowing your AI to:

- **Remember** past decisions and their outcomes
- **Learn** from failures (failed approaches are boosted in future searches)
- **Follow rules** with semantic matching guardrails
- **Understand** your code structure through tree-sitter analysis

All data stays local on your machine. No cloud, no telemetry, fully private.

---

## Features

### Semantic Memory
Store and retrieve observations using hybrid search that combines:
- **Vector similarity** (embeddings) - finds conceptually related memories
- **Full-text search** (BM25) - matches exact keywords
- **Temporal decay** - recent memories rank higher
- **Failure boost** - past failures surface prominently to prevent repeating mistakes

### Rules Engine
Create guardrails that are matched semantically against actions:
```
Trigger: "adding API endpoint"
→ Must do: ["Add rate limiting", "Write integration tests"]
→ Must not: ["Skip authentication"]
→ Ask first: ["Is this a breaking change?"]
```

### Code Analysis
Parse TypeScript/JavaScript files with tree-sitter to extract:
- Classes, methods, and functions
- Interfaces and type aliases
- Import statements
- JSDoc documentation

Link memories to specific code entities for contextual recall.

---

## Installation

### Prerequisites

- **[Bun](https://bun.sh)** v1.0 or higher
- **macOS**: SQLite with extension support (via Homebrew: `brew install sqlite`)
- **Linux**: Works out of the box

### Install from npm

```bash
bun install -g code-recall
```

---

## Quick Start

### 1. Add to Claude Code

```bash
claude mcp add code-recall -- bunx code-recall
```

### 2. Restart Claude Code

The server starts automatically when you open Claude Code.

### 3. Start Using Memory

Once connected, Claude can store observations, search memories, check rules, and more using the [MCP tools](#mcp-tools) below.

### Configuration with Other MCP Clients

Add to your MCP client configuration:

```json
{
  "mcpServers": {
    "code-recall": {
      "command": "bunx",
      "args": ["code-recall"]
    }
  }
}
```

---

## MCP Tools

code-recall provides 8 tools that AI agents can use:

### `store_observation`

Store a new observation in memory with automatic conflict detection.

| Parameter | Type | Description |
|-----------|------|-------------|
| `category` | `decision` \| `pattern` \| `warning` \| `learning` | Type of observation |
| `content` | `string` | The main content |
| `rationale` | `string?` | Why this decision was made |
| `tags` | `string[]?` | Tags for categorization |
| `file_path` | `string?` | Associated file path |

```json
{
  "category": "decision",
  "content": "Use JWT for authentication",
  "rationale": "Stateless auth enables horizontal scaling",
  "tags": ["auth", "architecture"]
}
```

### `search_memory`

Search memories using semantic similarity.

| Parameter | Type | Description |
|-----------|------|-------------|
| `query` | `string` | Search query |
| `limit` | `number?` | Max results (default: 10) |
| `category` | `string?` | Filter by category |
| `file_path` | `string?` | Filter by file path |

### `get_briefing`

Get a session start briefing with stats, warnings, and failed approaches.

| Parameter | Type | Description |
|-----------|------|-------------|
| `focus_areas` | `string[]?` | Topics to pre-fetch context for |

### `set_rule`

Create a new rule/guardrail with semantic trigger matching.

| Parameter | Type | Description |
|-----------|------|-------------|
| `trigger` | `string` | Action pattern that triggers this rule |
| `must_do` | `string[]?` | Required actions |
| `must_not` | `string[]?` | Forbidden actions |
| `ask_first` | `string[]?` | Questions to consider |

### `check_rules`

Check which rules apply to an action.

| Parameter | Type | Description |
|-----------|------|-------------|
| `action` | `string` | The action you're about to take |

### `record_outcome`

Record whether a decision worked or failed.

| Parameter | Type | Description |
|-----------|------|-------------|
| `memory_id` | `number` | ID of the memory |
| `outcome` | `string` | Description of what happened |
| `worked` | `boolean` | Whether it was successful |

### `list_rules`

List all active rules. No parameters.

### `analyze_structure`

Analyze a source file and extract its code structure.

| Parameter | Type | Description |
|-----------|------|-------------|
| `file_path` | `string` | Path to the file |
| `include_types` | `string[]?` | Filter entity types |

---

## Recommended Workflow

```
┌─────────────────────────────────────────────────────────┐
│                    SESSION START                         │
│                         │                                │
│                         ▼                                │
│               get_briefing(focus_areas)                  │
│                         │                                │
└─────────────────────────┼───────────────────────────────┘
                          │
┌─────────────────────────┼───────────────────────────────┐
│                  BEFORE CHANGES                          │
│                         │                                │
│          ┌──────────────┴──────────────┐                │
│          ▼                              ▼                │
│   check_rules(action)          search_memory(query)     │
│                                                          │
└─────────────────────────────────────────────────────────┘
                          │
┌─────────────────────────┼───────────────────────────────┐
│                AFTER DECISIONS                           │
│                         │                                │
│                         ▼                                │
│        store_observation(category, content)              │
│                                                          │
└─────────────────────────────────────────────────────────┘
                          │
┌─────────────────────────┼───────────────────────────────┐
│              AFTER IMPLEMENTATION                        │
│                         │                                │
│                         ▼                                │
│         record_outcome(memory_id, worked)                │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## Best Practices

### Claude Code Skill

For optimal integration with Claude Code, add our Skill to your project. [Skills](https://code.claude.com/docs/en/skills) teach Claude when and how to use code-recall automatically.

**Install the Skill:**

```bash
# From your project root
mkdir -p .claude/skills/code-recall
curl -o .claude/skills/code-recall/SKILL.md \
  https://raw.githubusercontent.com/AbianS/code-recall/main/.claude/skills/code-recall/SKILL.md
```

Or create `.claude/skills/code-recall/SKILL.md` manually with [our skill template](https://github.com/AbianS/code-recall/blob/main/.claude/skills/code-recall/SKILL.md).

### What the Skill Does

Once installed, Claude will automatically:

- **Session start**: Call `get_briefing` to load context and warnings
- **Before changes**: Check `search_memory` and `check_rules` for relevant past decisions
- **After decisions**: Store important choices with `store_observation`
- **After implementation**: Record outcomes with `record_outcome`

This creates a feedback loop where Claude learns from past successes and failures in your project.

---

## Architecture

```
code-recall/
├── src/
│   ├── index.ts              # Entry point
│   ├── server.ts             # MCP server and tools
│   ├── database/
│   │   ├── index.ts          # DatabaseManager (SQLite + sqlite-vec)
│   │   └── schema.ts         # Database schema
│   ├── memory/
│   │   ├── index.ts          # MemoryManager
│   │   ├── embeddings.ts     # Local embeddings (@xenova/transformers)
│   │   └── search.ts         # Hybrid search implementation
│   ├── rules/
│   │   └── index.ts          # RulesEngine with semantic matching
│   └── code/
│       ├── index.ts          # Code analysis coordinator
│       ├── parser.ts         # tree-sitter WASM parser
│       └── extractors/       # Language-specific extractors
├── tests/                    # Comprehensive test suite
└── .code-recall/             # Data directory (auto-created)
    └── memory.db             # SQLite database
```

---

## Technical Stack

| Component | Technology |
|-----------|------------|
| **Runtime** | [Bun](https://bun.sh) |
| **Database** | SQLite + [sqlite-vec](https://github.com/asg017/sqlite-vec) |
| **Embeddings** | [@xenova/transformers](https://huggingface.co/docs/transformers.js) (all-MiniLM-L6-v2, 384d) |
| **Full-text Search** | SQLite FTS5 |
| **Code Parsing** | [web-tree-sitter](https://github.com/nickelproject/nickel/blob/main/packages/tree-sitter/README.md) |
| **Protocol** | [MCP](https://modelcontextprotocol.io) (stdio transport) |

### Search Algorithm

The hybrid search combines multiple signals:

| Signal | Weight | Description |
|--------|--------|-------------|
| Vector similarity | 50% | Cosine similarity of embeddings |
| Full-text score | 30% | BM25 ranking |
| Recency | 15% | Exponential time decay |
| Failure boost | 5% | Failed decisions rank higher |

---

## Development

```bash
# Run in development mode (with watch)
bun run dev

# Run tests
bun test

# Run specific test file
bun test tests/memory/search.test.ts
```

### Test Coverage

The project includes 210+ tests covering:
- Database operations and vector search
- Embedding generation and similarity
- Hybrid search algorithm
- Rules engine semantic matching
- Code analysis and extraction
- MCP server tools

---

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

MIT License - see [LICENSE](LICENSE) for details.

---

<p align="center" style="text-align:center">with 💖 by <a href="https://github.com/AbianS" target="_blank">AbianS</a></p>
