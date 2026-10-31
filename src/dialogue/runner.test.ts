import { describe, expect, test } from "vitest";
import { DIALOGUES } from "../data/dialogues";
import { DialogueRunner } from "./runner";
import type { Dialogue } from "./types";

const mo = DIALOGUES.mo;
const startText = mo.nodes[mo.start].text;

const finish = (r: DialogueRunner) => {
  while (r.isTyping) r.tick();
};

describe("DialogueRunner", () => {
  test("types one char per tick", () => {
    const r = new DialogueRunner(mo);
    r.tick();
    r.tick();
    r.tick();
    expect(r.visibleText).toBe(startText.slice(0, 3));
    expect(r.isTyping).toBe(true);
  });

  test("press while typing reveals all", () => {
    const r = new DialogueRunner(mo);
    r.tick();
    r.press();
    expect(r.visibleText).toBe(startText);
    expect(r.isTyping).toBe(false);
    expect(r.done).toBe(false);
  });

  test("choices appear only after typing completes", () => {
    const r = new DialogueRunner(mo);
    expect(r.choices).toEqual([]);
    finish(r);
    expect(r.choices.map((c) => c.label)).toEqual(["What's east of here?", "Bye!"]);
  });

  test("move wraps", () => {
    const r = new DialogueRunner(mo);
    finish(r);
    r.move(1);
    expect(r.selected).toBe(1);
    r.move(1);
    expect(r.selected).toBe(0);
    r.move(-1);
    expect(r.selected).toBe(1);
  });

  test("press follows choice", () => {
    const r = new DialogueRunner(mo);
    finish(r);
    r.press(); // "What's east of here?"
    finish(r);
    expect(r.visibleText).toBe(mo.nodes.east.text);
  });

  test("null next ends dialogue", () => {
    const r = new DialogueRunner(mo);
    finish(r);
    r.move(1); // "Bye!"
    r.press();
    expect(r.done).toBe(true);
  });

  test("a node without next or choices ends on press", () => {
    const r = new DialogueRunner(DIALOGUES.lint);
    finish(r);
    r.press();
    expect(r.done).toBe(true);
  });

  test("charsPerTick reveals several characters at once", () => {
    const one: Dialogue = { id: "x", start: "a", nodes: { a: { text: "hello" } } };
    const r = new DialogueRunner(one, 2);
    r.tick();
    expect(r.visibleText).toBe("he");
  });

  test("every DIALOGUES node's next and choice targets exist", () => {
    for (const d of Object.values(DIALOGUES)) {
      expect(d.nodes[d.start], `${d.id} start`).toBeDefined();
      for (const [id, node] of Object.entries(d.nodes)) {
        const targets = [node.next, ...(node.choices ?? []).map((c) => c.next)];
        for (const t of targets) if (t != null) expect(d.nodes[t], `${d.id}.${id} → ${t}`).toBeDefined();
      }
    }
  });
});
