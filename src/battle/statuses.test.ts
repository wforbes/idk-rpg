import { beforeAll, describe, expect, test } from "vitest";
import { createGameState } from "../state/gameState";
import { createBattle, resolveTurn, snapshotFor, type TurnDeps } from "./engine";
import { getSandbox } from "./sandbox";
import { applyStatus, CHILL_SPEED_PENALTY, CHILL_TURNS, effectiveSpeed } from "./statuses";
import type { BattleEvent, BattleState, RunCode } from "./types";

let runCode: RunCode;
beforeAll(async () => {
  runCode = (await getSandbox()).run;
});

const rngOf = (values: number[]) => {
  const q = [...values];
  return () => q.shift() ?? 0.5;
};
const SLAP = [0.5, 0.9, 0.5, 0.5]; // no drift; Bugblob slaps
const deps = (values: number[] = SLAP): TurnDeps => ({ runCode, rng: rngOf(values) });
const fresh = (): BattleState =>
  createBattle("bugblob", createGameState().player, { knownAbilities: ["ember", "jab", "frostbite"] });
const cast = (code: string) => ({ kind: "cast" as const, code });
const firstActor = (events: BattleEvent[]) => events.find((e) => e.type === "cast")?.who;

describe("statuses", () => {
  test("frostbite(3) deals 3 and chills for 2 turns", () => {
    const { state, events } = resolveTurn(fresh(), cast("frostbite(3)"), deps());
    expect(state.enemy.hp).toBe(24 - 3);
    expect(events).toContainEqual({ type: "statusApplied", who: "enemy", status: "chilled", turns: CHILL_TURNS });
    expect(state.enemy.statuses.chilled).toBe(CHILL_TURNS - 1); // ticked at the end of this turn
  });

  test("chill flips turn order, then expires and order flips back", () => {
    let s = fresh();
    const t1 = resolveTurn(s, cast("frostbite(3)"), deps());
    expect(firstActor(t1.events)).toBe("enemy"); // Bugblob (6) is faster
    s = t1.state;
    expect(effectiveSpeed(s.enemy)).toBe(6 - CHILL_SPEED_PENALTY);

    const t2 = resolveTurn(s, cast("ember(3)"), deps());
    expect(firstActor(t2.events)).toBe("player"); // chilled Bugblob (4) is slower than you (5)
    expect(t2.events).toContainEqual({ type: "statusEnded", who: "enemy", status: "chilled" });
    s = t2.state;
    expect(s.enemy.statuses.chilled).toBeUndefined();

    const t3 = resolveTurn(s, cast("ember(3)"), deps());
    expect(firstActor(t3.events)).toBe("enemy");
  });

  test("reapplying refreshes, doesn't stack", () => {
    const s = fresh();
    applyStatus(s, "enemy", "chilled", 2);
    s.enemy.statuses.chilled = 1;
    applyStatus(s, "enemy", "chilled", 2);
    expect(s.enemy.statuses.chilled).toBe(2);
    expect(effectiveSpeed(s.enemy)).toBe(6 - CHILL_SPEED_PENALTY);
  });

  test("a chill-immune target emits immune", () => {
    const s = fresh();
    s.enemy.traits.chillImmune = true;
    expect(applyStatus(s, "enemy", "chilled", 2)).toEqual([{ type: "immune", who: "enemy", status: "chilled" }]);
    expect(s.enemy.statuses.chilled).toBeUndefined();
  });

  test("frostHalf halves frostbite damage", () => {
    const s = fresh();
    s.enemy.traits.frostHalf = true;
    const { state } = resolveTurn(s, cast("frostbite(3)"), deps());
    expect(state.enemy.hp).toBe(24 - 1);
  });

  test("the snapshot shows chilled and scared", () => {
    const s = fresh();
    applyStatus(s, "player", "chilled", 2);
    applyStatus(s, "enemy", "scared", 2);
    const snap = snapshotFor(s, "player");
    expect(snap.self.chilled).toBe(true);
    expect(snap.self.speed).toBe(5 - CHILL_SPEED_PENALTY);
    expect(snap.enemy.chilled).toBe(false);
    expect(snap.enemy.scared).toBe(true);
  });
});
