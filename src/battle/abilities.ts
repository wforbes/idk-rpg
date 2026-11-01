import type { BattleEvent, BattleState, Resource, Side } from "./types";

export interface Ability {
  id: string;
  /** Which spellbook tab lists it. "other" = enemy-only or special actions. */
  kind: "move" | "spell" | "other";
  /** How it's called, for the spellbook, e.g. "ember(mana)". */
  signature: string;
  /** One-line effect summary for the spellbook. */
  notes: string;
  /** Fuel window and the resource it spends; absent for abilities that take no fuel. */
  fuel?: { min: number; max: number; resource: Resource };
  /** Mutates the draft. Called only after fuel has been validated and spent. */
  apply(draft: BattleState, user: Side, fuel: number | undefined): BattleEvent[];
}

export const EMBER_HOT_THRESHOLD = 25;
export const EMBER_HOT_BONUS = 2;
export const EMBER_MELT_FUEL = 5;
export const SLIME_SLAP_DAMAGE = 5;
export const ENERGY_REGEN = 2;

export const opponent = (side: Side): Side => (side === "player" ? "enemy" : "player");

function dealDamage(draft: BattleState, user: Side, amount: number): BattleEvent {
  const target = opponent(user);
  draft[target].hp = Math.max(0, draft[target].hp - amount);
  return { type: "damage", who: user, target, amount };
}

/** The fuel window an ability has for this user, after modifications. */
export function fuelWindow(_draft: BattleState, _user: Side, ability: Ability): { min: number; max: number } {
  if (!ability.fuel) return { min: 0, max: 0 };
  return { min: ability.fuel.min, max: ability.fuel.max };
}

export const ABILITIES: Record<string, Ability> = {
  ember: {
    id: "ember",
    kind: "spell",
    signature: "ember(mana)",
    notes: "burns · a full 5 MP melts ice",
    fuel: { min: 3, max: 5, resource: "mana" },
    apply(draft, user, fuel = 0) {
      const target = draft[opponent(user)];
      const events: BattleEvent[] = [];
      if (target.shielded) {
        if (fuel < EMBER_MELT_FUEL) return [{ type: "blocked", who: user, spell: "ember" }];
        target.shielded = false;
        events.push({ type: "shieldMelted", who: user });
      }
      const bonus = draft.world.temperature > EMBER_HOT_THRESHOLD ? EMBER_HOT_BONUS : 0;
      events.push(dealDamage(draft, user, fuel * 2 + bonus));
      return events;
    },
  },
  jab: {
    id: "jab",
    kind: "move",
    signature: "jab(energy)",
    notes: "physical · bounces off ice · misses dodgers",
    fuel: { min: 2, max: 4, resource: "energy" },
    apply(draft, user, fuel = 0) {
      const target = draft[opponent(user)];
      if (target.shielded) return [{ type: "blocked", who: user, spell: "jab" }];
      if (target.dodging) return [{ type: "missed", who: user, spell: "jab" }];
      return [dealDamage(draft, user, fuel * 2)];
    },
  },
  frostGather: {
    id: "frostGather",
    kind: "other",
    signature: "frostGather()",
    notes: "raises an ice shield",
    apply(draft, user) {
      draft[user].shielded = true;
      return [{ type: "shieldUp", who: user }];
    },
  },
  slimeSlap: {
    id: "slimeSlap",
    kind: "other",
    signature: "slimeSlap()",
    notes: `${SLIME_SLAP_DAMAGE} damage`,
    apply(draft, user) {
      return [dealDamage(draft, user, SLIME_SLAP_DAMAGE)];
    },
  },
};
