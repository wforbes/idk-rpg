# Phase 2 — Combat Depth: Design

*Status: approved by the owner 2026-11-01 (answers to §14 folded in). Date: 2026-11-01.*

This builds on the game design (`2026-10-31-idk-rpg-design.md`, especially §5) and the Phase 1 code. The owner asked for a draft without a question round, so **almost every specific in this document is Claude's call** unless it quotes the original design. Numbers are starting points to tune by playing.

---

## 1. Intent

Phase 1 proved the core loop: read a tell, write a conditional against values that change before your code runs, and cast. Phase 2 gives that loop **more things worth branching on**, so one fight has more than one right answer:

- a second resource (Energy) and a physical Move alongside Spells
- items your code can call to bend the world
- statuses that change turn order and behavior
- a non-violent way to win (Taunt and giving up)
- a reason to keep fighting (XP, levels, skill points, spell modifications)
- two new enemies whose patterns reward different code

This is still roadmap prototyping, not the story mode. It aims for breadth of mechanics at rough quality, and every system stays small.

## 2. Goals, non-goals, anti-goals

**Goals**
- Every new mechanic shows up as something the player can **read in code** (awareness values) and **act on in code** (callable functions).
- Each enemy has a pattern that a short `if` beats clearly, and that brute force handles poorly.
- All tunable numbers live in data tables (`abilities`, `enemies`, `items`, `progression`) and nowhere else.
- Automated "balance tests" simulate fights, so tuning doesn't break winnability.

**Non-goals**
- The full status list from the roadmap. Only **chilled** and **scared** come in Phase 2; shocked, sleepy and sad are deferred.
- Player-written wrapper functions such as a `combo()` (Phase 6), concept unlocks via Books or NPCs (Phase 3), and saving (Phase 4).
- Healing outside battle. HP, MP and EN are still fully restored after every fight.

**Anti-goals** (failures even if they technically work)
- **Statuses that take turns away from the player.** No "you are paralyzed and skip your turn". Statuses change numbers and order, never the player's agency.
- **An overlay crowded into a wall of text.** New references (Moves, Items) go in tabs, not in more columns.
- **Grinding.** Levels help, but the intended code pattern for each enemy must win at level 1.

## 3. The rules of a turn (revised)

Phase 1 rule: one *damaging* Move or Spell per turn. Phase 2 broadens it into an action economy. **Each turn the player gets:**

- **One main action:** any Move, Spell or `taunt()`.
- **One item use:** in code or from the Item menu. Items never end the turn.

A second main action or a second item use in the same turn is rejected with a clear message, the same way an extra damaging cast is today. Enemies follow the same rule.

Everything else from Phase 1 still applies:
- Speed decides order, with the player winning ties.
- Code runs at **resolution time** against the live state.
- The Cast precheck catches mistakes without costing the turn.
- Fuel outside the window fizzles, and the fuel is still spent.

## 4. Energy and Moves

- The player gains an **Energy** pool: `self.energy`, `self.maxEnergy`. It starts at **12**, regenerates **+2 per turn** (capped) like Mana, and shows as an EN bar under MP.
- **Moves** are called exactly like Spells but spend Energy.

| Move | Fuel | Effect |
|---|---|---|
| `jab(energy)` | 2–4 EN | Physical damage = `energy × 2`. **Bounces off an ice shield** (blocked, energy spent). **Misses a dodging target.** |

**All known Moves, Spells and items are callable from the same editor,** whichever menu option opened it. Attack opens the overlay on the **Moves** tab and Spell opens it on the **Spells** tab. This matters because code runs at resolution: a player who has to pick "Attack or Spell" *before* seeing what the enemy did couldn't write `if (enemy.shielded) ember(5); else jab(3);`, and that branch is exactly the point.

## 5. Items in code

- Each owned, battle-usable item appears in code as a read-only object with a `use()` method: `spaceHeater.use()`. Items you don't own aren't defined, so calling one gives a ReferenceError.
- **The Item menu** lists the same items. Picking one uses it immediately, shows its message, and returns to the menu with the turn not yet spent. This counts as the turn's one item use.
- The battle overlay gets an **Items** tab with each item's call and effect.
- Using up a **consumable** removes it from `gameState.inventory`, so it stays gone after the fight.

| Item | Kind | `use()` effect |
|---|---|---|
| `spaceHeater` | reusable | `world.temperature` +4 (cap 32) |
| `manaBerry` | consumable | +4 MP (capped) |
| `energyBar` | consumable | +4 EN (capped) |

Placement: two Mana Berries and one Energy Bar as ground items, split between the town and the route.

The canonical combo from the original design now works:

```js
spaceHeater.use();   // 24° → 28°
ember(4);            // 8 + 2 hot bonus
```

## 6. Statuses: chilled and scared

Statuses are timed tags on a fighter, shown as tags in the stat boxes and as boolean awareness values.

| Status | Effect | Duration | Source |
|---|---|---|---|
| **chilled** | Speed −2 (can flip who goes first) | 2 turns | `frostbite()`; Frostcap's `iceBreath()` |
| **scared** | The fighter's resolve loss is doubled (§7) | 2 turns | `taunt()` |

A duration counts down at the end of each full turn. Reapplying a status refreshes it to full duration; it doesn't stack.

**New spell:** `frostbite(mana)`, 2–4 MP. It deals `mana` damage and **chills** the target. It's learned at **level 2** (§8), so Phase 2 also proves out "unlocking an ability".

**Awareness additions:** `self.chilled`, `enemy.chilled`, `enemy.scared`. Plus `self.speed` and `enemy.speed`, so the player can reason about turn order in code.

## 7. Resolve, Taunt and giving up

- Every enemy has **resolve** (will to fight): `enemy.resolve`, `enemy.maxResolve`. It shows as a thin **WILL** bar under the enemy's HP.
- **Resolve drops** by half of any damage the enemy takes (rounded up), and by **15** per `taunt()`. A scared enemy loses double.
- `taunt()` is a **main action** with no fuel. It lowers resolve and makes the enemy **scared**. The **Taunt menu option** is a shortcut that performs `taunt()` as the whole turn without opening the editor.
- **At 0 resolve the enemy gives up.** That's a win, with the same XP as knocking it out, and its own message (Bugblob: "Bugblob gives up and oozes away."). Knocking an enemy out gets a new message ("Bugblob collapses into a puddle.").
- Code can mix the paths, for example `if (enemy.resolve <= 30) taunt(); else ember(3);`, which wears the enemy down with damage and finishes with words.

## 8. XP, levels, skill points and modifications

**XP and levels**
- A win (knockout or giving up) grants the enemy's `xp`.
- Thresholds are cumulative XP: **Lv2 at 20, Lv3 at 50, Lv4 at 90**.
- Each level adds **+5 max HP, +2 max MP and +2 max EN**.
- **Reaching Lv2 teaches `frostbite`.**
- **A loss** costs a percentage of the XP earned toward the next level, never a level. **The owner set it to 5%.** It must be a single named constant (`LOSS_XP_PENALTY = 0.05`) in the progression data table, easy to find and change.
- After a battle, the narration reports what happened: "You gained 10 XP.", "Level up! You're Lv 2.", "You learned frostbite!"

**Skill points**
- Each **successful** use of an ability (not a fizzle, block or miss) earns **+1 skill point in that ability**.

**Modifications**, bought with that ability's points:

| Ability | Mod | Cost | Effect |
|---|---|---|---|
| ember | Kindling | 5 | Fuel window becomes 2–5 |
| ember | Hot Hands | 8 | +2 damage |
| jab | Heavy Jab | 5 | +2 damage |
| frostbite | Deep Chill | 5 | Chill lasts 3 turns |

**Skills screen:** press `K` in the overworld. It's a DOM panel like the bag, showing level, XP to next level, and each ability with its points and mods (buy with Enter or a click). Bought mods change the spellbook text and the engine's numbers.

All of this lives in `gameState`: level, xp, `skillPoints[ability]`, `mods[]`, `knownAbilities[]`, and the energy stats.

## 9. New enemies

Enemies are still JavaScript scripts run in the sandbox. Each one is built to reward a different `if`.

| | Bugblob (existing) | Glitchling (new) | Frostcap (new) |
|---|---|---|---|
| Level · HP · Speed | 3 · 24 · 6 | 4 · 20 · **8** | 5 · 30 · **4** |
| Resolve · XP | 50 · 10 | 40 · 14 | 60 · 18 |
| Abilities | frostGather (shield), slimeSlap (5) | blink (dodging until its next turn), byteBite (4) | iceBreath (3 dmg + chills you), snowball (6) |
| Pattern | shield ⇄ slap (as Phase 1) | `if (self.dodging) byteBite(); else if (chance(0.6)) blink(); else byteBite();` | `if (!enemy.chilled) iceBreath(); else snowball();` plus a cold aura: −2° at the start of each of its turns |
| Weakness | fire ≥5 melts its shield; jab bounces off the shield | **jab misses while it's dodging**, but spells always hit | **takes +3 fire damage when it's above 25°**; takes half damage from frostbite and can't be chilled |
| The `if` it teaches | `ember(enemy.shielded ? 5 : 3)`, or jab when unshielded | `enemy.dodging ? ember(3) : jab(3)` | heat it up, then burn: `if (world.temperature <= 25) spaceHeater.use(); ember(4);` |

New awareness value: `enemy.dodging`.

Frostcap is slower than you until it chills you. After that it acts first, which makes the turn order something the player has to read (`self.speed`, `enemy.speed`).

Placement: Glitchling and Frostcap on the route, on walkable tiles away from the path. Tests validate the maps.

## 10. Battle UI changes

- **Player box:** HP, MP and a new **EN** bar, plus status tags (chilled).
- **Enemy box:** HP, a new thin **WILL** bar, and status tags (shielded, dodging, chilled, scared).
- **Menu:** Attack and Taunt become active; Item becomes active once you own a battle-usable item.
- **Casting overlay:** the spellbook column becomes tabs: **Moves | Spells | Items**. Each entry shows its call, fuel window (including mods) and effect. The awareness panel gains the new values.
- **Narration:** add messages for every new event: energy casts, misses, statuses applied and expiring, resolve loss, giving up, knockout, XP, level up, ability learned and item used.

## 11. Balance tests

Add a seeded fight simulator (pure TypeScript using the real engine and sandbox) and tests that run, for each enemy:
- **Its intended pattern (§9) wins ≥ 90%** of 200 seeded fights at level 1.
- **A naive pattern** (always the same cast) wins less often than the intended one.
- **Fights end within 15 turns** in ≥ 95% of runs (no stalemates).
- **The pure-taunt pattern** can win against at least one enemy (proving the non-violent path is real).

These guard the numbers while they get tuned by playing.

## 12. Suggested build order (vertical slices)

Each slice leaves the game playable and testable:

1. **Action economy + Energy + `jab`.** Rule refactor (§3), EN pool and bar, Moves tab, Attack menu active.
2. **Items in code + Item menu.** `spaceHeater`, `manaBerry`, `energyBar`; consumables leave the bag; the Items tab.
3. **Statuses + `frostbite`.** Chilled and scared plumbing, tags, durations, and awareness values. Frostbite is temporarily known from the start until slice 5.
4. **Resolve, Taunt, giving up.** The WILL bar, the Taunt shortcut and in-code `taunt()`, and the two win messages.
5. **XP, levels, skill points, mods.** Progression tables, post-battle narration, the `K` Skills screen, the level-2 frostbite unlock, and the loss penalty.
6. **Glitchling and Frostcap.** Scripts, sprites (pixel maps like the humanoids), and map placement.
7. **Balance tests + a tuning pass.** The simulator and §11 tests, then adjusting the tables.

## 13. Left to the builder

- Exact sandbox mechanics for item objects (the prelude defines frozen objects with a `use()` that records an item intent).
- How durations and resolve are represented on `Fighter`, and event names and copy for the new narration (same voice as Phase 1: short, playful and explicit about the rule).
- Sprite pixel maps for the new enemies, and their exact tile positions.
- Skills screen layout, within the bag panel's style.

## 14. Owner decisions (2026-11-01)

1. **Action economy** (§3): one main action + one item per turn. Approved.
2. **Giving up and knockouts grant equal XP.**
3. **Loss penalty: 5%** of progress toward the next level, as one easy-to-find constant.
4. **Frostbite unlocked at level 2** is fine as a placeholder for Phase 3's teaching.
