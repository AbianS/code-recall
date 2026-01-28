import type { CliRenderer } from "@opentui/core";
import { BoxRenderable, TextRenderable } from "@opentui/core";
import { BG_TERTIARY, FG_SECONDARY } from "../theme.ts";

const DEFAULT_HINTS =
  "1:Dashboard  2:Memories  3:Rules  4:Entities  /:Search  q:Quit";

export function createStatusBar(renderer: CliRenderer) {
  const container = new BoxRenderable(renderer, {
    id: "status-bar",
    height: 1,
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: BG_TERTIARY,
    paddingLeft: 1,
    paddingRight: 1,
  });

  const hints = new TextRenderable(renderer, {
    id: "status-hints",
    content: DEFAULT_HINTS,
    fg: FG_SECONDARY,
  });

  container.add(hints);

  return {
    renderable: container,
    update(text?: string) {
      hints.content = text ?? DEFAULT_HINTS;
    },
  };
}
