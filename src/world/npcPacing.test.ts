import { describe, expect, test } from "vitest";
import { parseTiledMap } from "./areaMap";
import { nextPaceStep, paceTileFree, type PacingNpc } from "./npcPacing";

const free = () => true;
const pacer = (over: Partial<PacingNpc> = {}): PacingNpc => ({
  originX: 5, originY: 5, x: 5, y: 5, pace: "x", paceRange: 2, dirSign: 1, ...over,
});

describe("nextPaceStep", () => {
  test("pacer moves within range and turns around", () => {
    let n = pacer();
    n = nextPaceStep(n, free);
    n = nextPaceStep(n, free);
    expect(n.x).toBe(7);
    n = nextPaceStep(n, free);
    expect(n.x).toBe(7);
    expect(n.dirSign).toBe(-1);
    n = nextPaceStep(n, free);
    expect(n.x).toBe(6);
  });

  test("pacer can walk to the far side of its range", () => {
    let n = pacer({ dirSign: -1 });
    for (let i = 0; i < 2; i++) n = nextPaceStep(n, free);
    expect(n.x).toBe(3);
  });

  test("pacer on y axis moves vertically", () => {
    const n = nextPaceStep(pacer({ pace: "y" }), free);
    expect(n).toMatchObject({ x: 5, y: 6 });
  });

  test("pacer waits when blocked", () => {
    const n = nextPaceStep(pacer(), () => false);
    expect(n).toMatchObject({ x: 5, y: 5, dirSign: -1 });
  });

  test("pace none never moves", () => {
    const n = nextPaceStep(pacer({ pace: "none" }), free);
    expect(n).toMatchObject({ x: 5, y: 5 });
  });
});

describe("paceTileFree", () => {
  // 3×2 map with no border walls: tree at (1,0), warp at (2,1).
  const map = parseTiledMap("p", {
    width: 3,
    height: 2,
    layers: [
      { type: "tilelayer", name: "walls", data: [0, 3, 0, 0, 0, 0] },
      {
        type: "objectgroup",
        name: "objects",
        objects: [
          {
            id: 1, type: "warp", x: 32, y: 16,
            properties: [
              { name: "target", value: "x" }, { name: "targetX", value: 0 },
              { name: "targetY", value: 0 }, { name: "facing", value: "up" },
            ],
          },
        ],
      },
    ],
  });

  test("open ground is free", () => {
    expect(paceTileFree(map, { x: 0, y: 1 }, [])).toBe(true);
  });

  test("off the map edge is never free", () => {
    expect(paceTileFree(map, { x: -1, y: 0 }, [])).toBe(false);
    expect(paceTileFree(map, { x: 3, y: 0 }, [])).toBe(false);
  });

  test("walls, warps and blockers are not free", () => {
    expect(paceTileFree(map, { x: 1, y: 0 }, [])).toBe(false);
    expect(paceTileFree(map, { x: 2, y: 1 }, [])).toBe(false);
    expect(paceTileFree(map, { x: 0, y: 1 }, [{ x: 0, y: 1 }])).toBe(false);
  });
});
