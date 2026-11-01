import { beforeAll, describe, expect, test } from "vitest";
import { createGameState } from "../state/gameState";
import { ENEMIES } from "./enemies";
import { createBattle, precheck, resolveTurn, snapshotFor, TEMP_MAX, TEMP_MIN, useItemNow, type TurnDeps } from "./engine";
import { getSandbox } from "./sandbox";
import type { BattleEvent, BattleState, RunCode } from "./types";

let runCode: RunCode;
beforeAll(async () => {
  runCode = (await getSandbox()).run;
});

/** rng that returns the given values in order, then 0.5 forever. 0.5 means "no temperature drift". */
const rngOf = (values: number[]) => {
  const queue = [...values];
  return () => queue.shift() ?? 0.5;
};
const deps = (values: number[] = []): TurnDeps => ({ runCode, rng: rngOf(values) });
const fresh = (): BattleState => createBattle("bugblob", createGameState().player);
const cast = (code: string) => ({ kind: "cast" as const, code });
const who = (e: BattleEvent) => ("who" in e ? e.who : null);

// Roll order per turn: [temperature drift, enemy roll 1, enemy roll 2, enemy roll 3].
const SHIELD = [0.5, 0.1]; // no drift; chance(0.5) succeeds → frostGather
const SLAP = [0.5, 0.9]; // no drift; chance(0.5) fails → slimeSlap

describe("createBattle", () => {
  test("sets up Bugblob, the player and the world", () => {
    const s = fresh();
    expect(s.enemy).toMatchObject({ name: "Bugblob", level: 3, hp: 24, maxHp: 24, speed: 6, shielded: false });
    expect(s.player).toMatchObject({ name: "You", hp: 30, maxHp: 30, mana: 10, maxMana: 10, energy: 12, maxEnergy: 12, speed: 5, shielded: false });
    expect(s.knownAbilities).toEqual(["ember", "jab"]);
    expect(s.world.temperature).toBe(24);
    expect(s.turn).toBe(1);
    expect(s.outcome).toBe("ongoing");
  });
});

describe("snapshotFor", () => {
  test("player view", () => {
    expect(snapshotFor(fresh(), "player")).toEqual({
      self: { hp: 30, maxHp: 30, mana: 10, maxMana: 10, energy: 12, maxEnergy: 12, speed: 5 },
      world: { temperature: 24 },
      enemy: { name: "Bugblob", hp: 24, maxHp: 24, shielded: false, dodging: false, speed: 6 },
    });
  });

  test("enemy view", () => {
    expect(snapshotFor(fresh(), "enemy")).toEqual({
      self: { name: "Bugblob", hp: 24, maxHp: 24, shielded: false, dodging: false },
      world: { temperature: 24 },
      enemy: { hp: 30, maxHp: 30, mana: 10, energy: 12 },
    });
  });
});

describe("resolveTurn", () => {
  test("faster enemy acts before player", () => {
    const { events } = resolveTurn(fresh(), cast("ember(3)"), deps(SLAP));
    expect(events[0].type).toBe("worldChanged");
    expect(who(events[1])).toBe("enemy");
  });

  test("tie goes to player", () => {
    const s = fresh();
    s.enemy.speed = 5;
    const { events } = resolveTurn(s, cast("ember(3)"), deps(SLAP));
    expect(who(events[1])).toBe("player");
  });

  test("code sees post-enemy state", () => {
    const { state, events } = resolveTurn(fresh(), cast("ember(enemy.shielded ? 5 : 3)"), deps(SHIELD));
    expect(events.map((e) => e.type)).toContain("shieldMelted");
    expect(state.enemy.hp).toBe(24 - 10);
    expect(state.enemy.shielded).toBe(false);
  });

  test("does not mutate the input state", () => {
    const s = fresh();
    const before = structuredClone(s);
    resolveTurn(s, cast("ember(4)"), deps(SLAP));
    expect(s).toEqual(before);
  });

  test("temperature drifts within bounds", () => {
    let s = fresh();
    const rng = Math.random;
    for (let i = 0; i < 50; i++) {
      s = resolveTurn(s, cast("ember(3)"), { runCode, rng }).state;
      expect(s.world.temperature).toBeGreaterThanOrEqual(TEMP_MIN);
      expect(s.world.temperature).toBeLessThanOrEqual(TEMP_MAX);
      s.player.hp = s.player.maxHp;
      s.enemy.hp = s.enemy.maxHp;
      s.player.mana = s.player.maxMana;
    }
  });

  test("temperature drift is reported first", () => {
    const { state, events } = resolveTurn(fresh(), cast("ember(3)"), deps([1, 0.9]));
    expect(state.world.temperature).toBe(27);
    expect(events[0]).toEqual({ type: "worldChanged", temperature: 27 });
  });

  test("mana regenerates and caps", () => {
    const { state, events } = resolveTurn(fresh(), cast("ember(3)"), deps(SLAP));
    expect(state.player.mana).toBe(10 - 3 + 2);
    expect(events).toContainEqual({ type: "regen", who: "player", amount: 2, resource: "mana" });

    const capped = fresh();
    capped.player.mana = 9;
    const r = resolveTurn(capped, cast("// nothing"), deps(SLAP));
    expect(r.state.player.mana).toBe(10);
    expect(r.events).toContainEqual({ type: "regen", who: "player", amount: 1, resource: "mana" });
  });

  test("energy regenerates and caps", () => {
    const { state, events } = resolveTurn(fresh(), cast("jab(3)"), deps(SLAP));
    expect(state.player.energy).toBe(12 - 3 + 2);
    expect(events).toContainEqual({ type: "regen", who: "player", amount: 2, resource: "energy" });
    const full = resolveTurn(fresh(), cast("ember(3)"), deps(SLAP));
    expect(full.events.some((e) => e.type === "regen" && e.resource === "energy")).toBe(false);
  });

  test("the player can branch between jab and ember at resolution", () => {
    const code = "enemy.shielded ? ember(5) : jab(3)";
    expect(resolveTurn(fresh(), cast(code), deps(SHIELD)).events.map((e) => e.type)).toContain("shieldMelted");
    const slap = resolveTurn(fresh(), cast(code), deps(SLAP));
    expect(slap.state.player.energy).toBe(12 - 3 + 2);
    expect(slap.state.enemy.hp).toBe(24 - 6);
  });

  test("turn counter advances", () => {
    expect(resolveTurn(fresh(), cast("ember(3)"), deps(SLAP)).state.turn).toBe(2);
  });

  test("run flees immediately", () => {
    const { state, events } = resolveTurn(fresh(), { kind: "run" }, deps(SLAP));
    expect(events).toEqual([{ type: "fled" }]);
    expect(state.outcome).toBe("fled");
  });

  test("player code error costs the turn but not the battle", () => {
    const { state, events } = resolveTurn(fresh(), cast('throw new Error("x")'), deps(SLAP));
    expect(events).toContainEqual(expect.objectContaining({ type: "codeError", who: "player" }));
    expect(state.outcome).toBe("ongoing");
  });

  test("console.log output from the real run becomes log events", () => {
    const { events } = resolveTurn(fresh(), cast("console.log(enemy.shielded); ember(enemy.shielded ? 5 : 3)"), deps(SHIELD));
    const i = events.findIndex((e) => e.type === "log");
    expect(events[i]).toEqual({ type: "log", who: "player", text: "true" });
    expect(events[i + 1]).toMatchObject({ type: "cast", who: "player", fuel: 5 });
  });

  test("logs are kept even when the code throws", () => {
    const { events } = resolveTurn(fresh(), cast('console.log("hi"); throw new Error("x")'), deps(SLAP));
    expect(events.filter((e) => e.type === "log" || e.type === "codeError").map((e) => e.type)).toEqual(["log", "codeError"]);
  });

  test("no cast is reported as noAction", () => {
    const { events } = resolveTurn(fresh(), cast("const x = 1;"), deps(SLAP));
    expect(events).toContainEqual({ type: "noAction", who: "player" });
  });

  test("the battle stops when someone falls", () => {
    const s = fresh();
    s.player.hp = 5;
    const { state, events } = resolveTurn(s, cast("ember(3)"), deps(SLAP));
    expect(state.outcome).toBe("lost");
    expect(events.at(-1)).toEqual({ type: "lost" });
    expect(events.some((e) => e.type === "cast" && e.who === "player")).toBe(false);
  });

  test("Bugblob never shields twice in a row", () => {
    const s = fresh();
    s.enemy.shielded = true;
    const { events } = resolveTurn(s, cast("ember(3)"), deps([0.5, 0.0, 0.0, 0.0]));
    expect(events).toContainEqual({ type: "cast", who: "enemy", spell: "slimeSlap" });
    expect(events.some((e) => e.type === "shieldUp")).toBe(false);
  });

  test("the winning pattern beats Bugblob", () => {
    let s = fresh();
    const rng = rngOf(Array.from({ length: 100 }, (_, i) => (i % 4 === 1 ? (i % 8 === 1 ? 0.1 : 0.9) : 0.5)));
    for (let i = 0; i < 10 && s.outcome === "ongoing"; i++) {
      s = resolveTurn(s, cast("ember(enemy.shielded ? 5 : 3)"), { runCode, rng }).state;
    }
    expect(s.outcome).toBe("won");
  });
});

describe("items in battle", () => {
  const withItems = (items: string[]) => createBattle("bugblob", createGameState().player, { items });

  test("spaceHeater + ember in one turn gets the hot bonus", () => {
    const { state, events } = resolveTurn(withItems(["spaceHeater"]), cast("spaceHeater.use(); ember(3);"), deps(SLAP));
    expect(events).toContainEqual({ type: "itemUsed", who: "player", item: "spaceHeater" });
    expect(state.enemy.hp).toBe(24 - (6 + 2));
  });

  test("a second item in the same turn is rejected", () => {
    const { state, events } = resolveTurn(withItems(["manaBerry", "manaBerry"]), cast("manaBerry.use(); manaBerry.use(); ember(3);"), deps(SLAP));
    expect(events).toContainEqual({ type: "itemRejected", who: "player", item: "manaBerry", reason: "extraItem" });
    expect(state.items).toEqual(["manaBerry"]);
  });

  test("Item menu use then an item in code is rejected", () => {
    const after = useItemNow(withItems(["manaBerry", "energyBar"]), "manaBerry").state;
    const { events } = resolveTurn(after, cast("energyBar.use(); ember(3);"), deps(SLAP));
    expect(events).toContainEqual({ type: "itemRejected", who: "player", item: "energyBar", reason: "extraItem" });
    expect(events.some((e) => e.type === "damage" && e.target === "enemy")).toBe(true);
  });

  test("the item limit resets next turn", () => {
    const one = resolveTurn(withItems(["manaBerry", "manaBerry"]), cast("manaBerry.use(); ember(3);"), deps(SLAP)).state;
    expect(one.itemUsedThisTurn).toBe(false);
    const two = resolveTurn(one, cast("manaBerry.use(); ember(3);"), deps(SLAP));
    expect(two.events).toContainEqual({ type: "itemUsed", who: "player", item: "manaBerry" });
  });

  test("consumables leave state.items and are recorded as consumed; the heater stays", () => {
    let s = withItems(["spaceHeater", "manaBerry"]);
    s = resolveTurn(s, cast("manaBerry.use(); ember(3);"), deps(SLAP)).state;
    s = resolveTurn(s, cast("spaceHeater.use(); ember(3);"), deps(SLAP)).state;
    expect(s.items).toEqual(["spaceHeater"]);
    expect(s.consumed).toEqual(["manaBerry"]);
  });

  test("useItemNow does not end the turn", () => {
    const before = withItems(["manaBerry"]);
    before.player.mana = 2;
    const { state, events } = useItemNow(before, "manaBerry");
    expect(state.turn).toBe(1);
    expect(state.player.mana).toBe(6);
    expect(state.itemUsedThisTurn).toBe(true);
    expect(events.every((e) => !("who" in e) || e.who === "player")).toBe(true);
    expect(before.player.mana).toBe(2);
  });

  test("an item-only turn is allowed by precheck", () => {
    expect(precheck(withItems(["manaBerry"]), "manaBerry.use();", runCode).ok).toBe(true);
  });

  test("precheck rejects two items", () => {
    const r = precheck(withItems(["manaBerry", "energyBar"]), "manaBerry.use(); energyBar.use(); ember(3);", runCode);
    expect(r).toMatchObject({ ok: false, message: "Only one item per turn." });
  });
});

describe("precheck", () => {
  const msg = (s: BattleState, code: string) => {
    const r = precheck(s, code, runCode);
    return r.ok ? "ok" : r.message;
  };

  test("accepts a legal cast", () => {
    expect(msg(fresh(), "ember(4)")).toBe("ok");
  });

  test("allows a fizzle — learning the window is part of play", () => {
    expect(msg(fresh(), "ember(9)")).toBe("ok");
  });

  test("code errors come back as the sandbox message", () => {
    expect(msg(fresh(), "enemy.hp = 0")).toMatch(/enemy\.hp is read-only/);
  });

  test("casting nothing", () => {
    expect(msg(fresh(), "// hmm")).toBe("Your code didn't cast anything. Try calling ember(…) with some mana.");
  });

  test("two damaging spells", () => {
    expect(msg(fresh(), "ember(3); ember(3);")).toBe("Only one move, spell or taunt per turn.");
    expect(msg(fresh(), "jab(3); ember(3);")).toBe("Only one move, spell or taunt per turn.");
  });

  test("bad fuel", () => {
    expect(msg(fresh(), "ember(4.5)")).toBe("ember needs a whole number of mana, like ember(4).");
    expect(msg(fresh(), 'ember("4")')).toBe("ember needs a whole number of mana, like ember(4).");
  });

  test("not enough mana", () => {
    const s = fresh();
    s.player.mana = 3;
    expect(msg(s, "ember(5)")).toBe("Not enough mana: ember(5) needs 5 MP and you have 3.");
    s.player.energy = 2;
    expect(msg(s, "jab(4)")).toBe("Not enough energy: jab(4) needs 4 EN and you have 2.");
  });

  test("precheck returns the dry run's logs", () => {
    expect(precheck(fresh(), 'console.log("a"); ember(4)', runCode)).toEqual({ ok: true, logs: ["a"] });
    expect(precheck(fresh(), 'console.log("b")', runCode)).toMatchObject({ ok: false, logs: ["b"] });
  });

  test("precheck does not mutate state", () => {
    const s = fresh();
    const before = structuredClone(s);
    precheck(s, "ember(4)", runCode);
    expect(s).toEqual(before);
  });
});

describe("Bugblob tell", () => {
  const tell = (s: BattleState) => ENEMIES.bugblob.tell(s);

  test("warns about the shield when shielded", () => {
    const s = fresh();
    s.enemy.shielded = true;
    expect(tell(s)).toBe("Bugblob's ice shield glistens. Weak flames won't get through.");
  });

  test("hints at a shield when unshielded", () => {
    expect(tell(fresh())).toBe("Bugblob shivers and gathers frost… it might raise its shield before you act.");
  });

  test("mentions heat only when hot", () => {
    const s = fresh();
    s.world.temperature = 26;
    expect(tell(s)).toMatch(/The air is hot — fire burns brighter\.$/);
    s.world.temperature = 25;
    expect(tell(s)).not.toMatch(/hot/);
  });
});
