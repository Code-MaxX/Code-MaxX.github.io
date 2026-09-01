/**
 * Declarative reveal choreography.
 *
 * Markup opts in with `data-reveal`; CSS holds the hidden state, but only
 * while <html> carries `.js-motion`. If this module never runs — script error,
 * blocked bundle, ancient browser — nothing is hidden and the page reads fine.
 * Animation is enhancement; the content is never gated behind it.
 */

import { device } from "./device";
import { qsa } from "./dom";

const REVEALED = "is-revealed";
const FAILSAFE_MS = 5000;

let observer: IntersectionObserver | null = null;

export function initReveal(): void {
  const targets = qsa("[data-reveal]");
  if (targets.length === 0) return;

  if (device.reducedMotion || typeof IntersectionObserver === "undefined") {
    revealAll();
    return;
  }

  // Stagger index per group, resolved once so CSS can offset by --reveal-i.
  for (const group of qsa("[data-reveal-group]")) {
    qsa("[data-reveal]", group).forEach((child, index) => {
      child.style.setProperty("--reveal-i", String(index));
    });
  }

  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add(REVEALED);
        observer?.unobserve(entry.target);
      }
    },
    { rootMargin: "0px 0px -12% 0px", threshold: 0.08 },
  );

  for (const target of targets) observer.observe(target);

  // Anything still hidden after the failsafe window gets shown regardless.
  window.setTimeout(revealAll, FAILSAFE_MS);
}

export function revealAll(): void {
  for (const target of qsa("[data-reveal]")) target.classList.add(REVEALED);
  observer?.disconnect();
  observer = null;
}

/** Register nodes added after boot (case-study overlay, palette results). */
export function observeReveal(root: ParentNode): void {
  const targets = qsa("[data-reveal]", root);
  if (!observer) {
    for (const target of targets) target.classList.add(REVEALED);
    return;
  }
  for (const target of targets) observer.observe(target);
}
