import { TEMP_MAX } from "./constants";
import type { BattleEvent, BattleState, Side } from "./types";

/** An item the player can use in battle — from code (`spaceHeater.use()`) or from the Item menu. */
export interface BattleItem {
  id: string;
  /** Used up when used. */
  consumable: boolean;
  /** How it's called in code, for the spellbook. */
  call: string;
  /** One-line effect summary for the spellbook. */
  notes: string;
  /** Mutates the draft. */
  apply(draft: BattleState, user: Side): BattleEvent[];
}

export const HEATER_DEGREES = 4;
export const BERRY_MANA = 4;
export const BAR_ENERGY = 4;

function restore(draft: BattleState, user: Side, resource: "mana" | "energy", amount: number): BattleEvent[] {
  const f = draft[user];
  const max = resource === "mana" ? f.maxMana : f.maxEnergy;
  const gained = Math.max(0, Math.min(amount, max - f[resource]));
  f[resource] += gained;
  return [{ type: "restored", who: user, resource, amount: gained }];
}

export const BATTLE_ITEMS: Record<string, BattleItem> = {
  spaceHeater: {
    id: "spaceHeater",
    consumable: false,
    call: "spaceHeater.use()",
    notes: `world.temperature +${HEATER_DEGREES}° · reusable`,
    apply(draft) {
      draft.world.temperature = Math.min(TEMP_MAX, draft.world.temperature + HEATER_DEGREES);
      return [{ type: "temperatureRaised", temperature: draft.world.temperature }];
    },
  },
  manaBerry: {
    id: "manaBerry",
    consumable: true,
    call: "manaBerry.use()",
    notes: `+${BERRY_MANA} MP · used up`,
    apply: (draft, user) => restore(draft, user, "mana", BERRY_MANA),
  },
  energyBar: {
    id: "energyBar",
    consumable: true,
    call: "energyBar.use()",
    notes: `+${BAR_ENERGY} EN · used up`,
    apply: (draft, user) => restore(draft, user, "energy", BAR_ENERGY),
  },
};
