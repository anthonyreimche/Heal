// Safelight — founded and principally authored by Anthony Reimche.
// Copyright (C) 2026 Anthony Reimche. Licensed under the GNU GPL v3 with an
// attribution-preservation term (GPL v3 §7b) — see LICENSE. This notice must
// be preserved in derived versions.

// The spots, as the develop program draws them. Until Safelight 3.2.0 they were
// core's own. main() patches the source it samples with
// `src = applyRetouch(srcUv, src);`, and the patch pass bakes a patched copy of
// the whole source the frame then develops from; this stage declares that
// function, its uniforms and the brush atlas at the program's retouch anchor,
// and writes nothing into main() itself. While this extension is away core's
// stand-in returns the source as it is.

import type { Line, ProcessingStageContribution, UniformDeclaration } from "./safelight";

export const STAGE_ID = "safelight.heal.retouch";

/** Heal's spots: declarations only, at the retouch anchor, for main()'s
 *  `src = applyRetouch(srcUv, src);` and the patch pass. Line 1 clips a heal's
 *  recoloured source to [0, 1]; later lines keep a linear source's range. */
const healSourceColour = (line: Line): string =>
  line === 1
    ? "clamp(textureLod(uImage, sUv, 0.0).rgb + corr, 0.0, 1.0);"
    : `textureLod(uImage, sUv, 0.0).rgb + corr;
    // A display-encoded source holds nothing outside [0, 1], and its decode
    // (srgbToLinear) is undefined below -0.055, which the correction can reach.
    if (!uLinear) srcCol = clamp(srcCol, 0.0, 1.0);`;

const healHelpers = (line: Line): string => `// ---- Retouch: spot heal / clone -------------------------------------------
// Closed-form gradient-domain (membrane) correction for a heal spot. Samples the
// boundary mismatch (destination - source) just outside the disc and interpolates
// it across the interior with inverse-distance (Shepard) weights — a smooth
// low-frequency field that makes the copied source meet its surroundings
// seamlessly even across a tone gradient. This is the per-pixel generalisation of
// the single mean-colour offset carried in uSpotTint. Both terms sample uImage so
// the correction stays in source space (it is added to the source patch, then the
// whole patched image is developed downstream — matching the flat-tint path).
vec3 membraneCorrection(vec2 dst, vec2 src, vec4 tc, float radius, vec2 uv) {
  vec2 q = vec2((uv.x - dst.x) * uImageAspect, uv.y - dst.y); // pixel in aspect space
  vec3 acc = vec3(0.0);
  float wsum = 0.0;
  const int N = 16;
  for (int k = 0; k < N; k++) {
    float a = (float(k) + 0.5) / float(N) * 6.2831853;
    vec2 e = vec2(cos(a), sin(a)) * radius * 1.04;       // boundary point (aspect space)
    vec2 dUv = clamp(dst + vec2(e.x / uImageAspect, e.y), 0.0, 1.0);
    // Same inverse rotate+scale the patch fetch uses, so the source boundary point
    // corresponds to the same place in the copied texture.
    float rx = (tc.x * e.x + tc.y * e.y) * tc.z;
    float ry = (-tc.y * e.x + tc.x * e.y) * tc.z;
    vec2 sUv = clamp(src + vec2(rx / uImageAspect, ry), 0.0, 1.0);
    // Explicit LOD: this runs in divergent control flow (inside the per-spot
    // branch), where auto-LOD derivatives are undefined and sample wrong mips.
    vec3 delta = textureLod(uImage, dUv, 0.0).rgb - textureLod(uImage, sUv, 0.0).rgb;
    float dist = length(q - e) + 1e-3;
    float w = 1.0 / (dist * dist);                        // mean-value-style weighting
    acc += delta * w;
    wsum += w;
  }
  return acc / max(wsum, 1e-4);
}

vec3 applyRetouch(vec2 uv, vec3 base) {
  vec3 c = base;
  for (int i = 0; i < MAX_SPOTS; i++) {
    if (i >= uSpotCount) break;
    vec4 a = uSpotA[i];
    vec4 b = uSpotB[i];
    vec2 dst = a.xy;
    vec2 src = a.zw;                  // source-patch centre
    vec4 tc = uSpotC[i];             // cosA, sinA, 1/scale
    float radius = max(b.x, 1e-4);
    float feather = b.y;
    float opacity = b.z;
    // Offset from the spot centre in image-height units (aspect-corrected so the
    // disc stays round on screen).
    float dx = (uv.x - dst.x) * uImageAspect;
    float dy = uv.y - dst.y;
    float dist = length(vec2(dx, dy));
    // The marked radius is fully replaced, so the blemish is removed outright;
    // feather softens the seam by fading out *beyond* the radius rather than
    // carving into the core (which only made the blemish go lighter, not gone).
    // feather=0 -> hard edge; feather=1 -> blend out to 2x the radius.
    float edge = radius * (1.0 + feather);
    if (dist >= edge) continue;
    float w = opacity * (1.0 - smoothstep(radius, edge, dist));
    if (w <= 0.0) continue;
    // Fetch the source with the inverse rotation+scale, so the patch lands
    // rotated by +angle and scaled by +scale to match the surrounding texture.
    float rx = (tc.x * dx + tc.y * dy) * tc.z;
    float ry = (-tc.y * dx + tc.x * dy) * tc.z;
    vec2 sUv = clamp(src + vec2(rx / uImageAspect, ry), 0.0, 1.0);
    // Recolour toward the destination's surroundings so the seam disappears. Heal
    // spots (b.w > 0.5) use the per-pixel gradient-domain membrane; clone spots —
    // and the membrane A/B toggle when off — fall back to the flat mean offset.
    vec3 corr = (uMembraneHeal && b.w > 0.5)
      ? membraneCorrection(dst, src, tc, radius, uv)
      : uSpotTint[i].rgb;
    vec3 srcCol = ${healSourceColour(line)}
    c = mix(c, srcCol, w);
  }
  // Brush-shaped retouch: painted coverage from the atlas, one source offset each.
  if (uRetouchCount > 0) {
    vec4 rcov = texture(uRetouchTex, uv);
    for (int i = 0; i < MAX_RBRUSH; i++) {
      if (i >= uRetouchCount) break;
      int ch = uRetouchCh[i];
      float cov = ch == 0 ? rcov.r : (ch == 1 ? rcov.g : (ch == 2 ? rcov.b : rcov.a));
      vec4 rd = uRetouchData[i];
      float w = cov * rd.z;
      if (w <= 0.0) continue;
      vec2 sUv = clamp(uv + rd.xy, 0.0, 1.0);
      vec3 srcCol = texture(uImage, sUv).rgb;
      c = mix(c, srcCol, w);
    }
  }
  return c;
}`;

/** The most circle spots and brush strokes the program draws. */
export const MAX_SPOTS = 32;
export const MAX_RBRUSH = 4;

const spotArray = (key: string, size: string, length: number): UniformDeclaration => ({
  key,
  glslType: "vec4",
  length,
  size,
  default: new Array(length * 4).fill(0),
});

/** `rows` of four flattened, then zero-filled to `length` rows. */
const rowsOf = (rows: number[][], length: number): number[] =>
  [...rows.flat(), ...new Array((length - rows.length) * 4).fill(0)];

/** The stage of release line `line`. */
export const healStage = (line: Line): ProcessingStageContribution => ({
  id: STAGE_ID,
  name: "Heal",
  phase: "geometry",
  anchor: "retouch",
  glsl: "",
  helpers: healHelpers(line),
  defines: { MAX_SPOTS, MAX_RBRUSH },
  uniforms: [
    { key: "uSpotCount", glslType: "int", default: 0 },
    spotArray("uSpotA", "MAX_SPOTS", MAX_SPOTS),
    spotArray("uSpotB", "MAX_SPOTS", MAX_SPOTS),
    spotArray("uSpotC", "MAX_SPOTS", MAX_SPOTS),
    spotArray("uSpotTint", "MAX_SPOTS", MAX_SPOTS),
    { key: "uRetouchCount", glslType: "int", default: 0 },
    { key: "uRetouchCh", glslType: "int", length: MAX_RBRUSH, size: "MAX_RBRUSH", default: [0, 0, 0, 0] },
    spotArray("uRetouchData", "MAX_RBRUSH", MAX_RBRUSH),
    { key: "uMembraneHeal", glslType: "bool", default: true },
  ],
  textures: [{ key: "uRetouchTex", kind: "atlas" }],
  patch: { active: ["uSpotCount", "uRetouchCount"] },
  derive: ({ retouch }) => {
    const shown = retouch.filter((s) => s.visible !== false);
    const circles = shown.filter((s) => s.shape !== "brush").slice(0, MAX_SPOTS);
    const brushes = shown
      .flatMap((s) => (s.shape === "brush" && s.dabs && s.dabs.length > 0 ? [{ ...s, dabs: s.dabs }] : []))
      .slice(0, MAX_RBRUSH);
    const tint = (s: (typeof circles)[number], v: number | undefined) => (s.mode === "clone" ? 0 : (v ?? 0));
    return {
      uSpotCount: circles.length,
      uSpotA: rowsOf(circles.map((s) => [s.dstX, s.dstY, s.srcX, s.srcY]), MAX_SPOTS),
      uSpotB: rowsOf(
        circles.map((s) => [s.radius, s.feather / 100, s.opacity / 100, s.mode === "clone" ? 0 : 1]),
        MAX_SPOTS,
      ),
      uSpotC: rowsOf(
        circles.map((s) => [Math.cos(s.angle ?? 0), Math.sin(s.angle ?? 0), 1 / (s.scale || 1), 0]),
        MAX_SPOTS,
      ),
      uSpotTint: rowsOf(
        circles.map((s) => [tint(s, s.recolorR), tint(s, s.recolorG), tint(s, s.recolorB), 0]),
        MAX_SPOTS,
      ),
      uRetouchCount: brushes.length,
      uRetouchCh: [0, 1, 2, 3],
      uRetouchData: rowsOf(
        brushes.map((s) => [s.srcX - s.dstX, s.srcY - s.dstY, s.opacity / 100, 0]),
        MAX_RBRUSH,
      ),
      uRetouchTex: brushes.map((s) => ({ id: s.id, dabs: s.dabs })),
    };
  },
});
