# idk — Roadmap

The game is built in phases. Each phase is a set of vertical slices that leave the game playable. Only the current phase gets a detailed implementation plan. Later phases are rough intent and will be re-planned when we reach them, using what we learned along the way.

Design doc: [superpowers/specs/2026-10-31-idk-rpg-design.md](superpowers/specs/2026-10-31-idk-rpg-design.md)

## Phase 1 — The starting area *(planned)*
One small village, a house interior and a route stub, all walkable with collision, doors and exits. It has NPC dialogue with choices, a ground item and an inventory, and **one rough coding fight** (Bugblob, `ember(mana)`, the casting overlay, awareness values that change before your code runs).
Plan: [superpowers/plans/2026-10-31-phase-1-starting-area.md](superpowers/plans/2026-10-31-phase-1-starting-area.md)

## Phase 2 — Combat depth *(rough)*
- Attack and Moves powered by Energy.
- Statuses: chilled, shocked, scared, sleepy, sad.
- Items usable in code (`spaceHeater.use()`), plus the Item menu, and settling the item limits.
- Taunt and enemies giving up.
- XP, levels and skill points; spell modifications.
- More enemies with distinct, readable patterns.
- Balancing the numbers by playing.

## Phase 3 — Concepts and teaching *(rough)*
- Concepts acquired from Books and NPCs, and a basic quest system in the dialogue UI.
- Short lessons and guided first fights.
- Locked and unlocked spellbook entries and awareness senses (e.g. goggles → `enemy.weakness`).
- Deciding how much the game teaches versus assumes.

## Phase 4 — A world worth exploring *(rough)*
- More areas and a save system.
- Real pixel art and audio.
- The "idk" running gag spread across NPCs and places.

## Phase 5 — Easier mode and phones *(rough)*
- Code-block input built from the same challenge content.
- A touch-friendly layout.

## Phase 6 — Reading code *(rough)*
- Enemies that show their next move as code to predict.
- The overconfident AI familiar whose spells you have to check.
- Player-written functions that wrap built-in spells.
