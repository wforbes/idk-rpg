import { isBlocked } from "./areaMap";
import type { AreaMap, TilePos } from "./types";

export interface PacingNpc {
  originX: number;
  originY: number;
  x: number;
  y: number;
  pace: "none" | "x" | "y";
  paceRange: number;
  dirSign: 1 | -1;
}

/** Where a pacing NPC may step: on the map, not a wall, not a warp, not a blocker (player, other entities). */
export function paceTileFree(map: AreaMap, p: TilePos, blockers: (TilePos | null)[]): boolean {
  if (isBlocked(map, p.x, p.y)) return false;
  if (map.warps.some((w) => w.x === p.x && w.y === p.y)) return false;
  return !blockers.some((b) => b && b.x === p.x && b.y === p.y);
}

/** One pacing tick: step one tile along the axis, or turn around at the range limit / when blocked. */
export function nextPaceStep(npc: PacingNpc, isFree: (p: TilePos) => boolean): PacingNpc {
  if (npc.pace === "none" || npc.paceRange <= 0) return npc;
  const next = npc.pace === "x" ? { x: npc.x + npc.dirSign, y: npc.y } : { x: npc.x, y: npc.y + npc.dirSign };
  const offset = npc.pace === "x" ? next.x - npc.originX : next.y - npc.originY;
  const turned = { ...npc, dirSign: (-npc.dirSign) as 1 | -1 };
  if (Math.abs(offset) > npc.paceRange || !isFree(next)) return turned;
  return { ...npc, ...next };
}
