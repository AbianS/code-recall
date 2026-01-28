<div align="center">

# code-recall-tui

**Terminal UI for browsing your code-recall database**

Explore memories, rules, code entities, and search through everything your AI agent has learned.

[![npm](https://img.shields.io/npm/v/code-recall-tui)](https://www.npmjs.com/package/code-recall-tui)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Bun](https://img.shields.io/badge/Bun-1.0+-black?logo=bun)](https://bun.sh)

</div>

---

## Installation

```bash
bun install -g code-recall-tui
```

## Usage

Run from the root of a project that has a `.code-recall/memory.db` file:

```bash
code-recall-tui
```

Or specify a project path:

```bash
code-recall-tui --project /path/to/your/project
```

You can also set the project path via environment variable:

```bash
CODE_RECALL_PROJECT_PATH=/path/to/project code-recall-tui
```

---

## Screens

### Dashboard

Overview of your code-recall data at a glance:
- Total memories, rules, failed decisions, and warnings
- Category breakdown (decisions, patterns, warnings, learnings)
- Recent activity feed
- Failed approaches panel

### Memories

Browse all stored memories with category filtering:
- Filter by: All, Decisions, Patterns, Warnings, Learnings
- Navigate tabs with `[` and `]`
- Press Enter to view full memory details

### Memory Detail

Full view of a single memory including:
- Category and outcome status
- Content, rationale, and context
- Tags, file path, and recorded outcome

### Rules

Browse all active rules/guardrails with their trigger patterns and constraint counts.

### Rule Detail

Full view of a rule showing:
- Trigger pattern
- Must Do constraints
- Must Not constraints
- Ask First questions

### Code Entities

Browse analyzed source files and their extracted code structure:
- Split view: file list + entity details
- Color-coded entity types (classes, functions, interfaces, etc.)
- Signatures and line ranges

### Search

Full-text search across all memories using SQLite FTS5.

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `1` | Go to Dashboard |
| `2` | Go to Memories |
| `3` | Go to Rules |
| `4` | Go to Code Entities |
| `/` | Go to Search |
| `Escape` | Go back |
| `Enter` | Select / Open detail |
| `Tab` | Toggle panel focus (where applicable) |
| `[` / `]` | Switch tabs (Memories screen) |
| `q` | Quit |

---

## Requirements

- **[Bun](https://bun.sh)** v1.0 or higher
- An existing `.code-recall/memory.db` database (created by the [code-recall](https://www.npmjs.com/package/code-recall) MCP server)
- **macOS**: SQLite with extension support (via Homebrew: `brew install sqlite`)

---

## How It Works

`code-recall-tui` opens your `.code-recall/memory.db` database in **read-only mode** -- it never modifies your data. It's a standalone viewer that is completely independent from the code-recall MCP server.

---

## License

MIT License - see [LICENSE](../../LICENSE) for details.
