/** Minimal typed DOM helpers. Deliberately tiny — no framework tax. */

export const qs = <T extends Element = HTMLElement>(
  selector: string,
  scope: ParentNode = document,
): T | null => scope.querySelector<T>(selector);

export const qsa = <T extends Element = HTMLElement>(
  selector: string,
  scope: ParentNode = document,
): T[] => Array.from(scope.querySelectorAll<T>(selector));

type Attrs = Record<string, string | number | boolean | undefined>;

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Attrs = {},
  children: (Node | string)[] = [],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  applyAttrs(node, attrs);
  append(node, children);
  return node;
}

const SVG_NS = "http://www.w3.org/2000/svg";

export function svg<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Attrs = {},
  children: (Node | string)[] = [],
): SVGElementTagNameMap[K] {
  const node = document.createElementNS(SVG_NS, tag);
  applyAttrs(node, attrs);
  append(node, children);
  return node;
}

function applyAttrs(node: Element, attrs: Attrs): void {
  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === false) continue;
    node.setAttribute(key, value === true ? "" : String(value));
  }
}

function append(node: Element, children: (Node | string)[]): void {
  for (const child of children) {
    node.append(typeof child === "string" ? document.createTextNode(child) : child);
  }
}

/** Escape untrusted-ish strings before they touch innerHTML. */
export const escapeHtml = (value: string): string =>
  value.replace(/[&<>"']/g, (ch) =>
    ch === "&" ? "&amp;"
    : ch === "<" ? "&lt;"
    : ch === ">" ? "&gt;"
    : ch === '"' ? "&quot;"
    : "&#39;",
  );

/** requestAnimationFrame that resolves once — useful before measuring. */
export const nextFrame = (): Promise<void> =>
  new Promise((resolve) => requestAnimationFrame(() => resolve()));

export function on<K extends keyof WindowEventMap>(
  target: Window,
  type: K,
  handler: (ev: WindowEventMap[K]) => void,
  options?: AddEventListenerOptions,
): () => void;
export function on<K extends keyof DocumentEventMap>(
  target: Document,
  type: K,
  handler: (ev: DocumentEventMap[K]) => void,
  options?: AddEventListenerOptions,
): () => void;
export function on<K extends keyof HTMLElementEventMap>(
  target: HTMLElement,
  type: K,
  handler: (ev: HTMLElementEventMap[K]) => void,
  options?: AddEventListenerOptions,
): () => void;
export function on(
  target: EventTarget,
  type: string,
  handler: EventListenerOrEventListenerObject,
  options?: AddEventListenerOptions,
): () => void {
  target.addEventListener(type, handler, options);
  return () => target.removeEventListener(type, handler, options);
}

/** Focus trap for modal surfaces (command palette, case-study overlay). */
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), textarea, select, [tabindex]:not([tabindex="-1"])';

export function trapFocus(container: HTMLElement, event: KeyboardEvent): void {
  const nodes = qsa<HTMLElement>(FOCUSABLE, container).filter(
    (node) => node.offsetParent !== null || node === document.activeElement,
  );
  if (nodes.length === 0) return;
  const first = nodes[0]!;
  const last = nodes[nodes.length - 1]!;
  const active = document.activeElement;
  if (event.shiftKey && active === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && active === last) {
    event.preventDefault();
    first.focus();
  }
}
