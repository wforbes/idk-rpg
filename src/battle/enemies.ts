import { EMBER_HOT_THRESHOLD } from "./abilities";
import type { BattleState, FighterTraits } from "./types";

export interface EnemyDef {
  id: string;
  name: string;
  level: number;
  maxHp: number;
  speed: number;
  abilities: string[];
  /** JavaScript run in the same sandbox as player code, from the enemy's point of view. */
  script: string;
  /** Prose hint shown in the casting overlay. */
  tell(s: BattleState): string;
  /** Will to fight; taunts and damage wear it down, and at 0 the enemy gives up. */
  maxResolve: number;
  /** Granted for a win either way — knockout or giving up. */
  xp: number;
  /** Narration for each way of winning. */
  knockoutText: string;
  giveUpText: string;
  /** Fixed quirks (weaknesses, immunities). */
  traits?: FighterTraits;
  /** Changes the air at the start of each of its actions. */
  aura?: { temperature: number };
}

const HOT = (s: BattleState) => s.world.temperature > EMBER_HOT_THRESHOLD;

export const ENEMIES: Record<string, EnemyDef> = {
  glitchling: {
    id: "glitchling",
    name: "Glitchling",
    level: 4,
    maxHp: 20,
    speed: 8,
    abilities: ["blink", "byteBite"],
    maxResolve: 40,
    xp: 14,
    knockoutText: "Glitchling crashes. Segmentation fault!",
    giveUpText: "Glitchling gives up and alt-tabs away.",
    script: `if (self.dodging) { byteBite(); } else if (chance(0.6)) { blink(); } else { byteBite(); }`,
    tell(s) {
      return s.enemy.dodging
        ? "Glitchling is flickering — fists and feet pass right through it, but magic won't."
        : "Glitchling twitches. It's fast… it may blink out of reach before you act.";
    },
  },
  frostcap: {
    id: "frostcap",
    name: "Frostcap",
    level: 5,
    maxHp: 30,
    speed: 4,
    abilities: ["iceBreath", "snowball"],
    maxResolve: 60,
    xp: 18,
    knockoutText: "Frostcap melts into a puddle of slush.",
    giveUpText: "Frostcap gives up and burrows back into the snow.",
    traits: { chillImmune: true, frostHalf: true, hotFireBonus: 3 },
    aura: { temperature: -2 },
    script: `if (!enemy.chilled) { iceBreath(); } else { snowball(); }`,
    tell(s) {
      const base = s.player.statuses.chilled
        ? "Frostcap winds up a snowball while you shiver."
        : "Frostcap's breath frosts the air. Its cold aura cools everything around it.";
      return HOT(s) ? `${base} It's sweating in the heat — fire will hurt extra!` : `${base} Frost won't do much to it.`;
    },
  },
  bugblob: {
    id: "bugblob",
    name: "Bugblob",
    level: 3,
    maxHp: 24,
    speed: 6,
    abilities: ["frostGather", "slimeSlap"],
    maxResolve: 50,
    xp: 10,
    knockoutText: "Bugblob collapses into a puddle.",
    giveUpText: "Bugblob gives up and oozes away.",
    script: `if (self.shielded) { slimeSlap(); } else if (chance(0.5)) { frostGather(); } else { slimeSlap(); }`,
    tell(s) {
      const base = s.enemy.shielded
        ? "Bugblob's ice shield glistens. Weak flames won't get through."
        : "Bugblob shivers and gathers frost… it might raise its shield before you act.";
      return s.world.temperature > EMBER_HOT_THRESHOLD ? `${base} The air is hot — fire burns brighter.` : base;
    },
  },
};
