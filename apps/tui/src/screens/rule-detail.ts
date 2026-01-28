import type { KeyEvent } from "@opentui/core";
import {
  BoxRenderable,
  ScrollBoxRenderable,
  TextRenderable,
} from "@opentui/core";
import {
  BG_PRIMARY,
  BG_SECONDARY,
  COLOR_ACCENT,
  COLOR_BORDER,
  COLOR_FAILURE,
  COLOR_SUCCESS,
  COLOR_WARNING,
  FG_MUTED,
  PANEL_BORDER,
} from "../theme.ts";
import type { AppContext, NavigateParams, Screen } from "../types.ts";

function parseJsonArray(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export class RuleDetailScreen implements Screen {
  readonly name = "rule-detail" as const;
  private scrollBox: ScrollBoxRenderable | null = null;
  private ctx: AppContext;
  private ruleId: number;

  constructor(ctx: AppContext, params: NavigateParams) {
    this.ctx = ctx;
    this.ruleId = params.ruleId!;
  }

  mount(contentArea: BoxRenderable) {
    const { renderer, store } = this.ctx;
    const rule = store.getRuleById(this.ruleId);

    if (!rule) {
      const errBox = new BoxRenderable(renderer, {
        width: "100%",
        flexGrow: 1,
        justifyContent: "center",
        alignItems: "center",
      });
      errBox.add(
        new TextRenderable(renderer, {
          content: `Rule #${this.ruleId} not found`,
          fg: FG_MUTED,
        }),
      );
      contentArea.add(errBox);
      return;
    }

    this.scrollBox = new ScrollBoxRenderable(renderer, {
      id: "rule-detail-scroll",
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

    // Trigger
    this.scrollBox.add(
      new TextRenderable(renderer, {
        content: `Rule #${rule.id}`,
        fg: FG_MUTED,
      }),
    );
    this.scrollBox.add(
      new TextRenderable(renderer, {
        content: `"${rule.trigger}"`,
        fg: COLOR_ACCENT,
        attributes: 1,
      }),
    );

    // Date
    this.scrollBox.add(
      new TextRenderable(renderer, {
        content: `Created: ${formatDate(rule.created_at)}`,
        fg: FG_MUTED,
      }),
    );

    const mustDo = parseJsonArray(rule.must_do);
    const mustNot = parseJsonArray(rule.must_not);
    const askFirst = parseJsonArray(rule.ask_first);

    // Must Do
    if (mustDo.length > 0) {
      this.scrollBox.add(
        createConstraintPanel(renderer, "Must Do", mustDo, "+", COLOR_SUCCESS),
      );
    }

    // Must Not
    if (mustNot.length > 0) {
      this.scrollBox.add(
        createConstraintPanel(
          renderer,
          "Must Not",
          mustNot,
          "-",
          COLOR_FAILURE,
        ),
      );
    }

    // Ask First
    if (askFirst.length > 0) {
      this.scrollBox.add(
        createConstraintPanel(
          renderer,
          "Ask First",
          askFirst,
          "?",
          COLOR_WARNING,
        ),
      );
    }

    if (mustDo.length === 0 && mustNot.length === 0 && askFirst.length === 0) {
      this.scrollBox.add(
        new TextRenderable(renderer, {
          content: "No constraints defined for this rule.",
          fg: FG_MUTED,
          attributes: 4,
        }),
      );
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

function createConstraintPanel(
  renderer: import("@opentui/core").CliRenderer,
  title: string,
  items: string[],
  prefix: string,
  color: string,
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
    gap: 0,
  });

  for (const item of items) {
    panel.add(
      new TextRenderable(renderer, {
        content: `  ${prefix} ${item}`,
        fg: color,
      }),
    );
  }

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
