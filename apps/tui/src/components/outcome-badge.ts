import {
  COLOR_FAILURE,
  COLOR_PENDING,
  COLOR_SUCCESS,
  OUTCOME_ICONS,
} from "../theme.ts";

export function outcomeLabel(worked: number | null): string {
  if (worked === 1) return `${OUTCOME_ICONS.worked} WORKED`;
  if (worked === 0) return `${OUTCOME_ICONS.failed} FAILED`;
  return `${OUTCOME_ICONS.pending} PENDING`;
}

export function outcomeColor(worked: number | null): string {
  if (worked === 1) return COLOR_SUCCESS;
  if (worked === 0) return COLOR_FAILURE;
  return COLOR_PENDING;
}
