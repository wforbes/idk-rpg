import { ABILITIES, fuelWindow } from "./abilities";
import type { BattleEvent, BattleState, Intent, Side } from "./types";

/**
 * Applies one combatant's intents, in order, under the battle rules:
 * known abilities only, one main action (move, spell or taunt) per turn, whole-number fuel
 * within your pool; fuel outside the window fizzles (and is still spent). Mutates `draft`.
 */
export function applyIntents(draft: BattleState, user: Side, allowed: string[], intents: Intent[]): BattleEvent[] {
  const events: BattleEvent[] = [];
  let actionTaken = false;

  for (const intent of intents) {
    if (draft.outcome !== "ongoing") break;
    if (!("spell" in intent)) continue; // items: Task 3
    const { spell, fuel } = intent;
    const ability = allowed.includes(spell) ? ABILITIES[spell] : undefined;
    if (!ability) {
      events.push({ type: "rejected", who: user, spell, reason: "unknownSpell" });
      continue;
    }
    if (actionTaken) {
      events.push({ type: "rejected", who: user, spell, reason: "extraAction" });
      continue;
    }

    let spent: number | undefined;
    if (ability.fuel) {
      if (typeof fuel !== "number" || !Number.isInteger(fuel) || fuel < 0) {
        events.push({ type: "rejected", who: user, spell, reason: "badFuel" });
        continue;
      }
      const { resource } = ability.fuel;
      const fighter = draft[user];
      if (fuel > fighter[resource]) {
        events.push({ type: "notEnoughFuel", who: user, spell, fuel, have: fighter[resource], resource });
        continue;
      }
      fighter[resource] -= fuel;
      spent = fuel;
    }

    actionTaken = true;
    if (ability.fuel && spent !== undefined) {
      const { resource } = ability.fuel;
      events.push({ type: "cast", who: user, spell, fuel: spent, resource });
      const { min, max } = fuelWindow(draft, user, ability);
      if (spent < min || spent > max) {
        events.push({ type: "fizzle", who: user, spell, fuel: spent, min, max, resource });
        continue;
      }
    } else {
      events.push({ type: "cast", who: user, spell });
    }

    events.push(...ability.apply(draft, user, spent));
    if (draft.enemy.hp <= 0) {
      draft.outcome = "won";
      events.push({ type: "won" });
    } else if (draft.player.hp <= 0) {
      draft.outcome = "lost";
      events.push({ type: "lost" });
    }
  }
  return events;
}
