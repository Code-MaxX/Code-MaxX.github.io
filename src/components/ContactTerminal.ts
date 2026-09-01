/**
 * ContactTerminal — the last panel of the system.
 *
 * The command line types itself once, when the terminal comes into view, and
 * the channels appear as its output. Why it moves: the section is framed as a
 * connection being opened, and the typing is the moment it opens.
 */

import { device } from "@/core/device";
import { qs, qsa } from "@/core/dom";
import { scrambleOnView } from "@/core/scramble";

export function initTextEffects(): void {
  // Section indices decrypt on approach — short technical strings only.
  for (const node of qsa<HTMLElement>("[data-scramble]")) {
    scrambleOnView(node, { speed: 0.9, stagger: 1.1 });
  }
}

export function initContactTerminal(): void {
  const terminal = qs("[data-terminal]");
  const line = terminal ? qs<HTMLElement>("[data-terminal-type]", terminal) : null;
  if (!terminal || !line) return;

  const text = line.textContent ?? "";
  if (device.reducedMotion || typeof IntersectionObserver === "undefined") return;

  line.textContent = "";
  line.classList.add("is-typing");

  let started = false;
  const begin = (): void => {
    if (started) return;
    started = true;
    observer.disconnect();
    type(line, text);
  };

  const observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting)) begin();
    },
    { threshold: 0.35 },
  );
  observer.observe(terminal);

  // Failsafe: an empty prompt is worse than one that typed itself unseen.
  window.setTimeout(begin, 12000);
}

function type(node: HTMLElement, text: string): void {
  let index = 0;
  const step = (): void => {
    index += 1;
    node.textContent = text.slice(0, index);
    if (index < text.length) {
      // Slight jitter: a constant interval reads as a marquee, not a keyboard.
      window.setTimeout(step, 34 + Math.random() * 46);
    } else {
      window.setTimeout(() => node.classList.remove("is-typing"), 1400);
    }
  };
  window.setTimeout(step, 240);
}
