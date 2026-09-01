/**
 * The motion system.
 *
 * One place owns GSAP, ScrollTrigger and Lenis so they share a single ticker
 * and a single scroll source of truth. Nothing else in the app imports them
 * directly. Under `prefers-reduced-motion` the libraries are never fetched at
 * all — the site is fully usable without them, so shipping them would be pure
 * cost for a user who has asked for less.
 */

import { device } from "./device";

export type MotionSystem = {
  gsap: typeof import("gsap").gsap;
  ScrollTrigger: typeof import("gsap/ScrollTrigger").ScrollTrigger;
  lenis: import("lenis").default | null;
  refresh(): void;
};

let motionPromise: Promise<MotionSystem | null> | null = null;
let motionRef: MotionSystem | null = null;

/** Lazily boot the motion stack. Resolves to `null` when motion is off. */
export function getMotion(): Promise<MotionSystem | null> {
  if (motionPromise) return motionPromise;

  if (device.reducedMotion) {
    motionPromise = Promise.resolve(null);
    return motionPromise;
  }

  motionPromise = boot().catch((error: unknown) => {
    // A failed motion layer must never take the content with it.
    console.warn("[motion] disabled:", error);
    return null;
  });
  return motionPromise;
}

async function boot(): Promise<MotionSystem> {
  const [{ gsap }, { ScrollTrigger }, lenisModule] = await Promise.all([
    import("gsap"),
    import("gsap/ScrollTrigger"),
    import("lenis"),
  ]);

  gsap.registerPlugin(ScrollTrigger);
  gsap.defaults({ ease: "power3.out", duration: 0.9 });
  // Tab-away then back should not fire a giant catch-up frame.
  gsap.ticker.lagSmoothing(180, 33);

  const Lenis = lenisModule.default;
  let lenis: InstanceType<typeof Lenis> | null = null;

  // Smooth scroll is a desktop affordance. On touch, the native scroller is
  // faster, better integrated and does not fight the browser's own gestures.
  if (!device.touch) {
    lenis = new Lenis({
      duration: 1.05,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      syncTouch: false,
      wheelMultiplier: 1,
      touchMultiplier: 1.6,
    });

    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((time: number) => lenis?.raf(time * 1000));
  }

  const system: MotionSystem = {
    gsap,
    ScrollTrigger,
    lenis,
    refresh: () => ScrollTrigger.refresh(),
  };

  motionRef = system;
  scheduleRefresh(system);

  if (import.meta.env.DEV) {
    (window as unknown as { __motion?: MotionSystem }).__motion = system;
  }

  return system;
}

/** Fonts and images change layout height; re-measure once they land. */
function scheduleRefresh(system: MotionSystem): void {
  const refresh = () => system.ScrollTrigger.refresh();
  if (document.fonts?.ready) void document.fonts.ready.then(refresh);
  window.addEventListener("load", refresh, { once: true });

  let resizeTimer = 0;
  window.addEventListener(
    "resize",
    () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(refresh, 200);
    },
    { passive: true },
  );
}

/** Scroll to a section id, through Lenis when it is driving. */
export function scrollToSection(id: string, offset = -8): void {
  const target = document.getElementById(id);
  if (!target) return;

  if (motionRef?.lenis) {
    motionRef.lenis.scrollTo(target, { offset, duration: 1.15 });
  } else {
    target.scrollIntoView({
      behavior: device.reducedMotion ? "auto" : "smooth",
      block: "start",
    });
  }
  // Move keyboard focus with the viewport — scrolling alone is not navigation.
  target.setAttribute("tabindex", "-1");
  target.focus({ preventScroll: true });
}

/** Freeze the page behind a modal surface. */
export function lockScroll(locked: boolean): void {
  document.documentElement.classList.toggle("is-locked", locked);
  if (motionRef?.lenis) {
    if (locked) motionRef.lenis.stop();
    else motionRef.lenis.start();
  }
}
