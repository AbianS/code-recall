import type { KeyEvent } from "@opentui/core";
import {
  BoxRenderable,
  ScrollBoxRenderable,
  TextRenderable,
} from "@opentui/core";
import { categoryColor, categoryLabel } from "../components/category-badge.ts";
import { outcomeColor, outcomeLabel } from "../components/outcome-badge.ts";
import {
  BG_PRIMARY,
  BG_SECONDARY,
  COLOR_ACCENT,
  COLOR_BORDER,
  FG_MUTED,
  FG_PRIMARY,
  FG_SECONDARY,
  PANEL_BORDER,
} from "../theme.ts";
import type { AppContext, NavigateParams, Screen } from "../types.ts";

export class MemoryDetailScreen implements Screen {
  readonly name = "memory-detail" as const;
  private scrollBox: ScrollBoxRenderable | null = null;
  private ctx: AppContext;
  private memoryId: number;

  constructor(ctx: AppContext, params: NavigateParams) {
    this.ctx = ctx;
    this.memoryId = params.memoryId!;
  }

  mount(contentArea: BoxRenderable) {
    const { renderer, store } = this.ctx;
    const memory = store.getMemoryById(this.memoryId);

    if (!memory) {
      const errBox = new BoxRenderable(renderer, {
        width: "100%",
        flexGrow: 1,
        justifyContent: "center",
        alignItems: "center",
      });
      errBox.add(
        new TextRenderable(renderer, {
          content: `Memory #${this.memoryId} not found`,
          fg: FG_MUTED,
        }),
      );
      contentArea.add(errBox);
      return;
    }

    this.scrollBox = new ScrollBoxRenderable(renderer, {
      id: "memory-detail-scroll",
      width: "100%",
      flexGrow: 1,
      scrollY: true,
      padding: 1,
      backgroundColor: BG_PRIMARY,
      contentOptions: {
        flexDirection: "column",
        gap: 1,
        width: "100%",
      },
    });

    // --- Header row: category + outcome ---
    const headerRow = new BoxRenderable(renderer, {
      id: "detail-header",
      width: "100%",
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    });

    headerRow.add(
      new TextRenderable(renderer, {
        content: `Memory #${memory.id}  ${categoryLabel(memory.category)}`,
        fg: categoryColor(memory.category),
        attributes: 1,
      }),
    );

    headerRow.add(
      new TextRenderable(renderer, {
        content: outcomeLabel(memory.worked),
        fg: outcomeColor(memory.worked),
        attributes: 1,
      }),
    );

    this.scrollBox.add(headerRow);

    // --- Dates ---
    const dateRow = new BoxRenderable(renderer, {
      width: "100%",
      flexDirection: "row",
      gap: 4,
    });
    dateRow.add(
      new TextRenderable(renderer, {
        content: `Created: ${formatDate(memory.created_at)}`,
        fg: FG_MUTED,
      }),
    );
    dateRow.add(
      new TextRenderable(renderer, {
        content: `Updated: ${formatDate(memory.updated_at)}`,
        fg: FG_MUTED,
      }),
    );
    this.scrollBox.add(dateRow);

    // --- Content panel ---
    this.scrollBox.add(createPanel(renderer, "Content", memory.content));

    // --- Rationale panel ---
    if (memory.rationale) {
      this.scrollBox.add(createPanel(renderer, "Rationale", memory.rationale));
    }

    // --- Context panel ---
    if (memory.context) {
      this.scrollBox.add(createPanel(renderer, "Context", memory.context));
    }

    // --- Tags ---
    if (memory.tags) {
      try {
        const tags = JSON.parse(memory.tags) as string[];
        if (tags.length > 0) {
          const tagsRow = new BoxRenderable(renderer, {
            width: "100%",
            flexDirection: "row",
            gap: 1,
          });
          tagsRow.add(
            new TextRenderable(renderer, {
              content: "Tags:",
              fg: FG_SECONDARY,
              attributes: 1,
            }),
          );
          tagsRow.add(
            new TextRenderable(renderer, {
              content: tags.join(", "),
              fg: COLOR_ACCENT,
            }),
          );
          this.scrollBox.add(tagsRow);
        }
      } catch {}
    }

    // --- File path ---
    if (memory.file_path) {
      const fileRow = new BoxRenderable(renderer, {
        width: "100%",
        flexDirection: "row",
        gap: 1,
      });
      fileRow.add(
        new TextRenderable(renderer, {
          content: "File:",
          fg: FG_SECONDARY,
          attributes: 1,
        }),
      );
      fileRow.add(
        new TextRenderable(renderer, {
          content: memory.file_path,
          fg: FG_PRIMARY,
        }),
      );
      this.scrollBox.add(fileRow);
    }

    // --- Outcome panel ---
    if (memory.outcome) {
      this.scrollBox.add(createPanel(renderer, "Outcome", memory.outcome));
    }

    this.scrollBox.focus();
    contentArea.add(this.scrollBox);
  }

  onKeypress(key: KeyEvent): boolean {
    if (key.name === "escape") {
      this.ctx.goBack();
      return true;
    }
    return false;
  }

  destroy() {
    this.scrollBox?.destroy();
    this.scrollBox = null;
  }
}

function createPanel(
  renderer: import("@opentui/core").CliRenderer,
  title: string,
  content: string,
) {
  const panel = new BoxRenderable(renderer, {
    width: "100%",
    flexDirection: "column",
    border: true,
    borderStyle: PANEL_BORDER,
    borderColor: COLOR_BORDER,
    title: ` ${title} `,
    titleAlignment: "left",
    backgroundColor: BG_SECONDARY,
    padding: 1,
  });

  panel.add(
    new TextRenderable(renderer, {
      content,
      fg: FG_PRIMARY,
    }),
  );

  return panel;
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}
