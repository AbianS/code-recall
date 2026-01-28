import type { RuleRow } from "../types.ts";

function parseJsonArray(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function formatRuleOption(rule: RuleRow) {
  const mustDo = parseJsonArray(rule.must_do);
  const mustNot = parseJsonArray(rule.must_not);
  const askFirst = parseJsonArray(rule.ask_first);

  const parts: string[] = [];
  if (mustDo.length > 0) parts.push(`+ ${mustDo.length} must-do`);
  if (mustNot.length > 0) parts.push(`- ${mustNot.length} must-not`);
  if (askFirst.length > 0) parts.push(`? ${askFirst.length} ask-first`);

  return {
    name: `"${rule.trigger}"`,
    description: parts.join("  |  ") || "No constraints defined",
    value: rule.id,
  };
}
