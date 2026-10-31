import Phaser from "phaser";
import { SCENES } from "./keys";
import { generateTextures } from "./textures";

export const MAP_KEYS = ["town", "house", "route"] as const;

export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENES.boot);
  }

  preload(): void {
    this.load.image("placeholder", "assets/tiles/placeholder.png");
    for (const key of MAP_KEYS) {
      // Same file twice: raw JSON for our parser, Tiled data for Phaser's renderer.
      this.load.json(`map:${key}`, `assets/maps/${key}.json`);
      this.load.tilemapTiledJSON(`tiled:${key}`, `assets/maps/${key}.json`);
    }
  }

  create(): void {
    generateTextures(this);
    this.scene.start(SCENES.overworld);
  }
}
