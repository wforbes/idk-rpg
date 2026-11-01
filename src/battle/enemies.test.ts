import { beforeAll, describe, expect, test } from "vitest";
import { createGameState } from "../state/gameState";
import { createBattle, resolveTurn, type TurnDeps } from "./engine";
import { ENEMIES } from "./enemies";
import { getSandbox } from "./sandbox";
import type { BattleEvent, BattleState, RunCode } from "./types";

let runCode: RunCode;
beforeAll(async () => {
  runCode = (await getSandbox()).run;
});

const rngOf = (values: number[]) => {
  const q = [...values];
  return () => q.shift() ?? 0.5;
};
const deps = (values: number[]): TurnDeps => ({ runCode, rng: rngOf(values) });
const fight = (enemyId: string): BattleState =>
  createBattle(enemyId, createGameState().player, { knownAbilities: ["ember", "jab", "frostbite", "taunt"] });
const cast = (code: string) => ({ kind: "cast" as const, code });
const actor = (events: BattleEvent[]) => events.find((e) => e.type === "cast")?.who;

// Roll order per turn: [drift, enemy roll 1, 2, 3]. 0.5 drift = no change.
const BLINK = [0.5, 0.1];
const BITE = [0.5, 0.9];

describe("Glitchling", () => {
  test("stats", () => {
    expect(fight("glitchling").enemy).toMatchObject({ name: "Glitchling", level: 4, hp: 20, speed: 8, resolve: 40 });
    expect(ENEMIES.glitchling.xp).toBe(14);
  });

  test("blink makes jab miss but ember hit", () => {
    const missed = resolveTurn(fight("glitchling"), cast("jab(3)"), deps(BLINK));
    expect(missed.events).toContainEqual({ type: "dodgeUp", who: "enemy" });
    expect(missed.events).toContainEqual({ type: "missed", who: "player", spell: "jab" });
    expect(missed.state.enemy.hp).toBe(20);
    const hit = resolveTurn(fight("glitchling"), cast("ember(3)"), deps(BLINK));
    expect(hit.state.enemy.hp).toBe(20 - 6);
  });

  test("dodging clears on Glitchling's next action, and it bites instead of blinking again", () => {
    const after = resolveTurn(fight("glitchling"), cast("ember(3)"), deps(BLINK)).state;
    expect(after.enemy.dodging).toBe(true);
    const next = resolveTurn(after, cast("jab(3)"), deps(BLINK));
    expect(next.events).toContainEqual({ type: "cast", who: "enemy", spell: "byteBite" });
    expect(next.state.enemy.dodging).toBe(false);
    expect(next.state.enemy.hp).toBe(20 - 6 - 6); // the jab lands this time
  });

  test("the intended pattern reads the dodge at resolution", () => {
    const code = "enemy.dodging ? ember(3) : jab(3)";
    expect(resolveTurn(fight("glitchling"), cast(code), deps(BLINK)).state.player.mana).toBe(10 - 3 + 2);
    expect(resolveTurn(fight("glitchling"), cast(code), deps(BITE)).state.player.energy).toBe(12 - 3 + 2);
  });
});

describe("Frostcap", () => {
  test("stats", () => {
    expect(fight("frostcap").enemy).toMatchObject({ name: "Frostcap", level: 5, hp: 30, speed: 4, resolve: 60 });
    expect(ENEMIES.frostcap.xp).toBe(18);
  });

  test("its cold aura cools the air each of its turns", () => {
    const { state, events } = resolveTurn(fight("frostcap"), cast("jab(2)"), deps([0.5]));
    expect(events).toContainEqual({ type: "aura", who: "enemy", temperature: 22 });
    expect(state.world.temperature).toBe(22);
  });

  test("iceBreath chills the player so Frostcap goes first next turn", () => {
    const t1 = resolveTurn(fight("frostcap"), cast("jab(2)"), deps([0.5]));
    expect(actor(t1.events)).toBe("player"); // you (5) are faster than Frostcap (4)
    expect(t1.events).toContainEqual({ type: "statusApplied", who: "player", status: "chilled", turns: 2 });
    const t2 = resolveTurn(t1.state, cast("jab(2)"), deps([0.5]));
    expect(actor(t2.events)).toBe("enemy"); // chilled you (3) are slower now
    expect(t2.events).toContainEqual({ type: "cast", who: "enemy", spell: "snowball" });
  });

  test("takes +3 fire when hot, half frostbite, and can't be chilled", () => {
    const hot = fight("frostcap");
    hot.world.temperature = 30; // aura → 28, still hot
    expect(resolveTurn(hot, cast("ember(3)"), deps([0.5])).state.enemy.hp).toBe(30 - (6 + 2 + 3));
    const { state, events } = resolveTurn(fight("frostcap"), cast("frostbite(4)"), deps([0.5]));
    expect(state.enemy.hp).toBe(30 - 2);
    expect(events).toContainEqual({ type: "immune", who: "enemy", status: "chilled" });
  });
});
