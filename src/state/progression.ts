import { LEVEL_GAINS, LEVEL_UNLOCKS, LEVEL_XP, LOSS_XP_PENALTY, MODS } from "../data/progression";
import type { GameState } from "./gameState";

export function levelForXp(xp: number): number {
  return LEVEL_XP.filter((needed) => xp >= needed).length;
}

/** Adds XP, applying every level-up it reaches (gains + unlocks). Returns lines to narrate. */
export function grantXp(gs: GameState, xp: number): string[] {
  const notes = [`You gained ${xp} XP.`];
  gs.xp += xp;
  while (gs.level < levelForXp(gs.xp)) {
    gs.level++;
    const p = gs.player;
    p.maxHp += LEVEL_GAINS.maxHp;
    p.maxMana += LEVEL_GAINS.maxMana;
    p.maxEnergy += LEVEL_GAINS.maxEnergy;
    p.hp += LEVEL_GAINS.maxHp;
    p.mana += LEVEL_GAINS.maxMana;
    p.energy += LEVEL_GAINS.maxEnergy;
    notes.push(`Level up! You're Lv ${gs.level}.`);
    for (const ability of LEVEL_UNLOCKS[gs.level] ?? []) {
      if (gs.knownAbilities.includes(ability)) continue;
      gs.knownAbilities.push(ability);
      notes.push(`You learned ${ability}!`);
    }
  }
  return notes;
}

/** A blackout costs a share of the progress toward the next level — never a level. */
export function applyLossPenalty(gs: GameState): string[] {
  const floor = LEVEL_XP[gs.level - 1] ?? 0;
  const lost = Math.floor(Math.max(0, gs.xp - floor) * LOSS_XP_PENALTY);
  if (lost <= 0) return [];
  gs.xp -= lost;
  return [`You lost ${lost} XP.`];
}

export function addSkillPoints(gs: GameState, uses: Record<string, number>): void {
  for (const [ability, n] of Object.entries(uses)) gs.skillPoints[ability] = (gs.skillPoints[ability] ?? 0) + n;
}

/** Buys a modification with its ability's skill points. False if unknown, unaffordable, not learned, or owned. */
export function buyMod(gs: GameState, modId: string): boolean {
  const mod = MODS[modId];
  if (!mod || gs.mods.includes(modId) || !gs.knownAbilities.includes(mod.ability)) return false;
  const points = gs.skillPoints[mod.ability] ?? 0;
  if (points < mod.cost) return false;
  gs.skillPoints[mod.ability] = points - mod.cost;
  gs.mods.push(modId);
  return true;
}
