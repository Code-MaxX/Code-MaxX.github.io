/**
 * Entry point.
 *
 * Order of operations matters here:
 *   1. Mark the document as script-enabled *before* first paint, so the reveal
 *      choreography's hidden states only ever apply when something will
 *      actually un-hide them.
 *   2. Mount every enhancement through the registry, where a failure in one is
 *      contained rather than fatal.
 *
 * Nothing below is required to read the page. The content is in the markup;
 * this file only makes it move.
 */

import "./styles/index.css";

import { device } from "./core/device";
import { initReveal } from "./core/reveal";
import { getMotion } from "./core/motion";
import { mountAll } from "./core/registry";

import { initArchitectureGraphs } from "./components/ArchitectureGraph";
import { initBootSequence } from "./components/BootSequence";
import { initCaseStudies } from "./components/CaseStudy";
import { initCommandPalette } from "./components/CommandPalette";
import { initContactTerminal, initTextEffects } from "./components/ContactTerminal";
import { initCustomCursor } from "./components/CustomCursor";
import { initEasterEggs } from "./components/EasterEggs";
import { initHeroSystem } from "./components/HeroSystem";
import { initNavigation } from "./components/Navigation";
import { initProjectCases } from "./components/ProjectCases";
import { initTechSystemMap } from "./components/TechSystemMap";

const root = document.documentElement;
root.classList.add("js-motion");
root.classList.toggle("is-touch", device.touch);
root.dataset["tier"] = device.tier;

const year = document.querySelector("[data-year]");
if (year) year.textContent = String(new Date().getFullYear());

async function start(): Promise<void> {
  // The boot overlay and the hero go first: they are what is on screen.
  initBootSequence();
  initReveal();

  await mountAll([
    { name: "hero", setup: initHeroSystem },
    { name: "navigation", setup: initNavigation },
    { name: "cursor", setup: initCustomCursor },
    { name: "palette", setup: initCommandPalette },
    { name: "text", setup: initTextEffects },
    { name: "cases", setup: initProjectCases },
    { name: "case-study", setup: initCaseStudies },
    { name: "architecture", setup: initArchitectureGraphs },
    { name: "stack-map", setup: initTechSystemMap },
    { name: "terminal", setup: initContactTerminal },
    { name: "easter-eggs", setup: initEasterEggs },
  ]);

  // Smooth scroll and the scroll choreography are the last things to arrive.
  // Loading them on idle keeps ~50 kB out of the critical path while still
  // having them ready before anyone has finished reading the hero. Under
  // `prefers-reduced-motion` this resolves without fetching anything.
  scheduleIdle(() => void getMotion());
}

type IdleWindow = Window & {
  requestIdleCallback?: (cb: () => void, options?: { timeout: number }) => number;
};

function scheduleIdle(run: () => void): void {
  const idle = (window as IdleWindow).requestIdleCallback;
  if (idle) idle.call(window, run, { timeout: 2200 });
  else window.setTimeout(run, 900);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => void start(), { once: true });
} else {
  void start();
}
