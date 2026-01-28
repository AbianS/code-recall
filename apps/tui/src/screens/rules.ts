import type { KeyEvent } from "@opentui/core";
import { BoxRenderable, SelectRenderable, TextRenderable } from "@opentui/core";
import { createEmptyState } from "../components/empty-state.ts";
import { formatRuleOption } from "../components/rule-card.ts";
import {
  BG_SECONDARY,
  BG_TERTIARY,
  COLOR_BORDER,
  FG_MUTED,
  FG_PRIMARY,
  FG_SECONDARY,
  PANEL_BORDER,
} from "../theme.ts";
import type { AppContext, Screen } from "../types.ts";

export class RulesScreen implements Screen {
  readonly name = "rules" as const;
  private container: BoxRenderable | null = null;
  private ruleSelect: SelectRenderable | null = null;
  private ctx: AppContext;

  constructor(ctx: AppContext) {
    this.ctx = ctx;
  }

  mount(contentArea: BoxRenderable) {
    const { renderer, store } = this.ctx;
    const rules = store.getActiveRules();

    this.container = new BoxRenderable(renderer, {
      id: "rules-screen",
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
      alignItems: "center",
    });

    headerRow.add(
      new TextRenderable(renderer, {
        content: "Active Guardrails",
        fg: FG_PRIMARY,
        attributes: 1,
      }),
    );

    headerRow.add(
      new TextRenderable(renderer, {
        content: `${rules.length} rules`,
        fg: FG_MUTED,
      }),
    );

    this.container.add(headerRow);

    // Rule list
    const listPanel = new BoxRenderable(renderer, {
      id: "rule-list-panel",
      flexGrow: 1,
      width: "100%",
      border: true,
      borderStyle: PANEL_BORDER,
      borderColor: COLOR_BORDER,
      backgroundColor: BG_SECONDARY,
    });

    if (rules.length === 0) {
      listPanel.add(createEmptyState(renderer, "No rules defined yet."));
    } else {
      this.ruleSelect = new SelectRenderable(renderer, {
        id: "rule-select",
        options: rules.map(formatRuleOption),
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
        itemSpacing: 1,
      });

      this.ruleSelect.on("itemSelected", () => {
        const opt = this.ruleSelect?.getSelectedOption();
        if (opt?.value != null) {
          this.ctx.navigateTo("rule-detail", { ruleId: opt.value });
        }
      });

      listPanel.add(this.ruleSelect);
      this.ruleSelect.focus();
    }

    this.container.add(listPanel);
    contentArea.add(this.container);
  }

  onKeypress(_key: KeyEvent): boolean {
    return false;
  }

  destroy() {
    this.container?.destroy();
    this.container = null;
    this.ruleSelect = null;
  }
}
