/**
 * Capability tiering.
 *
 * Every expensive feature asks this module for permission before it starts.
 * The tier is computed once, from signals that actually correlate with the
 * cost of running a render loop: core count, memory, coarse pointer, and the
 * user's own data/motion preferences.
 */

export type Tier = "high" | "medium" | "low";

const mq = (query: string): MediaQueryList | null =>
  typeof window.matchMedia === "function" ? window.matchMedia(query) : null;

const reducedMotionQuery = mq("(prefers-reduced-motion: reduce)");
const coarsePointerQuery = mq("(pointer: coarse)");
const hoverQuery = mq("(hover: hover)");

type NavigatorWithHints = Navigator & {
  deviceMemory?: number;
  connection?: { saveData?: boolean };
};

const nav = navigator as NavigatorWithHints;

let cachedTier: Tier | null = null;
let tierWidth = 0;

/**
 * Resolved lazily and re-resolved when the viewport changes size materially.
 * Computing it once at module load would freeze a decision made before the
 * layout settled — and a window dragged from a phone-width to a desktop-width
 * should get the desktop experience.
 */
function tier(): Tier {
  if (cachedTier !== null && Math.abs(window.innerWidth - tierWidth) < 240) return cachedTier;
  tierWidth = window.innerWidth;
  cachedTier = computeTier();
  return cachedTier;
}

function computeTier(): Tier {
  if (reducedMotionQuery?.matches) return "low";
  if (nav.connection?.saveData) return "low";

  const cores = nav.hardwareConcurrency ?? 4;
  const memory = nav.deviceMemory ?? 4;
  const coarse = coarsePointerQuery?.matches ?? false;
  const narrow = window.innerWidth < 720;

  // Deliberately not keyed on connection speed. A slow link is a reason not to
  // *fetch* something expensive; it says nothing about whether this GPU can
  // draw a few hundred points, and the renderer is 4 kB gzip. Judging the tier
  // on `effectiveType` throttled capable desktops down to the static hero.
  // `saveData` above is different: that is the user asking for less.
  if (cores <= 2 || memory <= 2) return "low";
  if (coarse || narrow || cores <= 4 || memory <= 4) return "medium";
  return "high";
}

let webgl2Support: boolean | null = null;

/** Probed lazily — creating a context to test is not free. */
export function supportsWebGL2(): boolean {
  if (webgl2Support !== null) return webgl2Support;
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2", { failIfMajorPerformanceCaveat: true });
    webgl2Support = gl !== null;
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
  } catch {
    webgl2Support = false;
  }
  return webgl2Support;
}

export const device = {
  get tier(): Tier {
    return tier();
  },

  get reducedMotion(): boolean {
    return reducedMotionQuery?.matches ?? false;
  },

  get touch(): boolean {
    return (coarsePointerQuery?.matches ?? false) || navigator.maxTouchPoints > 0;
  },

  get canHover(): boolean {
    return hoverQuery?.matches ?? true;
  },

  /** Capped device pixel ratio — retina beyond 2x buys nothing here. */
  get dpr(): number {
    const cap = this.tier === "high" ? 2 : 1.5;
    return Math.min(window.devicePixelRatio || 1, cap);
  },

  /** Should the WebGL hero run at all? */
  get allowWebGL(): boolean {
    return !this.reducedMotion && this.tier !== "low" && supportsWebGL2();
  },

  /** Should scroll be pinned/choreographed, or kept simple and linear? */
  get allowChoreography(): boolean {
    return !this.reducedMotion && !this.touch && window.innerWidth >= 1024;
  },

  get allowCustomCursor(): boolean {
    return this.canHover && !this.touch && window.innerWidth >= 900;
  },

  /**
   * Particle budget for the hero field.
   *
   * A portrait viewport crops into the middle of the field rather than showing
   * more of it, so the same count reads several times denser on a phone than
   * on a desktop. Budget for what is actually on screen, not for the device.
   */
  get particleBudget(): number {
    if (this.tier === "low") return 0;
    if (window.innerWidth < 720) return 240;
    if (this.tier === "medium") return 320;
    return window.innerWidth >= 1600 ? 900 : 700;
  },
};

/** React to a live change of the motion preference without a reload. */
export function onReducedMotionChange(handler: (reduced: boolean) => void): () => void {
  if (!reducedMotionQuery) return () => {};
  const listener = (event: MediaQueryListEvent) => handler(event.matches);
  reducedMotionQuery.addEventListener("change", listener);
  return () => reducedMotionQuery.removeEventListener("change", listener);
}
