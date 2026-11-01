import { describe, expect, test } from "vitest";
import { createGameState } from "../state/gameState";
import { createBattle, TEMP_MAX } from "./engine";
import { BAR_ENERGY, BATTLE_ITEMS, BERRY_MANA, HEATER_DEGREES } from "./items";

const fresh = () => createBattle("bugblob", createGameState().player);

describe("battle items", () => {
  test("space heater warms the air and caps at the max temperature", () => {
    const s = fresh();
    const events = BATTLE_ITEMS.spaceHeater.apply(s, "player");
    expect(s.world.temperature).toBe(24 + HEATER_DEGREES);
    expect(events).toEqual([{ type: "temperatureRaised", temperature: 24 + HEATER_DEGREES }]);
    s.world.temperature = TEMP_MAX - 1;
    BATTLE_ITEMS.spaceHeater.apply(s, "player");
    expect(s.world.temperature).toBe(TEMP_MAX);
  });

  test("mana berry restores mana, capped", () => {
    const s = fresh();
    s.player.mana = 3;
    expect(BATTLE_ITEMS.manaBerry.apply(s, "player")).toEqual([{ type: "restored", who: "player", resource: "mana", amount: BERRY_MANA }]);
    expect(s.player.mana).toBe(3 + BERRY_MANA);
    s.player.mana = 9;
    expect(BATTLE_ITEMS.manaBerry.apply(s, "player")).toEqual([{ type: "restored", who: "player", resource: "mana", amount: 1 }]);
    expect(s.player.mana).toBe(10);
  });

  test("energy bar restores energy, capped", () => {
    const s = fresh();
    s.player.energy = 2;
    BATTLE_ITEMS.energyBar.apply(s, "player");
    expect(s.player.energy).toBe(2 + BAR_ENERGY);
  });

  test("only the heater is reusable", () => {
    expect(BATTLE_ITEMS.spaceHeater.consumable).toBe(false);
    expect(BATTLE_ITEMS.manaBerry.consumable).toBe(true);
    expect(BATTLE_ITEMS.energyBar.consumable).toBe(true);
  });
});
