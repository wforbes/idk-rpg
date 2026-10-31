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
