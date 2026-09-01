/**
 * Navigation: sticky-state, current-section tracking, scroll rail and the
 * anchor links that have to route through Lenis when it is driving scroll.
 */

import { on, qs, qsa } from "@/core/dom";
import { scrollToSection } from "@/core/motion";

export function initNavigation(): void {
  const nav = qs("#nav");
  const railFill = qs("#rail-fill");
  const railReadout = qs("#rail-readout");
  const links = qsa<HTMLAnchorElement>(".nav__links a");
  const sections = qsa<HTMLElement>("main section[id]");

  // --- Anchor routing -----------------------------------------------------
  for (const anchor of qsa<HTMLAnchorElement>('a[data-scroll][href^="#"]')) {
    on(anchor, "click", (event) => {
      const id = anchor.getAttribute("href")?.slice(1);
      if (!id || !document.getElementById(id)) return;
      event.preventDefault();
      history.replaceState(null, "", `#${id}`);
      scrollToSection(id, id === "top" ? 0 : -8);
    });
  }

  // --- Sticky nav + rail progress ----------------------------------------
  let ticking = false;
  const update = (): void => {
    ticking = false;
    const y = window.scrollY;
    nav?.classList.toggle("is-stuck", y > 24);

    if (railFill) {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const progress = max > 0 ? Math.min(1, y / max) : 0;
      railFill.style.transform = `scaleY(${progress.toFixed(4)})`;
    }
  };

  on(window, "scroll", () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  }, { passive: true });
  update();

  // --- Current section ----------------------------------------------------
  if (typeof IntersectionObserver === "undefined" || sections.length === 0) return;

  const bySection = new Map<string, HTMLAnchorElement>();
  for (const link of links) {
    const id = link.getAttribute("href")?.slice(1);
    if (id) bySection.set(id, link);
  }

  const visible = new Set<string>();
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) visible.add(entry.target.id);
        else visible.delete(entry.target.id);
      }

      // The topmost visible section wins — matches what the reader is reading.
      const current = sections.find((section) => visible.has(section.id));
      for (const [id, link] of bySection) {
        link.classList.toggle("is-current", id === current?.id);
        link.setAttribute("aria-current", id === current?.id ? "true" : "false");
      }

      if (railReadout && current) {
        const index = sections.indexOf(current);
        railReadout.textContent = String(index).padStart(2, "0");
      }
    },
    { rootMargin: "-20% 0px -55% 0px", threshold: 0 },
  );

  for (const section of sections) observer.observe(section);
}
