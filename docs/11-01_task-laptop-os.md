# Task: Laptop OS — a mock Linux terminal and the `idkcode` editor

*Status: not started. Written 2026-11-01 as a hand-off for a future session.*

## What this is

The player's **Laptop** is effectively their weapon and their spellbook. Opening it should feel like using a small Linux computer: a terminal where they can look around a filesystem, read files, edit them with `nano`, and launch **`idkcode`**, the in-game code editor where they experiment with their spells.

We decided to **mock the operating system** rather than emulate real Linux. Emulators like v86 and WebVM are heavy, slow to boot and hard for the game to control, and Wasmer's bash needs special cross-origin headers. The parts that matter are still real:

- **xterm.js** renders the terminal (the same component VS Code uses).
- **CodeMirror 6**, already in the project, is the editor.
- **The QuickJS sandbox**, already in the project, actually runs the player's JavaScript.

The game owns the filesystem and the commands, so the story can add files per Stage, gate commands, and show fictional hardware (later: `free -h` reflecting a RAM upgrade).

## Read first

- `docs/10-31_testing-feedback.md` — the owner's Stage 0 design, including the laptop, terminal, `nano` and `idkcode`.
- `docs/superpowers/specs/2026-10-31-idk-rpg-design.md` — the overall game design.
- `docs/roadmap.md` — the phase roadmap. This task is exploratory prototype work.
- Code to reuse or mirror:
  - `src/battle/sandbox.ts` — `getSandbox().run(code, snapshot, opts)` runs JS in QuickJS with a timeout and captures `console.log`.
  - `src/ui/castingOverlay.ts` — how we mount CodeMirror in a DOM overlay over the canvas, plus key handling (Esc, Ctrl+Enter).
  - `src/scenes/BattleScene.ts` — how a scene turns off Phaser's keyboard capture so DOM inputs receive every key.
  - `src/scenes/OverworldScene.ts` — modes (`explore`, `dialogue`, `inventory` …), the inventory screen, and `enableGlobalCapture()` on create.
  - `src/state/gameState.ts` — app-wide state (inventory, flags). The filesystem should live here.
  - `src/ui/InventoryScreen.ts` and `src/data/items.ts` — the bag UI and item definitions.

## Goal for the first version

From the overworld, the player can open their Laptop and get a working terminal with:

| Command | Behavior |
|---|---|
| `help` | Lists available commands with one-line descriptions |
| `ls [path]` | Lists a directory (folders marked, e.g. with a trailing `/` or a color) |
| `cd [path]` | Changes directory. Supports `..`, `.`, `~`, absolute and relative paths |
| `pwd` | Prints the current directory |
| `cat <file>` | Prints a file |
| `echo <text>` | Prints text |
| `clear` | Clears the screen |
| `whoami` | Prints the player's name (a placeholder until character creation exists) |
| `nano <file>` | Opens the file in a CodeMirror editor overlay. Ctrl+S saves and Esc/Ctrl+X exits back to the terminal. Creates the file if it doesn't exist |
| `node <file.js>` | Runs the file's JavaScript in the QuickJS sandbox and prints `console.log` output or the error |
| `idkcode [dir]` | Opens the code editor view: a file list (like a project sidebar) + CodeMirror + a Run button + an output panel |
| `exit` | Closes the laptop and returns to the overworld |

Plus the basics a terminal needs: a prompt like `player@dull-laptop:~$`, Backspace, Left/Right cursor, Up/Down history, Ctrl+C to cancel the line, and a friendly `command not found: x — try 'help'`. Tab completion is a nice-to-have.

**Starting filesystem** (seed content; the owner will rewrite the copy):

```
/home/player/
  readme.txt          ← welcome note; hints at `ls`, `cat`, `idkcode`
  notes/
    todo.txt          ← "don't be late for coding school!"
  spells/
    hello.js          ← console.log("hello, world") — runnable with `node` and in idkcode
```

## Non-goals (for now)

- Real Linux behavior beyond the table: no pipes, redirects, globbing, permissions, processes or `grep`.
- Saving to disk. Phase 4 adds a save system, so keep the filesystem in `gameState` and make it serializable to JSON.
- Spells written in `idkcode` being usable in combat. That's a later design step. For now `idkcode` is a practice space.
- Phone or touch layout.
- Laptop hardware stats and upgrades (RAM/SSD). Design the shape so these can come later, but don't build them.

## Suggested architecture

Keep the logic pure and testable, and keep the DOM thin. This matches how the rest of the project is built: pure modules with Vitest tests, and Phaser/DOM only rendering.

```
src/laptop/
  fs.ts            VirtualFs: a tree of dirs/files; resolve(path, cwd), list, read, write, mkdir; toJSON/fromJSON
  fs.test.ts
  shell.ts         parse a command line → dispatch to a command; holds cwd + history; returns output lines
  shell.test.ts
  commands.ts      the command table: name → (args, ctx) => output | an effect like { open: "nano", path }
  commands.test.ts
src/ui/
  terminal.ts      xterm.js adapter: mounts in #ui, line editing, prompt, renders shell output, handles effects
  nanoEditor.ts    CodeMirror overlay for one file (could share setup with castingOverlay.ts)
  idkcodeView.ts   file sidebar + CodeMirror + Run + output
  laptop.css
```

- **Commands return results and effects, not DOM.** For example, `nano` returns `{ effect: "openEditor", path }`, `exit` returns `{ effect: "close" }`, and `clear` returns `{ effect: "clear" }`. The UI layer acts on effects. This keeps `shell.ts` and `commands.ts` fully unit-testable.
- **Running JS:** the current sandbox API is battle-shaped (it needs a `Snapshot` and `actions`). Either call it with an empty snapshot and no actions, or add a small general-purpose wrapper (for example `runScript(code, { timeoutMs })` that returns `{ ok, logs, error }`) that reuses the same isolation, timeout and log capture. Keep the existing battle API and tests intact.
- **Line editing:** xterm.js only delivers raw keystrokes, so the prompt, Backspace, cursor movement and history have to be handled somewhere. Write a small line editor yourself (it's testable as a pure reducer), or try `xterm-readline`. The builder chooses.
- **Packages:** `@xterm/xterm` (v6) and `@xterm/addon-fit` (v0.11). Note the scoped names; the old `xterm` package is deprecated.

## Opening the laptop (entry point)

The final game puts the Laptop on a desk in the player's bedroom (Stage 0). That room doesn't exist yet, so for this prototype:

1. Add a `laptop` item to `ITEMS` ("Dull Computers 15\" Laptop", with a flavor description).
2. Place a Laptop ground item in the existing house interior (`public/assets/maps/house.json`) so it can be picked up. Follow the Tiled conventions in `src/world/areaMap.ts`, use a unique object id, bump `nextobjectid`, and put it on a walkable tile. `npm test` validates the maps.
3. Give the inventory a way to **use** an item: for example, Enter on the selected item opens the laptop. Only the laptop is usable for now.
4. While the laptop is open, the overworld should be frozen in a new mode such as `"laptop"`.

## Gotchas already learned in this repo

- **Keyboard capture.** The overworld calls `this.input.keyboard.enableGlobalCapture()`. Phaser then calls `preventDefault()` on keys like Space, the arrows, W/A/S/D, E and I, which would swallow them before xterm or CodeMirror see them. When the laptop opens, call `disableGlobalCapture()` and set `keyboard.enabled = false`; restore both on close. Verify that typing `wasd ei` and pressing the arrows works in the terminal and nano and does **not** move the player.
- **Hold-lock.** After a panel closes, the overworld ignores direction keys until they're released (`holdLock`). Set it when the laptop closes too.
- **Hidden look-alike characters.** Test seed text and sprite data for stray non-ASCII characters (a Cyrillic "о" slipped in once).

## How to verify

- **Unit tests (Vitest)** for the filesystem (path resolution with `..`, `~`, absolute and relative paths; reading or writing missing paths; JSON round trip), shell parsing (quoted args, extra spaces, empty input, unknown commands), and each command's output and effects. `npm test`, `npm run typecheck` and `npm run build` must all pass.
- **In the browser.** There's no browser tool in this environment. Install `playwright-core` in the session scratchpad and launch the installed Edge headless (`channel: "msedge"`). In dev builds the game is exposed as `window.game`. Hold each key at least about 50 ms, because Phaser misses instant presses. Run the dev server on port 5199, and when stopping it, only kill node processes whose command line contains `--port 5199`; the owner may have their own server on 5173. Walk through: pick up the laptop, open it from the bag, run `ls`, `cd spells`, `cat hello.js`, `node hello.js`, edit with `nano` and save, run again, open `idkcode` and press Run, then `exit` back to the overworld.

## Working agreement with the owner

- Use the brainstorming, then plan, then execute flow for anything non-trivial, and ask the owner about open questions that change what gets built.
- During iterative or experimental passes, **don't commit until the owner reviews and signs off.**
- "Stage" is a story concept that can appear in code. "Phase" is planning vocabulary only and shouldn't appear in code.

## Open questions for the owner

1. **What should `idkcode` look and feel like in this first version?** The design doc says it should be "barebones, but still fun or useful" and that the owner will think through the guided sequence. Confirm the minimum before building the view.
2. **Should `idkcode` be able to call combat functions like `ember(4)` as a dry run** (showing what would happen) or only plain JavaScript for now?
3. **Terminal look:** a retro green-on-black screen, or a modern dark theme? Should the laptop fill the whole screen or show as a framed "laptop" around the terminal?
4. **The player's name** in the prompt and `whoami`: use a placeholder like `player` until character creation (Phase 4)?
