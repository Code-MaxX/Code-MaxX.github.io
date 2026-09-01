/**
 * Boot sequence.
 *
 * The overlay is in the markup and CSS already guarantees it clears itself
 * within 1.4s. This module only makes it feel alive and ends it as soon as the
 * page is genuinely ready — it can shorten the wait, never extend it.
 */

import { device } from "@/core/device";
import { qs, qsa } from "@/core/dom";
import { scrambleTo } from "@/core/scramble";

const MAX_MS = 1400;

export function initBootSequence(): void {
  const boot = qs("#boot");
  if (!boot) return;

  const dismiss = (): void => {
    if (boot.classList.contains("is-done")) return;
    boot.classList.add("is-done");
    document.documentElement.classList.add("is-booted");
    window.setTimeout(() => boot.remove(), 600);
  };

  if (device.reducedMotion) {
    boot.remove();
    document.documentElement.classList.add("is-booted");
    return;
  }

  // Each log line decrypts as it appears. Short strings only — nobody should
  // have to wait to read a loader.
  qsa<HTMLElement>("[data-boot-line]", boot).forEach((line, index) => {
    const text = line.dataset["bootLine"] ?? line.textContent ?? "";
    window.setTimeout(() => scrambleTo(line, text, { speed: 0.7, stagger: 0.6 }), 90 + index * 140);
  });

  // Whichever comes first: the page settling, or the ceiling.
  const ready = new Promise<void>((resolve) => {
    if (document.readyState === "complete") resolve();
    else window.addEventListener("load", () => resolve(), { once: true });
  });

  const floor = new Promise<void>((resolve) => window.setTimeout(resolve, 820));
  const ceiling = new Promise<void>((resolve) => window.setTimeout(resolve, MAX_MS));

  void Promise.race([Promise.all([ready, floor]), ceiling]).then(dismiss);
}
