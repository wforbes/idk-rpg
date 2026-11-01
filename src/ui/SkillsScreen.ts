import { LEVEL_XP, MODS } from "../data/progression";
import type { GameState } from "../state/gameState";
import { buyMod } from "../state/progression";
import { el, uiRoot } from "./dom";
import "./ui.css";

/** Level, XP, and each known ability's skill points with the mods they can buy. */
export class SkillsScreen {
  private root: HTMLDivElement | null = null;
  private gs: GameState | null = null;
  private selected = 0;
  private message = "";

  get isOpen(): boolean {
    return this.root !== null;
  }

  open(gs: GameState): void {
    this.close();
    this.gs = gs;
    this.selected = 0;
    this.message = "";
    this.root = el("div", "panel skills");
    uiRoot().append(this.root);
    this.render();
  }

  close(): void {
    this.root?.remove();
    this.root = null;
  }

  move(delta: 1 | -1): void {
    const n = this.mods().length;
    if (!n) return;
    this.selected = (this.selected + delta + n) % n;
    this.render();
  }

  /** Tries to buy the selected mod. */
  buy(): void {
    const gs = this.gs;
    const mod = this.mods()[this.selected];
    if (!gs || !mod) return;
    if (gs.mods.includes(mod.id)) this.message = `You already have ${mod.name}.`;
    else if (buyMod(gs, mod.id)) this.message = `Learned ${mod.name}!`;
    else this.message = `Not enough ${mod.ability} points — use ${mod.ability} successfully in battle to earn them.`;
    this.render();
  }

  private mods() {
    const known = this.gs?.knownAbilities ?? [];
    return Object.values(MODS).filter((m) => known.includes(m.ability));
  }

  private render(): void {
    const gs = this.gs;
    if (!this.root || !gs) return;
    const next = LEVEL_XP[gs.level];
    const header = el("p", "skills-level", next === undefined ? `Lv ${gs.level} · XP ${gs.xp} · max level` : `Lv ${gs.level} · XP ${gs.xp} / ${next}`);
    const list = el("ul", "skills-list");
    const mods = this.mods();
    for (const ability of gs.knownAbilities) {
      const pts = gs.skillPoints[ability] ?? 0;
      const own = mods.filter((m) => m.ability === ability);
      list.append(el("li", "skills-ability", `${ability} — ${pts} pt${pts === 1 ? "" : "s"}${own.length ? "" : " · no mods yet"}`));
      for (const m of own) {
        const i = mods.indexOf(m);
        const owned = gs.mods.includes(m.id);
        const status = owned ? "✓" : pts >= m.cost ? "buy" : "";
        const li = el("li", ["skills-mod", i === this.selected ? "selected" : "", owned ? "owned" : ""].join(" ").trim());
        li.append(el("span", "", `${m.name} (${m.cost}) — ${m.description}`), el("span", "skills-status", status));
        li.addEventListener("click", () => {
          this.selected = i;
          this.buy();
        });
        list.append(li);
      }
    }
    this.root.replaceChildren(
      el("h2", "inventory-title", "Skills"),
      header,
      list,
      el("p", "skills-message", this.message),
      el("p", "inventory-hint", "Enter buys · K / Esc to close"),
    );
  }
}
