import { describe, expect, test } from "vitest";
import { createBattle } from "../battle/engine";
import { applyBattleResults } from "./battleResults";
import { createGameState } from "./gameState";

const finalWith = (consumed: string[]) => {
  const s = createBattle("bugblob", createGameState().player);
  s.consumed = consumed;
  return s;
};

describe("applyBattleResults: progression", () => {
  test("a win grants the enemy's XP and its skill points", () => {
    const gs = createGameState();
    const final = finalWith([]);
    final.outcome = "won";
    final.skillUses = { ember: 3, jab: 1 };
    const notes = applyBattleResults(gs, final, "won");
    expect(gs.xp).toBe(10);
    expect(gs.skillPoints).toEqual({ ember: 3, jab: 1 });
    expect(notes).toEqual(["You gained 10 XP."]);
  });

  test("giving up grants the same XP as a knockout", () => {
    const knockout = createGameState();
    const gaveUp = createGameState();
    const a = finalWith([]);
    a.enemy.hp = 0;
    const b = finalWith([]);
    b.enemy.resolve = 0;
    applyBattleResults(knockout, a, "won");
    applyBattleResults(gaveUp, b, "won");
    expect(gaveUp.xp).toBe(knockout.xp);
  });

  test("a loss applies the penalty and still keeps skill points", () => {
    const gs = createGameState();
    gs.xp = 45;
    gs.level = 2;
    const final = finalWith([]);
    final.skillUses = { ember: 2 };
    expect(applyBattleResults(gs, final, "lost")).toEqual(["You lost 1 XP."]);
    expect(gs.skillPoints).toEqual({ ember: 2 });
  });

  test("fleeing grants nothing but keeps skill points", () => {
    const gs = createGameState();
    const final = finalWith([]);
    final.skillUses = { jab: 1 };
    expect(applyBattleResults(gs, final, "fled")).toEqual([]);
    expect(gs.xp).toBe(0);
    expect(gs.skillPoints).toEqual({ jab: 1 });
  });
});

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
