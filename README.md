# Sahil Ghule — Portfolio

Personal site for **Sahil Dilip Ghule**, Backend & AI Systems Engineer.
Live at <https://code-maxx.github.io>.

The site is built as a small system rather than a page: a WebGL2 hero that
resolves an unstructured signal cloud into a layered architecture as you scroll,
interactive diagrams of the systems behind each role, the stack drawn as a
dependency graph, and a ⌘K command palette.

## Run it

```bash
npm install
npm run dev
```

| Script | What it does |
| --- | --- |
| `npm run dev` | Vite dev server on <http://localhost:5173> |
| `npm run build` | Type-check, then build to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run typecheck` | `tsc --noEmit` |

## Architecture

```
index.html          All prose content — semantic, indexable, readable with JS off
src/
  main.ts           Entry: marks the document script-enabled, mounts modules
  core/
    device.ts       Capability tiering; every expensive feature asks it first
    motion.ts       Owns GSAP + ScrollTrigger + Lenis (one ticker, one scroll)
    reveal.ts       Declarative entrance choreography with a hard failsafe
    scramble.ts     Text-decryption effect for short technical strings
    registry.ts     Mounts modules with per-module error containment
    dom.ts          Typed DOM/SVG helpers, focus trap
  components/       One file per feature (hero, graphs, palette, cursor, …)
  webgl/            Hand-written WebGL2 renderer for the hero field
  data/             Geometry and detail copy for the visualisations
  styles/           tokens → base → layout → components
public/             Static assets served from the site root
```

### Principles the code holds to

- **Content is never gated behind JavaScript.** All prose lives in `index.html`.
  Entrance states are applied by script, not CSS, so a failed bundle leaves a
  complete, readable page rather than an empty one. `reveal.ts` also carries a
  5-second failsafe.
- **Two sources of truth, cleanly split.** Markup owns prose; `src/data` owns
  geometry and the detail text that only exists inside a visualisation. Neither
  duplicates the other.
- **Nothing expensive starts on its own.** `device.ts` resolves a tier from core
  count, memory, pointer type and the user's data/motion preferences. The WebGL
  field is dynamically imported, only constructed when the hero is on screen,
  and stopped when it is not or when the tab is hidden.
- **Motion is a separate chunk, and optional.** Under `prefers-reduced-motion`
  GSAP and Lenis are never fetched at all — roughly 50 kB gzip that a user who
  asked for less should not have to download.
- **Every animation answers "why is this moving?"** The hero morph shows entropy
  becoming architecture. Architecture diagrams assemble in dataflow order.
  Packets travel edges that exist. Nothing moves only because it can.

### The hero field

`src/webgl/SystemField.ts` is a purpose-built WebGL2 renderer rather than a
scene-graph library. There is one thing to draw and its whole simulation —
drift, the cloud→lattice morph, pointer deflection and perspective — fits in a
vertex shader, so a frame costs two draw calls and no CPU geometry work. It
ships in about 4 kB gzip.

## Accessibility

`prefers-reduced-motion` is respected throughout; every diagram node is
focusable and labelled, with its explanation also written into a live text
readout; the command palette and case-study overlay use native `<dialog>` for
real modal semantics; focus is always visible; the custom cursor only appears
for an actual mouse and stands down permanently on the first touch.

## Deploy

Pushing to `main` runs `.github/workflows/deploy.yml`, which type-checks,
builds and publishes `dist/` to GitHub Pages.

**One-time setup:** in the repository, set **Settings → Pages → Source** to
**GitHub Actions** (it was previously "Deploy from a branch", which served the
old un-built site).
