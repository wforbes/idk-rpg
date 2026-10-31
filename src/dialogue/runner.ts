import type { Dialogue, DialogueChoice, DialogueNode } from "./types";

/** Steps through a dialogue tree with typewriter text. Pure state; the UI renders it. */
export class DialogueRunner {
  private node: DialogueNode | null;
  private shown = 0;
  private choice = 0;

  constructor(
    private readonly dialogue: Dialogue,
    private readonly charsPerTick = 1,
  ) {
    this.node = dialogue.nodes[dialogue.start];
  }

  get visibleText(): string {
    return this.node ? this.node.text.slice(0, this.shown) : "";
  }

  get isTyping(): boolean {
    return !!this.node && this.shown < this.node.text.length;
  }

  get done(): boolean {
    return this.node === null;
  }

  get choices(): DialogueChoice[] {
    return this.node && !this.isTyping ? (this.node.choices ?? []) : [];
  }

  get selected(): number {
    return this.choice;
  }

  tick(): void {
    if (this.node) this.shown = Math.min(this.node.text.length, this.shown + this.charsPerTick);
  }

  press(): void {
    if (!this.node) return;
    if (this.isTyping) {
      this.shown = this.node.text.length;
      return;
    }
    const choices = this.choices;
    this.goTo(choices.length ? choices[this.choice].next : this.node.next);
  }

  move(delta: 1 | -1): void {
    const n = this.choices.length;
    if (n) this.choice = (this.choice + delta + n) % n;
  }

  private goTo(id: string | null | undefined): void {
    this.node = id == null ? null : this.dialogue.nodes[id];
    this.shown = 0;
    this.choice = 0;
  }
}
