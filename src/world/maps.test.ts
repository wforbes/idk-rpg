import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import { isBlocked, parseTiledMap } from "./areaMap";
import type { AreaMap } from "./types";

const KEYS = ["town", "house", "route"] as const;

function load(key: string): AreaMap {
  const file = path.resolve("public/assets/maps", `${key}.json`);
  return parseTiledMap(key, JSON.parse(fs.readFileSync(file, "utf8")));
}

const maps: Record<string, AreaMap> = Object.fromEntries(KEYS.map((k) => [k, load(k)]));

describe("map data", () => {
  test.each(KEYS)("%s parses", (key) => {
    expect(maps[key].width).toBeGreaterThan(0);
  });

  test("warp targets land on walkable tiles that are not warps", () => {
    for (const map of Object.values(maps)) {
      for (const w of map.warps) {
        const target = maps[w.target];
        expect(target, `${map.key} warp → ${w.target}`).toBeDefined();
        expect(isBlocked(target, w.targetX, w.targetY), `${map.key}→${w.target} (${w.targetX},${w.targetY})`).toBe(false);
        expect(target.warps.some((t) => t.x === w.targetX && t.y === w.targetY)).toBe(false);
      }
    }
  });

  test("spawns, npcs, items and enemies are on walkable tiles", () => {
    for (const map of Object.values(maps)) {
      const things = [...Object.values(map.spawns), ...map.npcs, ...map.items, ...map.enemies];
      for (const t of things) expect(isBlocked(map, t.x, t.y), `${map.key} (${t.x},${t.y})`).toBe(false);
    }
  });

  test("town door leads into the house and the house exit returns below the door", () => {
    const door = maps.town.warps.find((w) => w.target === "house");
    expect(door).toMatchObject({ x: 10, y: 7 });
    const exit = maps.house.warps.find((w) => w.target === "town");
    expect(exit).toMatchObject({ targetX: 10, targetY: 8 });
  });

  test("town and route connect both ways", () => {
    expect(maps.town.warps.some((w) => w.target === "route")).toBe(true);
    expect(maps.route.warps.some((w) => w.target === "town")).toBe(true);
  });

  test("town has a default spawn", () => {
    expect(maps.town.spawns.default).toEqual({ x: 15, y: 12, facing: "down" });
  });
});
