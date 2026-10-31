import { describe, expect, test } from "vitest";
import { isBlocked, parseTiledMap } from "./areaMap";

const prop = (name: string, type: string, value: unknown) => ({ name, type, value });

// 4×3 map. Walls: a tree (gid 3) at (0,0); everything else open.
const fixture = {
  width: 4,
  height: 3,
  tilewidth: 16,
  tileheight: 16,
  layers: [
    { type: "tilelayer", name: "ground", width: 4, height: 3, data: Array(12).fill(1) },
    { type: "tilelayer", name: "walls", width: 4, height: 3, data: [3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
    {
      type: "objectgroup",
      name: "objects",
      objects: [
        { id: 1, name: "default", type: "spawn", x: 16, y: 16, width: 16, height: 16, properties: [prop("facing", "string", "down")] },
        {
          id: 2, name: "", type: "warp", x: 32, y: 16, width: 16, height: 16,
          properties: [prop("target", "string", "house"), prop("targetX", "int", 4), prop("targetY", "int", 6), prop("facing", "string", "up")],
        },
        {
          id: 7, name: "mo", type: "npc", x: 48, y: 32, width: 16, height: 16,
          properties: [prop("dialogueId", "string", "mo"), prop("pace", "string", "x"), prop("paceRange", "int", 2)],
        },
        { id: 8, name: "", type: "item", x: 16, y: 32, width: 16, height: 16, properties: [prop("itemId", "string", "spaceHeater")] },
        { id: 9, name: "", type: "enemy", x: 32, y: 32, width: 16, height: 16, properties: [prop("enemyId", "string", "bugblob")] },
      ],
    },
  ],
};

describe("parseTiledMap", () => {
  const map = parseTiledMap("town", fixture);

  test("parses size and walls", () => {
    expect(map.width).toBe(4);
    expect(map.height).toBe(3);
    expect(isBlocked(map, 0, 0)).toBe(true);
    expect(isBlocked(map, 1, 1)).toBe(false);
  });

  test("out of bounds is blocked", () => {
    expect(isBlocked(map, -1, 0)).toBe(true);
    expect(isBlocked(map, 4, 0)).toBe(true);
    expect(isBlocked(map, 0, 3)).toBe(true);
  });

  test("converts object pixels to tiles", () => {
    expect(map.warps).toEqual([{ x: 2, y: 1, target: "house", targetX: 4, targetY: 6, facing: "up" }]);
    expect(map.spawns.default).toEqual({ x: 1, y: 1, facing: "down" });
  });

  test("builds entity ids", () => {
    expect(map.npcs).toEqual([{ id: "town:7", x: 3, y: 2, dialogueId: "mo", pace: "x", paceRange: 2 }]);
    expect(map.items).toEqual([{ id: "town:8", x: 1, y: 2, itemId: "spaceHeater" }]);
    expect(map.enemies).toEqual([{ id: "town:9", x: 2, y: 2, enemyId: "bugblob" }]);
  });

  test("throws on missing walls layer", () => {
    const noWalls = { ...fixture, layers: fixture.layers.filter((l) => l.name !== "walls") };
    expect(() => parseTiledMap("x", noWalls)).toThrow(/walls/);
  });
});
