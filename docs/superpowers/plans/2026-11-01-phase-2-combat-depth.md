# Phase 2 — Combat Depth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Energy and Moves, code-callable items, two statuses, resolve, Taunt and giving up, XP, levels, skill points and mods, two new enemies, and seeded balance tests, all on top of the Phase 1 battle engine.

**Architecture:** Rules stay in pure TypeScript under `src/battle` and `src/state`, with Vitest tests. Scenes and DOM only render. Abilities, items, enemies and progression are data tables. The sandbox gains item objects. One shared rule function, `applyIntents`, enforces "one main action + one item" for both sides. Post-battle bookkeeping (XP, skill points, used-up items) happens in one pure function, `applyBattleResults(gameState, finalBattleState, outcome)`.

**Tech Stack:** The existing stack: Vite, TypeScript, Phaser 4, Vitest, CodeMirror 6, and QuickJS via `quickjs-emscripten-core`.

**Spec:** `docs/superpowers/specs/2026-11-01-phase-2-combat-depth-design.md`. Read §3–§11. The base design is `docs/superpowers/specs/2026-10-31-idk-rpg-design.md` §5.

## Global Constraints

- **Turn rule:** one main action (any Move, Spell or `taunt()`) and one item use per turn, for both sides. Items never end the turn.
- **Fixed values** (spec §4–§9):
  - Energy starts at 12 and regenerates +2 per turn. Mana regenerates +2 per turn as before.
  - `jab` costs 2–4 EN and deals energy×2. `frostbite` costs 2–4 MP, deals mana damage and chills.
  - Chilled: −2 speed for 2 turns. Scared: doubled resolve loss for 2 turns.
  - Taunt: −15 resolve, ×2 if the target is already scared, then applies scared.
  - Resolve loss from damage: ceil(damage/2), ×2 if scared.
  - Levels at 20/50/90 cumulative XP; each level gives +5 HP, +2 MP and +2 EN. Level 2 teaches frostbite.
  - `LOSS_XP_PENALTY = 0.05` lives in exactly one place: `src/data/progression.ts`.
  - Giving up and knockouts grant equal XP.
- **Enemy stats:**

  | Enemy | Lv | HP | Speed | Resolve | XP |
  |---|---|---|---|---|---|
  | Bugblob | 3 | 24 | 6 | 50 | 10 |
  | Glitchling | 4 | 20 | 8 | 40 | 14 |
  | Frostcap | 5 | 30 | 4 | 60 | 18 |
- **No status ever skips a turn.**
- **All tunable numbers live in data tables:** `src/battle/abilities.ts`, `src/battle/items.ts`, `src/battle/enemies.ts` and `src/data/progression.ts`.
- **Commits: stage only the files a task touches** (`git add <paths>`, never `git add -A`). The owner keeps uncommitted work in `docs/` and `.superpowers/`. Commit messages end with the `Co-Authored-By` trailer.
- Work on branch `phase-2-combat-depth`. Phase 1 test expectations that the new rules contradict get updated, not deleted.

## Review Focus

1. **Item menu, then code, in the same turn.** Using an item from the menu and then calling one in code must reject the second ("one item per turn"), and the turn must still resolve. Covered by a Task 3 test.
2. **Consumables used in a fight that you then lose or flee are still used up.** Owned items never go negative, and you can't call an item you don't own. Covered by Task 3 tests.
3. **Statuses expire.** Chill and scared tick down and end, and turn order flips back. A chilled player's code sees `self.chilled` correctly. Covered by Task 4 tests.
4. **HP 0 and resolve 0 on the same hit counts as a knockout** (one "won" outcome, no double narration). Covered by a Task 5 test.
5. **Level-ups.** Leveling twice from one big XP gain applies both levels and both unlocks. The loss penalty never drops a level or makes XP negative. Covered by Task 6 tests.

---

### Task 1: Action economy, Energy and `jab` (rules)

**Files:**
- Modify: `src/battle/types.ts`, `src/battle/abilities.ts`, `src/battle/applyIntents.ts`, `src/battle/engine.ts`, `src/battle/messages.ts`, `src/battle/view.ts`, `src/state/gameState.ts`, and their tests.

**Interfaces (produces):**
```ts
// types.ts
export interface Fighter { name; level; hp; maxHp; mana; maxMana; energy: number; maxEnergy: number; speed; shielded; dodging: boolean }
export type Intent = { spell: string; fuel?: unknown } | { item: string };
export interface BattleState { …existing; knownAbilities: string[]; mods: string[] }
// events: "notEnoughMana" is replaced by
  | { type: "notEnoughFuel"; who: Side; spell: string; fuel: number; have: number; resource: "mana" | "energy" }
// "fizzle" gains resource; "regen" gains resource; "rejected" reasons become "unknownSpell" | "extraAction" | "badFuel"
  | { type: "missed"; who: Side; spell: string }
// abilities.ts
export interface Ability { id; kind: "move" | "spell" | "other"; signature: string; notes: string;
  fuel?: { min: number; max: number; resource: "mana" | "energy" }; apply(draft, user, fuel): BattleEvent[] }
export function fuelWindow(draft: BattleState, user: Side, ability: Ability): { min: number; max: number } // applies mods (Task 6)
export const ENERGY_REGEN = 2;
// gameState.ts: PlayerStats gains energy/maxEnergy (12/12); GameState gains knownAbilities: ["ember","jab"]
// engine.ts: createBattle(enemyId, player: PlayerStats, opts?: { knownAbilities?: string[]; mods?: string[] }); PLAYER_ABILITIES removed
```
- Rules:
  - `applyIntents` allows **one ability intent per call**; a second gets `rejected/extraAction`.
  - Fuel comes from `ability.fuel.resource`.
  - `jab`: if the target is shielded → `blocked`; if dodging → `missed`. Energy is spent in both cases.
  - `resolveTurn` regenerates Energy as well as Mana, with one `regen` event per resource that changed.
  - Precheck message for two actions: `"Only one move, spell or taunt per turn."`
  - Not enough fuel: `"Not enough energy: jab(4) needs 4 EN and you have 2."` (and the mana equivalent).
  - The snapshot adds `self.energy`, `self.maxEnergy` and `self.speed`, and `enemy.speed` and `enemy.dodging`.

- [ ] **Step 1: Update and add failing tests.**
  - In `applyIntents.test.ts`:
    - The second-cast test now expects reason `extraAction`.
    - The not-enough-mana test now expects `notEnoughFuel` with `resource: "mana"`.
    - New tests:
      - `jab(3) deals 6 and spends 3 EN`.
      - `jab bounces off a shield` (blocked, EN spent).
      - `jab misses a dodging target` (missed, EN spent, HP unchanged).
      - `jab(5) fizzles (2–4)`.
      - `jab then ember is rejected as extraAction`.
      - `not enough energy`.
  - In `engine.test.ts`:
    - Snapshot expectations gain the new fields.
    - The two-spell precheck message changes.
    - New: `energy regenerates and caps` and `the player can branch between jab and ember at resolution` (Bugblob shields first, and `enemy.shielded ? ember(5) : jab(3)` emits `shieldMelted`).
  - In `messages.test.ts`: add the new event shapes to `ALL`.
- [ ] **Step 2:** Run `npm test` and expect the new and changed tests to FAIL.
- [ ] **Step 3:** Implement. Ability metadata:
  - ember: `kind "spell"`, `signature "ember(mana)"`, `notes "burns · a full 5 MP melts ice"`.
  - jab: `kind "move"`, `"jab(energy)"`, `"physical · bounces off ice · misses dodgers"`.
  - Enemy abilities: `kind "other"`.
- [ ] **Step 4:** Run `npm test && npm run typecheck` and expect both to pass.
- [ ] **Step 5:** Commit `feat(battle): one main action per turn, Energy and the jab move`.

### Task 2: Energy and Moves in the battle UI

**Files:** `src/ui/battleHud.ts`, `src/ui/battle.css`, `src/ui/castingOverlay.ts`, `src/ui/castingOverlay.css`, `src/scenes/BattleScene.ts`.

**Interfaces:**
- Consumes Task 1.
- `openCastingOverlay(opts & { tab: "moves" | "spells" | "items" })`. The spellbook column becomes tabs built from `ABILITIES` filtered by `state.knownAbilities` and grouped by `kind`. `taunt` (Task 5) is listed under Moves. Each entry shows `signature`, the fuel window from `fuelWindow` with its resource unit (`MP` or `EN`), and `notes`.
- `BattleView` adds `playerEnergy`, and `BattleHud` shows an EN bar under MP.
- The Attack menu entry is enabled and opens the overlay on the Moves tab; Spell opens it on Spells.

- [ ] **Step 1:** Extend `view.test.ts` with `a jab spends the shown energy` and `regen of energy`. Run it and watch it FAIL.
- [ ] **Step 2:** Implement the view, HUD, tabs and menu wiring. Run `npm test` and expect it to PASS.
- [ ] **Step 3: Manual check** (headless browser): Attack opens the Moves tab, and `jab(3)` damages Bugblob and lowers EN. `enemy.shielded ? ember(5) : jab(3)` wins. Tabs switch, and typing in the editor still never moves the player.
- [ ] **Step 4:** Commit `feat(battle-ui): EN bar, Attack menu and Moves/Spells tabs`.

### Task 3: Items in code and the Item menu

**Files:**
- Create: `src/battle/items.ts`, `src/battle/items.test.ts`, `src/state/battleResults.ts`, `src/state/battleResults.test.ts`.
- Modify: `src/battle/sandbox.ts` (+ test), `src/battle/types.ts`, `src/battle/applyIntents.ts`, `src/battle/engine.ts`, `src/battle/messages.ts`, `src/data/items.ts`, `src/ui/battleHud.ts`, `src/ui/castingOverlay.ts`, `src/scenes/BattleScene.ts`, `src/scenes/textures.ts`, `src/scenes/OverworldScene.ts`, `public/assets/maps/town.json`, `public/assets/maps/route.json`.

**Interfaces:**
```ts
// types.ts
RunOptions.items?: string[]                   // owned battle items; each becomes a frozen global { use() }
BattleState.items: string[]                   // player's battle-usable items (consumables repeat per copy)
BattleState.itemUsedThisTurn: boolean
BattleState.consumed: string[]                // consumables used this battle, in order
events: | { type: "itemUsed"; who: Side; item: string }
        | { type: "itemRejected"; who: Side; item: string; reason: "extraItem" | "notOwned" }
        | { type: "temperatureRaised"; temperature: number } | { type: "restored"; who: Side; resource: "mana" | "energy"; amount: number }
// items.ts
export interface BattleItem { id: string; consumable: boolean; call: string; notes: string; apply(draft: BattleState, user: Side): BattleEvent[] }
export const BATTLE_ITEMS: Record<string, BattleItem>;   // spaceHeater (+4°, cap TEMP_MAX), manaBerry (+4 MP), energyBar (+4 EN)
export const HEATER_DEGREES = 4, BERRY_MANA = 4, BAR_ENERGY = 4;
// engine.ts
export function useItemNow(s: BattleState, itemId: string): { state: BattleState; events: BattleEvent[] }  // Item menu
createBattle(enemyId, player, opts?: { knownAbilities?; mods?; items?: string[] })
// battleResults.ts
export function applyBattleResults(gs: GameState, final: BattleState, outcome: "won" | "lost" | "fled"): string[] // notes to narrate; Task 3 removes consumed items from gs.inventory
```
- Rules:
  - Item intents are allowed once per turn per side (`itemUsedThisTurn` resets at the end of `resolveTurn`).
  - Using an item not in `state.items` gives `notOwned`. That can only happen via a stale overlay, since the sandbox defines only owned items.
  - Consumables are removed from `state.items` and pushed to `consumed`.
  - `BattleScene` passes `gameState.inventory` filtered to `BATTLE_ITEMS` keys. After the battle it calls `applyBattleResults` and narrates the returned notes, then `endBattle`.
- **Item menu:** lists owned battle items (name and count), and picking one calls `useItemNow`, narrates it, and returns to the menu. If an item was already used this turn, picking one shows "You've already used an item this turn." The menu is enabled only when the player owns battle items.
- **Overlay:** the Items tab shows `call` and `notes` with counts.
- **Map content:**
  - Ground items: two `manaBerry` (one in town, one on the route) and one `energyBar` (on the route), on walkable tiles with unique ids and `nextobjectid` bumped.
  - Item textures: `item-spaceHeater` (the current heater art), `item-manaBerry` and `item-energyBar`. The overworld uses `item-<itemId>` when it exists.
  - Add `ITEMS` entries for manaBerry ("Mana Berry") and energyBar ("Energy Bar") with descriptions that show the call.

- [ ] **Step 1: Failing tests.**
  - `sandbox.test.ts`: `spaceHeater.use() records an item intent`, `items not owned are not defined` (a ReferenceError), `item objects are read-only`.
  - `items.test.ts`: heater raises the temperature and caps at 32, the berry restores and caps, the bar restores.
  - `engine.test.ts`:
    - `spaceHeater + ember in one turn gets the hot bonus`.
    - `a second item in the same turn is rejected`.
    - `Item menu use then an item in code is rejected` (Review Focus 1).
    - `consumables leave state.items`.
    - `useItemNow does not end the turn` (turn counter unchanged, enemy didn't act).
  - `battleResults.test.ts`: consumed items are removed from inventory, one copy each, even when lost or fled (Review Focus 2). An inventory never goes negative.
- [ ] **Step 2:** Run them and watch them FAIL.
- [ ] **Step 3:** Implement. Run `npm test && npm run typecheck` and expect both to PASS (`maps.test` validates the new ground items).
- [ ] **Step 4: Manual check:** pick up a berry, then in battle use it from the Item menu (MP goes up, the menu returns) and then cast. `spaceHeater.use(); ember(4)` shows the temperature rising and the hot bonus. After the fight the berry is gone from the bag.
- [ ] **Step 5:** Commit `feat(battle): items in code, Item menu, berries and energy bars`.

### Task 4: Statuses (chilled, scared) and `frostbite`

**Files:** `src/battle/types.ts`, `src/battle/abilities.ts`, `src/battle/applyIntents.ts`, `src/battle/engine.ts`, `src/battle/messages.ts`, `src/battle/view.ts`, `src/ui/battleHud.ts`, `src/state/gameState.ts`, and tests.

**Interfaces:**
```ts
export type StatusName = "chilled" | "scared";
Fighter.statuses: Partial<Record<StatusName, number>>   // turns remaining
Fighter.traits: { chillImmune?: boolean; frostHalf?: boolean; hotFireBonus?: number }   // set by createBattle from EnemyDef (Task 7 fills them)
export function effectiveSpeed(f: Fighter): number       // speed − CHILL_SPEED_PENALTY if chilled
export function applyStatus(draft, target: Side, status: StatusName, turns: number): BattleEvent[]  // refresh, no stack; respects chillImmune
export const CHILL_SPEED_PENALTY = 2, CHILL_TURNS = 2, SCARED_TURNS = 2;
events: | { type: "statusApplied"; who: Side; status: StatusName; turns: number } | { type: "statusEnded"; who: Side; status: StatusName }
        | { type: "immune"; who: Side; status: StatusName }
// abilities: frostbite { kind "spell", fuel 2–4 mana, damage = mana (halved, rounded down, if target.traits.frostHalf), then chill }
// snapshot: self.chilled, enemy.chilled, enemy.scared
```
- Rules:
  - Turn order uses `effectiveSpeed`.
  - At the end of each full turn, every status counts down by 1; reaching 0 removes it and emits `statusEnded`.
  - A status applied this turn still counts down at the end of this turn, so "2 turns" means it affects the next turn's order and ends after it. That's the builder's reading of the spec; ledger it.
  - `frostbite` is in `GameState.knownAbilities` from the start until Task 6 moves it to the level-2 unlock.
- HUD: status tags for both sides (`chilled`, `scared`, plus the existing `shielded`, and `dodging` from Task 7). `BattleView` carries tags and `stepView` handles `statusApplied` and `statusEnded`.

- [ ] **Step 1: Failing tests:**
  - `frostbite(3) deals 3 and chills for 2 turns`.
  - `chill flips turn order` (player chills Bugblob: 6−2=4 < 5, so the player acts first next turn).
  - `chill expires and order flips back` (Review Focus 3).
  - `reapplying refreshes, doesn't stack`.
  - `chillImmune target emits immune`.
  - `frostHalf halves frostbite`.
  - `the snapshot shows self.chilled while chilled`.
  - View: `statusApplied adds a tag`.
- [ ] **Step 2:** Run them and watch them FAIL. **Step 3:** Implement. **Step 4:** Run `npm test && npm run typecheck` and expect both to PASS.
- [ ] **Step 5: Manual check:** `frostbite(3)` on Bugblob shows a chilled tag, you act first next turn, and the tag disappears after.
- [ ] **Step 6:** Commit `feat(battle): chilled and scared statuses, frostbite`.

### Task 5: Resolve, Taunt and giving up

**Files:** `src/battle/types.ts`, `src/battle/abilities.ts`, `src/battle/applyIntents.ts`, `src/battle/enemies.ts`, `src/battle/engine.ts`, `src/battle/messages.ts`, `src/battle/view.ts`, `src/ui/battleHud.ts`, `src/ui/battle.css`, `src/scenes/BattleScene.ts`, and tests.

**Interfaces:**
```ts
Fighter.resolve: number; Fighter.maxResolve: number   // player: 0/0 (never gives up)
EnemyDef.maxResolve: number; EnemyDef.xp: number       // Bugblob 50 / 10
export const TAUNT_RESOLVE = 15, SCARED_MULTIPLIER = 2;
// abilities: taunt { kind "other" (listed under Moves), signature "taunt()", no fuel, main action: resolve −15 (×2 if scared), then applyStatus scared }
events: | { type: "resolveLost"; who: Side; amount: number } | { type: "gaveUp" }   // "won" now means knockout
```
- Rules:
  - Any damage to a fighter with `maxResolve > 0` also emits `resolveLost` of ceil(dmg/2), ×2 if scared, floored at 0.
  - After each ability: if HP is 0 → `won` (knockout, outcome `won`). Otherwise if resolve is 0 → `gaveUp` (outcome `won`). Never both (Review Focus 4).
- Copy:
  - `won`: "Bugblob collapses into a puddle." (from `EnemyDef.knockoutText`)
  - `gaveUp`: "Bugblob gives up and oozes away." (from `EnemyDef.giveUpText`)
  - `taunt` cast: "You taunt Bugblob!"
  - `resolveLost`: "Bugblob's will to fight drops by 15."
- UI:
  - Enemy box: a thin WILL bar under HP.
  - The **Taunt menu** entry is enabled and runs `resolveTurn(state, { kind: "cast", code: "taunt();" })` directly.
  - The awareness snapshot adds `enemy.resolve` and `enemy.maxResolve`.

- [ ] **Step 1: Failing tests:**
  - `taunt lowers resolve 15 and scares`.
  - `taunting a scared enemy costs 30`.
  - `damage lowers resolve by half, rounded up`.
  - `resolve 0 → gaveUp and won`.
  - `a lethal hit that also empties resolve is a knockout only`.
  - `pure taunting makes Bugblob give up within 4 turns with seeded rolls`.
  - Update the Phase 1 `won copy` test to the knockout copy and add a `gaveUp copy` test.
- [ ] **Step 2:** FAIL. **Step 3:** Implement. **Step 4:** `npm test && npm run typecheck` PASS.
- [ ] **Step 5: Manual check:** taunt three times and Bugblob gives up. The WILL bar drains and the scared tag shows.
- [ ] **Step 6:** Commit `feat(battle): resolve, taunt and giving up`.

### Task 6: XP, levels, skill points, mods and the Skills screen

**Files:**
- Create: `src/data/progression.ts`, `src/state/progression.ts`, `src/state/progression.test.ts`, `src/ui/SkillsScreen.ts`.
- Modify: `src/state/gameState.ts`, `src/state/battleResults.ts` (+ test), `src/battle/types.ts`, `src/battle/applyIntents.ts`, `src/battle/abilities.ts`, `src/battle/engine.ts`, `src/scenes/OverworldScene.ts`, `src/scenes/BattleScene.ts`, `src/ui/ui.css`.

**Interfaces:**
```ts
// data/progression.ts — every progression number lives here
export const LEVEL_XP = [0, 20, 50, 90];                     // cumulative XP to reach Lv1..Lv4
export const LEVEL_GAINS = { maxHp: 5, maxMana: 2, maxEnergy: 2 };
export const LEVEL_UNLOCKS: Record<number, string[]> = { 2: ["frostbite"] };
export const LOSS_XP_PENALTY = 0.05;                         // share of progress toward the next level lost on a blackout
export interface ModDef { id: string; ability: string; name: string; cost: number; description: string }
export const MODS: Record<string, ModDef>;                   // kindling(ember,5,"Fuel window becomes 2–5"), hotHands(ember,8,"+2 damage"), heavyJab(jab,5,"+2 damage"), deepChill(frostbite,5,"Chill lasts 3 turns")
// state/progression.ts
export function levelForXp(xp: number): number;
export function grantXp(gs: GameState, xp: number): string[];      // notes: gained, level up (each), learned (each)
export function applyLossPenalty(gs: GameState): string[];         // floor(progress × LOSS_XP_PENALTY), never below the level's floor
export function addSkillPoints(gs: GameState, uses: Record<string, number>): void;
export function buyMod(gs: GameState, modId: string): boolean;     // false if unaffordable, unknown ability or already owned
// GameState gains: level: 1, xp: 0, skillPoints: Record<string, number>, mods: string[]; knownAbilities becomes ["ember","jab","taunt"] (frostbite now comes from Lv2)
// BattleState.skillUses: Record<string, number>   // +1 per successful player ability (not fizzle / blocked / missed / rejected)
```
- Mods apply via `fuelWindow` (Kindling) and in ability `apply` (Hot Hands, Heavy Jab, Deep Chill) when `user === "player"` and `draft.mods` includes the id.
- `applyBattleResults`: on a win → `grantXp(ENEMIES[id].xp)`; on a loss → `applyLossPenalty`. Then `addSkillPoints(final.skillUses)` and remove consumed items. It returns the notes.
- Post-battle narration: "You gained 10 XP.", "Level up! You're Lv 2.", "You learned frostbite!", "You lost 1 XP."
- **Skills screen:** `K` toggles it in the overworld (mode `"skills"`). It shows Lv and XP (`xp / next`), then each known ability with its points and mods: owned ✓, affordable or not. Up/Down selects a mod, Enter or a click buys it, and `K`/Esc closes. The hold-lock is set on close.

- [ ] **Step 1: Failing tests** (`progression.test.ts`, `battleResults.test.ts`, `engine.test.ts`):
  - `levelForXp boundaries (19→1, 20→2, 90→4)`.
  - `grantXp across two levels applies both gains and the frostbite unlock once` (Review Focus 5).
  - `loss penalty is 5% of progress, floored, never drops a level or goes negative`.
  - `LOSS_XP_PENALTY is 0.05`.
  - `skill uses count only successes`.
  - `buyMod spends points once`.
  - `kindling widens ember to 2–5`.
  - `hotHands adds 2`.
  - `giving up grants the same XP as a knockout`.
- [ ] **Step 2:** FAIL. **Step 3:** Implement. **Step 4:** `npm test && npm run typecheck` PASS.
- [ ] **Step 5: Manual check:**
  - Beat Bugblob twice (20 XP) to see the level-up and frostbite narration; frostbite appears in the Spells tab.
  - `K` shows points, and buying Kindling makes `ember(2)` legal.
  - Losing shows the XP loss.
- [ ] **Step 6:** Commit `feat(progression): XP, levels, skill points, mods and Skills screen`.

### Task 7: Glitchling and Frostcap

**Files:**
- Create: `src/art/enemySprites.ts`, `src/art/enemySprites.test.ts`.
- Modify: `src/battle/abilities.ts`, `src/battle/enemies.ts`, `src/battle/engine.ts`, `src/battle/messages.ts`, `src/scenes/textures.ts`, `src/ui/battleHud.ts`, `public/assets/maps/route.json`, and tests.

**Interfaces:**
```ts
EnemyDef.traits?: Fighter["traits"]; EnemyDef.aura?: { temperature: number }   // applied at the start of the enemy's action
abilities: blink (other: self.dodging = true → "dodgeUp"), byteBite (4 dmg), iceBreath (3 dmg + chill target), snowball (6 dmg)
events: | { type: "dodgeUp"; who: Side } | { type: "aura"; who: Side; temperature: number }
// enemies: glitchling { Lv4, HP20, speed 8, resolve 40, xp 14, script per spec §9 }, frostcap { Lv5, HP30, speed 4, resolve 60, xp 18, aura −2, traits { chillImmune, frostHalf, hotFireBonus: 3 }, script per spec §9 }
// art/enemySprites.ts: 16×16 pixel maps + palettes for glitchling and frostcap (painted at 1× and 3× like the player)
```
- Rules:
  - `dodging` clears at the start of the dodger's next action.
  - `hotFireBonus` adds to ember damage when the temperature is above `EMBER_HOT_THRESHOLD`.
  - The aura clamps at `TEMP_MIN`.
- Place Glitchling and Frostcap on the route, on walkable tiles off the path, with unique ids and `nextobjectid` bumped.

- [ ] **Step 1: Failing tests:**
  - `blink makes jab miss but ember hit`.
  - `dodging clears on Glitchling's next action`.
  - `Frostcap's aura cools the air each of its turns`.
  - `iceBreath chills the player so Frostcap goes first next turn`.
  - `Frostcap takes +3 fire when hot, half frostbite, can't be chilled`.
  - Sprite frames are 16×16 and use only palette characters.
  - Maps test passes.
- [ ] **Step 2:** FAIL. **Step 3:** Implement. **Step 4:** `npm test && npm run typecheck` PASS.
- [ ] **Step 5: Manual check:** fight each new enemy with its intended pattern (spec §9) and look at the sprites in the overworld and in battle.
- [ ] **Step 6:** Commit `feat(enemies): Glitchling and Frostcap`.

### Task 8: Balance simulator, balance tests and a tuning pass

**Files:** Create `src/battle/simulate.ts` and `src/battle/balance.test.ts`; modify the data tables as tuning requires.

**Interfaces:**
```ts
export function seededRng(seed: number): () => number;          // mulberry32
export interface SimResult { outcome: BattleState["outcome"]; turns: number }
export function simulateFight(enemyId: string, code: string, seed: number, runCode: RunCode, opts?: { items?: string[]; maxTurns?: number }): SimResult  // level-1 player from createGameState(); maxTurns default 30
```
- Patterns:

  | Enemy | Intended | Naive |
  |---|---|---|
  | bugblob | `ember(enemy.shielded ? 5 : 3)` | `ember(3)` |
  | glitchling | `enemy.dodging ? ember(3) : jab(3)` | `jab(3)` |
  | frostcap (with `spaceHeater`) | `if (world.temperature <= 25) spaceHeater.use(); ember(4);` | `ember(4)` |

  Taunt-only: `taunt()` vs bugblob.
- Tests (N = 100 seeds each; raise the test timeout as needed):
  - intended win rate ≥ 0.9
  - naive is worse: lower win rate *or* higher average turns
  - ≥ 95% of intended fights end within 15 turns
  - taunt-only wins vs Bugblob ≥ 0.9

- [ ] **Step 1:** Write the simulator test (`simulateFight is deterministic for a seed`) and the balance tests. Run them; they may FAIL on the numbers.
- [ ] **Step 2:** Implement `simulate.ts`. Then tune only data-table numbers until the tests pass, and **ledger each changed number with the reason**.
- [ ] **Step 3:** Run `npm test && npm run typecheck && npm run build` and expect all three to pass.
- [ ] **Step 4:** Commit `test(balance): seeded fight simulator and balance tests`.

## Done when

- All tasks are committed on `phase-2-combat-depth`.
- `npm test`, `npm run typecheck` and `npm run build` are green.
- The manual checks pass in the headless browser.
- The owner has the list of rulings and tuned numbers.
