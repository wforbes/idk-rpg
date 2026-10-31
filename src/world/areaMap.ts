import type { AreaMap, Facing } from "./types";

export const TILE_SIZE = 16;

interface TiledProperty {
  name: string;
  value: unknown;
}

interface TiledObject {
  id: number;
  name?: string;
  type?: string;
  /** Tiled 1.9 wrote "class" instead of "type". */
  class?: string;
  x: number;
  y: number;
  properties?: TiledProperty[];
}

interface TiledLayer {
  type: string;
  name: string;
  data?: number[];
  objects?: TiledObject[];
}

interface TiledMap {
  width: number;
  height: number;
  layers: TiledLayer[];
}

const FACINGS: readonly Facing[] = ["up", "down", "left", "right"];

/**
 * Converts Tiled JSON into the game's map model.
 * Conventions: tile layer "walls" (any non-zero gid blocks), object layer "objects"
 * with object types spawn / warp / npc / item / enemy.
 */
export function parseTiledMap(key: string, json: unknown): AreaMap {
  const tiled = json as TiledMap;
  const walls = tiled.layers.find((l) => l.type === "tilelayer" && l.name === "walls");
  if (!walls?.data) throw new Error(`Map "${key}" has no "walls" tile layer`);

  const map: AreaMap = {
    key,
    width: tiled.width,
    height: tiled.height,
    blocked: walls.data.map((gid) => gid !== 0),
    spawns: {},
    warps: [],
    npcs: [],
    items: [],
    enemies: [],
  };

  const objects = tiled.layers.find((l) => l.type === "objectgroup" && l.name === "objects")?.objects ?? [];
  for (const obj of objects) {
    const props = new Map((obj.properties ?? []).map((p) => [p.name, p.value]));
    const str = (name: string) => requireProp<string>(key, obj, props, name, "string");
    const int = (name: string) => requireProp<number>(key, obj, props, name, "number");
    const facing = (name: string) => {
      const f = str(name) as Facing;
      if (!FACINGS.includes(f)) throw new Error(`Map "${key}" object ${obj.id}: bad facing "${f}"`);
      return f;
    };
    const x = Math.floor(obj.x / TILE_SIZE);
    const y = Math.floor(obj.y / TILE_SIZE);
    const id = `${key}:${obj.id}`;

    switch (obj.type ?? obj.class) {
      case "spawn":
        map.spawns[obj.name || "default"] = { x, y, facing: facing("facing") };
        break;
      case "warp":
        map.warps.push({ x, y, target: str("target"), targetX: int("targetX"), targetY: int("targetY"), facing: facing("facing") });
        break;
      case "npc": {
        const pace = str("pace");
        if (pace !== "none" && pace !== "x" && pace !== "y") throw new Error(`Map "${key}" npc ${obj.id}: bad pace "${pace}"`);
        map.npcs.push({ id, name: obj.name ?? "", x, y, dialogueId: str("dialogueId"), pace, paceRange: int("paceRange") });
        break;
      }
      case "item":
        map.items.push({ id, x, y, itemId: str("itemId") });
        break;
      case "enemy":
        map.enemies.push({ id, x, y, enemyId: str("enemyId") });
        break;
      default:
        throw new Error(`Map "${key}" object ${obj.id}: unknown type "${obj.type ?? obj.class}"`);
    }
  }
  return map;
}

function requireProp<T>(key: string, obj: TiledObject, props: Map<string, unknown>, name: string, type: string): T {
  const value = props.get(name);
  if (typeof value !== type) throw new Error(`Map "${key}" object ${obj.id}: missing ${type} property "${name}"`);
  return value as T;
}

/** Out of bounds counts as blocked. */
export function isBlocked(map: AreaMap, x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= map.width || y >= map.height) return true;
  return map.blocked[y * map.width + x];
}
