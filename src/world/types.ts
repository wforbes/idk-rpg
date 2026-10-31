export type Facing = "up" | "down" | "left" | "right";

export interface TilePos {
  x: number;
  y: number;
}

export interface Warp extends TilePos {
  target: string;
  targetX: number;
  targetY: number;
  facing: Facing;
}

export interface NpcSpawn extends TilePos {
  id: string;
  /** The Tiled object's name, e.g. "mo"; picks the NPC's sprite. */
  name: string;
  dialogueId: string;
  pace: "none" | "x" | "y";
  paceRange: number;
}

export interface ItemSpawn extends TilePos {
  id: string;
  itemId: string;
}

export interface EnemySpawn extends TilePos {
  id: string;
  enemyId: string;
}

export interface AreaMap {
  key: string;
  width: number;
  height: number;
  /** Row-major, length width*height. */
  blocked: boolean[];
  spawns: Record<string, TilePos & { facing: Facing }>;
  warps: Warp[];
  npcs: NpcSpawn[];
  items: ItemSpawn[];
  enemies: EnemySpawn[];
}
