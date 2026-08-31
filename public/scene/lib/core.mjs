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
