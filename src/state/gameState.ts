import type { Facing } from "../world/types";

export interface PlayerStats {
  hp: number;
  maxHp: number;
  mana: number;
  maxMana: number;
  energy: number;
  maxEnergy: number;
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
  /** Moves, spells and actions the player can call in battle. */
  knownAbilities: string[];
}

export function createGameState(): GameState {
  return {
    player: { hp: 30, maxHp: 30, mana: 10, maxMana: 10, energy: 12, maxEnergy: 12, speed: 5 },
    inventory: [],
    flags: new Set(),
    respawn: { mapKey: "town", x: 15, y: 12, facing: "down" },
    knownAbilities: ["ember", "jab", "frostbite", "taunt"],
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

/**
 * Wraps up a fight. Phase 1 has no healing, so HP and MP are fully restored whatever happened.
 * Returns where the player should appear: back where they were, or at the respawn point after a blackout.
 */
export function endBattle(s: GameState, outcome: "won" | "lost" | "fled", enemyEntityId: string, returnTo: Respawn): Respawn {
  if (outcome === "won") setFlag(s, `defeated:${enemyEntityId}`);
  s.player.hp = s.player.maxHp;
  s.player.mana = s.player.maxMana;
  s.player.energy = s.player.maxEnergy;
  return outcome === "lost" ? { ...s.respawn } : returnTo;
}

/** The app-wide instance. */
export const gameState: GameState = createGameState();
