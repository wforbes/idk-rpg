import type { BattleEvent, BattleState } from "./types";

/** The numbers the HUD shows. Stepped event by event so bars move in time with the narration. */
export interface BattleView {
  playerHp: number;
  playerMana: number;
  enemyHp: number;
  enemyShielded: boolean;
  temperature: number;
}

export function viewOf(s: BattleState): BattleView {
  return {
    playerHp: s.player.hp,
    playerMana: s.player.mana,
    enemyHp: s.enemy.hp,
    enemyShielded: s.enemy.shielded,
    temperature: s.world.temperature,
  };
}

export function stepView(v: BattleView, e: BattleEvent): BattleView {
  switch (e.type) {
    case "cast":
      return e.who === "player" && e.fuel !== undefined ? { ...v, playerMana: v.playerMana - e.fuel } : v;
    case "damage":
      return e.target === "player"
        ? { ...v, playerHp: Math.max(0, v.playerHp - e.amount) }
        : { ...v, enemyHp: Math.max(0, v.enemyHp - e.amount) };
    case "regen":
      return { ...v, playerMana: v.playerMana + e.amount };
    case "shieldUp":
      return e.who === "enemy" ? { ...v, enemyShielded: true } : v;
    case "shieldMelted":
      return e.who === "player" ? { ...v, enemyShielded: false } : v;
    case "worldChanged":
      return { ...v, temperature: e.temperature };
    default:
      return v;
  }
}
