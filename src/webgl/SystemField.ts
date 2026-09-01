/**
 * SystemField — the hero visualisation.
 *
 * A distributed system rendered as geometry: nodes begin as an unstructured
 * cloud of signal and, as you scroll in, resolve into a layered topology with
 * traffic moving along its edges. Entropy becoming architecture — which is
 * what the rest of the page is about.
 *
 * Built directly on WebGL2 rather than a scene graph library. There is exactly
 * one thing to draw, its whole simulation fits in a vertex shader, and doing
 * it by hand keeps the payload at a few kilobytes with two draw calls a frame
 * and no per-frame allocation.
 */

import { LINE_FRAG, LINE_VERT, POINT_FRAG, POINT_VERT } from "./shaders";

export type SystemFieldOptions = {
  canvas: HTMLCanvasElement;
  particles: number;
  dpr: number;
  accent: [number, number, number];
  accent2: [number, number, number];
};

type Uniforms = Record<string, WebGLUniformLocation | null>;

const LAYERS = 5;
const LAYER_SPAN = 4.1;
const CAM_Z = 4.6;
const FOCAL = 2.15;

/** Deterministic PRNG — the same system assembles on every visit. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Geometry = {
  count: number;
  free: Float32Array;
  lattice: Float32Array;
  seed: Float32Array;
  size: Float32Array;
  tint: Float32Array;
  edges: [number, number][];
  layerOf: Uint8Array;
};

function buildGeometry(particles: number): Geometry {
  const rand = mulberry32(0x5ab1);
  const perLayer = Math.max(8, Math.floor(particles / LAYERS));
  const count = perLayer * LAYERS;

  const free = new Float32Array(count * 3);
  const lattice = new Float32Array(count * 3);
  const seed = new Float32Array(count);
  const size = new Float32Array(count);
  const tint = new Float32Array(count);
  const layerOf = new Uint8Array(count);

  // Each layer is a jittered grid: a service tier, not a random slice.
  const cols = Math.max(3, Math.round(Math.sqrt(perLayer * 1.7)));
  const rows = Math.max(2, Math.ceil(perLayer / cols));

  let i = 0;
  for (let layer = 0; layer < LAYERS; layer += 1) {
    const z = (layer / (LAYERS - 1) - 0.5) * LAYER_SPAN;
    for (let n = 0; n < perLayer; n += 1) {
      const col = n % cols;
      const row = Math.floor(n / cols) % rows;
      const gx = (col / (cols - 1) - 0.5) * 2.62;
      const gy = (rows > 1 ? row / (rows - 1) - 0.5 : 0) * 1.5;

      const o = i * 3;
      lattice[o] = gx + (rand() - 0.5) * 0.16;
      lattice[o + 1] = gy + (rand() - 0.5) * 0.16;
      lattice[o + 2] = z + (rand() - 0.5) * 0.1;

      // Free state: a wide, shallow shell of unresolved signal.
      const theta = rand() * Math.PI * 2;
      const radius = 0.95 + rand() * 2.0;
      free[o] = Math.cos(theta) * radius * 1.2;
      free[o + 1] = Math.sin(theta) * radius * 0.66;
      free[o + 2] = (rand() - 0.5) * 3.6;

      seed[i] = rand();
      // A few nodes read larger — hubs, not uniform dust.
      size[i] = rand() < 0.07 ? 4.4 + rand() * 2.8 : 1.55 + rand() * 1.35;
      // A minority take the secondary accent: a second system in the mesh.
      tint[i] = rand() < 0.14 ? 0.85 + rand() * 0.15 : rand() * 0.12;
      layerOf[i] = layer;
      i += 1;
    }
  }

  return { count, free, lattice, seed, size, tint, edges: buildEdges(lattice, layerOf, perLayer), layerOf };
}

/**
 * Feed-forward topology: every node links to its nearest neighbours in the
 * next tier, plus one sideways link inside its own tier. Computed once against
 * the lattice positions, then reused for both states.
 */
function buildEdges(
  lattice: Float32Array,
  layerOf: Uint8Array,
  perLayer: number,
): [number, number][] {
  const edges: [number, number][] = [];
  const total = layerOf.length;

  const dist2 = (a: number, b: number): number => {
    const ax = lattice[a * 3]! - lattice[b * 3]!;
    const ay = lattice[a * 3 + 1]! - lattice[b * 3 + 1]!;
    return ax * ax + ay * ay;
  };

  for (let i = 0; i < total; i += 1) {
    const layer = layerOf[i]!;
    if (layer < LAYERS - 1) {
      const start = (layer + 1) * perLayer;
      const end = start + perLayer;
      let best = -1;
      let second = -1;
      let bestD = Infinity;
      let secondD = Infinity;
      for (let j = start; j < end; j += 1) {
        const d = dist2(i, j);
        if (d < bestD) {
          secondD = bestD;
          second = best;
          bestD = d;
          best = j;
        } else if (d < secondD) {
          secondD = d;
          second = j;
        }
      }
      if (best >= 0) edges.push([i, best]);
      // A second link only where the two are genuinely adjacent — otherwise
      // the topology stops reading as tiers and becomes a hairball.
      if (second >= 0 && secondD < 0.42) edges.push([i, second]);
    }
    // One lateral link keeps each tier legible as a tier.
    const neighbour = i + 1;
    if (neighbour < total && layerOf[neighbour] === layer && dist2(i, neighbour) < 0.24) {
      edges.push([i, neighbour]);
    }
  }
  return edges;
}

function compile(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("shader alloc failed");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`shader compile failed: ${log ?? "unknown"}`);
  }
  return shader;
}

function link(gl: WebGL2RenderingContext, vert: string, frag: string): WebGLProgram {
  const program = gl.createProgram();
  if (!program) throw new Error("program alloc failed");
  const vs = compile(gl, gl.VERTEX_SHADER, vert);
  const fs = compile(gl, gl.FRAGMENT_SHADER, frag);
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error(`program link failed: ${log ?? "unknown"}`);
  }
  return program;
}

function uniforms(gl: WebGL2RenderingContext, program: WebGLProgram, names: string[]): Uniforms {
  const map: Uniforms = {};
  for (const name of names) map[name] = gl.getUniformLocation(program, name);
  return map;
}

const SHARED_UNIFORMS = [
  "u_time", "u_morph", "u_rot", "u_focal", "u_aspect", "u_camZ",
  "u_pointer", "u_pointerAmp", "u_fit", "u_accent", "u_accent2", "u_opacity",
];

export class SystemField {
  private readonly canvas: HTMLCanvasElement;
  private readonly gl: WebGL2RenderingContext;
  private readonly dpr: number;
  private readonly accent: [number, number, number];
  private readonly accent2: [number, number, number];

  private pointProgram!: WebGLProgram;
  private lineProgram!: WebGLProgram;
  private pointUniforms!: Uniforms;
  private lineUniforms!: Uniforms;
  private pointVao!: WebGLVertexArrayObject;
  private lineVao!: WebGLVertexArrayObject;
  private readonly buffers: WebGLBuffer[] = [];

  private pointCount = 0;
  private lineVertexCount = 0;

  private readonly rot = new Float32Array(9);
  private running = false;
  private raf = 0;
  private startTime = 0;
  private lastTime = 0;

  private morph = 0;
  private morphTarget = 0;
  private opacity = 0;
  private opacityTarget = 1;
  private pointerX = 0;
  private pointerY = 0;
  private pointerTargetX = 0;
  private pointerTargetY = 0;
  private aspect = 1;

  constructor(options: SystemFieldOptions) {
    this.canvas = options.canvas;
    this.dpr = options.dpr;
    this.accent = options.accent;
    this.accent2 = options.accent2;

    const gl = this.canvas.getContext("webgl2", {
      alpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: true,
      powerPreference: "high-performance",
      preserveDrawingBuffer: false,
      desynchronized: true,
    });
    if (!gl) throw new Error("webgl2 unavailable");
    this.gl = gl;

    this.setup(buildGeometry(options.particles));
    this.canvas.addEventListener("webglcontextlost", this.onContextLost);
  }

  private onContextLost = (event: Event): void => {
    // Keep the page alive; the hero simply stops drawing.
    event.preventDefault();
    this.stop();
  };

  private setup(geometry: Geometry): void {
    const gl = this.gl;

    this.pointProgram = link(gl, POINT_VERT, POINT_FRAG);
    this.lineProgram = link(gl, LINE_VERT, LINE_FRAG);
    this.pointUniforms = uniforms(gl, this.pointProgram, [...SHARED_UNIFORMS, "u_pointScale"]);
    this.lineUniforms = uniforms(gl, this.lineProgram, SHARED_UNIFORMS);

    // ---- Points -----------------------------------------------------------
    this.pointCount = geometry.count;
    this.pointVao = this.createVao();
    this.attribute(this.pointProgram, "a_free", geometry.free, 3);
    this.attribute(this.pointProgram, "a_lattice", geometry.lattice, 3);
    this.attribute(this.pointProgram, "a_seed", geometry.seed, 1);
    this.attribute(this.pointProgram, "a_size", geometry.size, 1);
    this.attribute(this.pointProgram, "a_tint", geometry.tint, 1);

    // ---- Lines ------------------------------------------------------------
    const edgeCount = geometry.edges.length;
    this.lineVertexCount = edgeCount * 2;
    const free = new Float32Array(this.lineVertexCount * 3);
    const latt = new Float32Array(this.lineVertexCount * 3);
    const seed = new Float32Array(this.lineVertexCount);
    const pfree = new Float32Array(this.lineVertexCount * 3);
    const platt = new Float32Array(this.lineVertexCount * 3);
    const pseed = new Float32Array(this.lineVertexCount);
    const end = new Float32Array(this.lineVertexCount);
    const tint = new Float32Array(this.lineVertexCount);

    for (let e = 0; e < edgeCount; e += 1) {
      const [a, b] = geometry.edges[e]!;
      for (let v = 0; v < 2; v += 1) {
        const idx = e * 2 + v;
        const o = idx * 3;
        for (let k = 0; k < 3; k += 1) {
          free[o + k] = geometry.free[a * 3 + k]!;
          latt[o + k] = geometry.lattice[a * 3 + k]!;
          pfree[o + k] = geometry.free[b * 3 + k]!;
          platt[o + k] = geometry.lattice[b * 3 + k]!;
        }
        seed[idx] = geometry.seed[a]!;
        pseed[idx] = geometry.seed[b]!;
        end[idx] = v;
        tint[idx] = Math.max(geometry.tint[a]!, geometry.tint[b]!);
      }
    }

    this.lineVao = this.createVao();
    this.attribute(this.lineProgram, "a_free", free, 3);
    this.attribute(this.lineProgram, "a_lattice", latt, 3);
    this.attribute(this.lineProgram, "a_seed", seed, 1);
    this.attribute(this.lineProgram, "a_pfree", pfree, 3);
    this.attribute(this.lineProgram, "a_plattice", platt, 3);
    this.attribute(this.lineProgram, "a_pseed", pseed, 1);
    this.attribute(this.lineProgram, "a_end", end, 1);
    this.attribute(this.lineProgram, "a_tint", tint, 1);

    gl.bindVertexArray(null);
    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    // Premultiplied additive: light accumulates, nothing darkens the page.
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);
    this.setRotation(0, 0);
  }

  private createVao(): WebGLVertexArrayObject {
    const vao = this.gl.createVertexArray();
    if (!vao) throw new Error("vao alloc failed");
    this.gl.bindVertexArray(vao);
    return vao;
  }

  private attribute(
    program: WebGLProgram,
    name: string,
    data: Float32Array,
    size: number,
  ): void {
    const gl = this.gl;
    const location = gl.getAttribLocation(program, name);
    if (location < 0) return;
    const buffer = gl.createBuffer();
    if (!buffer) throw new Error("buffer alloc failed");
    this.buffers.push(buffer);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, size, gl.FLOAT, false, 0, 0);
  }

  /** Yaw/pitch as a 3x3 — a full matrix stack would be four extra kilobytes. */
  private setRotation(yaw: number, pitch: number): void {
    const cy = Math.cos(yaw);
    const sy = Math.sin(yaw);
    const cx = Math.cos(pitch);
    const sx = Math.sin(pitch);
    const m = this.rot;
    m[0] = cy;      m[1] = sy * sx;   m[2] = -sy * cx;
    m[3] = 0;       m[4] = cx;        m[5] = sx;
    m[6] = sy;      m[7] = -cy * sx;  m[8] = cy * cx;
  }

  resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width * this.dpr));
    const height = Math.max(1, Math.round(rect.height * this.dpr));
    if (this.canvas.width === width && this.canvas.height === height) return;
    this.canvas.width = width;
    this.canvas.height = height;
    this.aspect = rect.width / Math.max(1, rect.height);
    this.gl.viewport(0, 0, width, height);
  }

  /** Scroll progress through the hero, 0 → 1. Drives cloud → architecture. */
  setProgress(progress: number): void {
    this.morphTarget = Math.min(1, Math.max(0, progress));
  }

  setPointer(x: number, y: number): void {
    this.pointerTargetX = x;
    this.pointerTargetY = y;
  }

  setOpacity(value: number): void {
    this.opacityTarget = Math.min(1, Math.max(0, value));
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.startTime = performance.now();
    this.lastTime = this.startTime;
    this.raf = requestAnimationFrame(this.frame);
  }

  stop(): void {
    this.running = false;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  private frame = (now: number): void => {
    if (!this.running) return;
    this.raf = requestAnimationFrame(this.frame);

    // Clamp dt so a backgrounded tab does not resume with a jump.
    const dt = Math.min(0.05, (now - this.lastTime) / 1000);
    this.lastTime = now;
    const time = (now - this.startTime) / 1000;

    const k = 1 - Math.exp(-dt * 6);
    this.morph += (this.morphTarget - this.morph) * k;
    this.opacity += (this.opacityTarget - this.opacity) * (1 - Math.exp(-dt * 3));
    this.pointerX += (this.pointerTargetX - this.pointerX) * (1 - Math.exp(-dt * 4));
    this.pointerY += (this.pointerTargetY - this.pointerY) * (1 - Math.exp(-dt * 4));

    // The camera drifts a little with the cursor: parallax, not a joystick.
    // It also swings towards a three-quarter view as the lattice forms — from
    // straight on, five stacked tiers project onto each other and read as one
    // mesh; from an angle they read as layers, which is the point.
    this.setRotation(
      this.pointerX * 0.2 + Math.sin(time * 0.07) * 0.05 + this.morph * 0.46,
      -this.pointerY * 0.14 - this.morph * 0.1,
    );

    this.render(time);
  };

  private applyShared(u: Uniforms, time: number): void {
    const gl = this.gl;
    gl.uniform1f(u["u_time"]!, time);
    gl.uniform1f(u["u_morph"]!, this.morph);
    gl.uniformMatrix3fv(u["u_rot"]!, false, this.rot);
    gl.uniform1f(u["u_focal"]!, FOCAL);
    gl.uniform1f(u["u_aspect"]!, this.aspect);
    gl.uniform1f(u["u_camZ"]!, CAM_Z - this.morph * 0.75);
    gl.uniform2f(u["u_pointer"]!, this.pointerX, this.pointerY);
    gl.uniform1f(u["u_pointerAmp"]!, 0.55);
    // Dividing x by a portrait aspect magnifies the field, so a phone sees a
    // narrow slice of the middle instead of the whole system — which is why it
    // read as a dense hairball. Pull most of that magnification back out.
    gl.uniform1f(u["u_fit"]!, this.aspect < 1 ? 1 - 0.62 * (1 - this.aspect) : 1);
    gl.uniform3fv(u["u_accent"]!, this.accent);
    gl.uniform3fv(u["u_accent2"]!, this.accent2);
    gl.uniform1f(u["u_opacity"]!, this.opacity);
  }

  private render(time: number): void {
    const gl = this.gl;
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(this.lineProgram);
    this.applyShared(this.lineUniforms, time);
    gl.bindVertexArray(this.lineVao);
    gl.drawArrays(gl.LINES, 0, this.lineVertexCount);

    gl.useProgram(this.pointProgram);
    this.applyShared(this.pointUniforms, time);
    gl.uniform1f(this.pointUniforms["u_pointScale"]!, this.dpr * 3.4);
    gl.bindVertexArray(this.pointVao);
    gl.drawArrays(gl.POINTS, 0, this.pointCount);

    gl.bindVertexArray(null);
  }

  destroy(): void {
    this.stop();
    this.canvas.removeEventListener("webglcontextlost", this.onContextLost);
    const gl = this.gl;
    for (const buffer of this.buffers) gl.deleteBuffer(buffer);
    gl.deleteVertexArray(this.pointVao);
    gl.deleteVertexArray(this.lineVao);
    gl.deleteProgram(this.pointProgram);
    gl.deleteProgram(this.lineProgram);
    gl.getExtension("WEBGL_lose_context")?.loseContext();
  }
}
