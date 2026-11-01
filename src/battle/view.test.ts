import { describe, expect, test } from "vitest";
import { createGameState } from "../state/gameState";
import { createBattle } from "./engine";
import { stepView, viewOf } from "./view";

const s = createBattle("bugblob", createGameState().player);

describe("battle view", () => {
  test("viewOf copies the displayed numbers", () => {
    expect(viewOf(s)).toEqual({
      playerHp: 30, playerMana: 10, playerEnergy: 12, enemyHp: 24, enemyShielded: false, temperature: 24,
      playerStatuses: [], enemyStatuses: [], enemyResolve: 50, enemyDodging: false,
    });
  });

  test("a cast spends the shown mana", () => {
    expect(stepView(viewOf(s), { type: "cast", who: "player", spell: "ember", fuel: 4 }).playerMana).toBe(6);
  });

  test("a jab spends the shown energy, not mana", () => {
    const v = stepView(viewOf(s), { type: "cast", who: "player", spell: "jab", fuel: 3, resource: "energy" });
    expect(v.playerEnergy).toBe(9);
    expect(v.playerMana).toBe(10);
  });

  test("energy regen raises the shown energy", () => {
    const v = stepView({ ...viewOf(s), playerEnergy: 5 }, { type: "regen", who: "player", amount: 2, resource: "energy" });
    expect(v.playerEnergy).toBe(7);
  });

  test("item effects show up in the view", () => {
    let v = stepView({ ...viewOf(s), playerMana: 2 }, { type: "restored", who: "player", resource: "mana", amount: 4 });
    expect(v.playerMana).toBe(6);
    v = stepView(v, { type: "restored", who: "player", resource: "energy", amount: 1 });
    expect(v.playerEnergy).toBe(13);
    expect(stepView(v, { type: "temperatureRaised", temperature: 28 }).temperature).toBe(28);
  });

  test("statuses add and remove tags", () => {
    let v = stepView(viewOf(s), { type: "statusApplied", who: "enemy", status: "chilled", turns: 2 });
    expect(v.enemyStatuses).toEqual(["chilled"]);
    v = stepView(v, { type: "statusApplied", who: "enemy", status: "chilled", turns: 2 });
    expect(v.enemyStatuses).toEqual(["chilled"]);
    v = stepView(v, { type: "statusEnded", who: "enemy", status: "chilled" });
    expect(v.enemyStatuses).toEqual([]);
    expect(stepView(v, { type: "statusApplied", who: "player", status: "chilled", turns: 2 }).playerStatuses).toEqual(["chilled"]);
  });

  test("resolve loss lowers the shown will, never below 0", () => {
    expect(stepView(viewOf(s), { type: "resolveLost", who: "enemy", amount: 15 }).enemyResolve).toBe(35);
    expect(stepView(viewOf(s), { type: "resolveLost", who: "enemy", amount: 99 }).enemyResolve).toBe(0);
  });

  test("damage lowers the target's shown HP, never below 0", () => {
    expect(stepView(viewOf(s), { type: "damage", who: "player", target: "enemy", amount: 8 }).enemyHp).toBe(16);
    expect(stepView(viewOf(s), { type: "damage", who: "enemy", target: "player", amount: 99 }).playerHp).toBe(0);
  });

  test("shield, regen and temperature", () => {
    let v = stepView(viewOf(s), { type: "shieldUp", who: "enemy" });
    expect(v.enemyShielded).toBe(true);
    v = stepView(v, { type: "shieldMelted", who: "player" });
    expect(v.enemyShielded).toBe(false);
    v = stepView({ ...v, playerMana: 5 }, { type: "regen", who: "player", amount: 2, resource: "mana" });
    expect(v.playerMana).toBe(7);
    expect(stepView(v, { type: "worldChanged", temperature: 28 }).temperature).toBe(28);
  });

  test("events that change nothing leave the view alone", () => {
    const v = viewOf(s);
    expect(stepView(v, { type: "fizzle", who: "player", spell: "ember", fuel: 6, min: 3, max: 5, resource: "mana" })).toEqual(v);
  });
});
