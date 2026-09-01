/**
 * Custom cursor.
 *
 * Small and precise by default; it only grows when it has something to say.
 * Elements declare their own state with `data-cursor`, so the cursor never
 * needs to know what a card or a graph node is.
 *
 * Touch and coarse pointers never see it, and the native cursor is only
 * hidden once this one is actually on screen.
 */

import { device } from "@/core/device";
import { el, on } from "@/core/dom";

type CursorState = "default" | "link" | "project" | "inspect" | "drag";

const LABELS: Record<CursorState, string> = {
  default: "",
  link: "",
  project: "View",
  inspect: "Inspect",
  drag: "Drag",
};

export function initCustomCursor(): void {
  if (device.reducedMotion) return;

  // Wait for evidence of a mouse. Touch users never pay for any of this, and
  // the width test is evaluated when it can actually be trusted.
  const stop = on(window, "pointermove", (event) => {
    if (event.pointerType !== "mouse" || !device.allowCustomCursor) return;
    stop();
    build();
  }, { passive: true });
}

function build(): void {
  const root = el("div", { class: "cursor", "aria-hidden": "true" });
  const dot = el("span", { class: "cursor__dot" });
  const ring = el("span", { class: "cursor__ring" });
  const label = el("span", { class: "cursor__label" });
  root.append(ring, dot, label);
  document.body.append(root);
  document.documentElement.classList.add("has-cursor");

  let targetX = window.innerWidth / 2;
  let targetY = window.innerHeight / 2;
  let x = targetX;
  let y = targetY;
  let state: CursorState = "default";
  let visible = false;
  let raf = 0;

  const setState = (next: CursorState): void => {
    if (next === state) return;
    state = next;
    root.dataset["state"] = next;
    label.textContent = LABELS[next];
  };

  const frame = (): void => {
    // Two-speed follow: the dot is exact, the ring trails. The lag is what
    // makes a 4px dot feel like an object rather than a repaint.
    x += (targetX - x) * 0.34;
    y += (targetY - y) * 0.34;
    root.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`;
    dot.style.transform = `translate3d(${(targetX - x).toFixed(2)}px, ${(targetY - y).toFixed(2)}px, 0)`;
    raf = requestAnimationFrame(frame);
  };

  on(window, "pointermove", (event) => {
    if (event.pointerType !== "mouse") return;
    targetX = event.clientX;
    targetY = event.clientY;

    if (!visible) {
      visible = true;
      x = targetX;
      y = targetY;
      root.classList.remove("is-hidden");
      if (!raf) raf = requestAnimationFrame(frame);
    }

    const node = event.target instanceof Element ? event.target : null;
    const declared = node?.closest<HTMLElement>("[data-cursor]")?.dataset["cursor"];
    if (declared && declared in LABELS) {
      setState(declared as CursorState);
    } else if (node?.closest("a, button, summary, input, [tabindex]:not([tabindex='-1'])")) {
      setState("link");
    } else {
      setState("default");
    }
  }, { passive: true });

  on(window, "pointerdown", () => root.classList.add("is-down"), { passive: true });
  on(window, "pointerup", () => root.classList.remove("is-down"), { passive: true });
  on(document, "mouseleave", () => root.classList.add("is-hidden"));
  on(document, "mouseenter", () => root.classList.remove("is-hidden"));

  // A plugged-in touchscreen or a switch to keyboard should not leave a ghost.
  on(window, "blur", () => root.classList.add("is-hidden"));

  // Stop the loop entirely when the tab is hidden.
  on(document, "visibilitychange", () => {
    if (document.hidden) {
      cancelAnimationFrame(raf);
      raf = 0;
    } else if (visible) {
      raf = requestAnimationFrame(frame);
    }
  });

  // If a coarse pointer ever touches the page, stand down for good.
  on(window, "touchstart", () => {
    cancelAnimationFrame(raf);
    root.remove();
    document.documentElement.classList.remove("has-cursor");
  }, { once: true, passive: true });

}
