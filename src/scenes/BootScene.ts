import Phaser from "phaser";
import { SCENES } from "./keys";

export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENES.boot);
  }

  create(): void {
    this.add
      .text(this.scale.width / 2, this.scale.height / 2, "idk", {
        fontFamily: "monospace",
        fontSize: "32px",
        color: "#ffffff",
      })
      .setOrigin(0.5);
  }
}
