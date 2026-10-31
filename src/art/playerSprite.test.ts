import { describe, expect, test } from "vitest";
import { PLAYER_FRAMES, PLAYER_PALETTE } from "./playerSprite";

describe("player sprite", () => {
  test.each(Object.entries(PLAYER_FRAMES))("%s frame is 16×16", (_facing, rows) => {
    expect(rows).toHaveLength(16);
    for (const row of rows) expect([...row]).toHaveLength(16);
  });

  test.each(Object.entries(PLAYER_FRAMES))("%s frame only uses palette characters", (_facing, rows) => {
    const unknown = rows.flatMap((row) => [...row]).filter((c) => c !== "." && !(c in PLAYER_PALETTE));
    expect(unknown).toEqual([]);
  });

  test("right is the mirror of left", () => {
    PLAYER_FRAMES.right.forEach((row, y) => expect([...row].reverse().join("")).toBe(PLAYER_FRAMES.left[y]));
  });
});
