import { ITEMS } from "../data/items";
import { el, uiRoot } from "./dom";
import "./ui.css";

/** Bag panel: item names on the left, the selected item's description on the right. */
export class InventoryScreen {
  private root: HTMLDivElement | null = null;
  private items: string[] = [];
  private selected = 0;

  get isOpen(): boolean {
    return this.root !== null;
  }

  open(items: string[]): void {
    this.close();
    this.items = items;
    this.selected = 0;
    this.root = el("div", "panel inventory");
    uiRoot().append(this.root);
    this.render();
  }

  close(): void {
    this.root?.remove();
    this.root = null;
  }

  move(delta: 1 | -1): void {
    const n = this.items.length;
    if (!n) return;
    this.selected = (this.selected + delta + n) % n;
    this.render();
  }

  private render(): void {
    if (!this.root) return;
    const title = el("h2", "inventory-title", "Bag");
    if (!this.items.length) {
      this.root.replaceChildren(title, el("p", "inventory-empty", "Your bag is empty."));
      return;
    }
    const list = el("ul", "inventory-list");
    this.items.forEach((id, i) => {
      const li = el("li", i === this.selected ? "selected" : "", ITEMS[id]?.name ?? id);
      li.addEventListener("click", () => {
        this.selected = i;
        this.render();
      });
      list.append(li);
    });
    const desc = el("p", "inventory-desc", ITEMS[this.items[this.selected]]?.description ?? "");
    const hint = el("p", "inventory-hint", "I / Esc to close");
    this.root.replaceChildren(title, el("div", "inventory-body"), hint);
    this.root.querySelector(".inventory-body")!.append(list, desc);
  }
}
