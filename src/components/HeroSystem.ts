/**
 * HeroSystem — owns the lifecycle of the WebGL field.
 *
 * The renderer is imported dynamically and only ever constructed when the
 * device can afford it and the hero is actually on screen. It stops when
 * scrolled away, stops when the tab is hidden, and is destroyed if the motion
 * preference changes underneath us. A visualisation that keeps a GPU busy
 * behind three sections of text is not a visualisation, it is a battery leak.
 */

import type { SystemField } from "@/webgl/SystemField";
import { device, onReducedMotionChange } from "@/core/device";
import { on, qs } from "@/core/dom";
import { cssColorToFloats } from "@/core/registry";

export function initHeroSystem(): void {
  const canvas = qs<HTMLCanvasElement>("#system-field");
  const hero = qs(".hero");
  if (!canvas || !hero) return;

  if (!device.allowWebGL) {
    // The hero still has its grid, vignette and scrim — it reads as designed,
    // just without the field.
    hero.classList.add("hero--static");
    canvas.remove();
    return;
  }

  let field: SystemField | null = null;
  let onScreen = false;
  let disposed = false;

  const sync = (): void => {
    if (!field) return;
    if (onScreen && !document.hidden) field.start();
    else field.stop();
  };

  const create = async (): Promise<void> => {
    if (field || disposed) return;
    const { SystemField: Field } = await import("@/webgl/SystemField");
    if (disposed) return;

    field = new Field({
      canvas,
      particles: device.particleBudget,
      dpr: device.dpr,
      accent: cssColorToFloats("--c-accent", [0.31, 0.91, 0.69]),
      accent2: cssColorToFloats("--c-accent-2", [0.44, 0.54, 1]),
    });

    field.resize();
    field.setProgress(progressNow());
    sync();
    requestAnimationFrame(() => canvas.classList.add("is-live"));

    if (import.meta.env.DEV) {
      (window as unknown as { __field?: SystemField }).__field = field;
    }
  };

  const destroy = (): void => {
    disposed = true;
    field?.destroy();
    field = null;
    canvas.classList.remove("is-live");
  };

  // --- Visibility ---------------------------------------------------------
  if (typeof IntersectionObserver !== "undefined") {
    const observer = new IntersectionObserver(
      (entries) => {
        onScreen = entries.some((entry) => entry.isIntersecting);
        if (onScreen) void create();
        sync();
      },
      { rootMargin: "120px" },
    );
    observer.observe(hero);
  } else {
    onScreen = true;
    void create();
  }

  on(document, "visibilitychange", sync);

  // --- Scroll progress ----------------------------------------------------
  // A plain listener rather than ScrollTrigger: this must be live before the
  // motion chunk lands, and it works identically with or without Lenis.
  const progressNow = (): number => {
    const rect = hero.getBoundingClientRect();
    const travel = rect.height || window.innerHeight;
    return Math.min(1, Math.max(0, -rect.top / travel));
  };

  let queued = false;
  on(window, "scroll", () => {
    if (queued || !field) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      const progress = progressNow();
      // The architecture finishes assembling in the first half of the hero's
      // travel, so the resolved system is actually seen — then it fades out
      // rather than competing with the content that follows.
      field?.setProgress(Math.min(1, progress / 0.45));
      field?.setOpacity(1 - Math.min(1, Math.max(0, (progress - 0.5) / 0.38)));
    });
  }, { passive: true });

  // --- Pointer ------------------------------------------------------------
  on(window, "pointermove", (event) => {
    if (!field || event.pointerType !== "mouse") return;
    field.setPointer(
      (event.clientX / window.innerWidth) * 2 - 1,
      -((event.clientY / window.innerHeight) * 2 - 1),
    );
  }, { passive: true });

  // --- Resize -------------------------------------------------------------
  let resizeTimer = 0;
  on(window, "resize", () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => field?.resize(), 150);
  }, { passive: true });

  // --- Respect a preference that changes mid-session ----------------------
  onReducedMotionChange((reduced) => {
    if (reduced) destroy();
  });
}
