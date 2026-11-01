import { describe, expect, test } from "vitest";
import { ENEMY_SPRITES } from "./enemySprites";

describe("enemy sprites", () => {
  test.each(Object.entries(ENEMY_SPRITES))("%s is 16×16 and uses only palette characters", (_id, sprite) => {
    expect(sprite.rows).toHaveLength(16);
    for (const row of sprite.rows) expect([...row]).toHaveLength(16);
    const unknown = sprite.rows.flatMap((r) => [...r]).filter((c) => c !== "." && !(c in sprite.palette));
    expect(unknown).toEqual([]);
  });

  test("glitchling and frostcap have sprites", () => {
    expect(Object.keys(ENEMY_SPRITES).sort()).toEqual(["frostcap", "glitchling"]);
  });
});
