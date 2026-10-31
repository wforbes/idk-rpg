import type { BattleEvent, BattleState, Side } from "./types";

export interface Ability {
  id: string;
  damaging: boolean;
  /** Mana window; absent for abilities that take no fuel. */
  fuel?: { min: number; max: number };
  /** Mutates the draft. Called only after fuel has been validated and spent. */
  apply(draft: BattleState, user: Side, fuel: number | undefined): BattleEvent[];
}

export const EMBER_HOT_THRESHOLD = 25;
export const EMBER_HOT_BONUS = 2;
export const EMBER_MELT_FUEL = 5;
export const SLIME_SLAP_DAMAGE = 5;

export const opponent = (side: Side): Side => (side === "player" ? "enemy" : "player");

function dealDamage(draft: BattleState, user: Side, amount: number): BattleEvent {
  const target = opponent(user);
  draft[target].hp = Math.max(0, draft[target].hp - amount);
  return { type: "damage", who: user, target, amount };
}

export const ABILITIES: Record<string, Ability> = {
  ember: {
    id: "ember",
    damaging: true,
    fuel: { min: 3, max: 5 },
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
  frostGather: {
    id: "frostGather",
    damaging: false,
    apply(draft, user) {
      draft[user].shielded = true;
      return [{ type: "shieldUp", who: user }];
    },
  },
  slimeSlap: {
    id: "slimeSlap",
    damaging: true,
    apply(draft, user) {
      return [dealDamage(draft, user, SLIME_SLAP_DAMAGE)];
    },
  },
};
