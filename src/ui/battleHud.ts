import type { BattleView } from "../battle/view";
import { el, uiRoot } from "./dom";
import "./battle.css";

export type MenuChoice = "attack" | "spell" | "item" | "taunt" | "run";

const MENU: { id: MenuChoice; label: string }[] = [
  { id: "attack", label: "Attack" },
  { id: "spell", label: "Spell" },
  { id: "item", label: "Item" },
  { id: "taunt", label: "Taunt" },
  { id: "run", label: "Run" },
];

const ADVANCE_KEYS = new Set([" ", "Enter", "e", "E"]);

/**
 * The battle's DOM boxes: enemy stats (top-left), player stats (right), and the bottom bar
 * that shows either narration or the action menu (bottom-right). Owns its own keyboard input.
 */
export class BattleHud {
  private root = el("div", "battle-hud");
  private enemyName = el("div", "battle-name");
  private enemyHp = bar("hp");
  private enemyTags = el("div", "battle-tags");
  private playerHpText = el("span");
  private playerHp = bar("hp");
  private playerMpText = el("span");
  private playerMp = bar("mp");
  private playerEnText = el("span");
  private playerEn = bar("en");
  private text = el("div", "battle-text");
  private menu = el("ul", "battle-menu");
  private onKey: ((e: KeyboardEvent) => void) | null = null;

  constructor(
    names: { enemy: string; level: number },
    private readonly max: { playerHp: number; playerMana: number; playerEnergy: number; enemyHp: number },
  ) {
    const enemyBox = el("div", "panel battle-enemy");
    this.enemyName.textContent = `${names.enemy.toUpperCase()}  Lv${names.level}`;
    enemyBox.append(this.enemyName, this.enemyHp.wrap, this.enemyTags);

    const playerBox = el("div", "panel battle-player");
    playerBox.append(
      row("HP", this.playerHpText), this.playerHp.wrap,
      row("MP", this.playerMpText), this.playerMp.wrap,
      row("EN", this.playerEnText), this.playerEn.wrap,
    );

    const bottom = el("div", "panel battle-bottom");
    bottom.append(this.text, this.menu);

    this.root.append(enemyBox, playerBox, bottom);
    uiRoot().append(this.root);
    window.addEventListener("keydown", this.handleKey);
  }

  update(v: BattleView): void {
    setBar(this.enemyHp, v.enemyHp, this.max.enemyHp);
    this.enemyTags.replaceChildren(...(v.enemyShielded ? [el("span", "tag", "shielded")] : []));
    setBar(this.playerHp, v.playerHp, this.max.playerHp);
    this.playerHpText.textContent = `${v.playerHp}/${this.max.playerHp}`;
    setBar(this.playerMp, v.playerMana, this.max.playerMana);
    this.playerMpText.textContent = `${v.playerMana}/${this.max.playerMana}`;
    setBar(this.playerEn, v.playerEnergy, this.max.playerEnergy);
    this.playerEnText.textContent = `${v.playerEnergy}/${this.max.playerEnergy}`;
  }

  /** Shows one line at a time; each advances on Space/E/Enter or a click. */
  async showMessages(lines: string[], onEachLine?: (index: number) => void): Promise<void> {
    for (let i = 0; i < lines.length; i++) {
      onEachLine?.(i);
      await this.waitForAdvance(lines[i]);
    }
  }

  /** `enabled` lists the options that work right now; the rest show dimmed and explain themselves when picked. */
  showMenu(onPick: (choice: MenuChoice) => void, enabled: ReadonlySet<MenuChoice>): void {
    let selected = MENU.findIndex((m) => m.id === "spell");
    this.root.classList.remove("hidden");
    this.text.textContent = "What will you do?";
    this.text.classList.remove("more");
    this.menu.hidden = false;

    const pick = (i: number) => {
      this.onKey = null;
      this.menu.hidden = true;
      onPick(MENU[i].id);
    };
    const render = () =>
      this.menu.replaceChildren(
        ...MENU.map((m, i) => {
          const li = el("li", [enabled.has(m.id) ? "" : "dimmed", i === selected ? "selected" : ""].join(" ").trim(), m.label);
          li.addEventListener("click", () => this.onKey && pick(i));
          return li;
        }),
      );
    render();

    // Grid is 2 columns: Attack Spell / Item Taunt / Run.
    this.onKey = (e) => {
      const moves: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -2, ArrowDown: 2, a: -1, d: 1, w: -2, s: 2 };
      const delta = moves[e.key];
      if (delta !== undefined) {
        const next = selected + delta;
        if (next >= 0 && next < MENU.length) selected = next;
        else if (delta === 2 && selected < MENU.length - 1) selected = MENU.length - 1; // Taunt ↓ Run
        render();
      } else if (ADVANCE_KEYS.has(e.key) && !e.repeat) {
        pick(selected);
      }
    };
  }

  /** Hide everything (e.g. while the casting overlay is open). */
  setHidden(hidden: boolean): void {
    this.root.classList.toggle("hidden", hidden);
  }

  destroy(): void {
    window.removeEventListener("keydown", this.handleKey);
    this.root.remove();
  }

  private waitForAdvance(line: string): Promise<void> {
    this.menu.hidden = true;
    this.text.textContent = line;
    this.text.classList.add("more");
    return new Promise((resolve) => {
      const done = () => {
        this.onKey = null;
        this.text.removeEventListener("click", done);
        resolve();
      };
      this.text.addEventListener("click", done);
      this.onKey = (e) => {
        if (ADVANCE_KEYS.has(e.key) && !e.repeat) done();
      };
    });
  }

  private handleKey = (e: KeyboardEvent) => {
    if (this.root.classList.contains("hidden") || !this.onKey) return;
    if (e.target instanceof Element && e.target.closest(".cm-editor, input, textarea")) return;
    e.preventDefault();
    this.onKey(e);
  };
}

interface Bar {
  wrap: HTMLDivElement;
  fill: HTMLElement;
}

function bar(kind: "hp" | "mp" | "en"): Bar {
  const wrap = el("div", `bar ${kind}`);
  const fill = el("i");
  wrap.append(fill);
  return { wrap, fill };
}

function setBar(b: Bar, value: number, max: number): void {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  b.fill.style.width = `${pct}%`;
  b.wrap.classList.toggle("low", pct <= 25);
}

function row(label: string, value: HTMLElement): HTMLDivElement {
  const r = el("div", "battle-row");
  r.append(el("span", "", label), value);
  return r;
}
