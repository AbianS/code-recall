import type { KeyEvent } from "@opentui/core";
import {
  BoxRenderable,
  SelectRenderable,
  TabSelectRenderable,
  TextRenderable,
} from "@opentui/core";
import { formatMemoryOption } from "../components/memory-card.ts";
import {
  BG_PRIMARY,
  BG_SECONDARY,
  BG_TERTIARY,
  COLOR_ACCENT,
  COLOR_BORDER,
  FG_MUTED,
  FG_PRIMARY,
  FG_SECONDARY,
  PANEL_BORDER,
} from "../theme.ts";
import type {
  AppContext,
  MemoryRow,
  NavigateParams,
  Screen,
} from "../types.ts";

const TABS = [
  { name: "All", description: "", value: "all" },
  { name: "Decisions", description: "", value: "decision" },
  { name: "Patterns", description: "", value: "pattern" },
  { name: "Warnings", description: "", value: "warning" },
  { name: "Learnings", description: "", value: "learning" },
];

export class MemoriesScreen implements Screen {
  readonly name = "memories" as const;
  private container: BoxRenderable | null = null;
  private tabSelect: TabSelectRenderable | null = null;
  private memorySelect: SelectRenderable | null = null;
  private countText: TextRenderable | null = null;
  private emptyState: BoxRenderable | null = null;
  private ctx: AppContext;
  private initialCategory: string | undefined;

  constructor(ctx: AppContext, params?: NavigateParams) {
    this.ctx = ctx;
    this.initialCategory = params?.category;
  }

  mount(contentArea: BoxRenderable) {
    const { renderer } = this.ctx;

    this.container = new BoxRenderable(renderer, {
      id: "memories-screen",
      width: "100%",
      flexGrow: 1,
      flexDirection: "column",
      padding: 1,
      gap: 1,
    });

    // Tab bar
    const tabRow = new BoxRenderable(renderer, {
      id: "tab-row",
      width: "100%",
      height: 3,
      flexDirection: "row",
      alignItems: "center",
      gap: 1,
    });

    this.tabSelect = new TabSelectRenderable(renderer, {
      id: "memory-tabs",
      options: TABS,
      height: 1,
      flexGrow: 1,
      backgroundColor: BG_PRIMARY,
      textColor: FG_SECONDARY,
      selectedBackgroundColor: COLOR_ACCENT,
      selectedTextColor: "#ffffff",
      focusedBackgroundColor: BG_PRIMARY,
      focusedTextColor: FG_PRIMARY,
      showDescription: false,
      wrapSelection: true,
    });

    this.countText = new TextRenderable(renderer, {
      id: "memory-count",
      content: "",
      fg: FG_MUTED,
    });

    tabRow.add(this.tabSelect);
    tabRow.add(this.countText);
    this.container.add(tabRow);

    // Memory list container
    const listPanel = new BoxRenderable(renderer, {
      id: "memory-list-panel",
      flexGrow: 1,
      width: "100%",
      border: true,
      borderStyle: PANEL_BORDER,
      borderColor: COLOR_BORDER,
      backgroundColor: BG_SECONDARY,
    });

    this.memorySelect = new SelectRenderable(renderer, {
      id: "memory-select",
      options: [],
      backgroundColor: BG_SECONDARY,
      focusedBackgroundColor: BG_SECONDARY,
      selectedBackgroundColor: BG_TERTIARY,
      selectedTextColor: FG_PRIMARY,
      textColor: FG_SECONDARY,
      descriptionColor: FG_MUTED,
      selectedDescriptionColor: FG_SECONDARY,
      showDescription: true,
      showScrollIndicator: true,
      flexGrow: 1,
      width: "100%",
    });

    this.memorySelect.on("itemSelected", () => {
      const opt = this.memorySelect?.getSelectedOption();
      if (opt?.value != null) {
        this.ctx.navigateTo("memory-detail", { memoryId: opt.value });
      }
    });

    listPanel.add(this.memorySelect);
    this.container.add(listPanel);

    // Tab change handler
    this.tabSelect.on("selectionChanged", () => {
      this.loadMemories();
    });

    // Set initial tab
    if (this.initialCategory) {
      const idx = TABS.findIndex((t) => t.value === this.initialCategory);
      if (idx >= 0) {
        this.tabSelect.setSelectedIndex(idx);
      }
    }

    // Load initial data
    this.loadMemories();
    this.memorySelect.focus();

    contentArea.add(this.container);
  }

  private loadMemories() {
    const tab = this.tabSelect?.getSelectedOption();
    const category = tab?.value;

    let memories: MemoryRow[];
    if (!category || category === "all") {
      memories = this.ctx.store.getRecentMemories(100);
    } else {
      memories = this.ctx.store.getMemoriesByCategory(category, 100);
    }

    const options = memories.map(formatMemoryOption);
    if (this.memorySelect) {
      this.memorySelect.options = options;
      this.memorySelect.setSelectedIndex(0);
    }

    if (this.countText) {
      this.countText.content = `${memories.length} memories`;
    }
  }

  onKeypress(key: KeyEvent): boolean {
    if (key.name === "[" || key.name === "]") {
      if (this.tabSelect) {
        if (key.name === "[") this.tabSelect.moveLeft();
        else this.tabSelect.moveRight();
        return true;
      }
    }
    return false;
  }

  destroy() {
    this.container?.destroy();
    this.container = null;
    this.tabSelect = null;
    this.memorySelect = null;
    this.countText = null;
    this.emptyState = null;
  }
}
