import type { Facing } from "../world/types";

/**
 * The player as 16×16 pixel maps: one character per pixel, "." is transparent.
 * Edit the art right here; textures.ts paints it with Graphics at boot.
 */
export const PLAYER_PALETTE: Record<string, number> = {
  o: 0x1b1b2a, // outline / eyes
  h: 0x6b4226, // hair
  s: 0xf1c27d, // skin
  S: 0xd9a066, // skin shade
  t: 0x5b7bd5, // tunic
  T: 0x3d5aa8, // tunic shade (sleeve in profile)
  b: 0x7a5230, // belt
  p: 0x3b3b55, // pants
  f: 0x2a1d14, // shoes
};

const DOWN = [
  "................",
  ".....oooooo.....",
  "....ohhhhhho....",
  "...ohhhhhhhho...",
  "...ohhhhhhhho...",
  "...ohssssssho...",
  "...osossssoso...",
  "...osssssssso...",
  "....oSSSSSSo....",
  "...otttttttto...",
  "..otottttttoto..",
  "..osobbbbbboso..",
  "...ooppppppoo...",
  "....oppooppo....",
  "....offooffo....",
  "....ooo..ooo....",
];

const UP = [
  "................",
  ".....oooooo.....",
  "....ohhhhhho....",
  "...ohhhhhhhho...",
  "...ohhhhhhhho...",
  "...ohhhhhhhho...",
  "...ohhhhhhhho...",
  "...ohhhhhhhho...",
  "....oSSSSSSo....",
  "...otttttttto...",
  "..otottttttoto..",
  "..osobbbbbboso..",
  "...ooppppppoo...",
  "....oppooppo....",
  "....offooffo....",
  "....ooo..ooo....",
];

const LEFT = [
  "................",
  ".....oooooo.....",
  "....ohhhhhho....",
  "...ohhhhhhhho...",
  "...ohhhhhhhho...",
  "...osssshhhho...",
  "...osossshhho...",
  "...osssssshho...",
  "....oSSSSSSo....",
  "....otttttto....",
  "....ottTTtto....",
  "....obbssbbo....",
  "....oppppppo....",
  "....oppooppo....",
  "....offooffo....",
  "....ooo..ooo....",
];

const mirror = (rows: string[]) => rows.map((r) => [...r].reverse().join(""));

export const PLAYER_FRAMES: Record<Facing, string[]> = {
  down: DOWN,
  up: UP,
  left: LEFT,
  right: mirror(LEFT),
};
