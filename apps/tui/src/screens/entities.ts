import type { KeyEvent } from "@opentui/core";
import {
  BoxRenderable,
  ScrollBoxRenderable,
  SelectRenderable,
  TextRenderable,
} from "@opentui/core";
import { createEmptyState } from "../components/empty-state.ts";
import {
  BG_SECONDARY,
  BG_TERTIARY,
  COLOR_ACCENT,
  COLOR_BORDER,
  COLOR_DECISION,
  COLOR_LEARNING,
  COLOR_PATTERN,
  COLOR_WARNING,
  FG_MUTED,
  FG_PRIMARY,
  FG_SECONDARY,
  PANEL_BORDER,
} from "../theme.ts";
import type { AppContext, Screen } from "../types.ts";

const ENTITY_TYPE_COLORS: Record<string, string> = {
  class: COLOR_DECISION,
  interface: COLOR_DECISION,
  type: COLOR_LEARNING,
  function: COLOR_PATTERN,
  method: COLOR_PATTERN,
  variable: COLOR_WARNING,
  import: FG_MUTED,
};

export class EntitiesScreen implements Screen {
  readonly name = "entities" as const;
  private container: BoxRenderable | null = null;
  private fileSelect: SelectRenderable | null = null;
  private entityPanel: BoxRenderable | null = null;
  private ctx: AppContext;
  private files: string[] = [];
  private focusOnEntities = false;

  constructor(ctx: AppContext) {
    this.ctx = ctx;
  }

  mount(contentArea: BoxRenderable) {
    const { renderer, store } = this.ctx;
    this.files = store.getDistinctEntityFiles();

    this.container = new BoxRenderable(renderer, {
      id: "entities-screen",
      width: "100%",
      flexGrow: 1,
      flexDirection: "column",
      padding: 1,
      gap: 1,
    });

    // Header
    const headerRow = new BoxRenderable(renderer, {
      width: "100%",
      flexDirection: "row",
      justifyContent: "space-between",
    });
    headerRow.add(
      new TextRenderable(renderer, {
        content: "Analyzed Files",
        fg: FG_PRIMARY,
        attributes: 1,
      }),
    );
    headerRow.add(
      new TextRenderable(renderer, {
        content: `${this.files.length} files`,
        fg: FG_MUTED,
      }),
    );
    this.container.add(headerRow);

    if (this.files.length === 0) {
      this.container.add(
        createEmptyState(
          renderer,
          "No code entities analyzed yet. Use analyze_structure via MCP.",
        ),
      );
      contentArea.add(this.container);
      return;
    }

    // Split view
    const splitRow = new BoxRenderable(renderer, {
      id: "split-row",
      width: "100%",
      flexGrow: 1,
      flexDirection: "row",
      gap: 1,
    });

    // File list (left)
    const filePanel = new BoxRenderable(renderer, {
      id: "file-panel",
      width: "35%",
      flexDirection: "column",
      border: true,
      borderStyle: PANEL_BORDER,
      borderColor: COLOR_BORDER,
      title: " Files ",
      titleAlignment: "left",
      backgroundColor: BG_SECONDARY,
    });

    this.fileSelect = new SelectRenderable(renderer, {
      id: "file-select",
      options: this.files.map((f) => ({
        name: shortenPath(f),
        description: "",
        value: f,
      })),
      backgroundColor: BG_SECONDARY,
      focusedBackgroundColor: BG_SECONDARY,
      selectedBackgroundColor: BG_TERTIARY,
      selectedTextColor: COLOR_ACCENT,
      textColor: FG_SECONDARY,
      showDescription: false,
      showScrollIndicator: true,
      flexGrow: 1,
      width: "100%",
    });

    this.fileSelect.on("selectionChanged", () => {
      this.loadEntities();
    });

    filePanel.add(this.fileSelect);
    splitRow.add(filePanel);

    // Entity panel (right)
    this.entityPanel = new BoxRenderable(renderer, {
      id: "entity-panel",
      flexGrow: 1,
      flexDirection: "column",
      border: true,
      borderStyle: PANEL_BORDER,
      borderColor: COLOR_BORDER,
      title: " Entities ",
      titleAlignment: "left",
      backgroundColor: BG_SECONDARY,
    });

    splitRow.add(this.entityPanel);
    this.container.add(splitRow);

    // Load first file
    this.loadEntities();
    this.fileSelect.focus();

    contentArea.add(this.container);
  }

  private loadEntities() {
    const opt = this.fileSelect?.getSelectedOption();
    if (!opt?.value || !this.entityPanel) return;

    const { renderer, store } = this.ctx;
    const filePath = opt.value as string;
    const entities = store.getCodeEntitiesByFile(filePath);

    // Clear entity panel
    for (const child of this.entityPanel.getChildren()) {
      child.destroy();
    }

    // Update panel title
    this.entityPanel.title = ` ${shortenPath(filePath)} `;

    if (entities.length === 0) {
      this.entityPanel.add(
        createEmptyState(renderer, "No entities in this file."),
      );
      return;
    }

    const scrollBox = new ScrollBoxRenderable(renderer, {
      id: "entity-scroll",
      flexGrow: 1,
      width: "100%",
      scrollY: true,
      backgroundColor: BG_SECONDARY,
      contentOptions: {
        flexDirection: "column",
        gap: 0,
        width: "100%",
      },
    });

    for (const entity of entities) {
      const row = new BoxRenderable(renderer, {
        width: "100%",
        flexDirection: "row",
        gap: 1,
        paddingLeft: 1,
      });

      const typeColor = ENTITY_TYPE_COLORS[entity.entity_type] ?? FG_SECONDARY;
      row.add(
        new TextRenderable(renderer, {
          content: `[${entity.entity_type}]`.padEnd(12),
          fg: typeColor,
          attributes: 1,
        }),
      );

      const displayName = entity.qualified_name || entity.name;
      row.add(
        new TextRenderable(renderer, {
          content: displayName,
          fg: FG_PRIMARY,
        }),
      );

      row.add(
        new TextRenderable(renderer, {
          content: `L${entity.start_line}-${entity.end_line}`,
          fg: FG_MUTED,
        }),
      );

      scrollBox.add(row);

      if (entity.signature) {
        const sigRow = new BoxRenderable(renderer, {
          width: "100%",
          paddingLeft: 14,
        });
        sigRow.add(
          new TextRenderable(renderer, {
            content:
              entity.signature.length > 70
                ? `${entity.signature.slice(0, 67)}...`
                : entity.signature,
            fg: FG_MUTED,
            attributes: 4,
          }),
        );
        scrollBox.add(sigRow);
      }
    }

    this.entityPanel.add(scrollBox);
  }

  onKeypress(key: KeyEvent): boolean {
    if (key.name === "tab" && this.fileSelect) {
      if (this.focusOnEntities) {
        this.fileSelect.focus();
        this.focusOnEntities = false;
      } else {
        // Find the scrollbox in entity panel and focus it
        const children = this.entityPanel?.getChildren() ?? [];
        for (const child of children) {
          if ("scrollBy" in child) {
            child.focus();
            this.focusOnEntities = true;
            break;
          }
        }
      }
      return true;
    }
    return false;
  }

  destroy() {
    this.container?.destroy();
    this.container = null;
    this.fileSelect = null;
    this.entityPanel = null;
  }
}

function shortenPath(filePath: string): string {
  const parts = filePath.split("/");
  if (parts.length <= 3) return filePath;
  return `.../${parts.slice(-3).join("/")}`;
}
