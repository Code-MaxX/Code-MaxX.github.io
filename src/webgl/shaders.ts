/**
 * GLSL for the hero system field.
 *
 * The whole simulation lives in the vertex shader. Particle drift, the morph
 * from cloud to lattice, pointer deflection and perspective are all computed
 * per-vertex from static buffers plus a handful of uniforms — so a frame costs
 * two draw calls and zero CPU geometry work.
 */

const SYSTEM_COMMON = /* glsl */ `
uniform float u_time;
uniform float u_morph;      // 0 = free cloud, 1 = structured lattice
uniform mat3  u_rot;
uniform float u_focal;
uniform float u_aspect;
uniform float u_camZ;
uniform vec2  u_pointer;    // normalised device coords of the cursor
uniform float u_pointerAmp;

vec3 systemPosition(vec3 free, vec3 lattice, float seed) {
  float phase = seed * 6.2831853;
  vec3 drift = vec3(
    sin(u_time * 0.19 + phase),
    cos(u_time * 0.15 + phase * 1.37),
    sin(u_time * 0.11 + phase * 0.61)
  ) * 0.11;

  // Settle the drift as the lattice takes hold: order should look intentional.
  vec3 cloud = free + drift * (0.35 + 0.65 * (1.0 - u_morph));
  vec3 p = mix(cloud, lattice, u_morph);

  // Pointer field, strongest while the system is still unstructured.
  vec2 pointerWorld = u_pointer * vec2(u_aspect, 1.0) * (u_camZ / u_focal);
  vec2 delta = p.xy - pointerWorld;
  float falloff = exp(-dot(delta, delta) * 1.35);
  p.xy += normalize(delta + vec2(1e-4)) * falloff * u_pointerAmp * (1.0 - u_morph * 0.75);

  return u_rot * p;
}
`;

export const POINT_VERT = /* glsl */ `#version 300 es
precision highp float;

in vec3  a_free;
in vec3  a_lattice;
in float a_seed;
in float a_size;
in float a_tint;

${SYSTEM_COMMON}

uniform float u_pointScale;

out float v_depth;
out float v_tint;
out float v_seed;

void main() {
  vec3 p = systemPosition(a_free, a_lattice, a_seed);
  float viewZ = max(p.z + u_camZ, 0.15);

  vec2 ndc = vec2(p.x / u_aspect, p.y) * (u_focal / viewZ);
  gl_Position = vec4(ndc, 0.0, 1.0);
  gl_PointSize = clamp(u_pointScale * a_size * (u_focal / viewZ), 1.5, 34.0);

  v_depth = smoothstep(10.0, 1.4, viewZ);
  v_tint = a_tint;
  v_seed = a_seed;
}
`;

export const POINT_FRAG = /* glsl */ `#version 300 es
precision highp float;

uniform vec3  u_accent;
uniform vec3  u_accent2;
uniform float u_opacity;
uniform float u_time;
uniform float u_morph;

in float v_depth;
in float v_tint;
in float v_seed;

out vec4 fragColor;

void main() {
  vec2 uv = gl_PointCoord * 2.0 - 1.0;
  float r2 = dot(uv, uv);
  if (r2 > 1.0) discard;

  // Soft core with a firm falloff — a data point, not a bokeh blob.
  float core = pow(1.0 - r2, 1.55);

  // A slow per-node heartbeat once the architecture has assembled.
  float pulse = 0.72 + 0.28 * sin(u_time * 1.6 + v_seed * 24.0);
  float energy = mix(1.0, pulse, u_morph * 0.85);

  vec3 colour = mix(u_accent, u_accent2, v_tint);
  float alpha = core * v_depth * u_opacity * energy;
  fragColor = vec4(colour * alpha, alpha);
}
`;

export const LINE_VERT = /* glsl */ `#version 300 es
precision highp float;

in vec3  a_free;
in vec3  a_lattice;
in float a_seed;
in vec3  a_pfree;
in vec3  a_plattice;
in float a_pseed;
in float a_end;      // 0 at the source node, 1 at the target
in float a_tint;

${SYSTEM_COMMON}

out float v_alpha;
out float v_end;
out float v_tint;
out float v_seed;

void main() {
  vec3 self  = systemPosition(a_free, a_lattice, a_seed);
  vec3 other = systemPosition(a_pfree, a_plattice, a_pseed);
  vec3 p = mix(self, other, a_end);

  float viewZ = max(p.z + u_camZ, 0.15);
  vec2 ndc = vec2(p.x / u_aspect, p.y) * (u_focal / viewZ);
  gl_Position = vec4(ndc, 0.0, 1.0);

  // A connection reads more strongly the closer its endpoints are. In the
  // free cloud the pairs are scattered, so the mesh is a faint haze of
  // possible links; as the lattice forms every edge shortens and the real
  // topology resolves out of it.
  float span = distance(self, other);
  v_alpha = smoothstep(2.9, 0.22, span) * smoothstep(10.0, 1.8, viewZ);
  v_end = a_end;
  v_tint = a_tint;
  v_seed = a_seed;
}
`;

export const LINE_FRAG = /* glsl */ `#version 300 es
precision highp float;

uniform vec3  u_accent;
uniform vec3  u_accent2;
uniform float u_opacity;
uniform float u_time;
uniform float u_morph;

in float v_alpha;
in float v_end;
in float v_tint;
in float v_seed;

out vec4 fragColor;

void main() {
  vec3 colour = mix(u_accent, u_accent2, v_tint * 0.85);

  // Data in transit: a single packet travelling the edge, only once the
  // architecture has assembled enough for the direction to mean something.
  float travel = fract(v_end - u_time * 0.32 + v_seed * 7.0);
  float packet = smoothstep(0.965, 1.0, travel) * u_morph;

  float alpha = v_alpha * u_opacity * (0.3 + packet * 2.6);
  vec3 out_colour = mix(colour, vec3(1.0), packet * 0.45);
  fragColor = vec4(out_colour * alpha, alpha);
}
`;
