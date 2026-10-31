import type { DialogueRunner } from "../dialogue/runner";
import { el, uiRoot } from "./dom";
import "./ui.css";

/** Bottom-of-screen dialogue panel. Renders whatever state the runner is in. */
export class DialogueBox {
  private root: HTMLDivElement | null = null;
  private text!: HTMLParagraphElement;
  private choices!: HTMLUListElement;
  private hint!: HTMLDivElement;
  private runner: DialogueRunner | null = null;

  constructor(private readonly onChoiceClick: (index: number) => void) {}

  open(runner: DialogueRunner): void {
    this.close();
    this.runner = runner;
    this.root = el("div", "panel dialogue");
    this.text = el("p", "dialogue-text");
    this.choices = el("ul", "dialogue-choices");
    this.hint = el("div", "dialogue-hint", "▼");
    this.root.append(this.text, this.choices, this.hint);
    uiRoot().append(this.root);
    this.render();
  }

  close(): void {
    this.root?.remove();
    this.root = null;
    this.runner = null;
  }

  render(): void {
    const r = this.runner;
    if (!r || !this.root) return;
    this.text.textContent = r.visibleText;
    const choices = r.choices;
    this.choices.replaceChildren(
      ...choices.map((c, i) => {
        const li = el("li", i === r.selected ? "selected" : "", c.label);
        li.addEventListener("click", () => this.onChoiceClick(i));
        return li;
      }),
    );
    // The ▼ "more" hint shows when text is fully typed and there are no choices to make.
    this.hint.hidden = r.isTyping || choices.length > 0;
  }
}
