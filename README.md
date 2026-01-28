<div align="center">

<img width="1536" height="1024" alt="code-recall" src="https://github.com/user-attachments/assets/04e1f95a-1239-42b1-bd23-c4bbe273452b" />

**Semantic memory for AI coding agents**

Give your AI assistant persistent memory that learns from your project's history.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Bun](https://img.shields.io/badge/Bun-1.0+-black?logo=bun)](https://bun.sh)
[![MCP](https://img.shields.io/badge/MCP-Compatible-green)](https://modelcontextprotocol.io)

</div>

---

## Packages

This monorepo contains two independent packages:

### [`code-recall`](./apps/server) - MCP Server

[![npm](https://img.shields.io/npm/v/code-recall)](https://www.npmjs.com/package/code-recall)

The core MCP server that gives AI agents persistent, semantic memory. It stores observations, decisions, and learnings in a local SQLite database with vector search, full-text search, and a rules engine.

```bash
bun install -g code-recall
```

```bash
claude mcp add code-recall -- bunx code-recall
```

### [`code-recall-tui`](./apps/tui) - Terminal UI

[![npm](https://img.shields.io/npm/v/code-recall-tui)](https://www.npmjs.com/package/code-recall-tui)

A terminal UI for browsing and exploring your code-recall database. View memories, rules, code entities, and search through everything your AI agent has learned.

```bash
bun install -g code-recall-tui
```

```bash
code-recall-tui
```

---

## Quick Start

1. **Install the MCP server** and add it to your AI coding agent
2. **Start coding** -- the agent will automatically store decisions, patterns, warnings, and learnings
3. **Browse your data** with the TUI to see what your agent has learned

All data stays local on your machine. No cloud, no telemetry, fully private.

---

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see [LICENSE](LICENSE) for details.
