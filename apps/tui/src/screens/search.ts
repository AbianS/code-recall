import {
  BoxRenderable,
  InputRenderable,
  KeyEvent,
  SelectRenderable,
  TextRenderable,
} from "@opentui/core";
import { createEmptyState } from "../components/empty-state.ts";
import { formatMemoryOption } from "../components/memory-card.ts";
import {
  BG_SECONDARY,
  BG_TERTIARY,
  COLOR_ACCENT,
  COLOR_BORDER,
  FG_MUTED,
  FG_PRIMARY,
  FG_SECONDARY,
  PANEL_BORDER,
} from "../theme.ts";
import type { AppContext, NavigateParams, Screen } from "../types.ts";

export class SearchScreen implements Screen {
  readonly name = "search" as const;
  private container: BoxRenderable | null = null;
  private input: InputRenderable | null = null;
  private resultSelect: SelectRenderable | null = null;
  private resultCount: TextRenderable | null = null;
  private emptyBox: BoxRenderable | null = null;
  private resultsPanel: BoxRenderable | null = null;
  private ctx: AppContext;
  private inputFocused = true;

  constructor(ctx: AppContext, _params?: NavigateParams) {
    this.ctx = ctx;
  }

  mount(contentArea: BoxRenderable) {
    const { renderer } = this.ctx;

    this.container = new BoxRenderable(renderer, {
      id: "search-screen",
      width: "100%",
      flexGrow: 1,
      flexDirection: "column",
      padding: 1,
      gap: 1,
    });

    // Search input bar
    const searchBar = new BoxRenderable(renderer, {
      id: "search-bar",
      width: "100%",
      height: 3,
      flexDirection: "row",
      alignItems: "center",
      border: true,
      borderStyle: PANEL_BORDER,
      borderColor: COLOR_ACCENT,
      title: " Search ",
      titleAlignment: "left",
      backgroundColor: BG_SECONDARY,
      paddingLeft: 1,
      paddingRight: 1,
    });

    this.input = new InputRenderable(renderer, {
      id: "search-input",
      placeholder: "Type a query and press Enter...",
      backgroundColor: BG_SECONDARY,
      focusedBackgroundColor: BG_SECONDARY,
      textColor: FG_PRIMARY,
      width: "100%",
    });

    this.input.on("enter", () => {
      this.executeSearch();
    });

    searchBar.add(this.input);
    this.container.add(searchBar);

    // Results area
    this.resultsPanel = new BoxRenderable(renderer, {
      id: "results-panel",
      flexGrow: 1,
      width: "100%",
      flexDirection: "column",
      border: true,
      borderStyle: PANEL_BORDER,
      borderColor: COLOR_BORDER,
      backgroundColor: BG_SECONDARY,
    });

    this.resultCount = new TextRenderable(renderer, {
      id: "result-count",
      content: "",
      fg: FG_MUTED,
      paddingLeft: 1,
    });
    this.resultsPanel.add(this.resultCount);

    this.emptyBox = createEmptyState(
      renderer,
      "Type a query above and press Enter to search memories.",
    );
    this.resultsPanel.add(this.emptyBox);

    this.container.add(this.resultsPanel);
    this.input.focus();

    contentArea.add(this.container);
  }

  private executeSearch() {
    const query = this.input?.value?.trim();
    if (!query || !this.resultsPanel) return;

    const { renderer, store } = this.ctx;

    try {
      const results = store.searchByFullText(query, 30);

      // Remove old results
      if (this.resultSelect) {
        this.resultSelect.destroy();
        this.resultSelect = null;
      }
      if (this.emptyBox) {
        this.emptyBox.destroy();
        this.emptyBox = null;
      }

      if (this.resultCount) {
        this.resultCount.content = `  ${results.length} result${results.length !== 1 ? "s" : ""} for "${query}"`;
      }

      if (results.length === 0) {
        this.emptyBox = createEmptyState(
          renderer,
          "No results found. Try a different query.",
        );
        this.resultsPanel.add(this.emptyBox);
        return;
      }

      this.resultSelect = new SelectRenderable(renderer, {
        id: "result-select",
        options: results.map(formatMemoryOption),
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

      this.resultSelect.on("itemSelected", () => {
        const opt = this.resultSelect?.getSelectedOption();
        if (opt?.value != null) {
          this.ctx.navigateTo("memory-detail", { memoryId: opt.value });
        }
      });

      this.resultsPanel.add(this.resultSelect);

      // Focus the results
      this.resultSelect.focus();
      this.inputFocused = false;
    } catch {
      if (this.resultCount) {
        this.resultCount.content = `  Search error. Try simpler terms (avoid special characters).`;
      }
    }
  }

  onKeypress(key: KeyEvent): boolean {
    if (key.name === "tab") {
      if (this.inputFocused && this.resultSelect) {
        this.resultSelect.focus();
        this.inputFocused = false;
      } else if (this.input) {
        this.input.focus();
        this.inputFocused = true;
      }
      return true;
    }
    if (key.name === "escape") {
      if (!this.inputFocused && this.input) {
        this.input.focus();
        this.inputFocused = true;
        return true;
      }
      this.ctx.goBack();
      return true;
    }
    return false;
  }

  destroy() {
    this.container?.destroy();
    this.container = null;
    this.input = null;
    this.resultSelect = null;
    this.resultCount = null;
    this.emptyBox = null;
    this.resultsPanel = null;
  }
}
