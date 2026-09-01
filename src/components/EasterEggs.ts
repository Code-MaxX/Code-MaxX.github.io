/**
 * Easter eggs.
 *
 * Three, all of them things an engineer would actually enjoy finding:
 *   · typing `sudo` anywhere opens the palette with the joke already loaded
 *   · the Konami code turns on a real telemetry HUD, not a confetti cannon
 *   · the console carries a greeting and the contact address
 *
 * Nothing here is required to use the site, and none of it fires by accident.
 */

import { device } from "@/core/device";
import { el, on } from "@/core/dom";
import { getPalette } from "./CommandPalette";

const KONAMI = [
  "ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown",
  "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight",
  "b", "a",
];

export function initEasterEggs(): void {
  initConsoleGreeting();
  initSudo();
  initKonami();
}

function isTyping(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
  );
}

/** Type `sudo` on the page and the palette answers. */
function initSudo(): void {
  let buffer = "";
  let timer = 0;

  on(document, "keydown", (event) => {
    if (isTyping(event.target) || event.metaKey || event.ctrlKey || event.altKey) return;
    if (event.key.length !== 1) return;

    buffer = (buffer + event.key.toLowerCase()).slice(-8);
    window.clearTimeout(timer);
    timer = window.setTimeout(() => { buffer = ""; }, 1200);

    if (buffer.endsWith("sudo")) {
      buffer = "";
      getPalette()?.open("sudo hire sahil");
    }
  });
}

/** Konami code → a telemetry HUD, because that is the fun version. */
function initKonami(): void {
  let index = 0;
  let hud: Hud | null = null;

  on(document, "keydown", (event) => {
    if (isTyping(event.target)) return;
    const expected = KONAMI[index];
    if (event.key === expected || event.key.toLowerCase() === expected) {
      index += 1;
      if (index === KONAMI.length) {
        index = 0;
        if (hud) {
          hud.destroy();
          hud = null;
        } else {
          hud = createHud();
        }
      }
    } else {
      index = event.key === KONAMI[0] ? 1 : 0;
    }
  });
}

type Hud = { destroy: () => void };

function createHud(): Hud {
  const root = el("aside", { class: "telemetry", role: "status", "aria-live": "off" });
  const rows: Record<string, HTMLElement> = {};

  const addRow = (key: string, value: string): void => {
    const dd = el("dd", {}, [value]);
    rows[key] = dd;
    list.append(el("dt", {}, [key]), dd);
  };

  const list = el("dl", { class: "telemetry__rows" });
  root.append(
    el("p", { class: "telemetry__head" }, ["TELEMETRY · KONAMI ↑↑↓↓←→←→BA to close"]),
    list,
  );

  addRow("fps", "—");
  addRow("tier", device.tier);
  addRow("particles", String(device.particleBudget));
  addRow("dpr", device.dpr.toFixed(2));
  addRow("viewport", `${window.innerWidth}×${window.innerHeight}`);
  addRow("scroll", "0%");
  addRow("webgl2", String(device.allowWebGL));

  document.body.append(root);

  let frames = 0;
  let last = performance.now();
  let raf = 0;

  const tick = (now: number): void => {
    frames += 1;
    if (now - last >= 500) {
      rows["fps"]!.textContent = String(Math.round((frames * 1000) / (now - last)));
      frames = 0;
      last = now;

      const max = document.documentElement.scrollHeight - window.innerHeight;
      const progress = max > 0 ? (window.scrollY / max) * 100 : 0;
      rows["scroll"]!.textContent = `${progress.toFixed(0)}%`;
      rows["viewport"]!.textContent = `${window.innerWidth}×${window.innerHeight}`;
    }
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);

  return {
    destroy: () => {
      cancelAnimationFrame(raf);
      root.remove();
    },
  };
}

function initConsoleGreeting(): void {
  const accent = "color:#4fe8b0;font:12px ui-monospace,monospace";
  const dim = "color:#8a94a6;font:12px ui-monospace,monospace";
  console.log("%c  SYSTEM ONLINE — sahil ghule  ", `${accent};padding:6px 0`);
  console.log("%cbackend & ai systems engineer · bengaluru", dim);
  console.log("%cthis field is drawn in raw webgl2; no scene graph, two draw calls.", dim);
  console.log("%ctry ⌘K — or type: sudo", dim);
  console.log("%cwork.sahilghule@gmail.com", accent);
}
