# idk — Game Design

*Status: brainstorming output, approved concepts only. Date: 2026-10-31.*

Items marked **(builder's call)** were decided by Claude during design, not by the project owner, and can be overridden. Items marked **(open)** are deliberately unsettled.

---

## 1. What this is, and why

**idk** is a browser game that helps people practice coding. It plays like a classic 16-bit, tile-based, top-down RPG — explore towns, talk to NPCs, pick up items, get into turn-based fights — except **combat is coding**. Your attacks and spells are functions you call; the concepts you learn (variables, conditionals, loops, functions, classes…) are the abilities you collect.

The core idea that makes it more than a quiz with an HP bar: **the concept *is* the mechanic.** A conditional lets you react to what the enemy is doing. A function lets you save a combo. Later concepts open up new ways to play rather than just bigger numbers. Players learn *why* a concept exists by needing it to win.

**Why now.** The main reason to learn coding is shifting: people increasingly need to *read, understand, guide, and check* code that AI generates, not only write it from scratch. Reading and verifying code (predict the output, spot the bug) is therefore as important as writing it, and the game should weigh those skills accordingly.

**The name.** "idk" is a running joke. Different characters and places expand it differently — *Information Data Knowledge*, *Important Development Knowledge*, *Integrated Development Kit*, *Intuition, Deduction, Knowledge*, etc. A possible thematic payoff (Claude's suggestion, not settled): the final meaning is the honest one — saying "I don't know" is one of a programmer's most important habits.

## 2. Who it's for

- **Primary:** high school and college students just starting to learn to code (intro classes).
- **Secondary:** adults transitioning into tech who need to guide and check AI-generated code; working engineers who want to keep their skills sharp rather than gradually handing control to LLMs.

## 3. Goals, non-goals, anti-goals

**Goals**
- Combat where coding concepts are the actual tools of play, not a gate in front of them.
- Players come away knowing they learned something. Some "homework feel" is acceptable — even desirable. The game doesn't hide that it's teaching.
- Teach JavaScript.
- Build iteratively in phases and slices, committing as we go, adjusting when something isn't working. This is a long-term project: scope stays minimal per slice, and there will be plenty of room later to test, refine, and expand. Nothing here needs to be one-shot.

**Non-goals (for now)**
- Phone play. Desktop / laptop / Chromebook first while gameplay is being refined. Phones come later via code-block input (see §6).
- A quest system (planned later; the dialogue UI should anticipate it).
- Multiple languages.

**Anti-goals** (would be a failure even if it technically worked)
- Combat that is just a quiz with an HP bar — the code must change *what happens*, not merely whether you get to hit.
- A recreation of any specific existing game. The genre conventions (four-corner battle layout, tile movement, Speed-based turn order) are fine; copying a particular game's content, characters, or identity is not.

## 4. The overworld

- Tile-based, top-down. **Movement is tile-by-tile** (grid-locked, like classic RPGs), not free pixel movement.
- Controls: arrow keys or WASD to move; one interact key (Space / E / Enter).
- Walls bound each area. Structures (houses) block movement on all sides.
- **Doors:** walking into a house's door switches to that house's interior map. The interior has an exit spot on its edge that corresponds to the door's position; leaving puts the player back outside at the door.
- **Area exits:** openings in an area's boundary walls lead to the next area.
- **NPCs** stand still or pace slowly back and forth along one axis. Facing an adjacent NPC and pressing interact **freezes the overworld** and opens a **dialogue box** across the bottom ¼–½ of the screen. Text prints out (typewriter style), and the player may choose from a few responses. This box is where quests will be handed out later.
- **Ground items:** standing adjacent and pressing interact picks the item up into the inventory. A simple inventory screen shows what's been collected.

## 5. Combat

### 5.1 Layout

Classic four-corner battle layout:

| Top-left: enemy's stat box (name, level, HP, status tags) | Top-right: enemy sprite, facing the player |
|---|---|
| **Bottom-left: player sprite, back to the camera** | **Bottom-right: player stats (HP, Energy, Mana) + action menu** |

Action menu: **Attack, Spell, Item, Taunt, Run.**

When the player picks **Attack** or **Spell**, a **casting overlay** opens (chosen design — "Option C"): the battle dims and pauses, and a large spellbook-styled panel fills the center of the screen. The overlay contains:

1. **Tell box** (top, full width) — a short prose description of what the enemy is doing or about to do, hinting at what to code ("Bugblob is gathering frost… its ice shield looks like it'll go up next turn, and it seems sluggish in the heat").
2. **Code editor** (left, largest) — where the player writes the turn's code.
3. **Spellbook / Moves list** (middle) — available Moves or Spells with their signatures, valid fuel ranges, and effects. Locked entries visible but grayed.
4. **Awareness panel** (right) — tabs for `self`, `world`, `enemy` listing readable properties and current values. Locked properties visible but grayed.
5. **Fuel readout + Cast button** (bottom right).

The overlay was chosen because it leaves the most room to grow as abilities and concepts expand.

Reference mockup: `.superpowers/brainstorm/1064-1793465386/content/casting-overlay-v2.html` (open directly in a browser).

### 5.2 Turn flow

- Turn order is decided by comparing **Speed**: the faster combatant acts first.
- **Player turn:** choose an action.
- **Enemy turn:** the enemy picks from a **pre-scripted, semi-predictable** set of Moves / Spells / Items. Reading that pattern (via tells and awareness) and countering it is the main coding challenge. Designing these scripts is expected to be the hardest and most important design work.
- Repeat until one side's HP reaches zero, the enemy gives up, or the player runs.

### 5.3 Moves and Spells are functions

- Moves (physical) take **Energy**; Spells (magical) take **Mana**. Both are called like functions with an amount of fuel: `ember(4)`.
- Each Move/Spell has a **valid fuel window** (e.g. `ember` works with 3–5 MP). Too little or too much → the cast **fails** (fizzles). The amount passed is spent from the player's pool.
- Not enough fuel in the pool → an **error**, and the player must choose again (the turn is not lost).
- A successful cast does **damage** and/or applies a **status** to the enemy — e.g. sleepy, shocked/paralyzed, scared, chilled, sad — which weakens the enemy's future actions.
- Energy and Mana are the overall limiter on what a turn can do.
- **Core Moves/Spells are built into the game** (e.g. `ember`), each with a fixed fuel window and effect. The player's main activity is calling these built-ins well. Skill points improve them (§5.8).
- **Later iterations:** players write their own functions that wrap the built-ins (e.g. a `combo()` that uses an item, then casts), customized outside combat or edited inline mid-combat. Not part of early slices.

### 5.3a When the player's code runs

The code is **not** evaluated when the player presses Cast. It runs when the player's action **resolves** in turn order, against the awareness values *at that moment*:

- If the enemy is faster, it has already acted, and may have changed `self`, `world`, or `enemy` values since the player was writing.
- Some values **fluctuate unpredictably** turn to turn (e.g. wind gusts, the enemy's mood), so the player can't know them exactly while writing.

Purpose: conditionals must matter. If code ran against the exact values shown while writing, every `if` would collapse into a constant the player could read off the panel. The player writes code for situations they can't fully see — the real skill.

The Awareness panel shows values as of when the player is writing; the tell hints at what may change.

### 5.4 Awareness: `self`, `world`, `enemy`

Three read-only objects the player's code can reference:

- `self` — introspection: `hp`, `mana`, `energy`, later `status`, …
- `world` — environment: `temperature`, `timeOfDay`, later `windSpeed`, `terrain`, … Some Moves/Spells get bonuses under certain conditions.
- `enemy` — perception: `hp`, `name`, later `weakness`, `status`, `nextMove`, …

Example of the intended feel:

```js
if (world.temperature > 25) {
  ember(5);
} else {
  ember(self.mana > 6 ? 5 : 3);
}
```

**Awareness is a progression track.** Early on the player can only sense a few properties; others are visible but locked and get unlocked over the game (e.g. goggles that reveal `enemy.weakness`).

**Awareness is read-only.** Assigning to it (`enemy.hp = 0`) fails — ideally with an in-world joke that also teaches something.

### 5.5 Items modify the world

- Combat items are **function calls in the same editor** that change awareness values *through the rules*, within limits: a **space heater** nudges `world.temperature` up, a **floor fan** raises `world.windSpeed`, a **time-travel device** shifts `world.timeOfDay` for a few turns. Other items restore Energy/Mana/HP or adjust stats.
- This is deliberately the "legal" way to change state that can't be assigned directly — it teaches encapsulation through a joke.
- **Using an item does not consume the turn.** Items and a cast can combine in one turn, and order matters:
  ```js
  spaceHeater.use();
  ember(5); // boosted by the heat
  ```
- Because items are turn-free, they need their own limit — consumable and/or one per turn **(open — to settle during combat slices)**.
- The menu still has an **Item** action for using items outside of code (e.g. healing); how that interacts with in-code item use is **(open)**.

### 5.6 Rules of what can be coded

Still to be fully defined during the combat slices. Settled so far:
- **One damaging Move/Spell per turn.**
- Energy/Mana budgets limit everything.
- Awareness objects are read-only.

### 5.7 Taunt, Run, and non-violent endings

- **Run** ends combat immediately.
- **Taunt** — mechanics **(open)**. Intent: make the enemy act more recklessly (fail more often) or more willing to give up.
- Influencing the enemy's stats enough can make it **give up**, ending combat without defeating it. Non-violent resolution is a valued path.

### 5.8 Winning, losing, progression

- Using a Move/Spell earns **skill points** in that Move/Spell or its category. Skill points buy **modifications** to Moves/Spells or **unlock new ones**.
- Winning grants **XP** toward the character's overall **Level**.
- Losing costs a small penalty (some XP or currency — **(open)** which) and the player **blacks out**, waking at the last save point or a nearby safe location.

## 6. Concepts, learning, and difficulty

- New **concepts** (variables, conditionals, loops, functions, classes, …) are acquired in the world — from **Books** (items) or from **NPCs**, often via quests.
- **The game is practice that also teaches lightly.** Each concept gets a short explanation (NPC or Book) plus a guided first fight before it appears in the spellbook. How much the game teaches will be refined in later iterations. Slice 1 may assume the player already knows basic JS syntax (`if`, function calls).
- Challenges should include **reading** code (predict output, spot the bug) as well as writing it. **Eventually this happens inside combat:** some enemies show their next move *as code* for the player to predict, and later the AI familiar (below) casts code the player must check. Not in early slices — but enemy behavior should be stored in a form that could later be displayed as code.
- **Difficulty modes share the same challenge content; only the input method changes:**
  - **Easier:** assemble code from **code blocks** picked from the spellbook (recognition). This is also the future phone mode.
  - **Harder:** **type** the code from memory; the spellbook is a reference to glance at (recall).
- *Unconfirmed idea (Claude's):* an overconfident **AI familiar** that travels with the player and casts spells that are usually — but not always — right; catching its mistakes is a skill. Fits the "check the AI's code" theme. Not committed.

## 7. Constraints

- Runs in the browser. Desktop / laptop / Chromebook first (keyboard + mouse), but layouts should not preclude a later phone version.
- Player code is JavaScript and must run **safely**: it can't touch the page, the game's internals, or the network, and it can't hang the game (infinite loops must be stopped).
- Built incrementally in phases and vertical slices, committed as we go, in the existing repo (`github.com/wforbes/idk-rpg`).

## 8. First slice — the starting area

The first build is a small area that proves the overworld works **and** contains one rough fight, so the core idea (coding combat) is felt early rather than discovered late.

Must include:
1. Tile-by-tile player movement with reliable collision against boundary walls and houses.
2. At least one house with a door → interior map → matching exit back to the door.
3. At least one area exit leading to a second area (a small stub area is fine).
4. At least one NPC (standing still or pacing on one axis); interact opens the frozen-world dialogue box with typewriter text and a choice of responses.
5. At least one ground item that can be picked up into an inventory, plus a simple inventory screen.
6. **One rough fight:** one enemy, triggered in the area, using the four-corner layout and the casting overlay, with at least one Spell (e.g. `ember(mana)` with a fuel window), Mana spending, fizzle on a bad amount, a tell, an awareness panel with a couple of live values, HP reduction on both sides, Speed-based turn order, and an end state (win/lose/run). It should be possible to write a conditional using an awareness value, and at least one value should be able to change between writing and resolution (§5.3a) so the conditional actually matters.

Explicitly not required in slice 1: quests, the code-block (easy) mode, skill points, XP/levels, Taunt, save system, real art.

## 9. How it gets made

**Decided by the project owner**
- The game teaches JavaScript.
- Desktop-first; code-block mode for phones later.
- Work in phases and slices inside the existing git repo, committing as we go.

**Builder's calls (Claude's defaults — override freely)**
- **Game code:** TypeScript, bundled with **Vite**. Typed game state helps as combat rules grow.
- **Engine:** **Phaser 3** — handles scenes (overworld / interior / battle), tilemaps, input, camera, and scaling, so effort goes into the game rather than plumbing.
- **Maps:** authored in the **Tiled** map editor and loaded as JSON, so areas can be edited visually.
- **In-game code editor:** **CodeMirror 6** — lightweight, good keyboard UX, works on mobile later. Rendered as HTML over the game canvas.
- **Running player code:** a sandboxed JavaScript interpreter (e.g. QuickJS compiled to WebAssembly) with an instruction/time budget, evaluated once per turn at resolution time (§5.3a) against a snapshot of the awareness values at that moment. Player code does not directly change game state; it produces a list of **intended actions** (cast `ember` with 5, use `spaceHeater`) which the battle engine validates against the rules (one damaging cast, fuel budget, item limits) and then resolves. This keeps rules enforceable and makes "fizzle", "error", and "nice try, `enemy.hp` is read-only" messages straightforward.
- **Art:** placeholder pixel art (simple colored tiles or free CC0 tilesets) for slice 1; 16×16 tiles scaled up crisply.
- **Tests:** unit tests (Vitest) for logic that isn't visual — battle rules, fuel windows, sandbox output, collision maps. Visual behavior checked by playing.
- **Hosting:** none needed yet; GitHub Pages is the natural later choice.

**Left to the builder**
- Exact file/module structure, scene architecture, data formats for enemies/spells/items/dialogue.
- Exact numbers (stats, fuel windows, damage formulas) for the slice-1 fight — rough is fine; they'll be tuned by playing.
- Text-printing speed, dialogue box sizing within the ¼–½ range, menu styling.
