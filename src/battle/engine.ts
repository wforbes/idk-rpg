import type { PlayerStats } from "../state/gameState";
import { applyIntents } from "./applyIntents";
import { ABILITIES, ENERGY_REGEN } from "./abilities";
import { ENEMIES } from "./enemies";
import type { BattleEvent, BattleState, RunCode, Side, Snapshot } from "./types";

export type PlayerAction = { kind: "cast"; code: string } | { kind: "run" };

export interface TurnDeps {
  runCode: RunCode;
  rng: () => number;
}

export { START_TEMPERATURE, TEMP_MAX, TEMP_MIN } from "./constants";
import { START_TEMPERATURE, TEMP_MAX, TEMP_MIN } from "./constants";
export const MANA_REGEN = 2;

/** What the player brings into a fight beyond raw stats. */
export interface BattleOptions {
  knownAbilities?: string[];
  mods?: string[];
  /** Battle-usable items the player carries (consumables once per copy). */
  items?: string[];
}

export const DEFAULT_ABILITIES = ["ember", "jab"];

export function createBattle(enemyId: string, player: PlayerStats, opts: BattleOptions = {}): BattleState {
  const def = ENEMIES[enemyId];
  if (!def) throw new Error(`unknown enemy: ${enemyId}`);
  return {
    enemyId,
    player: { name: "You", level: 1, ...player, shielded: false, dodging: false },
    enemy: {
      name: def.name, level: def.level, hp: def.maxHp, maxHp: def.maxHp,
      mana: 0, maxMana: 0, energy: 0, maxEnergy: 0, speed: def.speed, shielded: false, dodging: false,
    },
    world: { temperature: START_TEMPERATURE },
    turn: 1,
    outcome: "ongoing",
    knownAbilities: [...(opts.knownAbilities ?? DEFAULT_ABILITIES)],
    mods: [...(opts.mods ?? [])],
    items: [...(opts.items ?? [])],
    itemUsedThisTurn: false,
    consumed: [],
  };
}

/** What each side can sense. Values are copied, so code never touches the live state. */
export function snapshotFor(s: BattleState, side: Side): Snapshot {
  const world = { temperature: s.world.temperature };
  if (side === "player") {
    const { player: p, enemy: e } = s;
    return {
      self: { hp: p.hp, maxHp: p.maxHp, mana: p.mana, maxMana: p.maxMana, energy: p.energy, maxEnergy: p.maxEnergy, speed: p.speed },
      world,
      enemy: { name: e.name, hp: e.hp, maxHp: e.maxHp, shielded: e.shielded, dodging: e.dodging, speed: e.speed },
    };
  }
  const { enemy: e, player: p } = s;
  return {
    self: { name: e.name, hp: e.hp, maxHp: e.maxHp, shielded: e.shielded, dodging: e.dodging },
    world,
    enemy: { hp: p.hp, maxHp: p.maxHp, mana: p.mana, energy: p.energy },
  };
}

/**
 * Dry run when the player presses Cast: catches mistakes that should send them back to
 * the editor without losing the turn. A fizzle is allowed — learning the window is part of play.
 */
export type PrecheckResult = { ok: true; logs: string[] } | { ok: false; message: string; logs: string[] };

export function precheck(s: BattleState, code: string, runCode: RunCode): PrecheckResult {
  const result = runCode(code, snapshotFor(s, "player"), { actions: s.knownAbilities, rolls: [], items: s.items });
  const { logs } = result;
  const fail = (message: string): PrecheckResult => ({ ok: false, message, logs });
  if (!result.ok) return fail(result.error);
  if (!result.intents.length) return fail("Your code didn't cast anything. Try calling ember(…) with some mana.");

  for (const e of applyIntents(structuredClone(s), "player", s.knownAbilities, result.intents)) {
    if (e.type === "rejected" && e.reason === "extraAction") return fail("Only one move, spell or taunt per turn.");
    if (e.type === "rejected" && e.reason === "badFuel") {
      const resource = ABILITIES[e.spell]?.fuel?.resource ?? "mana";
      return fail(`${e.spell} needs a whole number of ${resource}, like ${e.spell}(4).`);
    }
    if (e.type === "rejected") return fail(`You don't know a spell called ${e.spell} yet.`);
    if (e.type === "itemRejected" && e.reason === "extraItem") return fail("Only one item per turn.");
    if (e.type === "itemRejected") return fail(`You don't have a ${e.item}.`);
    if (e.type === "notEnoughFuel") {
      const unit = e.resource === "mana" ? "MP" : "EN";
      return fail(`Not enough ${e.resource}: ${e.spell}(${e.fuel}) needs ${e.fuel} ${unit} and you have ${e.have}.`);
    }
  }
  return { ok: true, logs };
}

/**
 * One full turn. The world shifts first, then the faster side acts (player wins ties).
 * Each side's code runs against the state *at that moment* — so the player's `if` meets
 * whatever the enemy just did.
 */
export function resolveTurn(s: BattleState, action: PlayerAction, deps: TurnDeps): { state: BattleState; events: BattleEvent[] } {
  const draft = structuredClone(s);
  if (action.kind === "run") {
    draft.outcome = "fled";
    return { state: draft, events: [{ type: "fled" }] };
  }

  const events: BattleEvent[] = [];
  const drift = Math.round(deps.rng() * 6) - 3;
  draft.world.temperature = Math.min(TEMP_MAX, Math.max(TEMP_MIN, draft.world.temperature + drift));
  events.push({ type: "worldChanged", temperature: draft.world.temperature });

  const order: Side[] = draft.player.speed >= draft.enemy.speed ? ["player", "enemy"] : ["enemy", "player"];
  for (const side of order) {
    if (draft.outcome !== "ongoing") break;
    events.push(...act(draft, side, action.code, deps));
  }

  if (draft.outcome === "ongoing") {
    const p = draft.player;
    const mana = Math.min(MANA_REGEN, p.maxMana - p.mana);
    if (mana > 0) {
      p.mana += mana;
      events.push({ type: "regen", who: "player", amount: mana, resource: "mana" });
    }
    const energy = Math.min(ENERGY_REGEN, p.maxEnergy - p.energy);
    if (energy > 0) {
      p.energy += energy;
      events.push({ type: "regen", who: "player", amount: energy, resource: "energy" });
    }
    draft.turn++;
  }
  draft.itemUsedThisTurn = false;
  return { state: draft, events };
}

/** The Item menu: use one item right now. It doesn't end the turn, but it is the turn's one item. */
export function useItemNow(s: BattleState, itemId: string): { state: BattleState; events: BattleEvent[] } {
  const draft = structuredClone(s);
  const events = applyIntents(draft, "player", [], [{ item: itemId }]);
  return { state: draft, events };
}

function act(draft: BattleState, side: Side, playerCode: string, deps: TurnDeps): BattleEvent[] {
  const def = ENEMIES[draft.enemyId];
  const isPlayer = side === "player";
  const actions = isPlayer ? draft.knownAbilities : def.abilities;
  const rolls = isPlayer ? [] : [deps.rng(), deps.rng(), deps.rng()];
  const items = isPlayer ? draft.items : [];
  const result = deps.runCode(isPlayer ? playerCode : def.script, snapshotFor(draft, side), { actions, rolls, items });
  const logs: BattleEvent[] = isPlayer ? result.logs.map((text) => ({ type: "log", who: side, text })) : [];
  if (!result.ok) return [...logs, { type: "codeError", who: side, message: result.error }];
  if (!result.intents.length) return [...logs, { type: "noAction", who: side }];
  return [...logs, ...applyIntents(draft, side, actions, result.intents)];
}
