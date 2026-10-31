import Phaser from "phaser";
import { PLAYER_FRAMES, PLAYER_PALETTE } from "../art/playerSprite";
import type { Facing } from "../world/types";

/** Art drawn once at boot with Graphics. The player comes from pixel maps; the rest is still placeholder shapes. */
export function generateTextures(scene: Phaser.Scene): void {
  const g = scene.make.graphics({}, false);

  // Player: 4 frames side by side (down, up, left, right), painted from pixel maps.
  const facings: Facing[] = ["down", "up", "left", "right"];
  facings.forEach((facing, i) => paintPixels(g, PLAYER_FRAMES[facing], PLAYER_PALETTE, i * 16, 0));
  g.generateTexture("player", 64, 16);
  const player = scene.textures.get("player");
  facings.forEach((f, i) => player.add(f, 0, i * 16, 0, 16, 16));
  g.clear();

  // NPC: orange villager.
  g.fillStyle(0x7a3b12).fillRoundedRect(3, 2, 10, 13, 3);
  g.fillStyle(0xe8893a).fillRoundedRect(4, 3, 8, 11, 2);
  g.fillStyle(0xf1c27d).fillRect(5, 4, 6, 4);
  g.fillStyle(0x7a3b12).fillRect(4, 14, 3, 2).fillRect(9, 14, 3, 2);
  g.generateTexture("npc", 16, 16);
  g.clear();

  // Item: a little space heater (grille + glowing coil).
  g.fillStyle(0x333333).fillRect(3, 4, 10, 10);
  g.fillStyle(0xd0d0d0).fillRect(4, 5, 8, 8);
  g.fillStyle(0xff7a2f).fillRect(5, 7, 6, 1).fillRect(5, 9, 6, 1).fillRect(5, 11, 6, 1);
  g.fillStyle(0x333333).fillRect(4, 14, 2, 1).fillRect(10, 14, 2, 1);
  g.generateTexture("item", 16, 16);
  g.clear();

  // Overworld Bugblob: green slime with eyes.
  drawBlob(g, 0, 0, 16);
  g.generateTexture("enemy-bugblob", 16, 16);
  g.clear();

  // Battle sprites (48×48).
  drawBlob(g, 0, 0, 48);
  g.generateTexture("battle-bugblob", 48, 48);
  g.clear();

  // In battle you see the player from behind: the "up" frame at 3× scale.
  paintPixels(g, PLAYER_FRAMES.up, PLAYER_PALETTE, 0, 0, 3);
  g.generateTexture("battle-player-back", 48, 48);
  g.destroy();
}

function drawBlob(g: Phaser.GameObjects.Graphics, ox: number, oy: number, size: number): void {
  const s = size / 16;
  g.fillStyle(0x2f5e1f).fillEllipse(ox + 8 * s, oy + 10 * s, 14 * s, 11 * s);
  g.fillStyle(0x7bb662).fillEllipse(ox + 8 * s, oy + 10 * s, 12 * s, 9 * s);
  g.fillStyle(0xbfe6a8).fillEllipse(ox + 6 * s, oy + 8 * s, 3 * s, 2 * s);
  g.fillStyle(0x111111).fillRect(ox + 5 * s, oy + 9 * s, Math.max(1, s), 2 * s).fillRect(ox + 10 * s, oy + 9 * s, Math.max(1, s), 2 * s);
}

/** Paints a pixel map (one character per pixel, "." = transparent) at the given offset and scale. */
function paintPixels(
  g: Phaser.GameObjects.Graphics,
  rows: string[],
  palette: Record<string, number>,
  ox: number,
  oy: number,
  scale = 1,
): void {
  rows.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      const color = palette[ch];
      if (color !== undefined) g.fillStyle(color).fillRect(ox + x * scale, oy + y * scale, scale, scale);
    });
  });
}
