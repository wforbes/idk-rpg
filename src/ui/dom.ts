/** The DOM layer that sits exactly over the game canvas. */
export function uiRoot(): HTMLElement {
  const el = document.getElementById("ui");
  if (!el) throw new Error("#ui element missing");
  return el;
}

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
