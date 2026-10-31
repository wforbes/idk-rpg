import type { Snapshot } from "../battle/types";

export type AwarenessTab = "self" | "world" | "enemy";

/** Rows for the awareness panel, written exactly as the player would type them in code. */
export function awarenessRows(snapshot: Snapshot, tab: AwarenessTab): { label: string; value: string }[] {
  return Object.entries(snapshot[tab]).map(([key, value]) => ({
    label: `${tab}.${key}`,
    value: typeof value === "string" ? JSON.stringify(value) : String(value),
  }));
}
