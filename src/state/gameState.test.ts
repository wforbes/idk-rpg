import fs from "node:fs";
import { describe, expect, test } from "vitest";
import { parseTiledMap } from "../world/areaMap";
import { createGameState, endBattle, hasFlag, pickUp, setFlag, type Respawn } from "./gameState";

describe("game state", () => {
  test("starting stats", () => {
    const s = createGameState();
    expect(s.player).toEqual({ hp: 30, maxHp: 30, mana: 10, maxMana: 10, energy: 12, maxEnergy: 12, speed: 5 });
    expect(s.knownAbilities).toEqual(["ember", "jab", "taunt"]);
    expect(s).toMatchObject({ level: 1, xp: 0, skillPoints: {}, mods: [] });
    expect(s.inventory).toEqual([]);
    expect(s.respawn).toEqual({ mapKey: "town", x: 15, y: 12, facing: "down" });
  });

  test("pickUp adds item and sets flag", () => {
    const s = createGameState();
    expect(pickUp(s, "town:6", "spaceHeater")).toBe(true);
    expect(s.inventory).toEqual(["spaceHeater"]);
    expect(hasFlag(s, "picked:town:6")).toBe(true);
  });

  test("pickUp twice returns false and does not duplicate", () => {
    const s = createGameState();
    pickUp(s, "town:6", "spaceHeater");
    expect(pickUp(s, "town:6", "spaceHeater")).toBe(false);
    expect(s.inventory).toEqual(["spaceHeater"]);
  });

  test("flags persist independently of map reloads", () => {
    const s = createGameState();
    setFlag(s, "defeated:route:3");
    parseTiledMap("route", JSON.parse(fs.readFileSync("public/assets/maps/route.json", "utf8")));
    expect(hasFlag(s, "defeated:route:3")).toBe(true);
    expect(hasFlag(s, "defeated:route:4")).toBe(false);
  });
});

describe("endBattle", () => {
  const returnTo: Respawn = { mapKey: "route", x: 11, y: 7, facing: "right" };

  test("won sets defeated and returns returnTo", () => {
    const s = createGameState();
    expect(endBattle(s, "won", "route:3", returnTo)).toEqual(returnTo);
    expect(hasFlag(s, "defeated:route:3")).toBe(true);
  });

  test("lost returns respawn and restores HP and MP", () => {
    const s = createGameState();
    s.player.hp = 0;
    s.player.mana = 1;
    expect(endBattle(s, "lost", "route:3", returnTo)).toEqual({ mapKey: "town", x: 15, y: 12, facing: "down" });
    expect(s.player.hp).toBe(30);
    expect(s.player.mana).toBe(10);
    expect(hasFlag(s, "defeated:route:3")).toBe(false);
  });

  test("fled keeps the enemy undefeated", () => {
    const s = createGameState();
    expect(endBattle(s, "fled", "route:3", returnTo)).toEqual(returnTo);
    expect(hasFlag(s, "defeated:route:3")).toBe(false);
  });

  test("defeated enemies stay defeated after a later blackout", () => {
    const s = createGameState();
    endBattle(s, "won", "route:3", returnTo);
    endBattle(s, "lost", "route:9", returnTo);
    expect(hasFlag(s, "defeated:route:3")).toBe(true);
  });
});
