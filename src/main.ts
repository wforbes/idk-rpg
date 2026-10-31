import Phaser from "phaser";
import "./styles.css";
import { BootScene } from "./scenes/BootScene";
import { BattleScene } from "./scenes/BattleScene";
import { OverworldScene } from "./scenes/OverworldScene";

export const GAME_WIDTH = 320;
export const GAME_HEIGHT = 240;

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game",
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  pixelArt: true,
  backgroundColor: "#1b1b24",
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, OverworldScene, BattleScene],
});

// Dev-only handle for poking at scenes from the browser console.
if (import.meta.env.DEV) (window as unknown as { game: Phaser.Game }).game = game;
