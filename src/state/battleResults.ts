import type { BattleState } from "../battle/types";
import type { GameState } from "./gameState";

/**
 * Everything a finished fight changes in the game state (besides the defeated flag and the
 * HP/MP/EN refill, which endBattle handles). Returns lines to narrate before leaving the battle.
 */
export function applyBattleResults(gs: GameState, final: BattleState, _outcome: "won" | "lost" | "fled"): string[] {
  for (const item of final.consumed) {
    const i = gs.inventory.indexOf(item);
    if (i >= 0) gs.inventory.splice(i, 1);
  }
  return [];
}
