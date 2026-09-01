/**
 * ProjectCases — the case-file cards.
 *
 * Each card carries a small schematic of the system it describes, and the
 * schematic reacts to the cursor: the tilt and the highlight both track the
 * pointer's position over the card, so the card behaves like a physical file
 * being angled towards the light rather than a div with a hover class.
 */

import { device } from "@/core/device";
import { on, qsa, svg } from "@/core/dom";

type Glyph = "pipeline" | "regression" | "ledger" | "notebook";

const MAX_TILT = 4.5;

export function initProjectCases(): void {
  const cards = qsa<HTMLElement>(".case");
  if (cards.length === 0) return;

  for (const card of cards) {
    const preview = card.querySelector<HTMLElement>(".case__preview");
    const glyph = card.dataset["glyph"] as Glyph | undefined;
    if (preview && glyph) preview.append(buildGlyph(glyph));

    if (device.reducedMotion || !device.canHover) continue;

    on(card, "pointermove", (event) => {
      if (event.pointerType !== "mouse") return;
      const rect = card.getBoundingClientRect();
      const px = (event.clientX - rect.left) / rect.width;
      const py = (event.clientY - rect.top) / rect.height;

      card.classList.add("is-tilting");
      card.style.setProperty("--tilt-y", `${((px - 0.5) * MAX_TILT * 2).toFixed(2)}deg`);
      card.style.setProperty("--tilt-x", `${((0.5 - py) * MAX_TILT * 2).toFixed(2)}deg`);
      card.style.setProperty("--px", `${(px * 100).toFixed(1)}%`);
      card.style.setProperty("--py", `${(py * 100).toFixed(1)}%`);
    }, { passive: true });

    on(card, "pointerleave", () => {
      card.classList.remove("is-tilting");
      card.style.setProperty("--tilt-x", "0deg");
      card.style.setProperty("--tilt-y", "0deg");
    });
  }
}

/**
 * Schematics, not illustrations: each one is the shape of the system in the
 * card beside it.
 */
function buildGlyph(kind: Glyph): SVGSVGElement {
  const root = svg("svg", {
    viewBox: "0 0 240 92",
    preserveAspectRatio: "xMidYMid meet",
    "aria-hidden": "true",
    focusable: "false",
  });

  const line = (d: string): SVGPathElement => svg("path", { class: "glyph-line", d });
  const node = (cx: number, cy: number, r = 4): SVGCircleElement =>
    svg("circle", { class: "glyph-node", cx, cy, r });

  if (kind === "pipeline") {
    // input → validate → model → response, with the artefact loaded aside
    root.append(
      line("M28 46 H82 M98 46 H152 M168 46 H212"),
      line("M125 46 V22 H168"),
      node(28, 46), node(90, 46), node(160, 46, 5.5), node(212, 46), node(168, 22, 3),
    );
  } else if (kind === "regression") {
    // scatter with a fitted line through it
    const points: [number, number][] = [
      [30, 70], [52, 64], [70, 58], [92, 55], [112, 47],
      [134, 42], [156, 34], [178, 30], [204, 22],
    ];
    root.append(line("M24 76 L212 18"));
    for (const [x, y] of points) root.append(node(x, y, 3));
    root.append(line("M20 82 V12 M20 82 H220"));
  } else if (kind === "ledger") {
    // a chain of blocks, each pointing at the next
    for (let i = 0; i < 4; i += 1) {
      const x = 26 + i * 52;
      root.append(svg("rect", { class: "glyph-node", x, y: 32, width: 30, height: 28, rx: 2 }));
      if (i < 3) root.append(line(`M${x + 30} 46 H${x + 52}`));
    }
  } else {
    // stacked notebook cells with an output bar chart
    root.append(
      svg("rect", { class: "glyph-line", x: 24, y: 18, width: 120, height: 12, rx: 2, fill: "none" }),
      svg("rect", { class: "glyph-line", x: 24, y: 38, width: 92, height: 12, rx: 2, fill: "none" }),
      line("M24 68 H144"),
    );
    const bars = [16, 30, 22, 38, 26];
    bars.forEach((h, i) => {
      root.append(
        svg("rect", { class: "glyph-node", x: 164 + i * 13, y: 68 - h, width: 8, height: h, rx: 1 }),
      );
    });
  }

  return root;
}
