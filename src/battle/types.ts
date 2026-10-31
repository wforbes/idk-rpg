export type Scalar = number | string | boolean;

/** What a combatant can "sense" when its code runs. Read-only inside the sandbox. */
export interface Snapshot {
  self: Record<string, Scalar>;
  world: Record<string, Scalar>;
  enemy: Record<string, Scalar>;
}

/** Something the code asked to do, e.g. ember(4) → { spell: "ember", fuel: 4 }. The engine decides if it's legal. */
export interface Intent {
  spell: string;
  fuel?: unknown;
}

export type SandboxResult =
  | { ok: true; intents: Intent[]; logs: string[] }
  | { ok: false; error: string; logs: string[] };

export interface RunOptions {
  /** Function names the code may call; each records an Intent. */
  actions: string[];
  /** Pre-rolled random numbers consumed by chance(p). */
  rolls: number[];
  /** Default 100. */
  timeoutMs?: number;
}

export type RunCode = (code: string, snapshot: Snapshot, opts: RunOptions) => SandboxResult;

export type Side = "player" | "enemy";

export interface Fighter {
  name: string;
  level: number;
  hp: number;
  maxHp: number;
  mana: number;
  maxMana: number;
  speed: number;
  shielded: boolean;
}

export interface BattleState {
  enemyId: string;
  player: Fighter;
  enemy: Fighter;
  world: { temperature: number };
  turn: number;
  outcome: "ongoing" | "won" | "lost" | "fled";
}

export type BattleEvent =
  | { type: "worldChanged"; temperature: number }
  | { type: "codeError"; who: Side; message: string }
  | { type: "noAction"; who: Side }
  | { type: "rejected"; who: Side; spell: string; reason: "unknownSpell" | "extraDamagingCast" | "badFuel" }
  | { type: "notEnoughMana"; who: Side; spell: string; fuel: number; mana: number }
  | { type: "fizzle"; who: Side; spell: string; fuel: number; min: number; max: number }
  | { type: "cast"; who: Side; spell: string; fuel?: number }
  | { type: "blocked"; who: Side; spell: string }
  | { type: "shieldUp"; who: Side }
  | { type: "shieldMelted"; who: Side }
  | { type: "damage"; who: Side; target: Side; amount: number }
  | { type: "regen"; who: Side; amount: number }
  | { type: "fled" }
  | { type: "won" }
  | { type: "lost" };
