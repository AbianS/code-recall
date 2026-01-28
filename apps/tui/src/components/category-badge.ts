import { CATEGORY_COLORS, CATEGORY_ICONS, FG_SECONDARY } from "../theme.ts";

export function categoryLabel(category: string): string {
  const icon = CATEGORY_ICONS[category] ?? "\u25cb";
  return `${icon} ${category.toUpperCase()}`;
}

export function categoryColor(category: string): string {
  return CATEGORY_COLORS[category] ?? FG_SECONDARY;
}
