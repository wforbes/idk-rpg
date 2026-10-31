import Phaser from "phaser";
import type { Facing } from "../world/types";

/** Placeholder art, drawn once at boot. Real pixel art replaces this in a later phase. */
export function generateTextures(scene: Phaser.Scene): void {
  const g = scene.make.graphics({}, false);

  // Player: 4 frames side by side (down, up, left, right). The light "face" patch shows facing.
  const facings: Facing[] = ["down", "up", "left", "right"];
  facings.forEach((facing, i) => {
    const ox = i * 16;
    g.fillStyle(0x23366e).fillRoundedRect(ox + 3, 2, 10, 13, 3);
    g.fillStyle(0x5b7bd5).fillRoundedRect(ox + 4, 3, 8, 11, 2);
    g.fillStyle(0xf1c27d);
    if (facing === "down") g.fillRect(ox + 5, 4, 6, 4);
    if (facing === "left") g.fillRect(ox + 4, 4, 3, 4);
    if (facing === "right") g.fillRect(ox + 9, 4, 3, 4);
    // "up" shows the back of the head: no face patch.
    g.fillStyle(0x23366e).fillRect(ox + 4, 14, 3, 2).fillRect(ox + 9, 14, 3, 2);
  });
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

  g.fillStyle(0x23366e).fillRoundedRect(8, 6, 32, 42, 10);
  g.fillStyle(0x5b7bd5).fillRoundedRect(11, 9, 26, 36, 8);
  g.fillStyle(0x3b2a1a).fillCircle(24, 12, 9); // back of the head
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
