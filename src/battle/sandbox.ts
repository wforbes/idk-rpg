import variant from "@jitl/quickjs-singlefile-mjs-release-sync";
import {
  newQuickJSWASMModuleFromVariant,
  shouldInterruptAfterDeadline,
  type QuickJSContext,
  type QuickJSHandle,
  type QuickJSWASMModule,
} from "quickjs-emscripten-core";
import type { Intent, RunCode, RunOptions, SandboxResult, Snapshot } from "./types";

const DEFAULT_TIMEOUT_MS = 100;
const MEMORY_LIMIT = 16 * 1024 * 1024;
const MAX_LOG_LINES = 20;
const FILENAME = "spell.js";
/** The strict-mode line we prepend; error line numbers are shifted back by this. */
const PREFIX = '"use strict";\n';
const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;

let sandbox: Promise<{ run: RunCode }> | null = null;

/** Loads QuickJS once; every run gets a fresh, isolated runtime. */
export function getSandbox(): Promise<{ run: RunCode }> {
  sandbox ??= newQuickJSWASMModuleFromVariant(variant).then((qjs) => ({
    run: (code, snapshot, opts) => runIsolated(qjs, code, snapshot, opts),
  }));
  return sandbox;
}

function runIsolated(qjs: QuickJSWASMModule, code: string, snapshot: Snapshot, opts: RunOptions): SandboxResult {
  const runtime = qjs.newRuntime();
  runtime.setMemoryLimit(MEMORY_LIMIT);
  const vm = runtime.newContext();
  let state: QuickJSHandle | undefined;
  try {
    const prelude = vm.evalCode(buildPrelude(snapshot, opts), "prelude.js");
    if (prelude.error) {
      const err = vm.dump(prelude.error);
      prelude.error.dispose();
      throw new Error(`sandbox prelude failed: ${JSON.stringify(err)}`);
    }
    state = prelude.value;

    runtime.setInterruptHandler(shouldInterruptAfterDeadline(Date.now() + (opts.timeoutMs ?? DEFAULT_TIMEOUT_MS)));
    const result = vm.evalCode(PREFIX + code, FILENAME);
    runtime.removeInterruptHandler();

    const logs = readProp<string[]>(vm, state, "logs");
    if (result.error) {
      const err = vm.dump(result.error);
      result.error.dispose();
      return { ok: false, error: formatError(err), logs };
    }
    result.value.dispose();
    return { ok: true, intents: readProp<Intent[]>(vm, state, "intents"), logs };
  } finally {
    state?.dispose();
    vm.dispose();
    runtime.dispose();
  }
}

function readProp<T>(vm: QuickJSContext, obj: QuickJSHandle, name: string): T {
  const handle = vm.getProp(obj, name);
  try {
    return vm.dump(handle) as T;
  } finally {
    handle.dispose();
  }
}

function formatError(err: unknown): string {
  const e = (err ?? {}) as { name?: string; message?: string; stack?: string };
  if (e.name === "InternalError" && /interrupted/.test(e.message ?? "")) {
    return "Your code ran too long — is there a loop that never ends?";
  }
  const name = e.name ?? "Error";
  const message = e.message ?? String(err);
  const match = new RegExp(`${FILENAME.replace(".", "\\.")}:(\\d+)`).exec(e.stack ?? "");
  const line = match ? Number(match[1]) - 1 : null;
  return line && line > 0 ? `${name}: ${message} (line ${line})` : `${name}: ${message}`;
}

/**
 * Runs inside QuickJS before the player's code. Defines the read-only awareness globals,
 * the action functions that record intents, chance(), and console.log. Returns {intents, logs}.
 */
function buildPrelude(snapshot: Snapshot, opts: RunOptions): string {
  for (const name of opts.actions) {
    if (!IDENTIFIER.test(name)) throw new Error(`bad action name: ${name}`);
  }
  return `(() => {
  "use strict";
  const snap = ${JSON.stringify(snapshot)};
  const rolls = ${JSON.stringify(opts.rolls)};
  const actions = ${JSON.stringify(opts.actions)};
  const intents = [];
  const logs = [];

  const readOnly = (scope, data) => {
    const o = {};
    for (const k of Object.keys(data)) {
      Object.defineProperty(o, k, {
        enumerable: true,
        get: () => data[k],
        set: () => { throw new TypeError(scope + "." + k + " is read-only — you can sense it, but you can't change it."); },
      });
    }
    return Object.freeze(o);
  };
  const define = (name, value) =>
    Object.defineProperty(globalThis, name, { value, writable: false, enumerable: false, configurable: false });

  define("self", readOnly("self", snap.self));
  define("world", readOnly("world", snap.world));
  define("enemy", readOnly("enemy", snap.enemy));

  // Only plain values cross back to the game; anything else becomes null (the engine rejects it).
  const plain = (v) => (typeof v === "number" || typeof v === "string" || typeof v === "boolean" ? v : null);
  for (const name of actions) {
    define(name, function (fuel) {
      const intent = { spell: name };
      if (arguments.length > 0) intent.fuel = plain(fuel);
      intents.push(intent);
    });
  }

  define("chance", (p) => (rolls.length ? rolls.shift() : 0.5) < p);

  const show = (v) => {
    if (typeof v === "string") return v;
    try { return JSON.stringify(v) ?? String(v); } catch (e) { return String(v); }
  };
  define("console", Object.freeze({
    log: (...args) => { if (logs.length < ${MAX_LOG_LINES}) logs.push(args.map(show).join(" ")); },
  }));

  return { intents, logs };
})()`;
}
