/**
 * Every progression number lives here: levels, level-up gains, unlocks, the loss penalty,
 * and the skill-point modifications. Tune freely.
 */

/** Cumulative XP needed to reach Lv1, Lv2, Lv3, Lv4. */
export const LEVEL_XP = [0, 20, 50, 90];

/** What each level-up adds to your max stats. */
export const LEVEL_GAINS = { maxHp: 5, maxMana: 2, maxEnergy: 2 };

/** Abilities learned on reaching a level. */
export const LEVEL_UNLOCKS: Record<number, string[]> = { 2: ["frostbite"] };

/** Share of your progress toward the next level that a blackout costs (never a whole level). */
export const LOSS_XP_PENALTY = 0.05;

export interface ModDef {
  id: string;
  ability: string;
  name: string;
  /** Skill points of that ability. */
  cost: number;
  description: string;
}

export const MODS: Record<string, ModDef> = {
  kindling: { id: "kindling", ability: "ember", name: "Kindling", cost: 5, description: "Fuel window becomes 2–5" },
  hotHands: { id: "hotHands", ability: "ember", name: "Hot Hands", cost: 8, description: "+2 damage" },
  heavyJab: { id: "heavyJab", ability: "jab", name: "Heavy Jab", cost: 5, description: "+2 damage" },
  deepChill: { id: "deepChill", ability: "frostbite", name: "Deep Chill", cost: 5, description: "Chill lasts 3 turns" },
};

/** Mod effect sizes (used by the abilities). */
export const KINDLING_MIN = 2;
export const HOT_HANDS_BONUS = 2;
export const HEAVY_JAB_BONUS = 2;
export const DEEP_CHILL_TURNS = 3;
