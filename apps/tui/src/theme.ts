// Background colors
export const BG_PRIMARY = "#0d1117";
export const BG_SECONDARY = "#161b22";
export const BG_TERTIARY = "#21262d";
export const BG_HOVER = "#30363d";

// Text colors
export const FG_PRIMARY = "#e6edf3";
export const FG_SECONDARY = "#8b949e";
export const FG_MUTED = "#484f58";

// Category colors
export const COLOR_DECISION = "#58a6ff";
export const COLOR_PATTERN = "#3fb950";
export const COLOR_WARNING = "#d29922";
export const COLOR_LEARNING = "#bc8cff";

// Outcome colors
export const COLOR_SUCCESS = "#3fb950";
export const COLOR_FAILURE = "#f85149";
export const COLOR_PENDING = "#8b949e";

// Accent & borders
export const COLOR_ACCENT = "#58a6ff";
export const COLOR_BORDER = "#30363d";
export const COLOR_BORDER_FOCUS = "#58a6ff";

// Category color lookup
export const CATEGORY_COLORS: Record<string, string> = {
  decision: COLOR_DECISION,
  pattern: COLOR_PATTERN,
  warning: COLOR_WARNING,
  learning: COLOR_LEARNING,
};

// Category icons
export const CATEGORY_ICONS: Record<string, string> = {
  decision: "\u25cf",
  pattern: "\u25a0",
  warning: "\u25b2",
  learning: "\u2605",
};

// Outcome icons
export const OUTCOME_ICONS: Record<string, string> = {
  worked: "\u2713",
  failed: "\u2717",
  pending: "\u25cb",
};

// Border style
export const PANEL_BORDER = "rounded" as const;
