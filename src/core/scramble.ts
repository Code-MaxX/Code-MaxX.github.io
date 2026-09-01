/**
 * Text decryption effect.
 *
 * Why it moves: a label resolving out of noise reads as a value being
 * *computed*, not decorated. Used only on short technical strings — section
 * indices, status lines, node names — never on prose the reader must read.
 */

import { device } from "./device";

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/\\<>[]{}=+*#$%&_";

export type ScrambleOptions = {
  /** Frames each character spends unresolved before locking. */
  speed?: number;
  /** Extra frames of noise proportional to index — creates the sweep. */
  stagger?: number;
};

export function scrambleTo(
  node: HTMLElement,
  text: string,
  { speed = 1, stagger = 1.6 }: ScrambleOptions = {},
): () => void {
  // Writing textContent would delete any element children, so a node that has
  // them is not a scramble target — wrap its text in a span instead.
  if (node.firstElementChild) return () => {};
  if (device.reducedMotion) {
    node.textContent = text;
    return () => {};
  }

  const chars = [...text];
  const resolveAt = chars.map((_, i) => Math.round(i * stagger + 4 * speed));
  const total = Math.max(...resolveAt, 0) + 2;
  let frame = 0;
  let raf = 0;

  const tick = () => {
    let out = "";
    for (let i = 0; i < chars.length; i += 1) {
      const char = chars[i]!;
      if (char === " " || frame >= resolveAt[i]!) {
        out += char;
      } else {
        out += GLYPHS[(Math.random() * GLYPHS.length) | 0];
      }
    }
    node.textContent = out;
    frame += 1;
    if (frame <= total) raf = requestAnimationFrame(tick);
    else node.textContent = text;
  };

  raf = requestAnimationFrame(tick);
  return () => {
    cancelAnimationFrame(raf);
    node.textContent = text;
  };
}

/** Scramble a node's existing text the first time it scrolls into view. */
export function scrambleOnView(node: HTMLElement, options?: ScrambleOptions): void {
  if (device.reducedMotion || typeof IntersectionObserver === "undefined") return;
  if (node.firstElementChild) return;
  const text = node.textContent ?? "";
  if (!text.trim()) return;

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        io.disconnect();
        scrambleTo(node, text, options);
      }
    },
    { threshold: 0.6 },
  );
  io.observe(node);
}
