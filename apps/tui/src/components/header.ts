import type { CliRenderer } from "@opentui/core";
import { BoxRenderable, TextRenderable } from "@opentui/core";
import {
  BG_SECONDARY,
  COLOR_ACCENT,
  COLOR_BORDER,
  FG_PRIMARY,
  FG_SECONDARY,
} from "../theme.ts";

export function createHeader(renderer: CliRenderer, projectPath: string) {
  const container = new BoxRenderable(renderer, {
    id: "header",
    height: 3,
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: BG_SECONDARY,
    border: true,
    borderStyle: "heavy",
    borderColor: COLOR_BORDER,
    paddingLeft: 1,
    paddingRight: 1,
  });

  const title = new TextRenderable(renderer, {
    id: "header-title",
    content: " code-recall ",
    fg: COLOR_ACCENT,
    attributes: 1, // BOLD
  });

  const breadcrumb = new TextRenderable(renderer, {
    id: "header-breadcrumb",
    content: "Dashboard",
    fg: FG_PRIMARY,
  });

  const truncatedPath =
    projectPath.length > 40 ? `...${projectPath.slice(-37)}` : projectPath;
  const path = new TextRenderable(renderer, {
    id: "header-path",
    content: truncatedPath,
    fg: FG_SECONDARY,
    attributes: 4, // ITALIC
  });

  container.add(title);
  container.add(breadcrumb);
  container.add(path);

  return {
    renderable: container,
    update(screenName: string) {
      breadcrumb.content = screenName;
    },
  };
}
