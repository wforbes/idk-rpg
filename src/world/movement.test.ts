import { describe, expect, test } from "vitest";
import { parseTiledMap } from "./areaMap";
import { findInteractable, stepPos, tryStep, type Entity } from "./movement";

// 5×4 map: tree at (2,0); warp at (3,2) → house.
const map = parseTiledMap("t", {
  width: 5,
  height: 4,
  layers: [
    { type: "tilelayer", name: "walls", data: [0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
    {
      type: "objectgroup",
      name: "objects",
      objects: [
        {
          id: 1, type: "warp", x: 48, y: 32,
          properties: [
            { name: "target", value: "house" }, { name: "targetX", value: 1 },
            { name: "targetY", value: 1 }, { name: "facing", value: "up" },
          ],
        },
      ],
    },
  ],
});
const nobody = () => false;

describe("tryStep", () => {
  test("moves onto open tile", () => {
    expect(tryStep(map, { x: 1, y: 1 }, "right", nobody)).toEqual({ kind: "moved", to: { x: 2, y: 1 } });
  });

  test("blocked by wall", () => {
    expect(tryStep(map, { x: 2, y: 1 }, "up", nobody)).toEqual({ kind: "blocked" });
  });

  test("blocked by map edge", () => {
    expect(tryStep(map, { x: 0, y: 1 }, "left", nobody)).toEqual({ kind: "blocked" });
  });

  test("blocked by occupant", () => {
    const occupied = (p: { x: number; y: number }) => p.x === 1 && p.y === 2;
    expect(tryStep(map, { x: 1, y: 1 }, "down", occupied)).toEqual({ kind: "blocked" });
  });

  test("stepping onto a warp tile returns warp", () => {
    const r = tryStep(map, { x: 3, y: 1 }, "down", nobody);
    expect(r.kind).toBe("warp");
    if (r.kind === "warp") {
      expect(r.to).toEqual({ x: 3, y: 2 });
      expect(r.warp.target).toBe("house");
    }
  });

  test("stepPos moves one tile per direction", () => {
    expect(stepPos({ x: 2, y: 2 }, "up")).toEqual({ x: 2, y: 1 });
    expect(stepPos({ x: 2, y: 2 }, "down")).toEqual({ x: 2, y: 3 });
    expect(stepPos({ x: 2, y: 2 }, "left")).toEqual({ x: 1, y: 2 });
    expect(stepPos({ x: 2, y: 2 }, "right")).toEqual({ x: 3, y: 2 });
  });
});

describe("findInteractable", () => {
  const npc: Entity = { kind: "npc", id: "t:7", x: 2, y: 1 };

  test("returns the entity on the faced tile", () => {
    expect(findInteractable({ x: 1, y: 1 }, "right", [npc])).toBe(npc);
  });

  test("returns null when facing empty ground", () => {
    expect(findInteractable({ x: 1, y: 1 }, "left", [npc])).toBeNull();
  });

  test("returns null for a diagonal entity", () => {
    expect(findInteractable({ x: 1, y: 2 }, "right", [npc])).toBeNull();
    expect(findInteractable({ x: 1, y: 2 }, "up", [npc])).toBeNull();
  });
});
