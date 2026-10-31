import { describe, expect, test } from "vitest";
import { SLIME_SLAP_DAMAGE } from "./abilities";
import { applyIntents } from "./applyIntents";
import type { BattleEvent, BattleState, Fighter, Intent } from "./types";

const fighter = (over: Partial<Fighter> = {}): Fighter => ({
  name: "X", level: 1, hp: 24, maxHp: 24, mana: 10, maxMana: 10, speed: 5, shielded: false, ...over,
});

const battle = (opts: { player?: Partial<Fighter>; enemy?: Partial<Fighter>; temperature?: number } = {}): BattleState => ({
  enemyId: "bugblob",
  player: fighter({ name: "You", hp: 30, maxHp: 30, ...opts.player }),
  enemy: fighter({ name: "Bugblob", ...opts.enemy }),
  world: { temperature: opts.temperature ?? 20 },
  turn: 1,
  outcome: "ongoing",
});

const ember = (fuel?: unknown): Intent => (fuel === undefined ? { spell: "ember" } : { spell: "ember", fuel });
const cast = (s: BattleState, ...intents: Intent[]) => applyIntents(s, "player", ["ember"], intents);
const types = (events: BattleEvent[]) => events.map((e) => e.type);

describe("applyIntents: ember", () => {
  test("ember(4) deals 8 and spends 4", () => {
    const s = battle();
    const events = cast(s, ember(4));
    expect(s.enemy.hp).toBe(16);
    expect(s.player.mana).toBe(6);
    expect(events).toContainEqual({ type: "damage", who: "player", target: "enemy", amount: 8 });
  });

  test("hot bonus", () => {
    const s = battle({ temperature: 26 });
    cast(s, ember(3));
    expect(s.enemy.hp).toBe(24 - 8);
  });

  test("no hot bonus at exactly the threshold", () => {
    const s = battle({ temperature: 25 });
    cast(s, ember(3));
    expect(s.enemy.hp).toBe(24 - 6);
  });

  test.each([2, 6])("fizzle outside the window (%i)", (fuel) => {
    const s = battle();
    const events = cast(s, ember(fuel));
    expect(types(events)).toEqual(["cast", "fizzle"]);
    expect(events[1]).toEqual({ type: "fizzle", who: "player", spell: "ember", fuel, min: 3, max: 5 });
    expect(s.player.mana).toBe(10 - fuel);
    expect(s.enemy.hp).toBe(24);
  });

  test("not enough mana", () => {
    const s = battle({ player: { mana: 3 } });
    const events = cast(s, ember(4));
    expect(events).toEqual([{ type: "notEnoughMana", who: "player", spell: "ember", fuel: 4, mana: 3 }]);
    expect(s.player.mana).toBe(3);
  });

  test.each([undefined, "5", 4.5, NaN, -1, Infinity, null, true])("bad fuel never spends (%s)", (fuel) => {
    const s = battle();
    const intent: Intent = fuel === undefined ? { spell: "ember" } : { spell: "ember", fuel };
    const events = cast(s, intent);
    expect(events).toEqual([{ type: "rejected", who: "player", spell: "ember", reason: "badFuel" }]);
    expect(s.player.mana).toBe(10);
    expect(s.enemy.hp).toBe(24);
  });

  test("huge fuel", () => {
    const s = battle();
    expect(types(cast(s, ember(1e9)))).toEqual(["notEnoughMana"]);
    expect(s.player.mana).toBe(10);
  });

  test("second damaging cast rejected", () => {
    const s = battle();
    const events = cast(s, ember(3), ember(3));
    expect(s.enemy.hp).toBe(18);
    expect(s.player.mana).toBe(7);
    expect(events.at(-1)).toEqual({ type: "rejected", who: "player", spell: "ember", reason: "extraDamagingCast" });
  });

  test("a fizzle still uses up the turn's damaging cast", () => {
    const s = battle();
    const events = cast(s, ember(9), ember(3));
    expect(s.enemy.hp).toBe(24);
    expect(events.at(-1)).toMatchObject({ reason: "extraDamagingCast" });
  });

  test("a rejected cast does not use up the turn's damaging cast", () => {
    const s = battle();
    cast(s, ember("x"), ember(3));
    expect(s.enemy.hp).toBe(18);
  });

  test("shield blocks weak ember", () => {
    const s = battle({ enemy: { shielded: true } });
    const events = cast(s, ember(4));
    expect(types(events)).toEqual(["cast", "blocked"]);
    expect(s.player.mana).toBe(6);
    expect(s.enemy.hp).toBe(24);
    expect(s.enemy.shielded).toBe(true);
  });

  test("ember(5) melts shield", () => {
    const s = battle({ enemy: { shielded: true } });
    const events = cast(s, ember(5));
    expect(types(events)).toEqual(["cast", "shieldMelted", "damage"]);
    expect(s.enemy.hp).toBe(14);
    expect(s.enemy.shielded).toBe(false);
  });

  test("unknown spell rejected", () => {
    const s = battle();
    expect(cast(s, { spell: "frostGather" })).toEqual([
      { type: "rejected", who: "player", spell: "frostGather", reason: "unknownSpell" },
    ]);
    expect(s.player.shielded).toBe(false);
  });

  test("lethal damage wins and clamps", () => {
    const s = battle({ enemy: { hp: 3 } });
    const events = cast(s, ember(5), { spell: "ember", fuel: 3 });
    expect(s.enemy.hp).toBe(0);
    expect(s.outcome).toBe("won");
    expect(events.at(-1)).toEqual({ type: "won" });
  });
});

describe("applyIntents: enemy abilities", () => {
  const enemyAct = (s: BattleState, spell: string) => applyIntents(s, "enemy", ["frostGather", "slimeSlap"], [{ spell }]);

  test("slimeSlap hurts the player", () => {
    const s = battle();
    enemyAct(s, "slimeSlap");
    expect(s.player.hp).toBe(30 - SLIME_SLAP_DAMAGE);
  });

  test("slimeSlap can defeat the player", () => {
    const s = battle({ player: { hp: 2 } });
    const events = enemyAct(s, "slimeSlap");
    expect(s.player.hp).toBe(0);
    expect(s.outcome).toBe("lost");
    expect(events.at(-1)).toEqual({ type: "lost" });
  });

  test("frostGather raises the user's shield", () => {
    const s = battle();
    expect(types(enemyAct(s, "frostGather"))).toEqual(["cast", "shieldUp"]);
    expect(s.enemy.shielded).toBe(true);
  });
});
