import type { CliRenderer } from "@opentui/core";
import { BoxRenderable, TextRenderable } from "@opentui/core";
import { FG_MUTED } from "../theme.ts";

export function createEmptyState(renderer: CliRenderer, message: string) {
  const box = new BoxRenderable(renderer, {
    id: "empty-state",
    width: "100%",
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
  });

  const text = new TextRenderable(renderer, {
    content: message,
    fg: FG_MUTED,
    attributes: 4, // ITALIC
  });

  box.add(text);
  return box;
}
