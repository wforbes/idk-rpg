import Phaser from "phaser";
import { ENEMIES } from "../battle/enemies";
import { createBattle, resolveTurn, type PlayerAction } from "../battle/engine";
import { describeEvent } from "../battle/messages";
import { getSandbox } from "../battle/sandbox";
import type { BattleEvent, BattleState, RunCode } from "../battle/types";
import { stepView, viewOf } from "../battle/view";
import { endBattle, gameState, type Respawn } from "../state/gameState";
import { BattleHud, type MenuChoice } from "../ui/battleHud";
import { openCastingOverlay, type SpellbookTab } from "../ui/castingOverlay";
import { SCENES } from "./keys";

export interface BattleData {
  enemyId: string;
  enemyEntityId: string;
  returnTo: Respawn;
}

export class BattleScene extends Phaser.Scene {
  private data_!: BattleData;
  protected state!: BattleState;
  protected hud!: BattleHud;
  protected runCode!: RunCode;
  /** The last code the player cast in this battle; the editor reopens with it. */
  protected lastCode = "// e.g. ember(4); or jab(3);\n";

  constructor() {
    super(SCENES.battle);
  }

  init(data: BattleData): void {
    this.data_ = data;
  }

  create(): void {
    // Typing in DOM panels (the code editor) must never be swallowed by Phaser's key capture.
    this.input.keyboard?.disableGlobalCapture();

    this.state = createBattle(this.data_.enemyId, gameState.player, { knownAbilities: gameState.knownAbilities });
    this.drawScene();
    this.hud = new BattleHud(
      { enemy: this.state.enemy.name, level: this.state.enemy.level },
      {
        playerHp: this.state.player.maxHp,
        playerMana: this.state.player.maxMana,
        playerEnergy: this.state.player.maxEnergy,
        enemyHp: this.state.enemy.maxHp,
      },
    );
    this.hud.update(viewOf(this.state));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.hud.destroy());
    this.cameras.main.fadeIn(200);

    void this.begin();
  }

  private async begin(): Promise<void> {
    this.runCode = (await getSandbox()).run;
    await this.hud.showMessages([`${this.state.enemy.name} blocks the road!`]);
    this.playerTurn();
  }

  protected playerTurn(): void {
    this.hud.showMenu((choice) => void this.onPick(choice), this.enabledMenu());
  }

  /** Menu options that do something right now. */
  protected enabledMenu(): Set<MenuChoice> {
    return new Set<MenuChoice>(["attack", "spell", "run"]);
  }

  private async onPick(choice: MenuChoice): Promise<void> {
    if (choice === "attack") return this.openSpell("moves");
    if (choice === "spell") return this.openSpell("spells");
    if (choice === "run") return this.resolve({ kind: "run" });
    await this.hud.showMessages(["You haven't learned that yet."]);
    this.playerTurn();
  }

  protected openSpell(tab: SpellbookTab): void {
    const keyboard = this.input.keyboard;
    if (keyboard) keyboard.enabled = false;
    this.hud.setHidden(true);
    const restore = () => {
      if (keyboard) keyboard.enabled = true;
      this.hud.setHidden(false);
    };
    const overlay = openCastingOverlay({
      state: this.state,
      tab,
      initialCode: this.lastCode,
      runCode: this.runCode,
      onCast: (code) => {
        restore();
        this.lastCode = code;
        void this.resolve({ kind: "cast", code });
      },
      onBack: () => {
        restore();
        this.playerTurn();
      },
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => overlay.close());
  }

  protected async resolve(action: PlayerAction): Promise<void> {
    const before = this.state;
    const { state, events } = resolveTurn(before, action, { runCode: this.runCode, rng: Math.random });

    // Narrate in order, moving the bars with each line. Skip "the air shifts" when nothing shifted.
    const shown = events.filter((e) => !(e.type === "worldChanged" && e.temperature === before.world.temperature));
    let view = viewOf(before);
    await this.hud.showMessages(
      shown.map((e) => describeEvent(e, state)),
      (i) => {
        view = stepView(view, shown[i]);
        this.hud.update(view);
        this.react(shown[i]);
      },
    );
    this.state = state;
    this.hud.update(viewOf(state));

    if (state.outcome === "ongoing") return this.playerTurn();
    if (state.outcome === "lost") await this.hud.showMessages(["You blacked out…"]);
    const destination = endBattle(gameState, state.outcome, this.data_.enemyEntityId, this.data_.returnTo);
    this.cameras.main.fadeOut(250);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start(SCENES.overworld, destination));
  }

  // --- drawing ---------------------------------------------------------------

  private enemySprite!: Phaser.GameObjects.Image;
  private playerSprite!: Phaser.GameObjects.Image;

  private drawScene(): void {
    const g = this.add.graphics();
    g.fillStyle(0xdff2c9).fillRect(0, 0, 320, 240);
    g.fillStyle(0xb9dc9a).fillEllipse(238, 92, 110, 26); // enemy's ground
    g.fillStyle(0xb9dc9a).fillEllipse(84, 166, 120, 28); // player's ground
    const enemyTexture = `battle-${ENEMIES[this.state.enemyId].id}`;
    this.enemySprite = this.add.image(238, 66, enemyTexture).setScale(1.25);
    this.playerSprite = this.add.image(84, 140, "battle-player-back").setScale(1.25);
  }

  /** Small hit/shield flourishes so the narration has something to look at. */
  private react(e: BattleEvent): void {
    if (e.type === "damage") {
      const target = e.target === "enemy" ? this.enemySprite : this.playerSprite;
      this.tweens.add({ targets: target, alpha: 0.2, yoyo: true, repeat: 2, duration: 70 });
    } else if (e.type === "shieldUp") {
      this.enemySprite.setTint(0xaee3ff);
    } else if (e.type === "shieldMelted") {
      this.enemySprite.clearTint();
    } else if (e.type === "won") {
      this.tweens.add({ targets: this.enemySprite, alpha: 0, y: this.enemySprite.y + 10, duration: 400 });
    }
  }
}
