# Phase 1 — Starting Area Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a playable starting area. It covers tile-by-tile exploration with collision, a house with an interior, an exit to a second area, NPC dialogue with choices, an item pickup and inventory, and one rough coding fight against Bugblob using `ember(mana)` in the casting overlay.

**Architecture:** Game rules live in plain TypeScript modules with no Phaser imports (`src/world`, `src/battle`, `src/state`, `src/dialogue`), and Vitest unit-tests them. Phaser scenes (`src/scenes`) only render and route input. UI panels such as dialogue, inventory, battle boxes and the casting overlay are DOM elements layered over the canvas in `#ui`. Player code runs in a QuickJS WebAssembly sandbox. It returns *intents*, such as `{ spell: "ember", fuel: 4 }`, which the battle engine validates and resolves. Enemy behavior is also JS source run in the same sandbox, so it can be shown to the player as code later.

**Tech Stack:** Vite ^8, TypeScript ^7 (fall back to ^5.9 if the toolchain fights it), Phaser ^4.2, Vitest ^5, CodeMirror 6 (`codemirror`, `@codemirror/lang-javascript`, `@codemirror/theme-one-dark`), `quickjs-emscripten-core` + `@jitl/quickjs-singlefile-mjs-release-sync` ^0.32 (the WASM is embedded, so no Vite WASM config is needed), and `pngjs` (dev, for the placeholder tileset generator). Maps are authored as Tiled JSON.

**Spec:** `docs/superpowers/specs/2026-10-31-idk-rpg-design.md`. Read §4, §5 and §8 before starting. The roadmap is in `docs/roadmap.md`.

## Global Constraints

- Desktop first: keyboard + mouse. Use arrow keys or WASD to move and **Space / E / Enter** to interact. `I` toggles the inventory and `Esc` closes panels.
- Movement is **grid-locked, tile by tile**. Tiles are **16×16**. The game resolution is **320×240**, scaled up with `pixelArt: true`.
- The game teaches **JavaScript**. Player code is JS and runs only inside the sandbox. It can never reach the page, game internals or the network, and it cannot hang the game.
- Awareness objects (`self`, `world`, `enemy`) are **read-only** inside player code.
- **One damaging Move/Spell per turn.** Mana is the overall limiter.
- Player code runs at **resolution time** in turn order, not when Cast is pressed (spec §5.3a).
- Pure logic modules must not import Phaser or touch the DOM.
- Tests are colocated as `src/**/*.test.ts`. Run them with `npm test`.
- Art is placeholder only. Sprites are generated at boot, and the single tileset PNG is produced by a script.
- Do not add `.superpowers/` to `.gitignore`. The owner commits brainstorm output deliberately.
- Commit after each task. Messages end with the `Co-Authored-By` trailer from the session instructions.

## Review Focus

1. **Typing in the code editor must not drive the game.** WASD, Space, E, I, Esc and the arrow keys typed in CodeMirror must not move the player, choose menu items or close the overlay (except Esc). This is covered by the manual check in Task 12.
2. **Bad player code must never crash or hang the battle.** That includes syntax errors, thrown errors, infinite loops, assigning to `enemy.hp`, and code that casts nothing. Each gets a readable message and returns to the editor without losing the turn. This is covered by the Task 8 and Task 10 tests.
3. **Weird fuel values must not break the math.** `ember()`, `ember("5")`, `ember(4.5)`, `ember(NaN)`, `ember(-1)` and `ember(1e9)` are rejected or fizzle, and never produce NaN or negative HP or mana. This is covered by the Task 9 tests.
4. **Input mid-step or mid-transition must not skip tiles, pass through walls or double-warp.** Holding a direction, mashing interact during a step, or pressing keys while dialogue, inventory or a warp is active should do none of those things. This is covered by the Task 4 tests and the manual checks in Tasks 5 and 6.
5. **Picked-up items and defeated enemies must not come back.** They stay gone after leaving and re-entering an area and after a blackout. This is covered by the Task 7 and Task 11 tests.

---

### Task 1: Project scaffold

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `src/main.ts`, `src/styles.css`, `src/scenes/BootScene.ts`, `src/smoke.test.ts`, `.gitignore`, `README.md`

**Interfaces:**
- Produces: npm scripts `dev`, `build`, `test` (`vitest run`), `typecheck` (`tsc --noEmit`). The DOM layout is `#app` (relative, 4:3), which contains `#game` (the Phaser parent) and `#ui` (absolute, `inset: 0`, `pointer-events: none`; child panels set `pointer-events: auto`). Scene keys are the string constants `"Boot"`, `"Overworld"` and `"Battle"`.

- [ ] **Step 1:** Run `npm init -y`. Install the runtime deps (`phaser codemirror @codemirror/lang-javascript @codemirror/theme-one-dark quickjs-emscripten-core @jitl/quickjs-singlefile-mjs-release-sync`) and the dev deps (`vite vitest typescript pngjs @types/pngjs`). Set `"type": "module"` and add the scripts above.
- [ ] **Step 2:** Configure `tsconfig.json` with `strict` and `"moduleResolution": "bundler"`. Set the Vitest config in `vite.config.ts` to `test: { include: ["src/**/*.test.ts"] }`.
- [ ] **Step 3:** In `src/main.ts`, create a Phaser game at 320×240 with `pixelArt: true`, `parent: "game"` and `scale: { mode: Phaser.Scale.FIT, autoCenter: CENTER_BOTH }`. Register only `BootScene`, which for now draws the text "idk" centered. Keep `#ui` exactly over the canvas. The `#app` container holds a 4:3 box sized to fit the window, and the canvas fills it. Load a pixel UI font (Google Fonts "Press Start 2P") in `index.html`. Code will use a monospace font.
- [ ] **Step 4:** Write `src/smoke.test.ts` with `expect(1 + 1).toBe(2)`. Run `npm test` and expect it to PASS.
- [ ] **Step 5:** Run `npm run typecheck && npm run build` and expect both to exit 0. Run `npm run dev`, open the URL, and confirm "idk" is centered and scales crisply when you resize the window.
- [ ] **Step 6:** Add `node_modules/` and `dist/` to `.gitignore`. Add a `README.md` with the run and test commands. Commit `chore: scaffold Vite + TS + Phaser project`.

---

### Task 2: Area map model and Tiled parser

**Files:**
- Create: `src/world/types.ts`, `src/world/areaMap.ts`, `src/world/areaMap.test.ts`

**Interfaces:**
- Produces in `src/world/types.ts`:
  ```ts
  export type Facing = "up" | "down" | "left" | "right";
  export interface TilePos { x: number; y: number }
  export interface Warp extends TilePos { target: string; targetX: number; targetY: number; facing: Facing }
  export interface NpcSpawn extends TilePos { id: string; dialogueId: string; pace: "none" | "x" | "y"; paceRange: number }
  export interface ItemSpawn extends TilePos { id: string; itemId: string }
  export interface EnemySpawn extends TilePos { id: string; enemyId: string }
  export interface AreaMap {
    key: string; width: number; height: number;
    blocked: boolean[];               // row-major, length width*height
    spawns: Record<string, TilePos & { facing: Facing }>;
    warps: Warp[]; npcs: NpcSpawn[]; items: ItemSpawn[]; enemies: EnemySpawn[];
  }
  ```
- Produces in `src/world/areaMap.ts`: `parseTiledMap(key: string, json: unknown): AreaMap` and `isBlocked(map: AreaMap, x: number, y: number): boolean`. Out of bounds counts as blocked.
- The Tiled conventions this parser defines, which Task 3 must follow:
  - Tile layer `"walls"`: any non-zero gid blocks. Tile layer `"ground"` is visual only.
  - Object layer `"objects"`: rectangle objects whose tile is `floor(x/16), floor(y/16)`, with object `type` set to one of the following:
    - `spawn` (`name` is the spawn key; custom property `facing`)
    - `warp` (custom properties `target`, `targetX`, `targetY`, `facing`)
    - `npc` (custom properties `dialogueId`, `pace`, `paceRange`)
    - `item` (custom property `itemId`)
    - `enemy` (custom property `enemyId`)
  - Entity ids are `` `${key}:${object.id}` ``.

- [ ] **Step 1: Write failing tests** against a small inline fixture: a 4×3 Tiled JSON with a `walls` layer and an `objects` layer holding one object of each type.
  - `parses size and walls`: `isBlocked(map,0,0) === true` where gid 3, `isBlocked(map,1,1) === false` where gid 0.
  - `out of bounds is blocked`: `isBlocked(map,-1,0)` and `isBlocked(map,4,0)` are both `true`.
  - `converts object pixels to tiles`: a warp at `x:32,y:16` gives `{x:2,y:1}` with `target`, `targetX`, `targetY` and `facing` read from properties.
  - `builds entity ids`: the npc with object id 7 on map `"town"` has `id === "town:7"`, `pace === "x"` and `paceRange === 2`.
  - `throws on missing walls layer`: `expect(() => parseTiledMap("x", noWalls)).toThrow(/walls/)`.
- [ ] **Step 2:** Run `npm test -- areaMap` and expect it to FAIL because the module is missing.
- [ ] **Step 3:** Implement `parseTiledMap` and `isBlocked`.
- [ ] **Step 4:** Run `npm test -- areaMap` and expect it to PASS.
- [ ] **Step 5:** Commit `feat(world): AreaMap model and Tiled JSON parser`.

---

### Task 3: Placeholder tileset and the three maps

**Files:**
- Create: `scripts/make-placeholder-tileset.mjs`, `public/assets/tiles/placeholder.png`, `public/assets/maps/town.json`, `public/assets/maps/house.json`, `public/assets/maps/route.json`, `src/world/maps.test.ts`

**Interfaces:**
- Consumes: `parseTiledMap` and `isBlocked` (Task 2).
- Produces: the map keys `"town"`, `"house"` and `"route"` at `assets/maps/<key>.json`. The tileset is named `"placeholder"`, with image `../tiles/placeholder.png` relative to each map, embedded in every map (Phaser can't read external `.tsx`).
- Produces the tileset gids (128×16 PNG, 8 columns): 1 grass, 2 path, 3 tree, 4 roof, 5 house wall, 6 door, 7 floor, 8 interior wall. Gids 3, 4, 5 and 8 go only on `walls`; gids 1, 2, 6 and 7 go only on `ground`.

The map layouts below are this plan's call:

| Map | Size | Contents |
|---|---|---|
| `town` | 30×20 | Trees around the border, except an opening at x=29, y=9–10. Warps on (29,9) and (29,10) lead to `route` (1,7) and (1,8), facing right. The house body covers x=8–13, y=4–7 (roof on rows 4–5, wall on rows 6–7). The door is at (10,7): a door gid on `ground`, nothing on `walls`, and a warp to `house` (4,6) facing up. The `default` spawn is at (15,12) facing down. NPC `mo` is at (16,9) with pace x, range 2, dialogue `mo`. The item `spaceHeater` is at (20,14). Path tiles connect the spawn, the door and the exit, with a few scattered trees. |
| `house` | 10×8 | Interior walls around the edge with floor inside. The exit opening is at (4,7) with a warp to `town` (10,8) facing down. NPC `lint` stands at (2,2) with pace none, dialogue `lint`. |
| `route` | 20×15 | Trees around the border, except an opening at x=0, y=7–8. Warps on (0,7) and (0,8) lead to `town` (28,9) and (28,10), facing left. Enemy `bugblob` is at (12,7). |

- [ ] **Step 1:** Write `scripts/make-placeholder-tileset.mjs` using `pngjs`. It draws 8 flat-colored 16×16 tiles, each with a simple distinguishing mark, so the door and roof read clearly in Tiled and in the game. Run it with `node scripts/make-placeholder-tileset.mjs` and confirm the PNG exists and is 128×16.
- [ ] **Step 2:** Author the three maps as Tiled 1.10-format JSON (orthogonal, finite, CSV data arrays). Any method is fine, including a throwaway generator in the scratchpad. The committed JSON is the source of truth, and the owner will edit it in Tiled later.
- [ ] **Step 3: Write the map validation tests** in `src/world/maps.test.ts`. Load each JSON with `fs` and parse it.
  - `every map parses`: run this for `town`, `house` and `route`.
  - `warp targets land on walkable tiles`: for every warp, `!isBlocked(targetMap, targetX, targetY)`, and the target tile is not itself a warp (no ping-pong).
  - `spawns, npcs, items and enemies are on walkable tiles`.
  - `town has a door warp to house and house has an exit warp to town at the door's tile below`: house warp target = (10,8).
  - `town and route connect both ways`.
- [ ] **Step 4:** Run `npm test -- maps` and expect it to PASS. Open the maps in Tiled if you have it installed to check that they render. This is optional.
- [ ] **Step 5:** Commit `feat(world): placeholder tileset and town/house/route maps`.

---

### Task 4: Grid movement, interaction targeting and NPC pacing

**Files:**
- Create: `src/world/movement.ts`, `src/world/movement.test.ts`, `src/world/npcPacing.ts`, `src/world/npcPacing.test.ts`

**Interfaces:**
- Consumes: the `AreaMap`, `TilePos`, `Facing` and `Warp` types and `isBlocked` (Task 2).
- Produces:
  ```ts
  export function stepPos(p: TilePos, dir: Facing): TilePos;
  export type StepResult = { kind: "blocked" } | { kind: "moved"; to: TilePos } | { kind: "warp"; to: TilePos; warp: Warp };
  export function tryStep(map: AreaMap, from: TilePos, dir: Facing, occupied: (p: TilePos) => boolean): StepResult;
  export interface Entity { kind: "npc" | "item" | "enemy"; id: string; x: number; y: number }
  export function findInteractable(pos: TilePos, facing: Facing, entities: Entity[]): Entity | null;
  // npcPacing.ts
  export interface PacingNpc { originX: number; originY: number; x: number; y: number; pace: "none" | "x" | "y"; paceRange: number; dirSign: 1 | -1 }
  export function nextPaceStep(npc: PacingNpc, isFree: (p: TilePos) => boolean): PacingNpc;
  ```
- Entities (NPCs, uncollected items and undefeated enemies) are solid. The scene passes them to `occupied`.

- [ ] **Step 1: Write failing tests** using a small inline map built with `parseTiledMap`.
  - `moves onto open tile`: `tryStep(...,{x:1,y:1},"right",()=>false)` gives `{kind:"moved",to:{x:2,y:1}}`.
  - `blocked by wall`, `blocked by map edge` and `blocked by occupant`: each gives `{kind:"blocked"}`.
  - `stepping onto a warp tile returns warp`: `kind === "warp"`, and `warp.target` matches the fixture.
  - `findInteractable returns the entity on the faced tile`. It returns `null` when facing empty ground, and `null` for an entity diagonal to the player.
  - `pacer moves within range and turns around`: starting at the origin with x, range 2 and dirSign 1, after 2 steps `x === origin+2`, and the 3rd step flips to `dirSign -1` and stays put.
  - `pacer waits when blocked`: when `isFree` returns false, the position is unchanged and dirSign is flipped.
  - `pace none never moves`.
- [ ] **Step 2:** Run `npm test -- movement npcPacing` and expect it to FAIL.
- [ ] **Step 3:** Implement both modules.
- [ ] **Step 4:** Run `npm test -- movement npcPacing` and expect it to PASS.
- [ ] **Step 5:** Commit `feat(world): grid movement, interaction targeting, NPC pacing`.

---

### Task 5: Overworld scene (walking, warps, NPC rendering)

**Files:**
- Modify: `src/scenes/BootScene.ts` and `src/main.ts`
- Create: `src/scenes/OverworldScene.ts`, `src/scenes/textures.ts`

**Interfaces:**
- Consumes: `parseTiledMap` (Task 2), the maps (Task 3), and `tryStep`, `findInteractable` and `nextPaceStep` (Task 4).
- Produces:
  - `OverworldScene` (key `"Overworld"`) takes `init(data: { mapKey: string; x: number; y: number; facing: Facing })`. The default is town's `default` spawn.
  - Scene mode is `"explore" | "moving" | "dialogue" | "inventory" | "transition"`. Movement input is accepted only in `"explore"`.
  - Hooks for later tasks: `onInteract(entity: Entity)` (dialogue is Task 6, items are Task 7, enemies are Task 11) and `isEntityActive(entity): boolean`, which returns `true` for everything until Task 7 and Task 11 add flags.
- `textures.ts` provides `generateTextures(scene)`, which creates the texture keys `player`, `npc`, `item`, `enemy-bugblob`, `battle-player-back` and `battle-bugblob` from Graphics. Facing is shown with a small marker on the player.

- [ ] **Step 1:** In `BootScene`, preload the tileset image `placeholder` and the three maps (`load.json` for the parser, `load.tilemapTiledJSON` for rendering). Call `generateTextures`, then start `Overworld`.
- [ ] **Step 2:** In `OverworldScene`:
  - Render the `ground` and `walls` layers.
  - Place the player at the init tile.
  - Make the camera follow the player, bounded to the map. Interiors smaller than the screen are centered.
  - In `"explore"` mode, a held direction calls `tryStep`. On `moved`, tween over 150 ms with mode `"moving"`, then return to `"explore"` and re-check held keys so walking is continuous. On `blocked`, only change facing.
  - On `warp`, finish the tween, set mode `"transition"`, fade out (150 ms), then `scene.restart({ mapKey: warp.target, x: warp.targetX, y: warp.targetY, facing: warp.facing })`.
- [ ] **Step 3:** Render NPCs, items and enemies from the map. Every 1500 ms, advance each pacing NPC with `nextPaceStep`. Its `isFree` returns false for walls, the player's tile, the player's destination tile while moving, and other entities. Tween NPC steps too.
- [ ] **Step 4:** Make the interact key (Space/E/Enter) call `findInteractable` and pass any result to `onInteract`. For now `onInteract` only logs to `console.debug`.
- [ ] **Step 5: Manual check.** Run `npm run dev` and confirm each of these:
  - You walk continuously while holding a key.
  - The player cannot pass trees, the house, NPCs or the map edge.
  - Door → interior → bottom exit returns you under the door.
  - The east exit leads to the route, and the route's west exit leads back.
  - Mo paces x ±2 and never walks into the player.
  - Mashing keys during a fade causes no double warp.
  - Holding a key into a wall doesn't jitter.
  Also run `npm run typecheck`.
- [ ] **Step 6:** Commit `feat(overworld): walkable scene with collision, warps and pacing NPCs`.

---

### Task 6: Dialogue runner and dialogue box

**Files:**
- Create: `src/dialogue/types.ts`, `src/dialogue/runner.ts`, `src/dialogue/runner.test.ts`, `src/data/dialogues.ts`, `src/ui/DialogueBox.ts`
- Modify: `src/scenes/OverworldScene.ts` (the `onInteract` npc branch)

**Interfaces:**
- Produces:
  ```ts
  export interface DialogueChoice { label: string; next: string | null }
  export interface DialogueNode { text: string; choices?: DialogueChoice[]; next?: string | null }
  export interface Dialogue { id: string; start: string; nodes: Record<string, DialogueNode> }
  export class DialogueRunner {
    constructor(dialogue: Dialogue, charsPerTick?: number); // default 1
    readonly visibleText: string; readonly isTyping: boolean; readonly done: boolean;
    readonly choices: DialogueChoice[]; readonly selected: number;
    tick(): void;            // reveal charsPerTick more characters
    press(): void;           // typing → reveal all; choices → follow selected; else follow next (null/undefined → done)
    move(delta: 1 | -1): void; // wraps; no-op without choices
  }
  export const DIALOGUES: Record<string, Dialogue>;
  ```
- `DialogueBox` (DOM, in `#ui`) has `open(runner)`, `close()` and `render()`. It takes up the bottom 40% of the screen and highlights choices with ▶.

The copy is fixed by this plan:
- `mo`, node `start`: "Hey! Welcome to Idk Village. Nobody remembers what 'idk' stands for. I say it's Intuition, Deduction, Knowledge." Its choices are "What's east of here?" → `east` and "Bye!" → `null`.
- `mo`, node `east`: "A Bugblob's been oozing around the road. Its ice shield shrugs off weak fire… so bring enough mana."
- `lint`, node `start`: "Grandma Lint squints at you. \"idk? Obviously it means Integrated Development Kit. Kids these days.\""

- [ ] **Step 1: Write failing tests:**
  - `types one char per tick`: after 3 ticks, `visibleText` is the first 3 chars and `isTyping` is true.
  - `press while typing reveals all`: `visibleText === text` and `isTyping` is false.
  - `choices appear only after typing completes`.
  - `move wraps`: with 2 choices, calling `move(1)` twice gives `selected === 0`.
  - `press follows choice`: selecting "What's east of here?" moves to the `east` text.
  - `null next ends dialogue`: `done === true`.
  - `every DIALOGUES node's next and choice targets exist`.
- [ ] **Step 2:** Run `npm test -- runner` and expect it to FAIL.
- [ ] **Step 3:** Implement the runner and data. Then implement `DialogueBox` and hook it into the overworld. Interacting with an NPC sets mode `"dialogue"` (which freezes movement and pacing), faces the NPC toward the player, and ticks the runner every 30 ms. Interact calls `press()`, and up/down call `move()`. When `done`, close the box and return to `"explore"`. The interact press that opens dialogue must not also advance it.
- [ ] **Step 4:** Run `npm test` and expect it to PASS.
- [ ] **Step 5: Manual check.** Talk to Mo and pick both choices. Talk to Grandma Lint. Confirm Mo stops pacing while you talk and that holding a direction key during dialogue doesn't move you afterward.
- [ ] **Step 6:** Commit `feat(dialogue): typewriter dialogue with choices`.

---

### Task 7: Game state, item pickup and inventory screen

**Files:**
- Create: `src/state/gameState.ts`, `src/state/gameState.test.ts`, `src/data/items.ts`, `src/ui/InventoryScreen.ts`
- Modify: `src/scenes/OverworldScene.ts` (the item branch of `onInteract`, `isEntityActive`, the `I` key)

**Interfaces:**
- Produces:
  ```ts
  export interface PlayerStats { hp: number; maxHp: number; mana: number; maxMana: number; speed: number }
  export interface Respawn { mapKey: string; x: number; y: number; facing: Facing }
  export interface GameState { player: PlayerStats; inventory: string[]; flags: Set<string>; respawn: Respawn }
  export function createGameState(): GameState; // player 30/30 HP, 10/10 MP, speed 5; respawn = town default (15,12,"down")
  export function pickUp(s: GameState, entityId: string, itemId: string): boolean; // false if already picked
  export function hasFlag(s: GameState, flag: string): boolean;
  export function setFlag(s: GameState, flag: string): void;
  export const gameState: GameState; // the app-wide instance
  export const ITEMS: Record<string, { name: string; description: string }>;
  ```
- The flag conventions are `picked:<entityId>` and `defeated:<entityId>` (the latter is used in Task 11). `isEntityActive` returns false for an item with `picked:` set and an enemy with `defeated:` set.
- The copy for `ITEMS.spaceHeater` is name "Space Heater" and description "Warms the air around you. It doesn't do anything yet… but someday it might change world.temperature."

- [ ] **Step 1: Write failing tests:**
  - `starting stats`: 30/30 HP, 10/10 MP, speed 5.
  - `pickUp adds item and sets flag`.
  - `pickUp twice returns false and does not duplicate`.
  - `flags persist independently of map reloads`: set a flag, create a new parsed town map, and `hasFlag` is still true. This pins the rule that state never lives in the scene.
- [ ] **Step 2:** Run `npm test -- gameState` and expect it to FAIL.
- [ ] **Step 3:** Implement the state module. In the overworld:
  - Interacting with an item calls `pickUp`, hides the sprite and shows a one-line dialogue "You picked up the Space Heater!" using a one-node runner.
  - `I` toggles `InventoryScreen`, a DOM list of item names with the selected item's description. It's empty-safe: "Your bag is empty."
  - While the inventory is open, mode is `"inventory"`. `I` or `Esc` closes it.
- [ ] **Step 4:** Run `npm test` and expect it to PASS.
- [ ] **Step 5: Manual check.**
  - Pick up the heater, then leave the town and come back. It's gone and appears once in the inventory.
  - You can't walk while the inventory is open.
- [ ] **Step 6:** Commit `feat(state): game state, item pickup and inventory screen`.

---

### Task 8: Player-code sandbox

**Files:**
- Create: `src/battle/types.ts` (shared battle types, started here), `src/battle/sandbox.ts`, `src/battle/sandbox.test.ts`

**Interfaces:**
- Produces in `types.ts`:
  ```ts
  export type Scalar = number | string | boolean;
  export interface Snapshot { self: Record<string, Scalar>; world: Record<string, Scalar>; enemy: Record<string, Scalar> }
  export interface Intent { spell: string; fuel?: unknown }
  export type SandboxResult = { ok: true; intents: Intent[]; logs: string[] } | { ok: false; error: string; logs: string[] };
  export interface RunOptions { actions: string[]; rolls: number[]; timeoutMs?: number } // timeoutMs default 100
  export type RunCode = (code: string, snapshot: Snapshot, opts: RunOptions) => SandboxResult;
  ```
- Produces in `sandbox.ts`: `getSandbox(): Promise<{ run: RunCode }>`, a memoized singleton that loads the QuickJS module once.
- How a run works:
  1. Create a fresh runtime and context per run, with a 16 MB memory limit and `shouldInterruptAfterDeadline(Date.now() + timeoutMs)`.
  2. Evaluate a prelude that defines `self`, `world` and `enemy` as non-writable globals. Build each from the snapshot with getter-only accessors whose setters throw `TypeError("<scope>.<key> is read-only — you can sense it, but you can't change it.")`, then freeze them.
  3. The prelude also defines each name in `actions` as a function that pushes `{ spell: name, fuel: arg0 }`.
  4. It defines `chance(p)`, which consumes the next value of `rolls` (0.5 when they run out) and returns `roll < p`.
  5. It defines `console.log(...args)`, which joins the stringified args into `logs`.
  6. Evaluate `"use strict";\n` + the code, then read back the result with `JSON.stringify`. Dispose of everything in `finally`.
- Error text is `` `${name}: ${message}` ``, plus `` ` (line ${n})` `` when the line is known. Line numbers are corrected for the one-line strict prefix. An interrupt instead gives `"Your code ran too long — is there a loop that never ends?"`.

- [ ] **Step 1: Write failing tests**, all with snapshot `{self:{mana:7},world:{temperature:31},enemy:{hp:24,shielded:false}}` and `actions:["ember"]`:
  - `records intents`: `ember(4)` gives `intents` equal to `[{spell:"ember",fuel:4}]`.
  - `reads awareness`: `ember(world.temperature > 25 ? 5 : 3)` gives fuel 5.
  - `awareness is read-only`: `enemy.hp = 0` gives `ok:false` with an error matching `/enemy\.hp is read-only/`.
  - `cannot replace awareness`: `enemy = {}` gives `ok:false`.
  - `syntax error reports line`: `"ember(4)\nember(("` gives an error matching `/SyntaxError.*line 2/`.
  - `infinite loop is stopped`: `while(true){}` gives an error matching `/ran too long/` within 1 s of wall time.
  - `console.log is captured`: `console.log("hi", 2)` gives `logs` equal to `["hi 2"]`.
  - `chance uses rolls`: with `rolls:[0.1,0.9]`, `if (chance(0.5)) ember(3); if (chance(0.5)) ember(4);` gives a single intent with fuel 3.
  - `no host access`: `ember(typeof window === "undefined" && typeof fetch === "undefined" && typeof require === "undefined" ? 1 : 0)` gives fuel 1.
  - `runs are isolated`: `globalThis.x = 1` in one run, then `ember(typeof x === "undefined" ? 1 : 0)` in the next gives fuel 1.
- [ ] **Step 2:** Run `npm test -- sandbox` and expect it to FAIL.
- [ ] **Step 3:** Implement `getSandbox`.
- [ ] **Step 4:** Run `npm test -- sandbox` and expect it to PASS. Then run `npm run build` to confirm the WASM variant bundles without extra Vite config.
- [ ] **Step 5:** Commit `feat(battle): QuickJS sandbox for player code`.

---

### Task 9: Battle rules — abilities and intent resolution

**Files:**
- Modify: `src/battle/types.ts`
- Create: `src/battle/abilities.ts`, `src/battle/applyIntents.ts`, `src/battle/applyIntents.test.ts`

**Interfaces:**
- Consumes: `Intent` (Task 8).
- Produces in `types.ts`:
  ```ts
  export type Side = "player" | "enemy";
  export interface Fighter { name: string; level: number; hp: number; maxHp: number; mana: number; maxMana: number; speed: number; shielded: boolean }
  export interface BattleState { enemyId: string; player: Fighter; enemy: Fighter; world: { temperature: number }; turn: number; outcome: "ongoing" | "won" | "lost" | "fled" }
  export type BattleEvent =
    | { type: "worldChanged"; temperature: number }
    | { type: "codeError"; who: Side; message: string }
    | { type: "noAction"; who: Side }
    | { type: "rejected"; who: Side; spell: string; reason: "unknownSpell" | "extraDamagingCast" | "badFuel" }
    | { type: "notEnoughMana"; who: Side; spell: string; fuel: number; mana: number }
    | { type: "fizzle"; who: Side; spell: string; fuel: number; min: number; max: number }
    | { type: "cast"; who: Side; spell: string; fuel?: number }
    | { type: "blocked"; who: Side; spell: string }
    | { type: "shieldUp"; who: Side } | { type: "shieldMelted"; who: Side }
    | { type: "damage"; who: Side; target: Side; amount: number }
    | { type: "regen"; who: Side; amount: number }
    | { type: "fled" } | { type: "won" } | { type: "lost" };
  ```
- Produces in `abilities.ts`:
  ```ts
  export interface Ability { id: string; damaging: boolean; fuel?: { min: number; max: number }; apply(draft: BattleState, user: Side, fuel: number | undefined): BattleEvent[] }
  export const ABILITIES: Record<string, Ability>;
  export const EMBER_HOT_THRESHOLD = 25, EMBER_HOT_BONUS = 2, SLIME_SLAP_DAMAGE = 5;
  ```
- Produces in `applyIntents.ts`: `applyIntents(draft: BattleState, user: Side, allowed: string[], intents: Intent[]): BattleEvent[]`. This mutates `draft`, and `outcome` becomes `won` or `lost` when a fighter's HP reaches 0.

The ability rules below are this plan's call (spec §5.3, numbers to be tuned by playing):

| Ability | Rules |
|---|---|
| `ember` | Damaging, fuel 3–5 mana. If the target is shielded and fuel < 5, it's `blocked` with no damage. If shielded and fuel = 5, it emits `shieldMelted` and then deals damage. Damage is `fuel*2`, plus `EMBER_HOT_BONUS` when `world.temperature > EMBER_HOT_THRESHOLD`. |
| `frostGather` | Not damaging, no fuel. Sets the user's `shielded = true` and emits `shieldUp`. |
| `slimeSlap` | Damaging, no fuel. Deals `SLIME_SLAP_DAMAGE` to the opponent. |

`applyIntents` processes intents in order:
1. If the spell isn't in `allowed` or `ABILITIES`, emit `rejected/unknownSpell`.
2. If it's damaging and a damaging intent was already attempted this call, emit `rejected/extraDamagingCast`.
3. For abilities with a fuel window:
   - A fuel that isn't a finite non-negative integer gives `rejected/badFuel`, and nothing is spent.
   - A fuel above the user's mana gives `notEnoughMana`, and nothing is spent.
   - Otherwise, spend the fuel and emit `cast`. A fuel outside the window then gives `fizzle`, which still counts as the turn's damaging attempt.
   - A fuel inside the window runs `apply`.
4. Once HP hits 0, stop processing and emit `won` or `lost`. HP never goes below 0.

- [ ] **Step 1: Write failing tests.** Build a state helper with player mana 10, enemy hp 24 unshielded, and temperature 20.
  - `ember(4) deals 8 and spends 4`.
  - `hot bonus`: temperature 26 with `ember(3)` deals 8.
  - `fizzle below and above window`: `ember(2)` and `ember(6)` each spend their fuel, emit `fizzle`, and deal no damage.
  - `not enough mana`: with mana 3, `ember(4)` emits `notEnoughMana` and mana stays 3.
  - `bad fuel never spends`: for `undefined`, `"5"`, `4.5`, `NaN`, `-1` and `Infinity`, each emits `rejected/badFuel`, mana stays 10, and enemy HP stays 24.
  - `huge fuel`: `ember(1e9)` emits `notEnoughMana`.
  - `second damaging cast rejected`: `[ember(3), ember(3)]` resolves one cast and emits `extraDamagingCast`.
  - `shield blocks weak ember`: when shielded, `ember(4)` is `blocked`, mana is spent, and the shield stays.
  - `ember(5) melts shield`: emits `shieldMelted`, deals 10, and leaves `shielded` false.
  - `unknown spell rejected`: `frostGather` is not in player `allowed`.
  - `lethal damage wins and clamps`: enemy at 3 HP with `ember(5)` gives HP 0, `won`, and nothing after it.
  - `slimeSlap hurts the player`: enemy user with `slimeSlap` reduces player HP by 5. When that reaches 0 the result is `lost`.
- [ ] **Step 2:** Run `npm test -- applyIntents` and expect it to FAIL.
- [ ] **Step 3:** Implement `abilities.ts` and `applyIntents.ts`.
- [ ] **Step 4:** Run `npm test -- applyIntents` and expect it to PASS.
- [ ] **Step 5:** Commit `feat(battle): abilities and intent resolution rules`.

---

### Task 10: Battle flow — Bugblob, turns, precheck and messages

**Files:**
- Create: `src/battle/enemies.ts`, `src/battle/engine.ts`, `src/battle/engine.test.ts`, `src/battle/messages.ts`, `src/battle/messages.test.ts`

**Interfaces:**
- Consumes: `RunCode`, `Snapshot` and `getSandbox` (Task 8), `applyIntents` and `ABILITIES` (Task 9), and `PlayerStats` (Task 7).
- Produces:
  ```ts
  // enemies.ts
  export interface EnemyDef { id: string; name: string; level: number; maxHp: number; speed: number; abilities: string[]; script: string; tell(s: BattleState): string }
  export const ENEMIES: Record<string, EnemyDef>;
  export const PLAYER_ABILITIES = ["ember"];
  // engine.ts
  export type PlayerAction = { kind: "cast"; code: string } | { kind: "run" };
  export interface TurnDeps { runCode: RunCode; rng: () => number }
  export const START_TEMPERATURE = 24, TEMP_MIN = 18, TEMP_MAX = 32, MANA_REGEN = 2;
  export function createBattle(enemyId: string, player: PlayerStats): BattleState;
  export function snapshotFor(s: BattleState, side: Side): Snapshot;
  export function precheck(s: BattleState, code: string, runCode: RunCode): { ok: true } | { ok: false; message: string };
  export function resolveTurn(s: BattleState, action: PlayerAction, deps: TurnDeps): { state: BattleState; events: BattleEvent[] };
  // messages.ts
  export function describeEvent(e: BattleEvent, s: BattleState): string;
  ```

**Bugblob** (this plan's call): level 3, maxHp 24, speed 6, abilities `["frostGather","slimeSlap"]`, script:
```js
if (self.shielded) { slimeSlap(); } else if (chance(0.5)) { frostGather(); } else { slimeSlap(); }
```
Its tell:
- Shielded: "Bugblob's ice shield glistens. Weak flames won't get through."
- Otherwise: "Bugblob shivers and gathers frost… it might raise its shield before you act."
- Append " The air is hot — fire burns brighter." when `temperature > EMBER_HOT_THRESHOLD`.

**Snapshots:**
- The player's view is `self {hp,maxHp,mana,maxMana}`, `world {temperature}` and `enemy {name,hp,maxHp,shielded}`.
- The enemy's view is `self {name,hp,maxHp,shielded}`, `world {temperature}` and `enemy {hp,maxHp,mana}`.

**`resolveTurn`** works on a `structuredClone`:
1. `run` emits `fled`, sets the outcome and stops.
2. Temperature drifts by `Math.round(rng()*6)-3`, clamped to [18, 32], and emits `worldChanged`. This is what makes values change between writing and resolving.
3. The higher speed acts first, and the player wins ties. Each actor runs its code against its **current** snapshot via `runCode`. The player gets `actions: PLAYER_ABILITIES` and no rolls. The enemy gets its `abilities`, `rolls: [rng(), rng(), rng()]` and its `script`.
4. A `codeError` or zero intents emits `codeError` or `noAction`. Otherwise run `applyIntents`. Stop when the outcome isn't `ongoing`.
5. If still ongoing, the player regenerates `MANA_REGEN`, capped at max, which emits `regen`. Then `turn++`.

**`precheck`** runs the player code on the current snapshot and fails, with these messages, on:
- A code error: the sandbox error text.
- No intents: "Your code didn't cast anything. Try calling ember(…) with some mana."
- More than one damaging intent: "Only one damaging spell per turn."
- Bad fuel: "ember needs a whole number of mana, like ember(4)."
- Fuel above mana: "Not enough mana: ember(5) needs 5 MP and you have 3." (values filled in)

Fizzle is **not** prechecked. Learning the fuel window is part of play.

- [ ] **Step 1: Write failing tests** in `engine.test.ts`, using the real sandbox (`await getSandbox()` in `beforeAll`) and a scripted rng (`rngOf([...])`).
  - `createBattle` sets up Bugblob at full HP, the player from stats, temperature 24 and turn 1.
  - `faster enemy acts before player`: the first event after `worldChanged` belongs to the enemy.
  - `tie goes to player`: set enemy speed to 5.
  - `code sees post-enemy state`: the rolls make Bugblob raise its shield, and the player code `ember(enemy.shielded ? 5 : 3)` emits `shieldMelted` (fuel 5 chosen at resolution, not at writing).
  - `temperature drifts within bounds`: resolve 50 turns of `ember(3)`, resetting both fighters' HP each turn. The temperature always stays in [18, 32].
  - `mana regenerates and caps`.
  - `run flees immediately`: no enemy action, outcome `fled`.
  - `player code error costs the turn but not the battle`: `throw new Error("x")` gives a `codeError` event and the outcome stays `ongoing`.
  - `precheck` covers each failure message above, plus `ok` for `ember(4)` and `ok` for `ember(9)` with mana 10 (a fizzle is allowed).
  - `precheck does not mutate state`.
  - `Bugblob never shields twice in a row`: when already shielded, the script always emits `slimeSlap`.
  - `tell mentions heat only when hot`.
- [ ] **Step 2:** In `messages.test.ts`, write the failing test `every event type has a non-empty message without "undefined"`, plus exact copy for three events:
  - `fizzle`: "Your ember fizzled — it needs 3–5 mana, you gave it 6."
  - `blocked`: "Bugblob's ice shield swallowed the flames!"
  - `won`: "Bugblob gives up and oozes away."
- [ ] **Step 3:** Run `npm test -- engine messages` and expect it to FAIL.
- [ ] **Step 4:** Implement `enemies.ts`, `engine.ts` and `messages.ts`. The implementer writes the remaining message copy in the same voice: short, a bit playful and explicit about the rule.
- [ ] **Step 5:** Run `npm test` and expect it to PASS.
- [ ] **Step 6:** Commit `feat(battle): turn flow, Bugblob, precheck and battle messages`.

---

### Task 11: Battle scene and overworld hand-off

**Files:**
- Create: `src/scenes/BattleScene.ts`, `src/ui/battleHud.ts`
- Modify: `src/main.ts` (register the scene), `src/scenes/OverworldScene.ts` (the enemy branch of `onInteract`), `src/state/gameState.ts` (+ `endBattle`), `src/state/gameState.test.ts`

**Interfaces:**
- Consumes: `createBattle`, `resolveTurn`, `describeEvent` and `ENEMIES` (Task 10), `getSandbox` (Task 8), and `gameState`, `setFlag` and `hasFlag` (Task 7).
- Produces:
  - `BattleScene` (key `"Battle"`) takes `init(data: { enemyId: string; enemyEntityId: string; returnTo: Respawn })`.
  - `endBattle(s: GameState, outcome: "won" | "lost" | "fled", enemyEntityId: string, returnTo: Respawn): Respawn` lives in `gameState.ts`. It sets `defeated:` on a win, fully restores HP and MP for every outcome (no healing exists yet), and returns where to place the player: `returnTo` for won or fled, `s.respawn` for lost.
  - The HUD exposes `battleHud.showMenu(onPick: (choice: "attack" | "spell" | "item" | "taunt" | "run") => void)` and `battleHud.showMessages(lines: string[]): Promise<void>`. Messages advance on interact or click.
  - Task 12 uses the hook `BattleScene.openSpell()`.

- [ ] **Step 1: Write failing tests** in `gameState.test.ts`:
  - `endBattle won sets defeated and returns returnTo`.
  - `endBattle lost returns respawn and restores HP and MP`.
  - `endBattle fled keeps the enemy undefeated`.
- [ ] **Step 2:** Run `npm test -- gameState` and expect it to FAIL. Implement `endBattle` and run it again to PASS.
- [ ] **Step 3:** In the overworld, interacting with an enemy sets mode `"transition"`, flashes the screen and does `scene.start("Battle", { enemyId, enemyEntityId: entity.id, returnTo: { current map and position, facing } })`.
- [ ] **Step 4:** In `BattleScene`, render the four-corner layout from spec §5.1:
  - The enemy stat box (name, Lv, HP bar, a "shielded" tag when shielded) at top left.
  - The `battle-bugblob` sprite at top right.
  - The `battle-player-back` sprite at bottom left.
  - The player box (HP and MP bars with numbers) and the menu at bottom right. The menu is Attack, Spell, Item, Taunt, Run, navigated with arrows and interact or with clicks.
  - Attack, Item and Taunt are shown dimmed. Picking one shows "You haven't learned that yet." and returns to the menu.
  - Spell calls `openSpell()`, which is a no-op until Task 12.
  - Run calls `resolveTurn` with `run`, then plays the messages.
  - After any turn, play `describeEvent` for each event in order and update the bars after each message.
  - When the outcome isn't `ongoing`, call `endBattle` and `scene.start("Overworld", result)`. On a loss, show "You blacked out…" first.
- [ ] **Step 5: Manual check.**
  - Walk to Bugblob, interact, and see the four-corner layout. Run returns you to the route next to Bugblob, which is still there.
  - Dimmed options explain themselves.
  - Running `npm run typecheck` passes.
- [ ] **Step 6:** Commit `feat(battle): battle scene with four-corner layout and overworld hand-off`.

---

### Task 12: Casting overlay

**Files:**
- Create: `src/ui/castingOverlay.ts`, `src/ui/awareness.ts`, `src/ui/awareness.test.ts`, `src/ui/castingOverlay.css`
- Modify: `src/scenes/BattleScene.ts` (`openSpell`)

**Interfaces:**
- Consumes: `precheck`, `resolveTurn`, `snapshotFor`, `PLAYER_ABILITIES` and `ENEMIES[...].tell` (Task 10), `ABILITIES` (Task 9) and `getSandbox` (Task 8).
- Produces:
  - `awarenessRows(snapshot: Snapshot, tab: "self" | "world" | "enemy"): { label: string; value: string }[]`. Labels are the full path (`world.temperature`), and string values are shown quoted (`"Bugblob"`).
  - `openCastingOverlay(opts: { state: BattleState; initialCode: string; runCode: RunCode; onCast(code: string): void; onBack(): void }): { close(): void }`.

The layout follows spec §5.1 and the mockup `.superpowers/brainstorm/1064-1793465386/content/casting-overlay-v2.html`:
- The battle canvas dims and the spellbook panel covers about 90% of the screen.
- The tell box runs across the top.
- The CodeMirror editor sits on the left. It uses JS mode and the one-dark theme, and starts with `initialCode`. On the first battle that's `// Cast a spell, e.g. ember(4);\n`; after that it's the last code cast in this battle.
- The spellbook column shows `ember(mana)` — "3–5 MP · burns · a full 5 MP melts ice".
- The awareness panel has tabs for self, world and enemy, rendered from `awarenessRows` with the current values.
- At the bottom: an MP readout, a **Back** button (or Esc), a **Cast** button (or Ctrl+Enter), and an error/log line.

- [ ] **Step 1: Write failing tests** in `awareness.test.ts`:
  - `world tab lists temperature`: `[{label:"world.temperature", value:"31"}]`.
  - `strings are quoted`: `enemy.name` gives `"\"Bugblob\""`.
  - `booleans shown as true or false`.
- [ ] **Step 2:** Run `npm test -- awareness` and expect it to FAIL. Implement it, then run again and expect it to PASS.
- [ ] **Step 3:** Implement the overlay.
  - When it opens, set `scene.input.keyboard.enabled = false` and call `disableGlobalCapture()`. Restore both when it closes.
  - Cast runs `precheck`. On failure, it shows the message in the error line, keeps the overlay open and costs no turn. Any `console.log` output from the precheck run also shows in the log line.
  - On success, close and call `onCast(code)`. The scene runs `resolveTurn({kind:"cast", code})` and plays the messages.
  - Back closes the overlay and returns to the menu.
- [ ] **Step 4: Manual check.** Do each of these in one fight:
  1. Type `wasd eiWASD` and the arrow keys in the editor. Nothing happens in the game, and Space and Enter insert text.
  2. Esc goes back to the menu.
  3. `ember(9)` passes precheck, fizzles and spends 9.
  4. `ember(20)` is blocked by precheck with the not-enough-mana message.
  5. `while(true){}` shows the "ran too long" message within about a second.
  6. `enemy.hp = 0` shows the read-only joke.
  7. `ember(enemy.shielded ? 5 : 3)` wins the fight over a few turns. Bugblob disappears from the route afterward and stays gone after you visit town and come back.
  8. Lose deliberately by casting `ember(4)` into the shield repeatedly. You wake at the town spawn with full HP.
- [ ] **Step 5:** Run `npm test && npm run typecheck && npm run build`. All three must exit 0.
- [ ] **Step 6:** Commit `feat(battle): casting overlay with code editor, spellbook and awareness`.

---

## Done when

- Every manual check in Tasks 5, 6, 7, 11 and 12 passes in one session from a fresh `npm run dev`.
- `npm test`, `npm run typecheck` and `npm run build` are all green.
- The owner has played the fight and written down what felt off. Those notes feed the Phase 2 plan.
