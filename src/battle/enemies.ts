import { EMBER_HOT_THRESHOLD } from "./abilities";
import type { BattleState } from "./types";

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
}

export const ENEMIES: Record<string, EnemyDef> = {
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
