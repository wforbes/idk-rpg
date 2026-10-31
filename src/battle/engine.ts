import type { PlayerStats } from "../state/gameState";
import { applyIntents } from "./applyIntents";
import { ENEMIES, PLAYER_ABILITIES } from "./enemies";
import type { BattleEvent, BattleState, RunCode, Side, Snapshot } from "./types";

export type PlayerAction = { kind: "cast"; code: string } | { kind: "run" };

export interface TurnDeps {
  runCode: RunCode;
  rng: () => number;
}

export const START_TEMPERATURE = 24;
export const TEMP_MIN = 18;
export const TEMP_MAX = 32;
export const MANA_REGEN = 2;

export function createBattle(enemyId: string, player: PlayerStats): BattleState {
  const def = ENEMIES[enemyId];
  if (!def) throw new Error(`unknown enemy: ${enemyId}`);
  return {
    enemyId,
    player: { name: "You", level: 1, ...player, shielded: false },
    enemy: { name: def.name, level: def.level, hp: def.maxHp, maxHp: def.maxHp, mana: 0, maxMana: 0, speed: def.speed, shielded: false },
    world: { temperature: START_TEMPERATURE },
    turn: 1,
    outcome: "ongoing",
  };
}

/** What each side can sense. Values are copied, so code never touches the live state. */
export function snapshotFor(s: BattleState, side: Side): Snapshot {
  const world = { temperature: s.world.temperature };
  if (side === "player") {
    const { player: p, enemy: e } = s;
    return {
      self: { hp: p.hp, maxHp: p.maxHp, mana: p.mana, maxMana: p.maxMana },
      world,
      enemy: { name: e.name, hp: e.hp, maxHp: e.maxHp, shielded: e.shielded },
    };
  }
  const { enemy: e, player: p } = s;
  return {
    self: { name: e.name, hp: e.hp, maxHp: e.maxHp, shielded: e.shielded },
    world,
    enemy: { hp: p.hp, maxHp: p.maxHp, mana: p.mana },
  };
}

/**
 * Dry run when the player presses Cast: catches mistakes that should send them back to
 * the editor without losing the turn. A fizzle is allowed — learning the window is part of play.
 */
export function precheck(s: BattleState, code: string, runCode: RunCode): { ok: true } | { ok: false; message: string } {
  const result = runCode(code, snapshotFor(s, "player"), { actions: PLAYER_ABILITIES, rolls: [] });
  if (!result.ok) return { ok: false, message: result.error };
  if (!result.intents.length) return { ok: false, message: "Your code didn't cast anything. Try calling ember(…) with some mana." };

  for (const e of applyIntents(structuredClone(s), "player", PLAYER_ABILITIES, result.intents)) {
    if (e.type === "rejected" && e.reason === "extraDamagingCast") return { ok: false, message: "Only one damaging spell per turn." };
    if (e.type === "rejected" && e.reason === "badFuel") {
      return { ok: false, message: `${e.spell} needs a whole number of mana, like ${e.spell}(4).` };
    }
    if (e.type === "rejected") return { ok: false, message: `You don't know a spell called ${e.spell} yet.` };
    if (e.type === "notEnoughMana") {
      return { ok: false, message: `Not enough mana: ${e.spell}(${e.fuel}) needs ${e.fuel} MP and you have ${e.mana}.` };
    }
  }
  return { ok: true };
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
    const amount = Math.min(MANA_REGEN, draft.player.maxMana - draft.player.mana);
    if (amount > 0) {
      draft.player.mana += amount;
      events.push({ type: "regen", who: "player", amount });
    }
    draft.turn++;
  }
  return { state: draft, events };
}

function act(draft: BattleState, side: Side, playerCode: string, deps: TurnDeps): BattleEvent[] {
  const def = ENEMIES[draft.enemyId];
  const isPlayer = side === "player";
  const actions = isPlayer ? PLAYER_ABILITIES : def.abilities;
  const rolls = isPlayer ? [] : [deps.rng(), deps.rng(), deps.rng()];
  const result = deps.runCode(isPlayer ? playerCode : def.script, snapshotFor(draft, side), { actions, rolls });
  if (!result.ok) return [{ type: "codeError", who: side, message: result.error }];
  if (!result.intents.length) return [{ type: "noAction", who: side }];
  return applyIntents(draft, side, actions, result.intents);
}
