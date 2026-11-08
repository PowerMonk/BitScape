export type Child = Node | string | number | null | undefined;
type AttrValue = string | number | boolean | ((e: any) => void) | Record<string, string> | null | undefined;
type Attrs = Record<string, AttrValue>;

/**
 * Tiny hyperscript helper — the whole UI is built from this so
 * language switches can rebuild any view from scratch.
 */
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Attrs = {},
  kids: Child[] = [],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') node.className = String(v);
    else if (k === 'text') node.textContent = String(v);
    else if (k === 'html') node.innerHTML = String(v);
    else if (k.startsWith('on') && typeof v === 'function') {
      node.addEventListener(k.slice(2).toLowerCase(), v as EventListener);
    } else if (k === 'dataset' && typeof v === 'object') {
      Object.assign(node.dataset, v as Record<string, string>);
    } else if (v === true) node.setAttribute(k, '');
    else node.setAttribute(k, String(v));
  }
  append(node, kids);
  return node;
}

export function append(parent: Node, kids: Child[]): void {
  for (const k of kids) {
    if (k === null || k === undefined) continue;
    parent.appendChild(typeof k === 'object' ? k : document.createTextNode(String(k)));
  }
}

export function clear(node: Node): void {
  while (node.firstChild) node.removeChild(node.firstChild);
}

export function mount(parent: Node, kids: Child[]): void {
  clear(parent);
  append(parent, kids);
}
