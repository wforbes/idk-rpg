import { beforeAll, describe, expect, test } from "vitest";
import { getSandbox } from "./sandbox";
import type { RunCode, Snapshot } from "./types";

const snapshot: Snapshot = { self: { mana: 7 }, world: { temperature: 31 }, enemy: { hp: 24, shielded: false } };
const opts = { actions: ["ember"], rolls: [] as number[] };

let run: RunCode;
beforeAll(async () => {
  run = (await getSandbox()).run;
});

const ok = (code: string, o = opts) => {
  const r = run(code, snapshot, o);
  if (!r.ok) throw new Error(`expected ok, got: ${r.error}`);
  return r;
};
const fail = (code: string) => {
  const r = run(code, snapshot, opts);
  if (r.ok) throw new Error("expected an error");
  return r;
};

describe("sandbox", () => {
  test("records intents", () => {
    expect(ok("ember(4)").intents).toEqual([{ spell: "ember", fuel: 4 }]);
  });

  test("reads awareness", () => {
    expect(ok("ember(world.temperature > 25 ? 5 : 3)").intents).toEqual([{ spell: "ember", fuel: 5 }]);
  });

  test("awareness is read-only", () => {
    expect(fail("enemy.hp = 0").error).toMatch(/enemy\.hp is read-only/);
  });

  test("cannot add properties to awareness", () => {
    expect(fail("enemy.weakness = 'fire'").ok).toBe(false);
  });

  test("cannot replace awareness", () => {
    expect(fail("enemy = {}").ok).toBe(false);
  });

  test("syntax error reports line", () => {
    expect(fail("ember(4)\nember((").error).toMatch(/SyntaxError.*line 2/);
  });

  test("runtime error reports line", () => {
    expect(fail("ember(4);\nnotAFunction();").error).toMatch(/ReferenceError.*notAFunction.*line 2/);
  });

  test("infinite loop is stopped", () => {
    const started = Date.now();
    expect(fail("while(true){}").error).toMatch(/ran too long/);
    expect(Date.now() - started).toBeLessThan(1000);
  });

  test("console.log is captured", () => {
    expect(ok('console.log("hi", 2)').logs).toEqual(["hi 2"]);
  });

  test("logs survive an error", () => {
    expect(fail('console.log("before"); throw new Error("boom")').logs).toEqual(["before"]);
  });

  test("chance uses rolls", () => {
    const r = ok("if (chance(0.5)) ember(3); if (chance(0.5)) ember(4);", { actions: ["ember"], rolls: [0.1, 0.9] });
    expect(r.intents).toEqual([{ spell: "ember", fuel: 3 }]);
  });

  test("non-number fuel is passed through for the engine to judge", () => {
    expect(ok('ember("5")').intents).toEqual([{ spell: "ember", fuel: "5" }]);
    expect(ok("ember()").intents).toEqual([{ spell: "ember" }]);
  });

  test("no host access", () => {
    const r = ok('ember(typeof window === "undefined" && typeof fetch === "undefined" && typeof require === "undefined" ? 1 : 0)');
    expect(r.intents[0].fuel).toBe(1);
  });

  test("runs are isolated", () => {
    ok("globalThis.x = 1");
    expect(ok('ember(typeof x === "undefined" ? 1 : 0)').intents[0].fuel).toBe(1);
  });
});
