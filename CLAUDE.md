# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

code-recall is an MCP (Model Context Protocol) server that provides semantic memory for AI coding agents. It stores observations, decisions, and learnings in a local SQLite database with vector search capabilities.

## Commands

```bash
# Development
bun run dev          # Watch mode with auto-reload
bun run start        # Run server directly

# Testing
bun test             # Run all tests
bun test tests/memory/search.test.ts  # Run specific test file

# Linting
bun run lint         # Check code with Biome
bun run lint:fix     # Fix lint issues
```

## Architecture

### Core Components

```
src/
├── index.ts           # Entry point, starts MCP server via stdio
├── server.ts          # MCP server setup, registers all 8 tools
├── database/          # SQLite + sqlite-vec operations
│   └── index.ts       # DatabaseManager - all DB operations
├── memory/            # Semantic memory system
│   ├── index.ts       # MemoryManager - high-level memory API
│   ├── embeddings.ts  # Local embeddings via @xenova/transformers
│   └── search.ts      # Hybrid search (vector + FTS + recency)
├── rules/             # Guardrail rules engine
│   └── index.ts       # RulesEngine - semantic rule matching
└── code/              # Code analysis via tree-sitter
    ├── index.ts       # analyzeFile() entry point
    ├── parser.ts      # tree-sitter WASM loader
    └── extractors/    # Language-specific entity extraction
```

### Data Flow

1. **MCP Server** (`server.ts`) exposes 8 tools via stdio transport
2. **MemoryManager** handles storing/searching memories with embeddings
3. **DatabaseManager** persists to SQLite with sqlite-vec for vector search
4. **RulesEngine** matches actions against rules using cosine similarity
5. **CodeAnalyzer** extracts entities (classes, functions) via tree-sitter

### Search Algorithm

Hybrid search in `memory/search.ts` combines:
- Vector similarity (50%) - cosine similarity via sqlite-vec
- Full-text search (30%) - SQLite FTS5 BM25 ranking
- Recency (15%) - exponential decay over 7 days
- Failure boost (5%) - failed decisions rank 1.5x higher

### Key Technical Details

- **Embeddings**: all-MiniLM-L6-v2 model (384 dimensions) via @xenova/transformers
- **macOS**: Requires Homebrew SQLite for extension support (`brew install sqlite`)
- **Storage**: Data stored in `.code-recall/memory.db` in project root
- **Transport**: MCP over stdio (not HTTP)

## Testing

Tests use `bun:test` and are organized to mirror `src/` structure. The `tests/setup.ts` provides:
- `createTestDb()` - creates temp database with auto-cleanup
- Sample code fixtures (`SAMPLE_TS_CODE`, `SAMPLE_JS_CODE`, `SAMPLE_TSX_CODE`)

## MCP Tools

The server exposes 8 tools:
1. `store_observation` - Store memories with conflict detection
2. `search_memory` - Hybrid semantic search
3. `get_briefing` - Session start summary with stats/warnings
4. `set_rule` - Create guardrail rules
5. `check_rules` - Check rules against actions
6. `record_outcome` - Mark decisions as worked/failed
7. `list_rules` - List active rules
8. `analyze_structure` - Parse code files with tree-sitter
