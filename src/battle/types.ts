export type Scalar = number | string | boolean;

/** What a combatant can "sense" when its code runs. Read-only inside the sandbox. */
export interface Snapshot {
  self: Record<string, Scalar>;
  world: Record<string, Scalar>;
  enemy: Record<string, Scalar>;
}

/**
 * Something the code asked to do, e.g. ember(4) → { spell: "ember", fuel: 4 },
 * or spaceHeater.use() → { item: "spaceHeater" }. The engine decides if it's legal.
 */
export type Intent = { spell: string; fuel?: unknown } | { item: string };

export type SandboxResult =
  | { ok: true; intents: Intent[]; logs: string[] }
  | { ok: false; error: string; logs: string[] };

export interface RunOptions {
  /** Function names the code may call; each records an Intent. */
  actions: string[];
  /** Pre-rolled random numbers consumed by chance(p). */
  rolls: number[];
  /** Items the code may use; each becomes a read-only global with a use() method. */
  items?: string[];
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
  energy: number;
  maxEnergy: number;
  speed: number;
  shielded: boolean;
  /** Physical moves miss while this is set. */
  dodging: boolean;
  /** Timed statuses: turns remaining. */
  statuses: Partial<Record<StatusName, number>>;
  /** Fixed quirks from the enemy definition. */
  traits: FighterTraits;
  /** Will to fight; at 0 the fighter gives up. maxResolve 0 = never gives up (the player). */
  resolve: number;
  maxResolve: number;
}

export type StatusName = "chilled" | "scared";

export interface FighterTraits {
  /** Can't be chilled. */
  chillImmune?: boolean;
  /** Takes half damage from frostbite. */
  frostHalf?: boolean;
  /** Extra fire damage taken while the air is hot. */
  hotFireBonus?: number;
}

export type Resource = "mana" | "energy";

export interface BattleState {
  enemyId: string;
  player: Fighter;
  enemy: Fighter;
  world: { temperature: number };
  turn: number;
  outcome: "ongoing" | "won" | "lost" | "fled";
  /** The player's callable abilities this battle. */
  knownAbilities: string[];
  /** The player's bought modifications (Task 6 fills these). */
  mods: string[];
  /** The player's battle-usable items; a consumable appears once per copy. */
  items: string[];
  /** One item per turn, whether from the Item menu or from code. */
  itemUsedThisTurn: boolean;
  /** Consumables used up this battle, in order — removed from the bag afterwards. */
  consumed: string[];
}

export type BattleEvent =
  | { type: "worldChanged"; temperature: number }
  | { type: "codeError"; who: Side; message: string }
  | { type: "noAction"; who: Side }
  | { type: "rejected"; who: Side; spell: string; reason: "unknownSpell" | "extraAction" | "badFuel" }
  | { type: "notEnoughFuel"; who: Side; spell: string; fuel: number; have: number; resource: Resource }
  | { type: "fizzle"; who: Side; spell: string; fuel: number; min: number; max: number; resource: Resource }
  | { type: "cast"; who: Side; spell: string; fuel?: number; resource?: Resource }
  | { type: "blocked"; who: Side; spell: string }
  | { type: "missed"; who: Side; spell: string }
  | { type: "shieldUp"; who: Side }
  | { type: "shieldMelted"; who: Side }
  | { type: "damage"; who: Side; target: Side; amount: number }
  | { type: "regen"; who: Side; amount: number; resource: Resource }
  | { type: "log"; who: Side; text: string }
  | { type: "statusApplied"; who: Side; status: StatusName; turns: number }
  | { type: "statusEnded"; who: Side; status: StatusName }
  | { type: "immune"; who: Side; status: StatusName }
  | { type: "resolveLost"; who: Side; amount: number }
  /** The enemy's will ran out — a win, distinct from a knockout ("won"). */
  | { type: "gaveUp" }
  | { type: "itemUsed"; who: Side; item: string }
  | { type: "itemRejected"; who: Side; item: string; reason: "extraItem" | "notOwned" }
  | { type: "temperatureRaised"; temperature: number }
  | { type: "restored"; who: Side; resource: Resource; amount: number }
  | { type: "fled" }
  | { type: "won" }
  | { type: "lost" };
