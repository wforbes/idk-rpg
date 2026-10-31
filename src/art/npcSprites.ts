import { PLAYER_PALETTE } from "./playerSprite";

/**
 * Humanoid NPCs reuse the player's body frames with their own colors.
 * Keyed by the NPC's Tiled object name; each gets an `npc-<name>` texture.
 * NPCs not listed here use the generic placeholder sprite.
 */
export const NPC_PALETTES: Record<string, Record<string, number>> = {
  mo: {
    ...PLAYER_PALETTE,
    h: 0xe8b830, // blonde hair
    t: 0x8b5cc7, // purple tunic
    T: 0x6a3fa3, // purple tunic shade
    p: 0x0055cc, // blue jeans pants
  },
  lint: {
    ...PLAYER_PALETTE,
    h: 0xeeeef2, // white hair
    t: 0xc98aa0, // dusty rose cardigan
    T: 0xa66b80, // cardigan shade
    p: 0x6b5f78, // plum skirt
  },
};
