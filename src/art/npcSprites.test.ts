import { describe, expect, test } from "vitest";
import { NPC_PALETTES } from "./npcSprites";
import { PLAYER_FRAMES, PLAYER_PALETTE } from "./playerSprite";

describe("NPC sprites", () => {
  test("Mo has blonde hair and a purple tunic, unlike the player", () => {
    expect(NPC_PALETTES.mo.h).not.toBe(PLAYER_PALETTE.h);
    expect(NPC_PALETTES.mo.t).not.toBe(PLAYER_PALETTE.t);
  });

  test("Grandma Lint has white hair", () => {
    const hair = NPC_PALETTES.lint.h;
    const [r, g, b] = [(hair >> 16) & 0xff, (hair >> 8) & 0xff, hair & 0xff];
    expect(Math.min(r, g, b)).toBeGreaterThanOrEqual(0xd0); // light in every channel
    expect(Math.max(r, g, b) - Math.min(r, g, b)).toBeLessThanOrEqual(0x20); // and not tinted
  });

  test.each(Object.entries(NPC_PALETTES))("%s's palette colors every pixel of the body frames", (_name, palette) => {
    const used = new Set(Object.values(PLAYER_FRAMES).flatMap((rows) => rows.flatMap((r) => [...r])));
    used.delete(".");
    for (const ch of used) expect(palette[ch], `missing color for "${ch}"`).toBeTypeOf("number");
  });
});
