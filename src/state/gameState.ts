import type { Facing } from "../world/types";

export interface PlayerStats {
  hp: number;
  maxHp: number;
  mana: number;
  maxMana: number;
  speed: number;
}

export interface Respawn {
  mapKey: string;
  x: number;
  y: number;
  facing: Facing;
}

/** Everything that outlives a scene: stats, bag, world flags. Scenes read and write this, never own it. */
export interface GameState {
  player: PlayerStats;
  inventory: string[];
  /** "picked:<entityId>", "defeated:<entityId>" */
  flags: Set<string>;
  respawn: Respawn;
}

export function createGameState(): GameState {
  return {
    player: { hp: 30, maxHp: 30, mana: 10, maxMana: 10, speed: 5 },
    inventory: [],
    flags: new Set(),
    respawn: { mapKey: "town", x: 15, y: 12, facing: "down" },
  };
}

export function hasFlag(s: GameState, flag: string): boolean {
  return s.flags.has(flag);
}

export function setFlag(s: GameState, flag: string): void {
  s.flags.add(flag);
}

/** Returns false (and changes nothing) if this map item was already picked up. */
export function pickUp(s: GameState, entityId: string, itemId: string): boolean {
  const flag = `picked:${entityId}`;
  if (hasFlag(s, flag)) return false;
  setFlag(s, flag);
  s.inventory.push(itemId);
  return true;
}

/** The app-wide instance. */
export const gameState: GameState = createGameState();
