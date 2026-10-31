import { isBlocked } from "./areaMap";
import type { AreaMap, Facing, TilePos, Warp } from "./types";

const DELTAS: Record<Facing, TilePos> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

export function stepPos(p: TilePos, dir: Facing): TilePos {
  return { x: p.x + DELTAS[dir].x, y: p.y + DELTAS[dir].y };
}

export type StepResult =
  | { kind: "blocked" }
  | { kind: "moved"; to: TilePos }
  | { kind: "warp"; to: TilePos; warp: Warp };

export function tryStep(map: AreaMap, from: TilePos, dir: Facing, occupied: (p: TilePos) => boolean): StepResult {
  const to = stepPos(from, dir);
  if (isBlocked(map, to.x, to.y) || occupied(to)) return { kind: "blocked" };
  const warp = map.warps.find((w) => w.x === to.x && w.y === to.y);
  return warp ? { kind: "warp", to, warp } : { kind: "moved", to };
}

export interface Entity {
  kind: "npc" | "item" | "enemy";
  id: string;
  x: number;
  y: number;
}

export function findInteractable(pos: TilePos, facing: Facing, entities: Entity[]): Entity | null {
  const target = stepPos(pos, facing);
  return entities.find((e) => e.x === target.x && e.y === target.y) ?? null;
}
