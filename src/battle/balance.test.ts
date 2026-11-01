import { beforeAll, describe, expect, test } from "vitest";
import { getSandbox } from "./sandbox";
import { seededRng, simulateFight, type SimResult } from "./simulate";
import type { RunCode } from "./types";

const N = 100;
let runCode: RunCode;
beforeAll(async () => {
  runCode = (await getSandbox()).run;
});

interface Stats {
  winRate: number;
  avgTurns: number;
  within15: number;
}

function stats(enemyId: string, code: string, items: string[] = []): Stats {
  const results: SimResult[] = [];
  for (let seed = 1; seed <= N; seed++) results.push(simulateFight(enemyId, code, seed, runCode, { items }));
  return {
    winRate: results.filter((r) => r.outcome === "won").length / N,
    avgTurns: results.reduce((sum, r) => sum + r.turns, 0) / N,
    within15: results.filter((r) => r.outcome !== "ongoing" && r.turns <= 15).length / N,
  };
}

const CASES = [
  { enemy: "bugblob", intended: "ember(enemy.shielded ? 5 : 3)", naive: "ember(3)", items: [] },
  { enemy: "glitchling", intended: "enemy.dodging ? ember(3) : jab(3)", naive: "jab(3)", items: [] },
  {
    enemy: "frostcap",
    intended: "if (world.temperature <= 25) spaceHeater.use(); ember(4);",
    naive: "ember(4)",
    items: ["spaceHeater"],
  },
];

describe("simulator", () => {
  test("seededRng is deterministic", () => {
    const a = seededRng(42);
    const b = seededRng(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  test("simulateFight is deterministic for a seed", () => {
    const code = "ember(enemy.shielded ? 5 : 3)";
    expect(simulateFight("bugblob", code, 7, runCode)).toEqual(simulateFight("bugblob", code, 7, runCode));
  });
});

describe("balance (level 1, 100 seeded fights each)", () => {
  test.each(CASES)("$enemy: the intended pattern wins ≥ 90% and beats the naive one", ({ enemy, intended, naive, items }) => {
    const good = stats(enemy, intended, items);
    const bad = stats(enemy, naive, items);
    console.log(`${enemy}: intended ${JSON.stringify(good)} · naive ${JSON.stringify(bad)}`);
    expect(good.winRate).toBeGreaterThanOrEqual(0.9);
    expect(good.within15).toBeGreaterThanOrEqual(0.95);
    expect(bad.winRate < good.winRate || bad.avgTurns > good.avgTurns).toBe(true);
  }, 120_000);

  test("taunting alone talks Bugblob down", () => {
    const s = stats("bugblob", "taunt()");
    console.log(`bugblob taunt-only: ${JSON.stringify(s)}`);
    expect(s.winRate).toBeGreaterThanOrEqual(0.9);
  }, 120_000);
});
