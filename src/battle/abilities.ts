import { DEEP_CHILL_TURNS, HEAVY_JAB_BONUS, HOT_HANDS_BONUS, KINDLING_MIN } from "../data/progression";
import { applyStatus, CHILL_TURNS, SCARED_TURNS } from "./statuses";
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
export const BYTE_BITE_DAMAGE = 4;
export const ICE_BREATH_DAMAGE = 3;
export const SNOWBALL_DAMAGE = 6;
export const ENERGY_REGEN = 2;
export const TAUNT_RESOLVE = 15;
export const SCARED_MULTIPLIER = 2;

export const opponent = (side: Side): Side => (side === "player" ? "enemy" : "player");

/** Lowers a fighter's will to fight (doubled while scared). No-op for fighters without resolve. */
export function loseResolve(draft: BattleState, target: Side, base: number): BattleEvent[] {
  const f = draft[target];
  if (f.maxResolve <= 0 || base <= 0) return [];
  const amount = Math.min(f.resolve, base * (f.statuses.scared ? SCARED_MULTIPLIER : 1));
  f.resolve -= amount;
  return [{ type: "resolveLost", who: target, amount }];
}

/** Damage also shakes the target's resolve by half the damage, rounded up. */
function dealDamage(draft: BattleState, user: Side, amount: number): BattleEvent[] {
  const target = opponent(user);
  draft[target].hp = Math.max(0, draft[target].hp - amount);
  return [{ type: "damage", who: user, target, amount }, ...loseResolve(draft, target, Math.ceil(amount / 2))];
}

/** True when the player owns this modification (mods never help the enemy). */
const hasMod = (draft: BattleState, user: Side, mod: string) => user === "player" && draft.mods.includes(mod);

/** The fuel window an ability has for this user, after modifications. */
export function fuelWindow(draft: BattleState, user: Side, ability: Ability): { min: number; max: number } {
  if (!ability.fuel) return { min: 0, max: 0 };
  const min = ability.id === "ember" && hasMod(draft, user, "kindling") ? KINDLING_MIN : ability.fuel.min;
  return { min, max: ability.fuel.max };
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
      const hot = draft.world.temperature > EMBER_HOT_THRESHOLD ? EMBER_HOT_BONUS : 0;
      const hands = hasMod(draft, user, "hotHands") ? HOT_HANDS_BONUS : 0;
      const weakness = hot ? (target.traits.hotFireBonus ?? 0) : 0;
      events.push(...dealDamage(draft, user, fuel * 2 + hot + hands + weakness));
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
      return dealDamage(draft, user, fuel * 2 + (hasMod(draft, user, "heavyJab") ? HEAVY_JAB_BONUS : 0));
    },
  },
  frostbite: {
    id: "frostbite",
    kind: "spell",
    signature: "frostbite(mana)",
    notes: "damage = mana · chills: −2 speed for 2 turns",
    fuel: { min: 2, max: 4, resource: "mana" },
    apply(draft, user, fuel = 0) {
      const target = opponent(user);
      const damage = draft[target].traits.frostHalf ? Math.floor(fuel / 2) : fuel;
      const turns = hasMod(draft, user, "deepChill") ? DEEP_CHILL_TURNS : CHILL_TURNS;
      return [...dealDamage(draft, user, damage), ...applyStatus(draft, target, "chilled", turns)];
    },
  },
  taunt: {
    id: "taunt",
    kind: "other",
    signature: "taunt()",
    notes: `−${TAUNT_RESOLVE} will to fight (×2 if scared) · scares for ${SCARED_TURNS} turns`,
    apply(draft, user) {
      const target = opponent(user);
      return [...loseResolve(draft, target, TAUNT_RESOLVE), ...applyStatus(draft, target, "scared", SCARED_TURNS)];
    },
  },
  blink: {
    id: "blink",
    kind: "other",
    signature: "blink()",
    notes: "dodges until its next action — physical moves miss",
    apply(draft, user) {
      draft[user].dodging = true;
      return [{ type: "dodgeUp", who: user }];
    },
  },
  byteBite: {
    id: "byteBite",
    kind: "other",
    signature: "byteBite()",
    notes: `${BYTE_BITE_DAMAGE} damage`,
    apply: (draft, user) => dealDamage(draft, user, BYTE_BITE_DAMAGE),
  },
  iceBreath: {
    id: "iceBreath",
    kind: "other",
    signature: "iceBreath()",
    notes: `${ICE_BREATH_DAMAGE} damage · chills`,
    apply: (draft, user) => [
      ...dealDamage(draft, user, ICE_BREATH_DAMAGE),
      ...applyStatus(draft, opponent(user), "chilled", CHILL_TURNS),
    ],
  },
  snowball: {
    id: "snowball",
    kind: "other",
    signature: "snowball()",
    notes: `${SNOWBALL_DAMAGE} damage`,
    apply: (draft, user) => dealDamage(draft, user, SNOWBALL_DAMAGE),
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
      return dealDamage(draft, user, SLIME_SLAP_DAMAGE);
    },
  },
};
