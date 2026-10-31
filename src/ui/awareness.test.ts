import { describe, expect, test } from "vitest";
import type { Snapshot } from "../battle/types";
import { awarenessRows } from "./awareness";

const snap: Snapshot = {
  self: { hp: 24, maxHp: 30, mana: 7, maxMana: 10 },
  world: { temperature: 31 },
  enemy: { name: "Bugblob", hp: 24, maxHp: 24, shielded: false },
};

describe("awarenessRows", () => {
  test("world tab lists temperature", () => {
    expect(awarenessRows(snap, "world")).toEqual([{ label: "world.temperature", value: "31" }]);
  });

  test("strings are quoted", () => {
    expect(awarenessRows(snap, "enemy")[0]).toEqual({ label: "enemy.name", value: '"Bugblob"' });
  });

  test("booleans shown as true or false", () => {
    expect(awarenessRows(snap, "enemy").find((r) => r.label === "enemy.shielded")?.value).toBe("false");
  });

  test("rows keep the snapshot's order", () => {
    expect(awarenessRows(snap, "self").map((r) => r.label)).toEqual(["self.hp", "self.maxHp", "self.mana", "self.maxMana"]);
  });
});
