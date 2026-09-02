// Small self-contained toolbox: rng, value noise, colour, geometry buffers.
// No THREE dependency — geometry is accumulated into flat arrays and handed to
// THREE only at the very end (toGeo). Everything is deterministic.

// ------------------------------------------------------------------- random
export function makeRng(seed) {
  let a = 0;
  if (typeof seed === 'string') { for (let i = 0; i < seed.length; i++) a = (a * 31 + seed.charCodeAt(i)) >>> 0; }
  else a = (seed >>> 0) || 1;
  a = (a + 0x9e3779b9) >>> 0;
  return function rng() {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const rr = (rng, a, b) => a + (b - a) * rng();
export const ri = (rng, a, b) => Math.floor(a + (b - a + 1) * rng());
export const pick = (rng, arr) => arr[Math.min(arr.length - 1, Math.floor(rng() * arr.length))];

// -------------------------------------------------------------------- maths
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
export const gauss = (d, w) => Math.exp(-(d * d) / (w * w));

// ------------------------------------------------------------- value noise
function h2(ix, iy, s) {
  let n = ix * 374761393 + iy * 668265263 + s * 2246822519;
  n = (n ^ (n >>> 13)) >>> 0;
  n = Math.imul(n, 1274126177) >>> 0;
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}
export function vnoise(x, y, s = 0) {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const a = h2(ix, iy, s), b = h2(ix + 1, iy, s), c = h2(ix, iy + 1, s), d = h2(ix + 1, iy + 1, s);
  return lerp(lerp(a, b, ux), lerp(c, d, ux), uy) * 2 - 1;
}
export function fbm(x, y, oct = 4, lac = 2.03, gain = 0.5, s = 0) {
  let v = 0, amp = 1, f = 1, norm = 0;
  for (let i = 0; i < oct; i++) { v += amp * vnoise(x * f, y * f, s + i * 17); norm += amp; amp *= gain; f *= lac; }
  return v / norm;
}
export function ridged(x, y, oct = 4, s = 0) {
  let v = 0, amp = 1, f = 1, norm = 0;
  for (let i = 0; i < oct; i++) { v += amp * (1 - Math.abs(vnoise(x * f, y * f, s + i * 31))); norm += amp; amp *= 0.5; f *= 2.07; }
  return (v / norm) * 2 - 1;
}

// ------------------------------------------------------------------ colour
// sRGB hex -> linear float triple. Vertex-colour attributes are consumed as
// linear-srgb by three, so the conversion has to happen here.
const s2l = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
export function lin(hex) {
  const r = ((hex >> 16) & 255) / 255, g = ((hex >> 8) & 255) / 255, b = (hex & 255) / 255;
  return [s2l(r), s2l(g), s2l(b)];
}
export const mixc = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
export const scalec = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
export function jitc(c, rng, k) { const f = 1 + (rng() - 0.5) * 2 * k; return [c[0] * f, c[1] * f, c[2] * f]; }

// -------------------------------------------------------------- geom buffer
export function buf() { return { pos: [], col: [] }; }
export function tri(B, a, b, c, ca, cb, cc) {
  B.pos.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
  cb = cb || ca; cc = cc || ca;
  B.col.push(ca[0], ca[1], ca[2], cb[0], cb[1], cb[2], cc[0], cc[1], cc[2]);
}
export function quad(B, a, b, c, d, ca, cb, cc, cd) {
  tri(B, a, b, c, ca, cb || ca, cc || ca);
  tri(B, a, c, d, ca, cc || ca, cd || ca);
}
export function bufTris(B) { return B.pos.length / 9; }
export function appendBuf(dst, src) {
  for (let i = 0; i < src.pos.length; i++) dst.pos.push(src.pos[i]);
  for (let i = 0; i < src.col.length; i++) dst.col.push(src.col[i]);
}

// ------------------------------------- COLLISION-SAFE TRIANGLE SIZE
// MAP-CLEANUP INCREMENT 22, defect class 1, the third instance of it.
// `bench/public/js/play/collision.js` bins the world into 6 m cells and
// SILENTLY drops any triangle whose footprint in the collision plane covers
// more than `maxCellsPerTri = 64` of them. §22.2 caught that eating 100 % of
// `terrain-rim`; the same predicate was also eating the big flat cap triangles
// of three collidable meshes — a fan-triangulated lodge roof spans its whole
// footprint, so an 60 x 65 m building contributes 60 x 65 m TRIANGLES.
//
// The fix is not a threshold: it is THE BENCH'S OWN PREDICATE, run at build
// time with margin. A triangle is split while its footprint in the collision
// plane covers more than `maxCells = 48` six-metre bins — the same
// `floor(min/cell) .. floor(max/cell)` arithmetic `collision.js` does, held 16
// cells under its 64 so the rule survives the `Math.round` the grid builder
// applies to its own step.
//
// MEASURING THE FOOTPRINT RATHER THAN THE SPAN IS WORTH 3,087 TRIANGLES, and
// on a budget with 4.2 k of headroom that is the difference between affordable
// and not. The first cut of this capped each axis at 36 m — the rule `RIM.step`
// obeys, and the right rule for a REGULAR GRID where every quad is square.
// These meshes are fan-triangulated building plans, so they are full of long
// thin slivers instead: 40 m by 4 m covers 8 x 1 = 8 cells and the bench keeps
// it happily, but a per-axis cap splits it anyway. Splitting on the PRODUCT
// costs +462 collidable triangles where the per-axis cap cost +3,549, and both
// leave exactly the same zero dropped.
//
// MIDPOINT SUBDIVISION IS GEOMETRY- AND COLOUR-PRESERVING HERE, which is why
// this is safe to run on meshes that ship. A triangle is planar, so its edge
// midpoints lie on it; the buffers are non-indexed with per-vertex colour, and
// linear colour interpolation at a midpoint is precisely what the rasteriser
// was already computing for that point.
//
// MEASURED, NOT ASSERTED — and it is not quite pixel-identical, so the claim is
// stated the way it actually came out. `work/shoot_split.mjs` shoots the two
// split meshes with the split on and off:
//   the base lodges   PSNR 48.0 dB, mean |dY| 0.033/255, worst pixel 36/255
//   the granite dome  PSNR 69.0 dB, mean |dY| 0.0006/255, worst pixel 36/255
// and `renders/lint-fixes/split-village-lodge.diffx10.png` — the difference at
// 10x gain — says where that lives: a ONE-PIXEL HAIRLINE along the roof
// silhouette and pure black everywhere else. The shaded surface is unchanged;
// what moves is which pixels the roof EDGE covers, because a float32 midpoint
// of two float32 endpoints is not exactly collinear with them. That is
// rasterisation noise on a silhouette, not a shading change, and the flat-face
// interiors — the thing that could have gone wrong through
// `computeVertexNormals()` re-averaging at the new vertices — are bit-identical.
//
// THE COLLISION PLANE IS (x, y) OF THESE BUFFERS, NOT (x, z). The buffers are
// ENU/z-up; the player converts (x, y, z) -> (x, z, -y) before binning, so the
// two axes that get binned are this buffer's x and y and the UP axis is its z.
// Splitting on the wrong pair bins against elevation and does nothing.
export function splitForCollision(B, { cell = 6, maxCells = 48, maxDepth = 6 } = {}) {
  const P = B.pos, C = B.col;
  const out = { pos: [], col: [] };
  let split = 0;
  const emit = (a, b, c, ca, cb, cc) => {
    out.pos.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
    out.col.push(ca[0], ca[1], ca[2], cb[0], cb[1], cb[2], cc[0], cc[1], cc[2]);
  };
  const mid = (u, v) => [(u[0] + v[0]) / 2, (u[1] + v[1]) / 2, (u[2] + v[2]) / 2];
  const cells = (a, b, c) => {
    const ix = Math.floor(Math.max(a[0], b[0], c[0]) / cell) - Math.floor(Math.min(a[0], b[0], c[0]) / cell) + 1;
    const iy = Math.floor(Math.max(a[1], b[1], c[1]) / cell) - Math.floor(Math.min(a[1], b[1], c[1]) / cell) + 1;
    return ix * iy;
  };
  const rec = (a, b, c, ca, cb, cc, d) => {
    if (d >= maxDepth || cells(a, b, c) <= maxCells) { emit(a, b, c, ca, cb, cc); return; }
    // 1-to-4 midpoint split: no T-junctions against the three neighbours,
    // because every neighbour that shares a long edge is over the span too and
    // splits that edge at the same midpoint.
    const ab = mid(a, b), bc = mid(b, c), ca2 = mid(c, a);
    const cab = mixc(ca, cb, 0.5), cbc = mixc(cb, cc, 0.5), cca = mixc(cc, ca, 0.5);
    rec(a, ab, ca2, ca, cab, cca, d + 1);
    rec(ab, b, bc, cab, cb, cbc, d + 1);
    rec(ca2, bc, c, cca, cbc, cc, d + 1);
    rec(ab, bc, ca2, cab, cbc, cca, d + 1);
    split++;
  };
  for (let t = 0; t < P.length; t += 9) {
    const a = [P[t], P[t + 1], P[t + 2]], b = [P[t + 3], P[t + 4], P[t + 5]], c = [P[t + 6], P[t + 7], P[t + 8]];
    const ca = [C[t], C[t + 1], C[t + 2]], cb = [C[t + 3], C[t + 4], C[t + 5]], cc = [C[t + 6], C[t + 7], C[t + 8]];
    rec(a, b, c, ca, cb, cc, 0);
  }
  B.pos = out.pos; B.col = out.col;
  return { split, tris: out.pos.length / 9 };
}

export function toGeo(THREE, B, { normals = true } = {}) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(B.pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(B.col, 3));
  if (normals) g.computeVertexNormals();
  g.computeBoundingSphere();
  return g;
}

// Face-normal driven snow: every triangle whose normal points up enough gets
// blended toward snow. This is what makes near-black rock read as "rock with
// snow lace on every ledge" without a texture.
export function snowLace(B, { snow, lo = 0.35, hi = 0.80, amount = 1.0, patchy = 0.0, seed = 3 } = {}) {
  const P = B.pos, C = B.col;
  const rng = makeRng(seed);
  for (let t = 0; t < P.length; t += 9) {
    const ax = P[t], ay = P[t + 1], az = P[t + 2];
    const e1x = P[t + 3] - ax, e1y = P[t + 4] - ay, e1z = P[t + 5] - az;
    const e2x = P[t + 6] - ax, e2y = P[t + 7] - ay, e2z = P[t + 8] - az;
    let nx = e1y * e2z - e1z * e2y, ny = e1z * e2x - e1x * e2z, nz = e1x * e2y - e1y * e2x;
    const len = Math.hypot(nx, ny, nz) || 1;
    // SIGNED nz: snow settles on up-facing faces only. abs() here put pale
    // "snow" plates on the UNDERSIDES of tilted blocks — the floating-wedge
    // read the fp-spires close-ups caught. (Fix imported verbatim from
    // eagles-nest-kt22-B-truth-01, whose spire close-ups found it; it applies
    // to every laced surface in this world, firs and granite included.)
    nz = nz / len;
    let f = smooth(lo, hi, nz) * amount;
    if (patchy > 0) f *= 1 - patchy * rng();
    if (f <= 0.002) continue;
    for (let k = 0; k < 3; k++) {
      const o = t + k * 3;
      C[o] = lerp(C[o], snow[0], f);
      C[o + 1] = lerp(C[o + 1], snow[1], f);
      C[o + 2] = lerp(C[o + 2], snow[2], f);
    }
  }
}

// ------------------------------------------------------------ solid makers
// An n-sided prism with independently jittered top and bottom rings, a lateral
// top offset and a yaw. This is the single primitive every rock is built from:
// stack them, lean them, flare them and you get blocky granite instead of cones.
export function prism(B, rng, o) {
  const {
    x = 0, y = 0, z = 0, r = 1, h = 1, sides = 6, taper = 0.8,
    jit = 0.18, yaw = 0, dx = 0, dy = 0, col, colTop, tiltX = 0, tiltY = 0, rz = 1,
  } = o;
  const n = Math.max(3, sides | 0);
  const bot = [], top = [];
  for (let i = 0; i < n; i++) {
    const a = yaw + (i / n) * Math.PI * 2;
    const rb = r * (1 + (rng() - 0.5) * 2 * jit);
    const rt = r * taper * (1 + (rng() - 0.5) * 2 * jit);
    const bz = z + (rng() - 0.5) * h * 0.08;
    bot.push([x + Math.cos(a) * rb, y + Math.sin(a) * rb * rz, bz]);
    top.push([x + dx + Math.cos(a) * rt + tiltX, y + dy + Math.sin(a) * rt * rz + tiltY, z + h * (1 + (rng() - 0.5) * 0.14)]);
  }
  const cB = col, cT = colTop || col;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    quad(B, bot[i], bot[j], top[j], top[i], cB, cB, cT, cT);
  }
  for (let i = 1; i < n - 1; i++) tri(B, top[0], top[i], top[i + 1], cT);
  for (let i = 1; i < n - 1; i++) tri(B, bot[0], bot[i + 1], bot[i], cB);
  return { top, bot };
}

// axis-aligned-ish box with yaw, used for man-made things
export function box(B, o) {
  const { x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1, yaw = 0, col, colTop } = o;
  const c = Math.cos(yaw), s = Math.sin(yaw);
  const P = (lx, ly, lz) => [x + lx * c - ly * s, y + lx * s + ly * c, z + lz];
  const hx = sx / 2, hy = sy / 2;
  const a = P(-hx, -hy, 0), b = P(hx, -hy, 0), d = P(hx, hy, 0), e = P(-hx, hy, 0);
  const a2 = P(-hx, -hy, sz), b2 = P(hx, -hy, sz), d2 = P(hx, hy, sz), e2 = P(-hx, hy, sz);
  const cT = colTop || col;
  quad(B, a, b, b2, a2, col); quad(B, b, d, d2, b2, col);
  quad(B, d, e, e2, d2, col); quad(B, e, a, a2, e2, col);
  quad(B, a2, b2, d2, e2, cT);
  quad(B, a, e, d, b, col);
}

// a cylinder between two points (cables, poles, tree trunks)
export function tube(B, p0, p1, r, col, sides = 6, r1 = null) {
  const d = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
  const L = Math.hypot(d[0], d[1], d[2]) || 1;
  const w = [d[0] / L, d[1] / L, d[2] / L];
  let up = Math.abs(w[2]) > 0.9 ? [1, 0, 0] : [0, 0, 1];
  let a = [w[1] * up[2] - w[2] * up[1], w[2] * up[0] - w[0] * up[2], w[0] * up[1] - w[1] * up[0]];
  const al = Math.hypot(a[0], a[1], a[2]) || 1; a = [a[0] / al, a[1] / al, a[2] / al];
  const b = [w[1] * a[2] - w[2] * a[1], w[2] * a[0] - w[0] * a[2], w[0] * a[1] - w[1] * a[0]];
  const R1 = r1 === null ? r : r1;
  const ring = (p, rad) => {
    const o = [];
    for (let i = 0; i < sides; i++) {
      const t = (i / sides) * Math.PI * 2, ca = Math.cos(t) * rad, sa = Math.sin(t) * rad;
      o.push([p[0] + a[0] * ca + b[0] * sa, p[1] + a[1] * ca + b[1] * sa, p[2] + a[2] * ca + b[2] * sa]);
    }
    return o;
  };
  const r0 = ring(p0, r), rn = ring(p1, R1);
  for (let i = 0; i < sides; i++) {
    const j = (i + 1) % sides;
    quad(B, r0[i], r0[j], rn[j], rn[i], col);
  }
}

// flat quad in the XY plane at height z (signs, flags handled separately)
export function plate(B, pts, col) {
  for (let i = 1; i < pts.length - 1; i++) tri(B, pts[0], pts[i], pts[i + 1], col);
}

// ==================================================== THE SHADER-LOOK PLUMBING
//
// specs/0005. Landed by L2 — atmosphere and light — and built so L1 (snow),
// L3 (tracks) and L4 (rock) plug into it later without restructuring anything:
// a layer is a DATA registration, not an edit to this file's shape.
//
// WHY IT LIVES IN core.mjs AND NOT IN A look.mjs OF ITS OWN. Two hard reasons,
// both found by trying the other way first:
//   * the exporter's manifest is an EXPLICIT allowlist of scene modules
//     (tools/export-red-dog/manifest.json, D4) and it is not this layer's file
//     to edit — a new module would simply be absent from the shipped build and
//     404 on import. `lib/core.mjs` is already on the list.
//   * terrain.mjs and env.mjs both need it, and env.mjs already imports
//     terrain.mjs for SUN_DIR. A third module imported by terrain would close
//     that cycle and put `SUN_DIR` in the temporal dead zone at env's own
//     evaluation. core.mjs imports nothing, so it cannot.
//
// ------------------------------------------------------------------ WHY THIS
// The world has ~14 materials spread over a dozen modules, three of which are
// other agents' territory, and two of which already own an `onBeforeCompile`
// (granite.mjs, kt-rocks.mjs). Reaching every one of them by hand is neither
// possible nor revert-able. So the look is installed ONCE, at the THREE module
// level:
//
//   1. `THREE.ShaderChunk` — the GLSL. three resolves `#include <name>` from
//      this table at COMPILE time, so replacing a chunk before the first render
//      reaches every material in the scene, including the two that patch their
//      own shaders (they splice `<color_fragment>`, which nothing here touches).
//   2. `THREE.ShaderLib[*].uniforms` — the uniform DECLARATIONS. Every built-in
//      material clones its uniform map out of ShaderLib at program-build time
//      (WebGLPrograms.getUniforms), so an entry added here is present on every
//      material three compiles. This matters more than it looks: three uploads
//      by walking the PROGRAM's active uniforms and indexing the material's
//      map, so a uniform that is declared in GLSL but missing from the map is a
//      hard crash, not a no-op.
//   3. `Material.prototype.onBeforeCompile` — the safety net for a material
//      three does NOT source from ShaderLib, i.e. a `ShaderMaterial` with
//      `fog: true`. Nothing in the world or the bench is one today; this is so
//      that adding one later cannot crash the page.
//
// ------------------------------------------------- WHY THE VALUES ARE TYPED ARRAYS
// `cloneUniforms()` (three r180) deep-copies Colors and Vectors and slices JS
// arrays — but a TYPED array falls through to plain assignment and is therefore
// SHARED by every material's clone. So every tunable in this system lives in a
// `Float32Array`, and one write to it reaches the whole world on the next
// frame with no material walk, no recompile and no per-material bookkeeping.
// That is what makes ground rule 6 cheap: a `timeOfDay` scrub or a golden-hour
// preset is `LOOK.SUN_STEP_EDGE = x` in a loop, not a shader edit.
//
// Greg tunes by NAME: every dial is exposed on `LOOK` (and on `window.__look`)
// as a named property, live, e.g.
//
//     __look.FOG_BAND_MIX[1] = 0.7
//     __look.SUN_STEP_EDGE = 0.30
//     __look.SHADOW_TINT = 0x8f7fd0

// ------------------------------------------------------------- the registry
const LAYERS = new Map();

/**
 * Register one look layer. Call BEFORE installLook().
 *   id       — 'L2-atmosphere', 'L1-snow', ...
 *   uniforms — { name: { value: Float32Array } }. Typed arrays only: anything
 *              else is cloned per material and stops being live-tunable.
 *   shared   — { name: { value: Texture|null } }. Uniforms whose HOLDER OBJECT
 *              is force-shared by every material (see below). Declared here and
 *              not in `uniforms` because the sharing costs one assignment per
 *              material per program build and only a sampler needs it.
 *   chunks   — { shaderChunkName: (src) => newSrc }. Applied in registration
 *              order, so two layers can both extend the same chunk.
 *
 * ----------------------------------------------------- WHY `shared` EXISTS
 * The typed-array trick above (see "WHY THE VALUES ARE TYPED ARRAYS") does not
 * work for a TEXTURE, and specs/0013 §2.3's guess that it would — "a texture
 * uniform is assigned by reference in cloneUniforms and is therefore shared
 * too" — is WRONG on r180. `cloneUniforms()` (three.core.js, r180) reads:
 *
 *     if ( property.isTexture ) {
 *       if ( property.isRenderTargetTexture ) {
 *         console.warn( 'UniformsUtils: Textures of render targets cannot be
 *                        cloned via cloneUniforms() or mergeUniforms().' );
 *         dst[ u ][ p ] = null;                 // NULLED, once per material
 *       } else { dst[ u ][ p ] = property.clone(); }   // CLONED, per material
 *     }
 *
 * so a render target's texture parked in `ShaderLib[*].uniforms` reaches every
 * material as `null` and warns once per material per program build, and an
 * ordinary texture reaches it as a per-material COPY that a later write cannot
 * find. Either way L3's ping-pong recentre — which swaps which render target
 * the world is reading — could not be published with one write.
 *
 * The fix is a placement, not a mechanism. `WebGLRenderer.getProgram()` does
 * (three.module.js r180):
 *
 *     parameters.uniforms = programCache.getUniforms( material );   // the clone
 *     material.onBeforeCompile( parameters, _this );                // then this
 *     materialProperties.uniforms = parameters.uniforms;
 *
 * — for BUILT-IN materials too, not just ShaderMaterial. So the safety net in
 * installLook() below runs after the clone and can put the ORIGINAL holder
 * object back. Every material then indexes the same `{ value }`, and
 * `holder.value = otherTarget.texture` is one write for the whole world, which
 * is the same property the typed arrays have.
 *
 * KNOWN HOLE, and it is harmless: `granite.mjs` and `kt-rocks.mjs` assign an
 * INSTANCE `onBeforeCompile`, which shadows the prototype net. Those two keep
 * the clone's null and three binds its 1x1 empty texture. They are the two rock
 * materials; L3 reads only where L1's albedo gate says "snow", which no rock
 * fragment passes, so they never sample it. A future layer that needs a sampler
 * ON ROCK has to chain those two hooks — say so here rather than debug it twice.
 */
export function registerLookLayer({ id, uniforms = {}, shared = {}, chunks = {} }) {
  LAYERS.set(id, { id, uniforms, shared, chunks });
}

/** The named-tunable surface. Layers hang their dials here (see `dial`). */
export const LOOK = { layers: () => [...LAYERS.keys()] };

// ------------------------------------------------------------- named dials
/** a Float32Array preloaded with `init` */
export const f32 = (init) => Float32Array.from(init);

/** LOOK.NAME <-> arr[i], a live float. */
export function dial(name, arr, i) {
  Object.defineProperty(LOOK, name, {
    get: () => arr[i], set: (v) => { arr[i] = +v; }, enumerable: true, configurable: true,
  });
}

/**
 * LOOK.NAME <-> arr[i..i+n-1], a live float vector (per-band dials).
 * `derive` (optional) keeps a second slot `d` cells along in step with it —
 * used for the reciprocal half-widths the shaders actually want (see below).
 */
export function dialVec(name, arr, i, n, stride = 1, derive = null, d = 0) {
  const view = {};
  for (let k = 0; k < n; k++) {
    const at = i + k * stride, dat = d + k * stride;
    Object.defineProperty(view, k, {
      get: () => arr[at],
      set: (v) => { arr[at] = +v; if (derive) arr[dat] = derive(+v); },
      enumerable: true, configurable: true,
    });
    if (derive) arr[dat] = derive(arr[at]);
  }
  view.length = n;
  Object.defineProperty(LOOK, name, { value: view, enumerable: true, configurable: true });
}

/**
 * A softness dial stored as the RECIPROCAL HALF-WIDTH the shader wants.
 *
 * Every edge in this system is `clamp((x - edge) * inv + 0.5, 0, 1)` rather
 * than `smoothstep(edge - soft, edge + soft, x)`. That is a measured choice,
 * not a stylistic one: the four smoothsteps L2 adds to two of the hottest
 * fragment paths in the world cost real milliseconds on the headless raster
 * rig, and a smoothstep either side of a 0.05-wide step edge or a 55 m fog
 * boundary is invisible — the whole point of the layer is that these edges are
 * HARD. So the shader multiplies by a precomputed reciprocal and the human
 * still reads and writes a half-width in the units of the thing being stepped.
 */
export const halfInv = (v) => 0.5 / Math.max(Math.abs(+v), 1e-4);
export function dialSoft(name, arr, i, initial) {
  arr[i] = halfInv(initial);
  Object.defineProperty(LOOK, name, {
    get: () => 0.5 / arr[i], set: (v) => { arr[i] = halfInv(v); },
    enumerable: true, configurable: true,
  });
}

/**
 * LOOK.NAME <-> an sRGB hex written into arr[off..off+2] as LINEAR rgb — the
 * space every colour in this world is authored in (lib/core.mjs `lin`).
 * `norm: 'luma'` divides the triple by its own Rec.709 luma, which turns the
 * colour into a HUE-ONLY multiplier: SUN_RAMP_* and SHADOW_TINT change the
 * cast of the light without changing how bright it is, so a warmth dial and an
 * exposure dial never fight.
 */
export function dialColor(name, arr, off, hex, { norm = null } = {}) {
  const write = (h) => {
    let c = lin(h);
    if (norm === 'luma') {
      const y = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2] || 1;
      c = [c[0] / y, c[1] / y, c[2] / y];
    }
    arr[off] = c[0]; arr[off + 1] = c[1]; arr[off + 2] = c[2];
    hexes.set(name, h);
  };
  write(hex);
  Object.defineProperty(LOOK, name, {
    get: () => hexes.get(name), set: write, enumerable: true, configurable: true,
  });
}
const hexes = new Map();

/** the same, for an N-entry colour array: LOOK.NAME[i] = 0xrrggbb */
export function dialColorArray(name, arr, hexList, { stride = 3 } = {}) {
  const view = { length: hexList.length };
  hexList.forEach((h0, k) => {
    const key = `${name}[${k}]`;
    dialColor(key, arr, k * stride, h0);
    const d = Object.getOwnPropertyDescriptor(LOOK, key);
    delete LOOK[key];
    Object.defineProperty(view, k, { ...d, enumerable: true });
  });
  Object.defineProperty(LOOK, name, { value: view, enumerable: true, configurable: true });
}

// ----------------------------------------------------------------- presets
//
// specs/0024. A PRESET IS A TABLE OF DIAL VALUES AND NOTHING ELSE: the same
// names Greg types in the console, holding the same things their setters take —
// a float, an sRGB hex, or an array of either for the `dialVec` /
// `dialColorArray` views. There is no second representation of the look and no
// code path a preset can reach that the console cannot.
//
// `default` IS CAPTURED, NOT AUTHORED. The table under that name is filled from
// the dials themselves at `definePresets()` time (env.mjs's last statement, by
// which point terrain, granite and env have all registered), so
// `preset('default')` is an exact undo rather than a second hand-copied list
// that can drift from the initial values. A dial that registers LATER and is
// then touched by a preset gets its own value folded into that table on the
// first write, so the undo stays exact for anything that arrives afterwards.
const PRESETS = new Map();
let CURRENT = 'default';

/** read one dial back in the form a preset table writes it. */
function readDial(name) {
  const v = LOOK[name];
  // a dialVec / dialColorArray view is array-LIKE (indices + length), not an Array
  return (v && typeof v === 'object' && typeof v.length === 'number') ? Array.from(v) : v;
}

/**
 * Write one. The vector views are defined with `value:` and no setter, so
 * `LOOK.FOG_BAND_COLOR = [...]` would throw in a module's strict mode — an
 * array is written through the view element by element, which is also the only
 * form that keeps `dialVec`'s derived slots (the reciprocal half-widths) in step.
 */
function writeDial(name, v) {
  if (Array.isArray(v)) {
    const view = LOOK[name];
    for (let i = 0; i < v.length && i < view.length; i++) view[i] = v[i];
  } else {
    LOOK[name] = v;
  }
}

/**
 * Register the preset tables. `tables.default` is FILLED IN PLACE with the
 * captured snapshot (env.mjs declares it as an empty object and exports the
 * whole map, so what is registered and what is inspectable are one object).
 *
 * IT CAPTURES THE UNION OF WHAT THE OTHER TABLES NAME, NOT EVERY DIAL, and that
 * distinction was found by measuring rather than reasoned about. Snapshotting
 * the whole registry made `preset('default')` an undo of things no preset had
 * done: `TRACKS_GAIN` is registered by terrain.mjs and then OWNED AT RUNTIME by
 * the player's tracks.js, so a "restore" wrote the registration value over a
 * live setting and switched the carve tracks off. A preset undoes ITS OWN
 * writes; anything it never touched is somebody else's state.
 */
export function definePresets(tables) {
  const captured = tables.default || (tables.default = {});
  for (const [name, table] of Object.entries(tables)) {
    if (name === 'default') continue;
    for (const k of Object.keys(table)) if (k in LOOK && !(k in captured)) captured[k] = readDial(k);
  }
  for (const [name, table] of Object.entries(tables)) PRESETS.set(name, table);
  return LOOK;
}

/** the preset names, `default` first. */
LOOK.presets = () => [...PRESETS.keys()];

/**
 * `LOOK.preset()` — the current name.
 * `LOOK.preset('golden-hour')` — apply it, and return the list of dials moved.
 * An unknown name changes nothing, warns once and returns null.
 */
LOOK.preset = (name) => {
  if (name === undefined) return CURRENT;
  const table = PRESETS.get(name);
  if (!table) {
    console.warn(`look: no preset "${name}" — have ${[...PRESETS.keys()].join(', ') || '(none)'}`);
    return null;
  }
  const undo = PRESETS.get('default');
  const applied = [];
  for (const [k, v] of Object.entries(table)) {
    if (!(k in LOOK)) continue;                       // a dial this build does not have
    if (undo && !(k in undo)) undo[k] = readDial(k);  // registered after the capture
    writeDial(k, v);
    applied.push(k);
  }
  CURRENT = name;
  return applied;
};

// ------------------------------------------------------------- the install
/**
 * Patch THREE for every registered layer. Must run before the first render;
 * world.mjs calls it at the top of buildWorld(), before any material exists.
 * Idempotent — the harness and the standalone page both boot the same modules.
 */
export function installLook(THREE) {
  // The `three` namespace is a frozen Module object, so the "already done" flag
  // hangs off ShaderChunk — a plain table, and the thing being patched.
  if (INSTALLED.has(THREE.ShaderChunk)) return LOOK;
  INSTALLED.add(THREE.ShaderChunk);

  const uniforms = {};
  for (const L of LAYERS.values()) Object.assign(uniforms, L.uniforms);
  // the sampler holders (see registerLookLayer's `shared`). Kept in their own
  // bag because (2) must declare the NAME without parking a render-target
  // texture in ShaderLib — that is the thing cloneUniforms nulls and warns on.
  const shared = {};
  for (const L of LAYERS.values()) Object.assign(shared, L.shared || {});

  // (2) every built-in material type carries the declarations. A shared holder
  // is declared here as `{ value: null }` — a DIFFERENT object from the live
  // holder, so whatever the live one is pointing at never enters cloneUniforms.
  // three binds its 1x1 empty texture for a null sampler, so a material that
  // misses step (3) is inert rather than broken.
  const declared = { ...uniforms };
  for (const n of Object.keys(shared)) declared[n] = { value: null };
  for (const k of Object.keys(THREE.ShaderLib)) Object.assign(THREE.ShaderLib[k].uniforms, declared);

  // (3) the safety net. A material with its OWN onBeforeCompile (granite,
  // kt-rocks) shadows this — both are MeshLambertMaterial and so are already
  // covered by (2), and both pin their own customProgramCacheKey.
  //
  // ...and, for `shared`, this is no longer only a safety net: it is the whole
  // mechanism. It runs on `parameters.uniforms`, which getProgram() has ALREADY
  // filled from cloneUniforms(), so assigning UNCONDITIONALLY here replaces the
  // per-material copy with the one holder object the layer owns.
  const inherited = THREE.Material.prototype.onBeforeCompile;
  THREE.Material.prototype.onBeforeCompile = function poiLookUniforms(shader, renderer) {
    if (shader && shader.uniforms) {
      for (const n in uniforms) if (!(n in shader.uniforms)) shader.uniforms[n] = uniforms[n];
      for (const n in shared) shader.uniforms[n] = shared[n];
    }
    return inherited.call(this, shader, renderer);
  };

  // (1) the GLSL
  for (const L of LAYERS.values()) {
    for (const [name, patch] of Object.entries(L.chunks)) {
      const src = THREE.ShaderChunk[name];
      if (src === undefined) throw new Error(`look: ${L.id} patches unknown chunk <${name}>`);
      THREE.ShaderChunk[name] = patch(src);
    }
  }

  // the tuning handle, alongside index.html's own __world / __cams / __stats
  try { globalThis.__look = LOOK; } catch { /* no global to hang it on */ }
  return LOOK;
}
const INSTALLED = new WeakSet();
