import { describe, expect, test } from "vitest";
import { createBattle } from "../battle/engine";
import { applyBattleResults } from "./battleResults";
import { createGameState } from "./gameState";

const finalWith = (consumed: string[]) => {
  const s = createBattle("bugblob", createGameState().player);
  s.consumed = consumed;
  return s;
};

describe("applyBattleResults: items", () => {
  test.each(["won", "lost", "fled"] as const)("consumed items leave the bag, one copy each (%s)", (outcome) => {
    const gs = createGameState();
    gs.inventory = ["spaceHeater", "manaBerry", "manaBerry", "energyBar"];
    applyBattleResults(gs, finalWith(["manaBerry", "energyBar"]), outcome);
    expect(gs.inventory).toEqual(["spaceHeater", "manaBerry"]);
  });

  test("an item that isn't in the bag is ignored, never negative", () => {
    const gs = createGameState();
    gs.inventory = ["spaceHeater"];
    applyBattleResults(gs, finalWith(["manaBerry"]), "won");
    expect(gs.inventory).toEqual(["spaceHeater"]);
  });
});
