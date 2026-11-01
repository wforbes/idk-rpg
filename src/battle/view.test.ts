import { describe, expect, test } from "vitest";
import { createGameState } from "../state/gameState";
import { createBattle } from "./engine";
import { stepView, viewOf } from "./view";

const s = createBattle("bugblob", createGameState().player);

describe("battle view", () => {
  test("viewOf copies the displayed numbers", () => {
    expect(viewOf(s)).toEqual({ playerHp: 30, playerMana: 10, enemyHp: 24, enemyShielded: false, temperature: 24 });
  });

  test("a cast spends the shown mana", () => {
    expect(stepView(viewOf(s), { type: "cast", who: "player", spell: "ember", fuel: 4 }).playerMana).toBe(6);
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
