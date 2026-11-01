import { describe, expect, test } from "vitest";
import { LEVEL_GAINS, LEVEL_XP, LOSS_XP_PENALTY } from "../data/progression";
import { createGameState } from "./gameState";
import { addSkillPoints, applyLossPenalty, buyMod, grantXp, levelForXp } from "./progression";

describe("levels", () => {
  test("levelForXp boundaries", () => {
    expect(levelForXp(0)).toBe(1);
    expect(levelForXp(19)).toBe(1);
    expect(levelForXp(20)).toBe(2);
    expect(levelForXp(49)).toBe(2);
    expect(levelForXp(90)).toBe(4);
    expect(levelForXp(10_000)).toBe(LEVEL_XP.length);
  });

  test("grantXp reports the gain", () => {
    const gs = createGameState();
    expect(grantXp(gs, 10)).toEqual(["You gained 10 XP."]);
    expect(gs.xp).toBe(10);
    expect(gs.level).toBe(1);
  });

  test("grantXp across two levels applies both gains and the frostbite unlock once", () => {
    const gs = createGameState();
    const notes = grantXp(gs, 55);
    expect(gs.level).toBe(3);
    expect(gs.player.maxHp).toBe(30 + 2 * LEVEL_GAINS.maxHp);
    expect(gs.player.maxMana).toBe(10 + 2 * LEVEL_GAINS.maxMana);
    expect(gs.player.maxEnergy).toBe(12 + 2 * LEVEL_GAINS.maxEnergy);
    expect(gs.knownAbilities.filter((a) => a === "frostbite")).toHaveLength(1);
    expect(notes).toEqual(["You gained 55 XP.", "Level up! You're Lv 2.", "You learned frostbite!", "Level up! You're Lv 3."]);
  });
});

describe("loss penalty", () => {
  test("is 5%", () => {
    expect(LOSS_XP_PENALTY).toBe(0.05);
  });

  test("takes 5% of progress toward the next level, rounded down", () => {
    const gs = createGameState();
    grantXp(gs, 45); // Lv2 (floor 20), progress 25
    expect(applyLossPenalty(gs)).toEqual(["You lost 1 XP."]);
    expect(gs.xp).toBe(44);
    expect(gs.level).toBe(2);
  });

  test("never drops a level or goes negative, and says nothing when nothing is lost", () => {
    const gs = createGameState();
    expect(applyLossPenalty(gs)).toEqual([]);
    expect(gs.xp).toBe(0);
    grantXp(gs, 20); // exactly Lv2
    applyLossPenalty(gs);
    expect(gs.xp).toBe(20);
    expect(gs.level).toBe(2);
  });
});

describe("skill points and mods", () => {
  test("addSkillPoints accumulates per ability", () => {
    const gs = createGameState();
    addSkillPoints(gs, { ember: 2, jab: 1 });
    addSkillPoints(gs, { ember: 3 });
    expect(gs.skillPoints).toEqual({ ember: 5, jab: 1 });
  });

  test("buyMod spends that ability's points once", () => {
    const gs = createGameState();
    addSkillPoints(gs, { ember: 6 });
    expect(buyMod(gs, "kindling")).toBe(true);
    expect(gs.mods).toEqual(["kindling"]);
    expect(gs.skillPoints.ember).toBe(1);
    expect(buyMod(gs, "kindling")).toBe(false);
  });

  test("buyMod refuses unaffordable, unknown, or not-yet-learned abilities", () => {
    const gs = createGameState();
    addSkillPoints(gs, { ember: 4, frostbite: 9 });
    expect(buyMod(gs, "kindling")).toBe(false); // costs 5
    expect(buyMod(gs, "nope")).toBe(false);
    expect(buyMod(gs, "deepChill")).toBe(false); // frostbite not learned yet
    expect(gs.mods).toEqual([]);
  });
});
