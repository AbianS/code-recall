import type { CliRenderer } from "@opentui/core";
import { BoxRenderable, TextRenderable } from "@opentui/core";
import {
  BG_SECONDARY,
  COLOR_BORDER,
  FG_SECONDARY,
  PANEL_BORDER,
} from "../theme.ts";

export function createStatBox(
  renderer: CliRenderer,
  opts: { value: number; label: string; color: string },
) {
  const box = new BoxRenderable(renderer, {
    id: `stat-${opts.label.toLowerCase().replace(/\s+/g, "-")}`,
    flexGrow: 1,
    height: 6,
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: BG_SECONDARY,
    border: true,
    borderStyle: PANEL_BORDER,
    borderColor: COLOR_BORDER,
    paddingLeft: 1,
    paddingRight: 1,
  });

  const value = new TextRenderable(renderer, {
    content: String(opts.value),
    fg: opts.color,
    attributes: 1, // BOLD
  });

  const label = new TextRenderable(renderer, {
    content: opts.label,
    fg: FG_SECONDARY,
  });

  box.add(value);
  box.add(label);

  return box;
}
