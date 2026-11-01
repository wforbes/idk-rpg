import { describe, expect, test } from "vitest";
import { createGameState } from "../state/gameState";
import { createBattle } from "./engine";
import { describeEvent } from "./messages";
import type { BattleEvent } from "./types";

const s = createBattle("bugblob", createGameState().player);

const ALL: BattleEvent[] = [
  { type: "worldChanged", temperature: 27 },
  { type: "codeError", who: "player", message: "SyntaxError: oops (line 2)" },
  { type: "codeError", who: "enemy", message: "x" },
  { type: "noAction", who: "player" },
  { type: "rejected", who: "player", spell: "frostGather", reason: "unknownSpell" },
  { type: "rejected", who: "player", spell: "ember", reason: "extraAction" },
  { type: "rejected", who: "player", spell: "ember", reason: "badFuel" },
  { type: "notEnoughFuel", who: "player", spell: "ember", fuel: 5, have: 3, resource: "mana" },
  { type: "notEnoughFuel", who: "player", spell: "jab", fuel: 4, have: 2, resource: "energy" },
  { type: "missed", who: "player", spell: "jab" },
  { type: "blocked", who: "player", spell: "jab" },
  { type: "fizzle", who: "player", spell: "ember", fuel: 6, min: 3, max: 5, resource: "mana" },
  { type: "fizzle", who: "player", spell: "jab", fuel: 5, min: 2, max: 4, resource: "energy" },
  { type: "cast", who: "player", spell: "ember", fuel: 4 },
  { type: "cast", who: "enemy", spell: "slimeSlap" },
  { type: "blocked", who: "player", spell: "ember" },
  { type: "shieldUp", who: "enemy" },
  { type: "shieldMelted", who: "player" },
  { type: "damage", who: "player", target: "enemy", amount: 8 },
  { type: "damage", who: "enemy", target: "player", amount: 5 },
  { type: "regen", who: "player", amount: 2, resource: "mana" },
  { type: "regen", who: "player", amount: 2, resource: "energy" },
  { type: "log", who: "player", text: "true" },
  { type: "fled" },
  { type: "won" },
  { type: "lost" },
];

describe("describeEvent", () => {
  test.each(ALL)("every event type has a message ($type)", (e) => {
    const text = describeEvent(e, s);
    expect(text.length).toBeGreaterThan(0);
    expect(text).not.toMatch(/undefined|null|NaN|\[object/);
  });

  test("fizzle copy", () => {
    expect(describeEvent({ type: "fizzle", who: "player", spell: "ember", fuel: 6, min: 3, max: 5, resource: "mana" }, s)).toBe(
      "Your ember fizzled — it needs 3–5 mana, you gave it 6.",
    );
  });

  test("blocked copy", () => {
    expect(describeEvent({ type: "blocked", who: "player", spell: "ember" }, s)).toBe("Bugblob's ice shield swallowed the flames!");
  });

  test("jab copy", () => {
    expect(describeEvent({ type: "blocked", who: "player", spell: "jab" }, s)).toBe("Your jab bounces off Bugblob's ice shield!");
    expect(describeEvent({ type: "missed", who: "player", spell: "jab" }, s)).toBe("Your jab misses — Bugblob isn't there!");
    expect(describeEvent({ type: "fizzle", who: "player", spell: "jab", fuel: 5, min: 2, max: 4, resource: "energy" }, s)).toBe(
      "Your jab fizzled — it needs 2–4 energy, you gave it 5.",
    );
    expect(describeEvent({ type: "regen", who: "player", amount: 2, resource: "energy" }, s)).toBe("You recover 2 EN.");
  });

  test("log copy", () => {
    expect(describeEvent({ type: "log", who: "player", text: "shielded? true" }, s)).toBe("console.log: shielded? true");
  });

  test("won copy", () => {
    expect(describeEvent({ type: "won" }, s)).toBe("Bugblob gives up and oozes away.");
  });
});
