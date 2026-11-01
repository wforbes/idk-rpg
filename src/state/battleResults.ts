import { ENEMIES } from "../battle/enemies";
import type { BattleState } from "../battle/types";
import type { GameState } from "./gameState";
import { addSkillPoints, applyLossPenalty, grantXp } from "./progression";

/**
 * Everything a finished fight changes in the game state (besides the defeated flag and the
 * HP/MP/EN refill, which endBattle handles). Returns lines to narrate before leaving the battle.
 */
export function applyBattleResults(gs: GameState, final: BattleState, outcome: "won" | "lost" | "fled"): string[] {
  for (const item of final.consumed) {
    const i = gs.inventory.indexOf(item);
    if (i >= 0) gs.inventory.splice(i, 1);
  }
  addSkillPoints(gs, final.skillUses);
  // Knocking an enemy out and talking it down are worth the same.
  if (outcome === "won") return grantXp(gs, ENEMIES[final.enemyId]?.xp ?? 0);
  if (outcome === "lost") return applyLossPenalty(gs);
  return [];
}
