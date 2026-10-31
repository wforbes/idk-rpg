import { ABILITIES } from "./abilities";
import type { BattleEvent, BattleState, Intent, Side } from "./types";

/**
 * Applies one combatant's intents, in order, under the battle rules:
 * known abilities only, one damaging attempt per turn, whole-number fuel within your mana,
 * fuel outside the window fizzles (and is still spent). Mutates `draft`.
 */
export function applyIntents(draft: BattleState, user: Side, allowed: string[], intents: Intent[]): BattleEvent[] {
  const events: BattleEvent[] = [];
  let damagingAttempted = false;

  for (const { spell, fuel } of intents) {
    if (draft.outcome !== "ongoing") break;
    const ability = allowed.includes(spell) ? ABILITIES[spell] : undefined;
    if (!ability) {
      events.push({ type: "rejected", who: user, spell, reason: "unknownSpell" });
      continue;
    }
    if (ability.damaging && damagingAttempted) {
      events.push({ type: "rejected", who: user, spell, reason: "extraDamagingCast" });
      continue;
    }

    let spent: number | undefined;
    if (ability.fuel) {
      if (typeof fuel !== "number" || !Number.isInteger(fuel) || fuel < 0) {
        events.push({ type: "rejected", who: user, spell, reason: "badFuel" });
        continue;
      }
      const fighter = draft[user];
      if (fuel > fighter.mana) {
        events.push({ type: "notEnoughMana", who: user, spell, fuel, mana: fighter.mana });
        continue;
      }
      fighter.mana -= fuel;
      spent = fuel;
    }

    if (ability.damaging) damagingAttempted = true;
    events.push(spent === undefined ? { type: "cast", who: user, spell } : { type: "cast", who: user, spell, fuel: spent });

    if (ability.fuel && spent !== undefined && (spent < ability.fuel.min || spent > ability.fuel.max)) {
      events.push({ type: "fizzle", who: user, spell, fuel: spent, min: ability.fuel.min, max: ability.fuel.max });
      continue;
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
