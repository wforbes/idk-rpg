import { indentWithTab } from "@codemirror/commands";
import { javascript } from "@codemirror/lang-javascript";
import { keymap } from "@codemirror/view";
import { oneDark } from "@codemirror/theme-one-dark";
import { basicSetup, EditorView } from "codemirror";
import { ABILITIES, fuelWindow } from "../battle/abilities";
import { ENEMIES } from "../battle/enemies";
import { BATTLE_ITEMS } from "../battle/items";
import { ITEMS } from "../data/items";
import { precheck, snapshotFor } from "../battle/engine";
import type { BattleState, RunCode } from "../battle/types";
import { awarenessRows, type AwarenessTab } from "./awareness";
import { el, uiRoot } from "./dom";
import "./castingOverlay.css";

export type SpellbookTab = "moves" | "spells" | "items";

export interface CastingOverlayOptions {
  state: BattleState;
  /** Which spellbook tab opens first (Attack → moves, Spell → spells). Everything known is callable either way. */
  tab: SpellbookTab;
  initialCode: string;
  runCode: RunCode;
  onCast(code: string): void;
  onBack(): void;
}

/**
 * The spellbook overlay: tell, code editor, spellbook, awareness panel, Cast / Back.
 * Cast runs a dry-run precheck; mistakes stay here and cost no turn.
 */
export function openCastingOverlay(opts: CastingOverlayOptions): { close(): void } {
  const { state } = opts;
  const snapshot = snapshotFor(state, "player");

  const backdrop = el("div", "casting-backdrop");
  const book = el("div", "casting");
  backdrop.append(book);

  const tell = el("div", "casting-tell", ENEMIES[state.enemyId].tell(state));

  const editorHost = el("div", "casting-editor");

  const spellbook = el("div", "casting-col casting-book");
  const bookTabs = el("div", "aware-tabs");
  const bookEntries = el("div", "book-entries");
  let bookTab: SpellbookTab = opts.tab;
  const renderBook = () => {
    bookTabs.replaceChildren(
      ...(["moves", "spells", "items"] as const).map((t) => {
        const b = el("button", t === bookTab ? "on" : "", { moves: "Moves", spells: "Spells", items: "Items" }[t]);
        b.type = "button";
        b.addEventListener("click", () => {
          bookTab = t;
          renderBook();
        });
        return b;
      }),
    );
    if (bookTab === "items") {
      const counts = new Map<string, number>();
      for (const id of state.items) counts.set(id, (counts.get(id) ?? 0) + 1);
      bookEntries.replaceChildren(
        ...(counts.size
          ? [...counts].map(([id, n]) => {
              const entry = el("div", "spell");
              entry.append(el("code", "", BATTLE_ITEMS[id].call));
              const count = BATTLE_ITEMS[id].consumable ? ` ×${n}` : "";
              entry.append(el("p", "", `${ITEMS[id]?.name ?? id}${count} · ${BATTLE_ITEMS[id].notes}`));
              return entry;
            })
          : [el("p", "", "No battle items in your bag.")]),
      );
      return;
    }
    const wanted = bookTab === "spells" ? ["spell"] : ["move", "other"];
    const ids = state.knownAbilities.filter((id) => ABILITIES[id] && wanted.includes(ABILITIES[id].kind));
    bookEntries.replaceChildren(
      ...(ids.length ? ids : [""]).map((id) => {
        const entry = el("div", "spell");
        if (!id) {
          entry.append(el("p", "", "Nothing here yet."));
          return entry;
        }
        const ability = ABILITIES[id];
        entry.append(el("code", "", ability.signature));
        let window = "";
        if (ability.fuel) {
          const { min, max } = fuelWindow(state, "player", ability);
          window = `${min}–${max} ${ability.fuel.resource === "mana" ? "MP" : "EN"} · `;
        }
        entry.append(el("p", "", `${window}${ability.notes}`));
        return entry;
      }),
    );
  };
  renderBook();
  spellbook.append(el("h3", "", "Spellbook"), bookTabs, bookEntries);

  const aware = el("div", "casting-col casting-aware");
  const tabs = el("div", "aware-tabs");
  const rows = el("dl", "aware-rows");
  let tab: AwarenessTab = "enemy";
  const renderAwareness = () => {
    tabs.replaceChildren(
      ...(["self", "world", "enemy"] as const).map((t) => {
        const b = el("button", t === tab ? "on" : "", t);
        b.type = "button";
        b.addEventListener("click", () => {
          tab = t;
          renderAwareness();
        });
        return b;
      }),
    );
    rows.replaceChildren(
      ...awarenessRows(snapshot, tab).flatMap((r) => [el("dt", "", r.label), el("dd", "", r.value)]),
    );
  };
  renderAwareness();
  aware.append(el("h3", "", "Awareness"), tabs, rows);

  const status = el("div", "casting-status");
  const message = el("div", "casting-message");
  const mp = el("span", "casting-mp", `MP ${state.player.mana}/${state.player.maxMana} · EN ${state.player.energy}/${state.player.maxEnergy}`);
  const back = el("button", "casting-back", "Back");
  const castBtn = el("button", "casting-cast", "▶ Cast");
  back.title = "Esc";
  castBtn.title = "Ctrl+Enter";
  back.type = castBtn.type = "button";
  const buttons = el("div", "casting-buttons");
  buttons.append(mp, back, castBtn);
  status.append(message, el("div", "casting-hint", "Ctrl+Enter casts · Esc goes back"), buttons);

  book.append(tell, editorHost, spellbook, aware, status);
  uiRoot().append(backdrop);

  const cast = () => {
    const code = editor.state.doc.toString();
    const result = precheck(state, code, opts.runCode);
    if (result.ok) {
      close();
      opts.onCast(code);
      return true;
    }
    message.replaceChildren(
      el("div", "casting-error", result.message),
      ...result.logs.map((l) => el("div", "casting-log", `console.log: ${l}`)),
    );
    return true;
  };
  const goBack = () => {
    close();
    opts.onBack();
    return true;
  };

  const editor = new EditorView({
    doc: opts.initialCode,
    parent: editorHost,
    extensions: [
      keymap.of([
        { key: "Mod-Enter", run: cast },
        { key: "Escape", run: goBack },
      ]),
      basicSetup,
      keymap.of([indentWithTab]),
      javascript(),
      oneDark,
      EditorView.lineWrapping,
    ],
  });

  // Esc / Ctrl+Enter also work when focus is on a button or tab rather than the editor.
  const onKey = (e: KeyboardEvent) => {
    if (e.target instanceof Element && e.target.closest(".cm-editor")) return;
    if (e.key === "Escape") goBack();
    else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) cast();
  };
  backdrop.addEventListener("keydown", onKey);
  back.addEventListener("click", goBack);
  castBtn.addEventListener("click", cast);

  // Put the cursor at the end so the player can start typing right away.
  editor.focus();
  editor.dispatch({ selection: { anchor: editor.state.doc.length } });

  let closed = false;
  function close() {
    if (closed) return;
    closed = true;
    editor.destroy();
    backdrop.remove();
  }
  return { close };
}
