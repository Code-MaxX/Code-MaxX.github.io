/**
 * ArchitectureGraph — draws a role's real system as an inspectable diagram.
 *
 * Why it moves: the assembly is scrubbed to scroll, so reading the section and
 * building the system are the same gesture. Nodes land in dataflow order,
 * edges draw from source to target, and packets travel the links once they
 * exist. Nothing animates that is not describing the system.
 *
 * Every node is focusable and labelled; the diagram is navigable by keyboard
 * and its content is also written out in the live readout beneath it.
 */

import type { ArchEdge, ArchNode, Architecture } from "@/data/experience";
import { roles } from "@/data/experience";
import { device } from "@/core/device";
import { on, qsa, svg } from "@/core/dom";
import { getMotion } from "@/core/motion";

const NODE_H = 58;
const GAP = 7;

const KIND_LABEL: Record<ArchNode["kind"], string> = {
  source: "src",
  service: "svc",
  queue: "queue",
  worker: "worker",
  store: "store",
  output: "out",
  model: "model",
};

export function initArchitectureGraphs(): void {
  for (const figure of qsa<HTMLElement>("[data-architecture]")) {
    const id = figure.dataset["architecture"];
    const role = roles.find((candidate) => candidate.id === id);
    const stage = figure.querySelector<HTMLElement>(".arch__stage");
    const readout = figure.querySelector<HTMLElement>(".arch__readout");
    if (!role || !stage || !readout) continue;
    render(stage, readout, role.architecture, role.system);
  }
}

function nodeWidth(node: ArchNode): number {
  return Math.max(140, Math.round(node.label.length * 7.4 + 34));
}

/** Clip a ray from a node centre to the edge of its box, plus a small gap. */
function anchor(node: ArchNode, dx: number, dy: number): [number, number] {
  const hw = nodeWidth(node) / 2 + GAP;
  const hh = NODE_H / 2 + GAP;
  const sx = dx === 0 ? Number.POSITIVE_INFINITY : hw / Math.abs(dx);
  const sy = dy === 0 ? Number.POSITIVE_INFINITY : hh / Math.abs(dy);
  const s = Math.min(sx, sy);
  return [node.x + dx * s, node.y + dy * s];
}

function edgePath(from: ArchNode, to: ArchNode, bow: number): {
  d: string;
  mid: [number, number];
  head: { x: number; y: number; angle: number };
} {
  const mx = (from.x + to.x) / 2;
  const my = (from.y + to.y) / 2;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;

  // Control point pushed perpendicular to the run.
  const cx = mx + (-dy / len) * bow;
  const cy = my + (dx / len) * bow;

  const [x1, y1] = anchor(from, (cx - from.x) / len, (cy - from.y) / len);
  const [x2, y2] = anchor(to, (cx - to.x) / len, (cy - to.y) / len);

  // Tangent at the target end: P₂ − C for a quadratic, P₂ − P₁ for a line.
  const tx = bow === 0 ? x2 - x1 : x2 - cx;
  const ty = bow === 0 ? y2 - y1 : y2 - cy;

  return {
    d: bow === 0 ? `M ${x1} ${y1} L ${x2} ${y2}` : `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`,
    // Quadratic midpoint: ¼P₀ + ½C + ¼P₂.
    mid: [0.25 * x1 + 0.5 * cx + 0.25 * x2, 0.25 * y1 + 0.5 * cy + 0.25 * y2],
    head: { x: x2, y: y2, angle: (Math.atan2(ty, tx) * 180) / Math.PI },
  };
}

function render(
  stage: HTMLElement,
  readout: HTMLElement,
  architecture: Architecture,
  systemName: string,
): void {
  const root = svg("svg", {
    class: "arch__svg",
    viewBox: architecture.viewBox,
    role: "group",
    "aria-label": `${systemName} architecture diagram — ${architecture.nodes.length} components`,
    preserveAspectRatio: "xMidYMid meet",
  });

  const edgeLayer = svg("g", { class: "arch__edges" });
  const nodeLayer = svg("g", { class: "arch__nodes" });
  root.append(edgeLayer, nodeLayer);

  const byId = new Map(architecture.nodes.map((node) => [node.id, node]));
  const edgeEls: { el: SVGGElement; line: SVGPathElement; edge: ArchEdge }[] = [];
  const nodeEls = new Map<string, SVGGElement>();
  const neighbours = new Map<string, Set<string>>();
  for (const node of architecture.nodes) neighbours.set(node.id, new Set());

  // --- Edges --------------------------------------------------------------
  architecture.edges.forEach((edge, index) => {
    const from = byId.get(edge.from);
    const to = byId.get(edge.to);
    if (!from || !to) return;

    neighbours.get(from.id)?.add(to.id);
    neighbours.get(to.id)?.add(from.id);

    const { d, mid, head } = edgePath(from, to, edge.bow ?? 0);
    const group = svg("g", { class: "arch-edge", "data-from": edge.from, "data-to": edge.to });

    const line = svg("path", {
      class: "arch-edge__line",
      d,
      pathLength: 1,
      "stroke-dasharray": edge.dashed ? "5 5" : undefined,
    });
    group.append(line);

    group.append(
      svg("path", {
        class: "arch-edge__head",
        d: "M-7,-3.4 L0,0 L-7,3.4 Z",
        transform: `translate(${head.x.toFixed(2)} ${head.y.toFixed(2)}) rotate(${head.angle.toFixed(2)})`,
      }),
    );

    // Packet path: a normalised path length means one animation works for
    // every edge regardless of its real geometry.
    const flow = svg("path", {
      class: "arch-edge__flow",
      d,
      pathLength: 100,
      style: `animation-delay: ${(index * 0.42).toFixed(2)}s`,
    });
    group.append(flow);

    if (edge.label) {
      group.append(
        svg("text", {
          class: "arch-edge__label",
          x: mid[0],
          y: mid[1] - 6,
          "text-anchor": "middle",
        }, [edge.label]),
      );
    }

    edgeLayer.append(group);
    edgeEls.push({ el: group, line, edge });
  });

  // --- Nodes --------------------------------------------------------------
  for (const node of architecture.nodes) {
    const w = nodeWidth(node);
    const x = node.x - w / 2;
    const y = node.y - NODE_H / 2;

    const group = svg("g", {
      class: "arch-node",
      "data-node": node.id,
      tabindex: 0,
      role: "button",
      "aria-label": `${node.label}. ${node.detail}`,
      "data-cursor": "inspect",
    });

    group.append(
      svg("rect", { class: "arch-node__box", x, y, width: w, height: NODE_H, rx: 5 }),
      svg("rect", { class: "arch-node__pip", x: x + w - 11, y: y + 8, width: 3, height: 3 }),
      svg("text", { class: "arch-node__kind", x: x + 12, y: y + 16 }, [KIND_LABEL[node.kind]]),
      svg("text", { class: "arch-node__label", x: x + 12, y: y + 33 }, [node.label]),
      svg("text", { class: "arch-node__sub", x: x + 12, y: y + 47 }, [node.sub]),
    );

    nodeLayer.append(group);
    nodeEls.set(node.id, group);
  }

  stage.append(root);

  // --- Inspection ---------------------------------------------------------
  // Hover/focus inspects transiently; Enter, Space or a tap pins the node so
  // the readout stays put while it is being read. Pinning is also what makes
  // `role="button"` on these nodes honest — activating one now does something.
  let pinned: ArchNode | null = null;

  const reset = (): void => {
    stage.classList.remove("is-inspecting");
    for (const el of nodeEls.values()) {
      el.classList.remove("is-active", "is-linked");
      el.setAttribute("aria-pressed", "false");
    }
    for (const { el } of edgeEls) el.classList.remove("is-hot");
    readout.textContent = "";
  };

  const clear = (): void => {
    if (pinned) inspect(pinned);
    else reset();
  };

  function inspect(node: ArchNode): void {
    stage.classList.add("is-inspecting");
    const linked = neighbours.get(node.id) ?? new Set<string>();
    for (const [id, el] of nodeEls) {
      el.classList.toggle("is-active", id === node.id);
      el.classList.toggle("is-linked", linked.has(id));
    }
    for (const { el, edge } of edgeEls) {
      el.classList.toggle("is-hot", edge.from === node.id || edge.to === node.id);
    }

    for (const [id, el] of nodeEls) {
      el.setAttribute("aria-pressed", pinned?.id === id ? "true" : "false");
    }

    readout.replaceChildren();
    const title = document.createElement("strong");
    title.textContent = node.label;
    readout.append(title, document.createTextNode(node.detail));
  }

  const togglePin = (node: ArchNode): void => {
    if (pinned?.id === node.id) {
      pinned = null;
      reset();
      inspect(node);
    } else {
      pinned = node;
      inspect(node);
    }
  };

  for (const node of architecture.nodes) {
    const el = nodeEls.get(node.id);
    if (!el) continue;
    el.setAttribute("aria-pressed", "false");
    el.addEventListener("pointerenter", () => inspect(node));
    el.addEventListener("focus", () => inspect(node));
    el.addEventListener("pointerleave", clear);
    el.addEventListener("blur", clear);
    // Touch has no hover state, so a tap pins instead.
    el.addEventListener("click", () => togglePin(node));
    el.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      togglePin(node);
    });
  }
  on(stage, "pointerleave", clear);
  on(stage, "keydown", (event) => {
    if (event.key !== "Escape" || !pinned) return;
    pinned = null;
    reset();
  });

  // --- Assembly -----------------------------------------------------------
  // Packets only animate while the diagram is on screen.
  if (typeof IntersectionObserver !== "undefined") {
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) stage.classList.toggle("is-live", entry.isIntersecting);
      },
      { rootMargin: "80px" },
    );
    io.observe(stage);
  } else {
    stage.classList.add("is-live");
  }

  // Gate the motion layer behind proximity: a visitor who never reaches the
  // experience section never downloads GSAP for it.
  whenNear(stage, () => void assemble(stage, nodeEls, edgeEls, architecture));
}

/** Run once the element is within a screen or so of the viewport. */
function whenNear(target: Element, run: () => void): void {
  if (typeof IntersectionObserver === "undefined") {
    run();
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      io.disconnect();
      run();
    },
    { rootMargin: "900px 0px" },
  );
  io.observe(target);
}

/**
 * Scrub the diagram's construction to scroll. Falls back to "already built"
 * whenever the motion layer is unavailable — nothing here is ever hidden by
 * CSS alone, so a failure to animate leaves a complete, readable diagram.
 */
async function assemble(
  stage: HTMLElement,
  nodeEls: Map<string, SVGGElement>,
  edgeEls: { el: SVGGElement; line: SVGPathElement; edge: ArchEdge }[],
  architecture: Architecture,
): Promise<void> {
  const motion = await getMotion();
  if (!motion || !device.allowChoreography) {
    stage.classList.add("is-assembled");
    return;
  }

  const { gsap, ScrollTrigger } = motion;

  // Dataflow order: left to right is the direction the system actually runs.
  const ordered = [...architecture.nodes].sort((a, b) => a.x - b.x || a.y - b.y);
  const nodes = ordered.map((node) => nodeEls.get(node.id)).filter((el): el is SVGGElement => !!el);
  const rank = new Map(ordered.map((node, index) => [node.id, index]));

  gsap.set(nodes, { opacity: 0, transformOrigin: "center", scale: 0.9 });
  gsap.set(edgeEls.map((entry) => entry.el), { opacity: 0 });
  gsap.set(edgeEls.map((entry) => entry.line), { strokeDashoffset: 1, strokeDasharray: "1 1" });

  const timeline = gsap.timeline({
    defaults: { ease: "power2.out" },
    scrollTrigger: {
      trigger: stage,
      start: "top 85%",
      end: "top 35%",
      scrub: 0.7,
      invalidateOnRefresh: true,
    },
  });

  timeline.to(nodes, { opacity: 1, scale: 1, duration: 0.5, stagger: 0.12 }, 0);

  for (const { el, line, edge } of edgeEls) {
    // An edge is drawn only after the node it leaves has landed.
    const at = ((rank.get(edge.from) ?? 0) + 1) * 0.12;
    timeline.to(el, { opacity: 1, duration: 0.2 }, at);
    timeline.to(line, { strokeDashoffset: 0, duration: 0.45 }, at);
  }

  timeline.add(() => stage.classList.add("is-assembled"), ">");
  ScrollTrigger.refresh();
}
