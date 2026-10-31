import fs from "node:fs";
import { describe, expect, test } from "vitest";
import { parseTiledMap } from "../world/areaMap";
import { createGameState, hasFlag, pickUp, setFlag } from "./gameState";

describe("game state", () => {
  test("starting stats", () => {
    const s = createGameState();
    expect(s.player).toEqual({ hp: 30, maxHp: 30, mana: 10, maxMana: 10, speed: 5 });
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
