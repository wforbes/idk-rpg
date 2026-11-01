import { createGameState } from "../state/gameState";
import { createBattle, resolveTurn } from "./engine";
import type { BattleState, RunCode } from "./types";

/** mulberry32 — a tiny seeded PRNG so balance runs are reproducible. */
export function seededRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface SimResult {
  outcome: BattleState["outcome"];
  turns: number;
}

/** Plays one fight as a fresh level-1 player who casts the same code every turn. */
export function simulateFight(
  enemyId: string,
  code: string,
  seed: number,
  runCode: RunCode,
  opts: { items?: string[]; maxTurns?: number } = {},
): SimResult {
  const gs = createGameState();
  let s = createBattle(enemyId, gs.player, { knownAbilities: gs.knownAbilities, mods: gs.mods, items: opts.items ?? [] });
  const rng = seededRng(seed);
  const maxTurns = opts.maxTurns ?? 30;
  let turns = 0;
  while (s.outcome === "ongoing" && turns < maxTurns) {
    s = resolveTurn(s, { kind: "cast", code }, { runCode, rng }).state;
    turns++;
  }
  return { outcome: s.outcome, turns };
}
