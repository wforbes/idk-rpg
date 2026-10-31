import Phaser from "phaser";
import { DIALOGUES } from "../data/dialogues";
import { ITEMS } from "../data/items";
import { DialogueRunner } from "../dialogue/runner";
import { gameState, hasFlag, pickUp } from "../state/gameState";
import { DialogueBox } from "../ui/DialogueBox";
import { InventoryScreen } from "../ui/InventoryScreen";
import { parseTiledMap, TILE_SIZE } from "../world/areaMap";
import { findInteractable, tryStep, type Entity } from "../world/movement";
import { nextPaceStep, type PacingNpc } from "../world/npcPacing";
import type { AreaMap, Facing, TilePos } from "../world/types";
import { SCENES } from "./keys";

export interface OverworldData {
  mapKey: string;
  x: number;
  y: number;
  facing: Facing;
}

type Mode = "explore" | "moving" | "dialogue" | "inventory" | "transition";

interface LiveEntity extends Entity {
  sprite: Phaser.GameObjects.Sprite;
  pacing?: PacingNpc;
  dialogueId?: string;
  itemId?: string;
  enemyId?: string;
}

const STEP_MS = 150;
const PACE_MS = 1500;
const FADE_MS = 150;
const TYPE_MS = 30;

export class OverworldScene extends Phaser.Scene {
  private area!: AreaMap;
  private start!: OverworldData;
  private mode: Mode = "explore";
  private player!: Phaser.GameObjects.Sprite;
  private playerPos: TilePos = { x: 0, y: 0 };
  /** The tile the player is leaving while a step tween runs; NPCs must not step into it. */
  private playerFrom: TilePos | null = null;
  private facing: Facing = "down";
  private entities: LiveEntity[] = [];
  /** After a panel closes, ignore direction keys until they're all released. */
  private holdLock = false;
  private dialogueBox!: DialogueBox;
  private runner: DialogueRunner | null = null;
  private typeTimer: Phaser.Time.TimerEvent | null = null;
  private keys!: {
    up: Phaser.Input.Keyboard.Key[];
    down: Phaser.Input.Keyboard.Key[];
    left: Phaser.Input.Keyboard.Key[];
    right: Phaser.Input.Keyboard.Key[];
    interact: Phaser.Input.Keyboard.Key[];
    inventory: Phaser.Input.Keyboard.Key[];
    back: Phaser.Input.Keyboard.Key[];
  };
  private inventory!: InventoryScreen;

  constructor() {
    super(SCENES.overworld);
  }

  init(data: Partial<OverworldData>): void {
    if (data?.mapKey !== undefined && data.x !== undefined && data.y !== undefined) {
      this.start = { mapKey: data.mapKey, x: data.x, y: data.y, facing: data.facing ?? "down" };
    } else {
      const spawn = parseTiledMap("town", this.cache.json.get("map:town")).spawns.default;
      this.start = { mapKey: "town", ...spawn };
    }
    this.mode = "explore";
    this.entities = [];
    this.playerFrom = null;
    this.holdLock = false;
    this.runner = null;
  }

  create(): void {
    const key = this.start.mapKey;
    this.area = parseTiledMap(key, this.cache.json.get(`map:${key}`));

    const tilemap = this.make.tilemap({ key: `tiled:${key}` });
    const tileset = tilemap.addTilesetImage("placeholder", "placeholder");
    if (!tileset) throw new Error("placeholder tileset missing");
    tilemap.createLayer("ground", tileset);
    tilemap.createLayer("walls", tileset);

    this.spawnEntities();

    this.playerPos = { x: this.start.x, y: this.start.y };
    this.facing = this.start.facing;
    this.player = this.add.sprite(...this.tileToWorld(this.playerPos), "player", this.facing).setOrigin(0).setDepth(10);

    this.setupCamera();
    this.setupInput();

    this.dialogueBox = new DialogueBox((i) => this.chooseByClick(i));
    this.inventory = new InventoryScreen();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.dialogueBox.close();
      this.inventory.close();
    });

    this.time.addEvent({ delay: PACE_MS, loop: true, callback: () => this.paceNpcs() });
    this.cameras.main.fadeIn(FADE_MS);
  }

  update(): void {
    if (this.mode === "dialogue") return this.updateDialogue();
    if (this.mode === "inventory") return this.updateInventory();
    if (this.mode !== "explore") return;
    if (this.justPressed("inventory")) {
      this.mode = "inventory";
      this.inventory.open(gameState.inventory);
      return;
    }
    if (this.justPressed("interact")) {
      this.interact();
      return;
    }
    const dir = this.heldDirection();
    if (dir) this.walk(dir);
  }

  // --- hooks for dialogue, items and battles ---------------------------------

  protected onInteract(entity: Entity): void {
    const live = entity as LiveEntity;
    if (live.kind === "npc" && live.dialogueId) this.startDialogue(new DialogueRunner(DIALOGUES[live.dialogueId]));
    if (live.kind === "item" && live.itemId) this.pickUpItem(live);
    if (live.kind === "enemy" && live.enemyId) this.startBattle(live);
  }

  protected isEntityActive(entity: Entity): boolean {
    if (entity.kind === "item") return !hasFlag(gameState, `picked:${entity.id}`);
    if (entity.kind === "enemy") return !hasFlag(gameState, `defeated:${entity.id}`);
    return true;
  }

  // --- setup -----------------------------------------------------------------

  private spawnEntities(): void {
    const add = (e: Omit<LiveEntity, "sprite">, texture: string) => {
      if (!this.isEntityActive(e)) return;
      const sprite = this.add.sprite(...this.tileToWorld(e), texture).setOrigin(0).setDepth(9);
      this.entities.push({ ...e, sprite });
    };
    for (const n of this.area.npcs) {
      add(
        {
          kind: "npc", id: n.id, x: n.x, y: n.y, dialogueId: n.dialogueId,
          pacing: { originX: n.x, originY: n.y, x: n.x, y: n.y, pace: n.pace, paceRange: n.paceRange, dirSign: 1 },
        },
        "npc",
      );
    }
    for (const i of this.area.items) add({ kind: "item", id: i.id, x: i.x, y: i.y, itemId: i.itemId }, "item");
    for (const e of this.area.enemies) add({ kind: "enemy", id: e.id, x: e.x, y: e.y, enemyId: e.enemyId }, `enemy-${e.enemyId}`);
  }

  private setupCamera(): void {
    const cam = this.cameras.main;
    const w = this.area.width * TILE_SIZE;
    const h = this.area.height * TILE_SIZE;
    cam.roundPixels = true;
    if (w <= this.scale.width && h <= this.scale.height) {
      cam.centerOn(w / 2, h / 2); // small interiors sit in the middle of the screen
    } else {
      cam.setBounds(0, 0, w, h);
      cam.startFollow(this.player, true);
    }
  }

  private setupInput(): void {
    const kb = this.input.keyboard!;
    kb.enableGlobalCapture(); // the battle scene turns it off so the code editor can receive keys
    const K = Phaser.Input.Keyboard.KeyCodes;
    const keys = (...codes: number[]) => codes.map((c) => kb.addKey(c));
    this.keys = {
      up: keys(K.UP, K.W),
      down: keys(K.DOWN, K.S),
      left: keys(K.LEFT, K.A),
      right: keys(K.RIGHT, K.D),
      interact: keys(K.SPACE, K.E, K.ENTER),
      inventory: keys(K.I),
      back: keys(K.ESC),
    };
  }

  // --- movement --------------------------------------------------------------

  private heldDirection(): Facing | null {
    const held = (["up", "down", "left", "right"] as const).find((dir) => this.keys[dir].some((k) => k.isDown)) ?? null;
    if (this.holdLock) {
      if (held) return null;
      this.holdLock = false;
    }
    return held;
  }

  private justPressed(name: keyof OverworldScene["keys"]): boolean {
    // Check every key so each one's JustDown flag is consumed.
    return this.keys[name].map((k) => Phaser.Input.Keyboard.JustDown(k)).some(Boolean);
  }

  private walk(dir: Facing): void {
    this.setFacing(dir);
    const result = tryStep(this.area, this.playerPos, dir, (p) => this.isOccupied(p));
    if (result.kind === "blocked") return;

    this.mode = "moving";
    this.playerFrom = this.playerPos;
    this.playerPos = result.to;
    const [x, y] = this.tileToWorld(result.to);
    this.tweens.add({
      targets: this.player,
      x,
      y,
      duration: STEP_MS,
      onComplete: () => {
        this.playerFrom = null;
        if (result.kind === "warp") {
          const { target, targetX, targetY, facing } = result.warp;
          this.transitionTo({ mapKey: target, x: targetX, y: targetY, facing });
        } else {
          this.mode = "explore";
          // Re-check held keys right away so walking is continuous.
          const next = this.heldDirection();
          if (next) this.walk(next);
        }
      },
    });
  }

  protected transitionTo(data: OverworldData): void {
    this.mode = "transition";
    this.cameras.main.fadeOut(FADE_MS);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.restart(data));
  }

  private setFacing(dir: Facing): void {
    this.facing = dir;
    this.player.setFrame(dir);
  }

  private isOccupied(p: TilePos): boolean {
    return this.entities.some((e) => e.x === p.x && e.y === p.y);
  }

  private paceNpcs(): void {
    if (this.mode === "dialogue" || this.mode === "transition") return;
    for (const e of this.entities) {
      if (!e.pacing) continue;
      const isFree = (p: TilePos) =>
        !this.area.blocked[p.y * this.area.width + p.x] &&
        !(p.x === this.playerPos.x && p.y === this.playerPos.y) &&
        !(this.playerFrom && p.x === this.playerFrom.x && p.y === this.playerFrom.y) &&
        !this.area.warps.some((w) => w.x === p.x && w.y === p.y) &&
        !this.entities.some((o) => o !== e && o.x === p.x && o.y === p.y);
      const next = nextPaceStep(e.pacing, isFree);
      e.pacing = next;
      if (next.x === e.x && next.y === e.y) continue;
      e.x = next.x;
      e.y = next.y;
      const [x, y] = this.tileToWorld(next);
      this.tweens.add({ targets: e.sprite, x, y, duration: STEP_MS * 2 });
    }
  }

  // --- interaction -----------------------------------------------------------

  private interact(): void {
    const target = findInteractable(this.playerPos, this.facing, this.entities);
    if (target) this.onInteract(target);
  }

  private startBattle(enemy: LiveEntity): void {
    this.mode = "transition";
    const returnTo = { mapKey: this.area.key, x: this.playerPos.x, y: this.playerPos.y, facing: this.facing };
    const cam = this.cameras.main;
    cam.flash(250, 255, 255, 255);
    cam.once(Phaser.Cameras.Scene2D.Events.FLASH_COMPLETE, () => {
      cam.fadeOut(200);
      cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () =>
        this.scene.start(SCENES.battle, { enemyId: enemy.enemyId, enemyEntityId: enemy.id, returnTo }),
      );
    });
  }

  private pickUpItem(item: LiveEntity): void {
    if (!item.itemId || !pickUp(gameState, item.id, item.itemId)) return;
    item.sprite.destroy();
    this.entities = this.entities.filter((e) => e !== item);
    const name = ITEMS[item.itemId]?.name ?? item.itemId;
    this.startDialogue(new DialogueRunner({ id: "pickup", start: "a", nodes: { a: { text: `You picked up the ${name}!` } } }));
  }

  private updateInventory(): void {
    if (this.justPressed("up")) this.inventory.move(-1);
    if (this.justPressed("down")) this.inventory.move(1);
    if (this.justPressed("inventory") || this.justPressed("back")) {
      this.inventory.close();
      this.holdLock = true;
      this.mode = "explore";
    }
  }

  // --- dialogue --------------------------------------------------------------

  protected startDialogue(runner: DialogueRunner): void {
    this.mode = "dialogue";
    this.runner = runner;
    this.dialogueBox.open(runner);
    this.typeTimer = this.time.addEvent({
      delay: TYPE_MS,
      loop: true,
      callback: () => {
        runner.tick();
        this.dialogueBox.render();
      },
    });
  }

  private updateDialogue(): void {
    const r = this.runner;
    if (!r) return;
    if (this.justPressed("up")) r.move(-1);
    if (this.justPressed("down")) r.move(1);
    if (this.justPressed("interact")) r.press();
    this.afterDialogueInput();
  }

  private chooseByClick(index: number): void {
    const r = this.runner;
    if (!r) return;
    while (r.selected !== index) r.move(1);
    r.press();
    this.afterDialogueInput();
  }

  private afterDialogueInput(): void {
    const r = this.runner;
    if (!r) return;
    if (!r.done) {
      this.dialogueBox.render();
      return;
    }
    this.typeTimer?.remove();
    this.typeTimer = null;
    this.runner = null;
    this.dialogueBox.close();
    this.holdLock = true;
    this.mode = "explore";
  }

  private tileToWorld(p: TilePos): [number, number] {
    return [p.x * TILE_SIZE, p.y * TILE_SIZE];
  }
}
