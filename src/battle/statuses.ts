import type { BattleEvent, BattleState, Fighter, Side, StatusName } from "./types";

export const CHILL_SPEED_PENALTY = 2;
export const CHILL_TURNS = 2;
export const SCARED_TURNS = 2;

/** Speed after statuses — what decides turn order. */
export function effectiveSpeed(f: Fighter): number {
  return f.speed - (f.statuses.chilled ? CHILL_SPEED_PENALTY : 0);
}

/** Applies (or refreshes — never stacks) a timed status. Mutates `draft`. */
export function applyStatus(draft: BattleState, target: Side, status: StatusName, turns: number): BattleEvent[] {
  const f = draft[target];
  if (status === "chilled" && f.traits.chillImmune) return [{ type: "immune", who: target, status }];
  f.statuses[status] = turns;
  return [{ type: "statusApplied", who: target, status, turns }];
}

/** End of a full turn: every status counts down; those reaching 0 end. Mutates `draft`. */
export function tickStatuses(draft: BattleState): BattleEvent[] {
  const events: BattleEvent[] = [];
  for (const side of ["player", "enemy"] as const) {
    const statuses = draft[side].statuses;
    for (const status of Object.keys(statuses) as StatusName[]) {
      const left = (statuses[status] ?? 0) - 1;
      if (left > 0) {
        statuses[status] = left;
      } else {
        delete statuses[status];
        events.push({ type: "statusEnded", who: side, status });
      }
    }
  }
  return events;
}
