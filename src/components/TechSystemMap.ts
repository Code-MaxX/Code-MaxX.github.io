/**
 * TechSystemMap — the stack drawn as the dependency graph it actually is.
 *
 * Hovering a node dims everything it does not touch and prints the chain
 * beneath: technology → the systems it ran in → what that made possible.
 * The point is the relationships; a badge wall has none.
 */

import { stackAdjacency, stackEdges, stackGroupLabels, stackNodes } from "@/data/stack";
import type { StackGroup, StackNode } from "@/data/stack";
import { el, on, qs, svg } from "@/core/dom";
import { getMotion } from "@/core/motion";

const RADIUS: Record<1 | 2 | 3, number> = { 1: 6, 2: 8.5, 3: 12 };

export function initTechSystemMap(): void {
  const map = qs("[data-stack-map]");
  const stage = map?.querySelector<HTMLElement>(".stackmap__stage");
  const panel = map?.querySelector<HTMLElement>(".stackmap__panel");
  if (!map || !stage || !panel) return;

  const root = svg("svg", {
    class: "stackmap__svg",
    // Cropped to the constellation's actual extent — the polar layout never
    // reaches the corners, and empty margin only shrinks the labels.
    viewBox: "178 58 684 620",
    role: "group",
    "aria-label": "Technology dependency map",
    preserveAspectRatio: "xMidYMid meet",
  });

  const byId = new Map(stackNodes.map((node) => [node.id, node]));
  const edgeLayer = svg("g", { class: "stackmap__edges" });
  const nodeLayer = svg("g", { class: "stackmap__nodes" });
  root.append(edgeLayer, nodeLayer);

  const edgeEls: { el: SVGLineElement; a: string; b: string }[] = [];
  for (const edge of stackEdges) {
    const a = byId.get(edge.a);
    const b = byId.get(edge.b);
    if (!a || !b) continue;
    const line = svg("line", {
      class: "stack-edge",
      x1: a.x, y1: a.y, x2: b.x, y2: b.y,
    });
    edgeLayer.append(line);
    edgeEls.push({ el: line, a: edge.a, b: edge.b });
  }

  const nodeEls = new Map<string, SVGGElement>();
  for (const node of stackNodes) {
    const r = RADIUS[node.weight];
    const group = svg("g", {
      class: "stack-node",
      "data-node": node.id,
      "data-weight": node.weight,
      tabindex: 0,
      role: "button",
      "aria-label": `${node.label}. ${node.role} Used in ${node.usedIn.join(", ")}.`,
      "data-cursor": "inspect",
    });
    group.append(
      svg("circle", { class: "stack-node__halo", cx: node.x, cy: node.y, r: r + 16 }),
      svg("circle", { class: "stack-node__dot", cx: node.x, cy: node.y, r }),
      svg("text", { class: "stack-node__label", x: node.x, y: node.y + r + 18 }, [node.label]),
    );
    nodeLayer.append(group);
    nodeEls.set(node.id, group);
  }

  stage.append(root);
  map.append(buildCards());
  map.classList.add("is-enhanced");

  // --- Inspection ---------------------------------------------------------
  const idle = (): Node[] => {
    const counts = new Map<StackGroup, number>();
    for (const node of stackNodes) counts.set(node.group, (counts.get(node.group) ?? 0) + 1);
    return [
      el("p", { class: "stackmap__group" }, ["Systems map"]),
      el("p", { class: "stackmap__name" }, [`${stackNodes.length} technologies`]),
      el("p", { class: "stackmap__role" }, [
        "Hover or focus a node to isolate what it connects to and read what it did in production.",
      ]),
      el(
        "ul",
        { class: "stackmap__legend" },
        [...counts].map(([group, count]) =>
          el("li", {}, [
            el("span", { class: `stackmap__swatch is-${group}` }),
            el("span", {}, [stackGroupLabels[group]]),
            el("span", { class: "stackmap__count" }, [String(count)]),
          ]),
        ),
      ),
      el("p", { class: "stackmap__outcome" }, [
        `${stackEdges.length} relationships — every edge is something that actually calls, stores or trains on the other.`,
      ]),
    ];
  };

  // As in the architecture diagrams: hover inspects, Enter/Space/tap pins.
  let pinned: StackNode | null = null;

  const inspect = (node: StackNode): void => {
    stage.classList.add("is-inspecting");
    const linked = new Set(stackAdjacency[node.id] ?? []);
    for (const [id, element] of nodeEls) {
      element.classList.toggle("is-active", id === node.id);
      element.classList.toggle("is-linked", linked.has(id));
    }
    for (const { el: line, a, b } of edgeEls) {
      line.classList.toggle("is-hot", a === node.id || b === node.id);
    }

    const chain = el("ul", { class: "stackmap__chain" }, [
      el("li", {}, [node.label]),
      ...node.usedIn.map((system) => el("li", {}, [system])),
    ]);

    for (const [id, element] of nodeEls) {
      element.setAttribute("aria-pressed", pinned?.id === id ? "true" : "false");
    }

    panel.replaceChildren(
      el("p", { class: "stackmap__group" }, [stackGroupLabels[node.group]]),
      el("p", { class: "stackmap__name" }, [node.label]),
      el("p", { class: "stackmap__role" }, [node.role]),
      chain,
      el("p", { class: "stackmap__outcome" }, [node.outcome]),
    );
  };

  const reset = (): void => {
    stage.classList.remove("is-inspecting");
    for (const node of nodeEls.values()) {
      node.classList.remove("is-active", "is-linked");
      node.setAttribute("aria-pressed", "false");
    }
    for (const { el: line } of edgeEls) line.classList.remove("is-hot");
    panel.replaceChildren(...idle());
  };

  const clear = (): void => {
    if (pinned) inspect(pinned);
    else reset();
  };

  const togglePin = (node: StackNode): void => {
    if (pinned?.id === node.id) {
      pinned = null;
      reset();
      inspect(node);
    } else {
      pinned = node;
      inspect(node);
    }
  };

  for (const node of stackNodes) {
    const element = nodeEls.get(node.id);
    if (!element) continue;
    element.setAttribute("aria-pressed", "false");
    element.addEventListener("pointerenter", () => inspect(node));
    element.addEventListener("focus", () => inspect(node));
    element.addEventListener("blur", clear);
    // Tablets have no hover: a tap pins the node instead.
    element.addEventListener("click", () => togglePin(node));
    element.addEventListener("keydown", (event) => {
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
  reset();

  // Same deal as the architecture diagrams: no motion chunk until it is close.
  if (typeof IntersectionObserver === "undefined") {
    void assemble(stage, [...nodeEls.values()], edgeEls.map((entry) => entry.el));
  } else {
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        io.disconnect();
        void assemble(stage, [...nodeEls.values()], edgeEls.map((entry) => entry.el));
      },
      { rootMargin: "900px 0px" },
    );
    io.observe(stage);
  }
}

/**
 * The graph draws itself once, on entry: hubs first, then their links. Hidden
 * state is applied by the motion layer, never by CSS — no motion layer means a
 * fully drawn map instead of an empty box.
 */
async function assemble(
  stage: HTMLElement,
  nodes: SVGGElement[],
  edges: SVGLineElement[],
): Promise<void> {
  const motion = await getMotion();
  if (!motion) {
    stage.classList.add("is-assembled");
    return;
  }

  const { gsap } = motion;
  gsap.set(nodes, { opacity: 0, transformOrigin: "center", scale: 0.7 });
  gsap.set(edges, { opacity: 0 });

  gsap
    .timeline({
      defaults: { ease: "power2.out" },
      scrollTrigger: { trigger: stage, start: "top 80%", once: true },
      onComplete: () => stage.classList.add("is-assembled"),
    })
    .to(nodes, { opacity: 1, scale: 1, duration: 0.6, stagger: { each: 0.035, from: "center" } })
    .to(edges, { opacity: 1, duration: 0.5, stagger: 0.012 }, 0.18);
}

/**
 * The mobile counterpart.
 *
 * A 1000-unit network scaled into a 340px column is unreadable, and shrinking
 * it further would be a broken desktop layout rather than a designed mobile
 * one. Below the breakpoint the same data is laid out linearly — every node's
 * role, the systems it ran in, and what it made possible — so the section
 * still says what it means on a phone. CSS picks which one is in the document.
 */
function buildCards(): HTMLElement {
  const list = el("ul", { class: "stack-cards" });

  for (const group of Object.keys(stackGroupLabels) as StackGroup[]) {
    const members = stackNodes.filter((node) => node.group === group);
    if (members.length === 0) continue;

    list.append(el("li", { class: "stack-cards__group mono" }, [stackGroupLabels[group]]));

    for (const node of members) {
      list.append(
        el("li", { class: "stack-cards__item" }, [
          el("p", { class: "stack-cards__name mono" }, [node.label]),
          el("p", { class: "stack-cards__role" }, [node.role]),
          el(
            "ul",
            { class: "chips chips--sm" },
            node.usedIn.map((system) => el("li", {}, [system])),
          ),
          el("p", { class: "stack-cards__outcome" }, [node.outcome]),
        ]),
      );
    }
  }

  return list;
}
