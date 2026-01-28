import type { KeyEvent } from "@opentui/core";
import { BoxRenderable, SelectRenderable, TextRenderable } from "@opentui/core";
import { categoryColor } from "../components/category-badge.ts";
import { createEmptyState } from "../components/empty-state.ts";
import { formatMemoryOption } from "../components/memory-card.ts";
import { createStatBox } from "../components/stat-box.ts";
import {
  BG_SECONDARY,
  BG_TERTIARY,
  CATEGORY_ICONS,
  COLOR_ACCENT,
  COLOR_BORDER,
  COLOR_FAILURE,
  COLOR_WARNING,
  FG_MUTED,
  FG_PRIMARY,
  FG_SECONDARY,
  PANEL_BORDER,
} from "../theme.ts";
import type { AppContext, Screen } from "../types.ts";

export class DashboardScreen implements Screen {
  readonly name = "dashboard" as const;
  private container: BoxRenderable | null = null;
  private recentSelect: SelectRenderable | null = null;
  private ctx: AppContext;

  constructor(ctx: AppContext) {
    this.ctx = ctx;
  }

  mount(contentArea: BoxRenderable) {
    const { renderer, store } = this.ctx;
    const stats = store.getStats();
    const recentMemories = store.getRecentMemories(10);
    const failedMemories = store.getFailedMemories(5);

    this.container = new BoxRenderable(renderer, {
      id: "dashboard",
      width: "100%",
      flexGrow: 1,
      flexDirection: "column",
      gap: 1,
      padding: 1,
    });

    // --- Stats row ---
    const statsRow = new BoxRenderable(renderer, {
      id: "stats-row",
      width: "100%",
      height: 6,
      flexDirection: "row",
      gap: 1,
    });

    statsRow.add(
      createStatBox(renderer, {
        value: stats.totalMemories,
        label: "Memories",
        color: COLOR_ACCENT,
      }),
    );
    statsRow.add(
      createStatBox(renderer, {
        value: stats.totalRules,
        label: "Rules",
        color: COLOR_ACCENT,
      }),
    );
    statsRow.add(
      createStatBox(renderer, {
        value: stats.failedDecisions,
        label: "Failed",
        color: COLOR_FAILURE,
      }),
    );
    statsRow.add(
      createStatBox(renderer, {
        value: stats.totalWarnings,
        label: "Warnings",
        color: COLOR_WARNING,
      }),
    );

    this.container.add(statsRow);

    // --- Middle row: categories + recent ---
    const middleRow = new BoxRenderable(renderer, {
      id: "middle-row",
      width: "100%",
      flexGrow: 1,
      flexDirection: "row",
      gap: 1,
    });

    // Category breakdown panel
    const categoryPanel = new BoxRenderable(renderer, {
      id: "category-panel",
      width: "35%",
      flexDirection: "column",
      border: true,
      borderStyle: PANEL_BORDER,
      borderColor: COLOR_BORDER,
      title: " Categories ",
      titleAlignment: "left",
      padding: 1,
      gap: 1,
      backgroundColor: BG_SECONDARY,
    });

    for (const cat of ["decision", "pattern", "warning", "learning"]) {
      const count = stats.byCategory[cat] ?? 0;
      const icon = CATEGORY_ICONS[cat] ?? "";
      const row = new BoxRenderable(renderer, {
        flexDirection: "row",
        justifyContent: "space-between",
        width: "100%",
      });
      row.add(
        new TextRenderable(renderer, {
          content: `${icon} ${cat.charAt(0).toUpperCase() + cat.slice(1)}`,
          fg: categoryColor(cat),
        }),
      );
      row.add(
        new TextRenderable(renderer, {
          content: String(count),
          fg: FG_PRIMARY,
          attributes: 1,
        }),
      );
      categoryPanel.add(row);
    }

    middleRow.add(categoryPanel);

    // Recent activity panel
    const recentPanel = new BoxRenderable(renderer, {
      id: "recent-panel",
      flexGrow: 1,
      flexDirection: "column",
      border: true,
      borderStyle: PANEL_BORDER,
      borderColor: COLOR_BORDER,
      title: " Recent Activity ",
      titleAlignment: "left",
      backgroundColor: BG_SECONDARY,
    });

    if (recentMemories.length === 0) {
      recentPanel.add(
        createEmptyState(renderer, "No memories yet. Start using code-recall!"),
      );
    } else {
      this.recentSelect = new SelectRenderable(renderer, {
        id: "recent-select",
        options: recentMemories.map(formatMemoryOption),
        backgroundColor: BG_SECONDARY,
        focusedBackgroundColor: BG_SECONDARY,
        selectedBackgroundColor: BG_TERTIARY,
        selectedTextColor: FG_PRIMARY,
        textColor: FG_SECONDARY,
        descriptionColor: FG_MUTED,
        selectedDescriptionColor: FG_SECONDARY,
        showDescription: true,
        flexGrow: 1,
        width: "100%",
      });

      this.recentSelect.on("itemSelected", () => {
        const opt = this.recentSelect?.getSelectedOption();
        if (opt?.value != null) {
          this.ctx.navigateTo("memory-detail", { memoryId: opt.value });
        }
      });

      recentPanel.add(this.recentSelect);
      this.recentSelect.focus();
    }

    middleRow.add(recentPanel);
    this.container.add(middleRow);

    // --- Failed approaches panel ---
    if (failedMemories.length > 0) {
      const failedPanel = new BoxRenderable(renderer, {
        id: "failed-panel",
        width: "100%",
        height: Math.min(failedMemories.length + 3, 8),
        flexDirection: "column",
        border: true,
        borderStyle: PANEL_BORDER,
        borderColor: COLOR_FAILURE,
        title: " Failed Approaches ",
        titleAlignment: "left",
        backgroundColor: BG_SECONDARY,
        padding: 1,
        gap: 0,
      });

      for (const mem of failedMemories) {
        const content =
          mem.content.length > 80
            ? `${mem.content.slice(0, 77)}...`
            : mem.content;
        failedPanel.add(
          new TextRenderable(renderer, {
            content: `\u2717 ${content}`,
            fg: COLOR_FAILURE,
          }),
        );
      }

      this.container.add(failedPanel);
    }

    contentArea.add(this.container);
  }

  onKeypress(_key: KeyEvent): boolean {
    return false;
  }

  destroy() {
    this.container?.destroy();
    this.container = null;
    this.recentSelect = null;
  }
}
