/**
 * Enemies drawn as 16×16 pixel maps (one character per pixel, "." transparent).
 * textures.ts paints each at 1× for the overworld and 3× for battle.
 */
export interface PixelSprite {
  rows: string[];
  palette: Record<string, number>;
}

export const ENEMY_SPRITES: Record<string, PixelSprite> = {
  // A flickering bit of corrupted data. The cyan pixels are "glitches".
  glitchling: {
    palette: { o: 0x1a0f24, m: 0xd64ad1, M: 0x8e2f8c, c: 0x3ff0ff, w: 0xffffff, k: 0x1a0f24 },
    rows: [
      "................",
      "......oooo......",
      "....oommmmoo....",
      "...ommmmmmmmo...",
      "..ommwkmmwkmmo..",
      "..ommwkmmwkmmo..",
      "..ommmmmmmmmmo..",
      ".cocmmmMMmmmmoc.",
      "..ommmmmmmmmmo..",
      "..oMmmmmmmmmMo..",
      "...oMmmmmmmMo...",
      "....oommmmoo.c..",
      "..c...oooo......",
      "....o.o..o.o....",
      "....o.o..o.o....",
      "................",
    ],
  },
  // A grumpy mushroom with a frosted cap.
  frostcap: {
    palette: { o: 0x14213d, b: 0x6ec6ff, B: 0x3a8fd0, w: 0xf2fbff, s: 0xe8d8b8, S: 0xc4b08c, k: 0x14213d },
    rows: [
      "................",
      ".....oooooo.....",
      "...oobbwbbbboo..",
      "..obbbbbbwbbbbo.",
      ".obwbbbbbbbbwbbo",
      ".oBBbbbwbbbbBBBo",
      "..oooooooooooo..",
      "....osssssso....",
      "....osksskso....",
      "....osssssSo....",
      "....osssssSo....",
      "...osssssssSo...",
      "...oooooooooo...",
      "................",
      "................",
      "................",
    ],
  },
};
