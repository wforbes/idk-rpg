import { describe, expect, test } from "vitest";
import { nextPaceStep, type PacingNpc } from "./npcPacing";

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
