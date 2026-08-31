// The ground: real USGS 3DEP relief + a piste stamp raster + an analytic
// mogul field.
//
//   demAt(x,y)   dem-tight (1400 m @ 2.73 m/px) cross-faded into dem-wide
//                (3200 m @ 12.5 m/px) and then into a far apron.
//   the raster   2.0 m cells over the playable core. Carries the flatten
//                weight/target that turns a raw hillside into a groomed
//                corridor, the per-style masks the terrain colour and the
//                forest read, and (BU,BV) = run-local coordinates so the
//                mogul field runs down the fall line of the run it is on.
//   groundZ      dem*(1-F) + FZ*F + moguls + wind texture
//
// Everything is bilinear, so normals are continuous â€” which is what the ski
// physics reads. Nothing here is a heightfield the player cannot see: the
// terrain meshes sample exactly this function.

import { clamp, lerp, smooth, fbm, vnoise } from './lib/core.mjs';
import { DEM_Z0, DEM_TIGHT, DEM_WIDE } from './dem-data.mjs';
import { DEM_KT } from './dem-kt.mjs';
import { DEM_UP_WIDE, DEM_UP_W, DEM_UP_E, DEM_WIDE_PATCH } from './dem-upper.mjs';
import { RUNS, LIFTS, CORE, PLAY, PLAY0, rasterOrigin, LOTS, ROADS } from './layout.mjs';
import { KT_SHAPE } from './kt-runs-data.mjs';
import { POU_SHAPE } from './pou-data.mjs';

// ------------------------------------------------------------------- DEM
function decode(g, patch) {
  const s = atob(g.b64), n = g.n, out = new Float32Array(n * n);
  for (let i = 0; i < n * n; i++) {
    let v = s.charCodeAt(2 * i) | (s.charCodeAt(2 * i + 1) << 8);
    if (v >= 32768) v -= 65536;
    out[i] = v / 10;
  }
  // ESCALATION 1 (pois/palisades-upper README §3/§9): red-dog/dem-wide.tif
  // carries spike pixels on the KT-22 south side reading up to 225 m below
  // their neighbours. 12 of them deviate more than 25 m from their own 5x5
  // median; six are fully masked by kt22/dem-tight and never reached the
  // shipped world, six genuinely answer, and TWO have a terrain-massif grid
  // vertex inside the pit (0.8 m and 2.8 m from it). Each repaired value is an
  // INDEPENDENT 3DEP export's reading of the same ground — this bundle's
  // dem-tight-s over ten of them — not a filter's guess. Table and provenance:
  // work/bake_dem_upper.py -> work/dem-upper.json.
  if (patch) for (let i = 0; i < patch.length; i += 2) out[patch[i]] = patch[i + 1] / 10;
  return { ...g, a: out };
}
const T = decode(DEM_TIGHT);      // red-dog  1400 m @ 1.367  m/px
const K = decode(DEM_KT);         // kt22     1600 m @ 1.5625 m/px  (the merge)
const W = decode(DEM_WIDE, DEM_WIDE_PATCH);   // red-dog 3200 m @ 3.125 m/px
// UPPER MOUNTAIN INCREMENT 1 — three more 3DEP frames (dem-upper.mjs).
const E = decode(DEM_UP_E);       // upper    1400 m @ 1.367  m/px  the Funitel wall
const V = decode(DEM_UP_W);       // upper    1400 m @ 1.367  m/px  the Gold Coast bench
const U = decode(DEM_UP_WIDE);    // upper    3600 m @ 7.031  m/px  the west surround

function grid(G, x, y) {
  const c = G.span / G.n;
  let fx = (x - G.ox + G.span / 2) / c - 0.5, fy = (y - G.oy + G.span / 2) / c - 0.5;
  fx = clamp(fx, 0, G.n - 1.001); fy = clamp(fy, 0, G.n - 1.001);
  const i = fx | 0, j = fy | 0, tx = fx - i, ty = fy - j, k = j * G.n + i;
  return lerp(lerp(G.a[k], G.a[k + 1], tx), lerp(G.a[k + G.n], G.a[k + G.n + 1], tx), ty);
}

// how far inside a frame (in metres) the point is
const inset = (G, x, y) => Math.min(G.span / 2 - Math.abs(x - G.ox), G.span / 2 - Math.abs(y - G.oy));

// THE MERGED DEM STACK. Three USGS 3DEP frames, coarsest first, each faded in
// over 70 m of its own frame inset so a resolution change is a gradient and
// never a step:
//
//   red-dog/dem-wide   3200 m @ 3.125  m/px   the valley and the skyline
//   kt22/dem-tight     1600 m @ 1.5625 m/px   the KT-22 line, face and summit
//   red-dog/dem-tight  1400 m @ 1.367  m/px   the Red Dog pod
//
// The two tight frames are independent exports of the SAME lidar and they
// agree to mean |dz| = 0.014 m over 40,000 random points in their overlap
// (work/bake_dem_kt.py) — the Int16 decimetre quantisation floor. So the Red
// Dog pod's ground is unchanged by the merge to within quantisation, and the
// KT sector gains 0.60 m of mean vertical fidelity over reading dem-wide.
// UPPER MOUNTAIN INCREMENT 1 adds three frames, and the ORDER IS THE
// REGRESSION GUARANTEE. They are applied BENEATH kt22/dem-tight and
// red-dog/dem-tight, so wherever the merged world already read a tight frame it
// reads exactly that frame still. Measured, not asserted: over their 740 x
// 1200 m overlap upper/dem-tight-e and kt22/dem-tight agree to a mean |dz| of
// 0.019 m, and the two dem-wides to 0.050 m over 1485 x 3200 m
// (work/bake_dem_upper.py). The new tiles only answer where the old stack had
// dem-wide, or had nothing at all — which for the whole Gold Coast bench and
// everything west of x = -1852 is "nothing at all".
export function demAt(x, y) {
  const iw = inset(W, x, y);
  const iu = inset(U, x, y);
  if (iw <= 40 && iu <= 40) {
    // far apron: hold the nearer frame's edge and fall away into the backdrop
    const G = iw >= iu ? W : U;
    const e = grid(G, clamp(x, G.ox - G.span / 2 + 20, G.ox + G.span / 2 - 20),
                      clamp(y, G.oy - G.span / 2 + 20, G.oy + G.span / 2 - 20));
    const d = Math.max(0, -Math.max(iw, iu));
    return e - smooth(0, 900, d) * 120 + fbm(x * 0.0016, y * 0.0016, 3, 2.1, 0.5, 91) * 45 * smooth(0, 400, d);
  }
  // the two 3 km wides. red-dog's is finer (3.125 vs 7.03 m/px as carried) AND
  // is the frame this world verified, so it wins inside its own box and fades
  // out to the upper wide over its outer 70 m instead of falling off a cliff.
  let z;
  if (iw > 0 && iu > 0) z = lerp(grid(U, x, y), grid(W, x, y), smooth(0, 70, iw));
  else if (iw > 0) z = grid(W, x, y);
  else z = grid(U, x, y);
  const v = inset(V, x, y);
  if (v > 0) z = lerp(z, grid(V, x, y), smooth(0, 70, v));
  const e = inset(E, x, y);
  if (e > 0) z = lerp(z, grid(E, x, y), smooth(0, 70, e));
  const k = inset(K, x, y);
  if (k > 0) z = lerp(z, grid(K, x, y), smooth(0, 70, k));
  const t = inset(T, x, y);
  if (t > 0) z = lerp(z, grid(T, x, y), smooth(0, 70, t));
  return z;
}

/** which 3DEP frame is actually answering at (x,y) — for verify.py and REPORT. */
export function demSource(x, y) {
  if (inset(W, x, y) <= 40 && inset(U, x, y) <= 40) return 'apron';
  if (inset(T, x, y) > 35) return 'rd-tight';
  if (inset(K, x, y) > 35) return 'kt-tight';
  if (inset(E, x, y) > 35) return 'up-tight-e';
  if (inset(V, x, y) > 35) return 'up-tight-w';
  if (inset(T, x, y) > 0 || inset(K, x, y) > 0 || inset(E, x, y) > 0 || inset(V, x, y) > 0) return 'fade';
  return inset(W, x, y) > 0 ? 'wide' : 'up-wide';
}

// ---------------------------------------------------------------- raster
// The raster spans PLAY = CORE u every promoted sector's box, so a corridor
// that leaves the full-fidelity core keeps its carve, its groom colour and its
// forest hole all the way out instead of stopping at an invisible line.
//
// THE ORIGIN IS FROZEN AT PLAY0 — the merged world's own extent before upper
// mountain increment 1 — and the raster GROWS west in whole 2.0 m cells to
// cover the new sectors. Moving the origin instead would have shifted the
// bilinear phase of F/FZ/MG/BU/BV under every corridor the merge already
// verified, for no gain: the four front-side sectors would have re-carved by a
// few centimetres and their published residuals would no longer be the numbers
// this world produces. `rasterOrigin` is in layout.mjs.
const RES = 2.0;
// CROPPED by poi-lab tools/export-red-dog (specs/0001 D23).
// Source: RX0 -3662, RY0 -1302.5, 2077 x 944 cells.
// The origin is moved east/north in WHOLE RES steps only, so every surviving
// cell centre lands on exactly the coordinate it had in the source world and
// no corridor re-carves by a millimetre. Nothing west of RX0 is stamped any
// more; the coarse DEM grids re-fill that ground for free (spec 0.15) and the
// backdrop is bare, ungroomed, treeless mountain — which is D16.3.
const RX0 = -660;
const RY0 = -770.5;
const RNX = 566;
const RNY = 777;

const F = new Float32Array(RNX * RNY);      // flatten weight
const FZ = new Float32Array(RNX * RNY);     // flatten target z
const MG = new Float32Array(RNX * RNY);     // groomed piste
const MB = new Float32Array(RNX * RNY);     // mogul field
const MC = new Float32Array(RNX * RNY);     // cat track / traverse bench
const ML = new Float32Array(RNX * RNY);     // glade (skiable, treed)
const MK = new Float32Array(RNX * RNY);     // packed base-area snow
const MP = new Float32Array(RNX * RNY);     // plowed / bare ground (lots, roads)
const BU = new Float32Array(RNX * RNY);     // metres along the run
const BV = new Float32Array(RNX * RNY);     // metres across the run (signed)
const MW = new Float32Array(RNX * RNY);     // lift swath (forest clearing only)
const MR = new Float32Array(RNX * RNY);     // race venue (Red Dog Face GS course)
const MX = new Float32Array(RNX * RNY);     // CONTEXT corridor — carved, coloured
                                            // and treed like any other run, but
                                            // it does not earn the 1.70 m mesh
// ---- KT CLASSIC RUNS (epoch B). All four are ZERO everywhere in epoch A, so
// the frozen placement basis does not have to carry them.
const MB2 = new Float32Array(RNX * RNY);    // KT mogul field (Moseley's, the Alternates)
const MRN = new Float32Array(RNX * RNY);    // fall-line sluff runnels (chute floors)
const MWL = new Float32Array(RNX * RNY);    // built chute WALL — drives the rock read
const MCN = new Float32Array(RNX * RNY);    // cornice height, in METRES, added directly
// ---- POULSEN'S GULLY (epoch C). Zero everywhere in epochs A and B.
const MPG = new Float32Array(RNX * RNY);    // the gully corridor — colour, forest hole,
                                            // and the 1.70 m terrain-piste promotion
const MPW = new Float32Array(RNX * RNY);    // built gully WALL, for the rock read

const cix = (x) => clamp(Math.round((x - RX0) / RES), 0, RNX - 1);
const ciy = (y) => clamp(Math.round((y - RY0) / RES), 0, RNY - 1);
const maxTo = (A, k, v) => { if (v > A[k]) A[k] = v; };

function forCells(x0, y0, x1, y1, cb) {
  // CROPPED build: a stamp outside the raster is SKIPPED, never clamped onto
  // the edge. Inside the raster this is bit-identical to the clamped rounding
  // it replaces (ceil(v-0.5) and floor(v+0.5) are Math.round).
  const i0 = Math.max(0, Math.ceil((x0 - RX0) / RES - 0.5));
  const i1 = Math.min(RNX - 1, Math.floor((x1 - RX0) / RES + 0.5));
  const j0 = Math.max(0, Math.ceil((y0 - RY0) / RES - 0.5));
  const j1 = Math.min(RNY - 1, Math.floor((y1 - RY0) / RES + 0.5));
  if (i1 < i0 || j1 < j0) return;
  for (let j = j0; j <= j1; j++) {
    const y = RY0 + j * RES;
    for (let i = i0; i <= i1; i++) cb(RX0 + i * RES, y, j * RNX + i);
  }
}

function addFlat(k, f, z0) {
  if (f <= 0.002) return;
  const nf = 1 - (1 - F[k]) * (1 - f);
  FZ[k] = (FZ[k] * F[k] + z0 * f) / (F[k] + f || 1);
  F[k] = nf;
}

// ------------------------------------------------------------ run stamps
// A corridor is a capsule along the centreline. Inside it the ground is pulled
// toward the run's own smoothed longitudinal profile (so a piste has a steady,
// skiable grade instead of the raw DEM's cross-slope), feathering back out to
// the untouched mountain at the corridor edge.
function prepRun(run) {
  const P = run.pts;
  const cum = [0];
  for (let i = 1; i < P.length; i++) cum.push(cum[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
  // longitudinal profile: the geojson Z (already 3DEP), lightly smoothed
  const zs = P.map((p) => p[2]);
  for (let pass = 0; pass < 2; pass++)
    for (let i = 1; i < zs.length - 1; i++) zs[i] = (zs[i - 1] + zs[i] * 2 + zs[i + 1]) / 4;
  const seg = [];
  for (let i = 0; i < P.length - 1; i++) {
    const ax = P[i][0], ay = P[i][1], bx = P[i + 1][0], by = P[i + 1][1];
    seg.push({ ax, ay, dx: bx - ax, dy: by - ay, L2: (bx - ax) ** 2 + (by - ay) ** 2 || 1e-9,
               x0: Math.min(ax, bx), x1: Math.max(ax, bx), y0: Math.min(ay, by), y1: Math.max(ay, by),
               z0: zs[i], z1: zs[i + 1], s0: cum[i], sL: cum[i + 1] - cum[i] });
  }
  let bx0 = 1e9, by0 = 1e9, bx1 = -1e9, by1 = -1e9;
  for (const p of P) { bx0 = Math.min(bx0, p[0]); bx1 = Math.max(bx1, p[0]); by0 = Math.min(by0, p[1]); by1 = Math.max(by1, p[1]); }
  return { seg, cum, len: cum[cum.length - 1], bb: [bx0, by0, bx1, by1] };
}

const PREP = {};
export const RUN_PREP = PREP;

// nearest point on the run: returns [dist, z, s, sideSign]
function nearest(pr, x, y, cutoff) {
  let bd = 1e9, bz = 0, bs = 0, bside = 1;
  for (const s of pr.seg) {
    if (x < s.x0 - cutoff || x > s.x1 + cutoff || y < s.y0 - cutoff || y > s.y1 + cutoff) continue;
    const px = x - s.ax, py = y - s.ay;
    const t = clamp((px * s.dx + py * s.dy) / s.L2, 0, 1);
    const qx = s.ax + s.dx * t, qy = s.ay + s.dy * t;
    const d = Math.hypot(x - qx, y - qy);
    if (d < bd) {
      bd = d; bz = lerp(s.z0, s.z1, t); bs = s.s0 + s.sL * t;
      bside = (px * s.dy - py * s.dx) < 0 ? -1 : 1;
    }
  }
  return [bd, bz, bs, bside];
}

// `pull` = how far the ground is dragged from the raw 3DEP surface toward the
// run's own smoothed longitudinal profile, AT THE CENTRELINE. It decays to 0 at
// the corridor edge, so a piste keeps the real mountain's cross-slope and only
// loses the fall-line lumps a groomer would actually have knocked down. A cat
// track is genuinely benched, so it gets a hard pull; a glade is barely touched.
const STYLE = {
  groomed:  { flat: 0.95, pull: 0.50, fe: 16, dig: 0.0, mask: MG },
  moguls:   { flat: 0.95, pull: 0.46, fe: 18, dig: 0.0, mask: MG },
  traverse: { flat: 0.95, pull: 0.86, fe: 10, dig: 0.4, mask: MC },
  cat:      { flat: 0.97, pull: 0.95, fe: 7,  dig: 0.6, mask: MC },
  glade:    { flat: 0.95, pull: 0.22, fe: 20, dig: 0.0, mask: ML },
  runout:   { flat: 0.95, pull: 0.72, fe: 22, dig: 0.0, mask: MK },
  // ---- added for the KT-22 sector ----
  // KT-22's front side is not groomed and never has been: GS Bowl, McConkey's,
  // the Fingers and the Nose are freeride terrain, and a groomed run's 0.50
  // pull toward a smoothed longitudinal profile would flatten the exact rolls,
  // benches and rock steps that make them what they are. `bowl` keeps a little
  // more (a bowl does get skied into a consistent shape); `freeride` keeps
  // almost nothing — it is the raw 3DEP surface with a corridor colour on it.
  bowl:     { flat: 0.95, pull: 0.30, fe: 20, dig: 0.0, mask: ML },
  freeride: { flat: 0.95, pull: 0.18, fe: 22, dig: 0.0, mask: ML },
  // KT CLASSIC RUNS. `ktmogul` is `bowl` without the corduroy: a mogul face is
  // skied into a consistent shape (so it earns more pull than `freeride`) but it
  // is emphatically NOT groomed, and `moguls` would have raised MG and painted
  // 5.2 m groomer banding down the most challenging mogul run in North America.
  ktmogul:  { flat: 0.95, pull: 0.34, fe: 20, dig: 0.0, mask: ML },
};

function stampRun(run) {
  const pr = prepRun(run);
  PREP[run.id] = pr;
  const st = STYLE[run.style] || STYLE.groomed;
  const hw = run.width / 2, fe = st.fe, m = hw + fe;
  const bumpOn = !!run.bump;      // moguls, and GS Bowl's `bowl` style
  forCells(pr.bb[0] - m, pr.bb[1] - m, pr.bb[2] + m, pr.bb[3] + m, (x, y, k) => {
    // EPOCH B's and EPOCH C's own run corridors are guarded too. A derived line
    // may cross a verified one (the Diagonal Chute passes 10.8 m from Strawberry
    // Fields; POULSEN'S GULLY shares 156 m of floor with LOWER DOG LEG); where it
    // does, the corridor stamp yields and the line rides the ground that is
    // already there. Epoch A is never guarded — GUARDF is still all 1s when it
    // runs, and `EPOCH` says which epoch this is.
    const g = EPOCH ? GUARDF[k] : 1;
    if (g <= 0) return;
    const [d, z, s, side] = nearest(pr, x, y, m);
    if (d > m) return;
    const inner = (1 - smooth(hw, m, d)) * g;
    // pull toward the GPS profile at the centreline, release to raw 3DEP at the edge
    const pull = st.pull * (1 - smooth(0, hw, d) ** 1.4);
    addFlat(k, inner * st.flat, lerp(demAt(x, y), z - st.dig, pull));
    maxTo(st.mask, k, inner);
    if (run.style === 'moguls' || run.style === 'groomed' || run.style === 'runout') maxTo(MG, k, inner);
    if (run.race) maxTo(MR, k, inner);
    if (run.context) maxTo(MX, k, inner);
    if (bumpOn && run.bump) {
      const t = s / pr.len;
      const g = smooth(run.bump[0] - 0.05, run.bump[0] + 0.06, t) * (1 - smooth(run.bump[1] - 0.06, run.bump[1] + 0.05, t));
      // bumps do not reach the corridor edge â€” the sides stay skiable
      const lane = run.race ? smooth(17, 27, d) : 1;   // no bumps inside the race lane
      maxTo(MB, k, g * lane * (1 - smooth(hw * 0.62, hw * 0.99, d)));
    }
    if (run.pouRuns) maxTo(MPG, k, inner);
    if (inner > 0.02 && (BU[k] === 0 || d < Math.abs(BV[k]))) { BU[k] = s; BV[k] = d * side; }
    if (EPOCH) noteWrite(k);
  });
}
/** '' during epoch A, 'B' while the KT classic runs stamp, 'C' while Poulsen's
 *  does. It gates the guard AND routes `noteWrite` to the right footprint
 *  record — THE RUN STAMPS COUNT AS EPOCH WRITES TOO, which the first cut of
 *  epoch B got wrong (it instrumented only the chute/cornice/mogul stamps, so
 *  the containment check was passing on incomplete evidence). */
let EPOCH = '';

// -------------------------------------------------------- base-area stamps
export function stampRect(cx, cy, sx, sy, yawDeg, { feather = 6, dig = 0.15, pave = 0, pack = 0, flat = 0.95 } = {}) {
  const yaw = yawDeg * Math.PI / 180, c = Math.cos(yaw), s = Math.sin(yaw);
  const z0 = demAt(cx, cy) - dig;
  const m = Math.hypot(sx, sy) / 2 + feather;
  forCells(cx - m, cy - m, cx + m, cy + m, (x, y, k) => {
    const dx = x - cx, dy = y - cy;
    const u = dx * c + dy * s, v = -dx * s + dy * c;
    const d = Math.max(Math.abs(u) - sx / 2, Math.abs(v) - sy / 2);
    if (d > feather) return;
    const f = 1 - smooth(0, feather, d);
    if (flat) addFlat(k, f * flat, z0);
    if (pave) maxTo(MP, k, f * pave);
    if (pack) maxTo(MK, k, f * pack);
  });
}

export function stampPath(pts, w, { feather = 5, dig = 0.2, pave = 0, pack = 0, flat = 0.9 } = {}) {
  const pr = prepRun({ pts: pts.map((p) => [p[0], p[1], demAt(p[0], p[1])]) });
  const m = w / 2 + feather;
  forCells(pr.bb[0] - m, pr.bb[1] - m, pr.bb[2] + m, pr.bb[3] + m, (x, y, k) => {
    const [d, z] = nearest(pr, x, y, m);
    if (d > m) return;
    const f = 1 - smooth(w / 2, m, d);
    if (flat) addFlat(k, f * flat, z - dig);
    if (pave) maxTo(MP, k, f * pave);
    if (pack) maxTo(MK, k, f * pack);
  });
}

// build the whole register. Order matters: the base-area flats go down first
// (they are the datum the run-out has to meet), then the pistes widest-first so
// a narrow steep corridor wins the flatten target where two overlap.
let built = false;
export function buildGround() {
  if (built) return;
  built = true;
  for (const L of LOTS) stampRect(L.c[0], L.c[1], L.s[0], L.s[1], L.yaw, { pave: 1, dig: 0.25, feather: 9 });
  for (const rd of ROADS) stampPath(rd, 11, { pave: 1, dig: 0.15, feather: 5 });
  // EPOCH A — every run the world already had. `ktRuns` lines are held back to
  // epoch B and `pouRuns` lines to epoch C, both below the basis snapshot, so
  // that not one rejection loop in forest.mjs sees them and not one placement in
  // the Red Dog pod moves.
  for (const r of [...RUNS].filter((r) => !r.ktRuns && !r.pouRuns).sort((a, b) => b.width - a.width)) stampRun(r);
  // Lift swaths. These clear FOREST only — they never touch the ground height,
  // because the mountain under a lift line is the mountain. They exist because
  // aerial.jpg is summer imagery from before the 2023 Red Dog realignment and
  // still shows unbroken canopy under the new line (measured openness 15.7%
  // under a 24 m swath vs a 19.8% frame baseline: no cut visible).
  for (const L of LIFTS) stampLiftSwath(L);
  // The guard is built from epoch A's own PREP — every protected run has been
  // prepped by the loop above — and it is built BEFORE the snapshot so that
  // nothing in it can depend on an epoch-B write.
  buildGuard();
  snapshotBasis();
  buildKtRuns();
  buildPouRuns();
}

function stampLiftSwath(L) {
  const pr = prepRun({ pts: L.pts });
  const hw = (L.swath || 26) / 2, fe = 9, m = hw + fe;
  forCells(pr.bb[0] - m, pr.bb[1] - m, pr.bb[2] + m, pr.bb[3] + m, (x, y, k) => {
    const [d] = nearest(pr, x, y, m);
    if (d > m) return;
    maxTo(MW, k, 1 - smooth(hw, m, d));
  });
}

// ======================================================================
// KT CLASSIC RUNS — epoch B, and THE FROZEN PLACEMENT BASIS
// ======================================================================
//
// THE PROBLEM THIS SOLVES, stated exactly. Every placement loop in forest.mjs
// is a REJECTION loop drawing from ONE shared rng stream, and REPORT §17.3's
// rule follows: a loop's output is a function of HOW MANY DRAWS IT TAKES, so
// anything that changes an acceptance test changes the stream for everything
// placed after it. The four front-side sector loops (exhibition, olympiclady,
// kt22, ktwest) draw from that shared stream, and pass 3's surround, the 70
// snags, the 85 granite outcrops and the 110 boulders are all drawn AFTER them.
//
// Reshaping the KT west face changes `groundZ` there, therefore `slopeAt`,
// therefore `forestDensity` — so the kt22 and ktwest loops would take a
// different number of candidates, and every snag, outcrop and boulder in the
// RED DOG POD would silently move. That is precisely the class of defect §14.3
// and §17.3 were written about, and it would have been invisible in a render.
//
// THE FIX is the one this world already uses, generalised: freeze the basis the
// decisions are made on, and apply the consequences afterwards.
//
//   1. epoch A stamps every pre-existing run — the world exactly as it was.
//   2. `snapshotBasis()` copies the eleven rasters that feed `forestDensity`
//      and `slopeAt`, over the KT working box only.
//   3. epoch B stamps the classic runs, the chute walls, the cornice and the
//      mogul fields on the LIVE rasters.
//   4. forest.mjs reads `masksAt0` / `slopeAt0` — the frozen basis — so every
//      loop takes exactly the draws it always took.
//   5. the trees that would now stand in a chute wall or on the mogul line are
//      removed, and the ones that survive are re-seated onto the new ground, by
//      a POST-DRAW filter on the finished arrays (forest.mjs `keep()`), which
//      cannot move a placement it does not remove.
//
// work/kt_forest.mjs is the hash that proves 4 and 5, the same way
// work/park_forest.mjs proved it for the terrain park.
//
// THE BOX MUST CONTAIN EVERY EPOCH-B WRITE, feather included — otherwise basis
// and live diverge outside it and the freeze leaks. `buildKtRuns` tracks the
// cell range it writes and `KT_WRITE` publishes it; work/kt_basis.mjs asserts
// containment and that basis == live everywhere outside.
export const KT_WORK = { x0: -1530, x1: -355, y0: -1190, y1: -105 };
// POULSEN'S GULLY — increment 21's own working box, and it is the reason the
// basis below became a LIST.
//
// THE FREEZE LEAKS THROUGH A SECOND DOOR IF YOU DO NOT DO THIS, and it is worth
// stating plainly because it is not obvious. `bil0` fell back to the LIVE raster
// for any cell outside KT_WORK — which was correct while epoch B was the only
// thing writing after the snapshot, because epoch B is contained in KT_WORK. The
// moment a second epoch writes anywhere else, `groundZ0` starts returning the
// world INCLUDING that epoch's own output at those cells, `forestDensity` and
// `slopeAt0` change, every rejection loop takes a different number of draws, and
// every tree, snag and boulder in the Red Dog pod silently moves. That is exactly
// the defect REPORT §17.3 and §20's epoch-B block exist to prevent, arriving from
// the other side. So the snapshot covers BOTH boxes and `bil0` consults both.
//
// Poulsen's own extent, measured by work/bake_poulsen.mjs, is x[-41, 59]
// y[-246, 460]; this adds the widest corridor half-width (12), its feather (22)
// and 45 m of margin, and work/pou_basis.mjs asserts containment rather than
// trusting the arithmetic.
export const POU_WORK = { x0: -120, x1: 130, y0: -320, y1: 530 };
// The two boxes MUST NOT OVERLAP — a cell in both would be snapshotted twice and
// `bil0` would have to pick, and whichever it picked would be wrong for the other
// epoch. KT_WORK.x1 = -355 and POU_WORK.x0 = -120, so they are 235 m apart.
const boxesOverlap = (a, b) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
if (boxesOverlap(KT_WORK, POU_WORK)) throw new Error('KT_WORK and POU_WORK overlap');

const BASIS_SRC = { F, FZ, MG, MB, MC, ML, MK, MP, MW, BU, BV };
/** one frozen copy of the eleven rasters per working box */
function mkBox(W) {
  const i0 = cix(W.x0), i1 = cix(W.x1), j0 = ciy(W.y0), j1 = ciy(W.y1);
  return { W, i0, i1, j0, j1, w: i1 - i0 + 1, h: j1 - j0 + 1, A: {} };
}
const BASIS_BOXES = [mkBox(KT_WORK), mkBox(POU_WORK)];
function snapshotBasis() {
  for (const B of BASIS_BOXES)
    for (const [name, A] of Object.entries(BASIS_SRC)) {
      const o = new Float32Array(B.w * B.h);
      for (let j = 0; j < B.h; j++) {
        const rs = (B.j0 + j) * RNX + B.i0, ws = j * B.w;
        for (let i = 0; i < B.w; i++) o[ws + i] = A[rs + i];
      }
      B.A[name] = o;
    }
}
// ------------------------------------------------- THE PROTECTED-CORRIDOR GUARD
// Containment inside a BOX is not enough. The box is 1175 x 1085 m and it holds
// other people's runs: measured, the first cut of epoch B lifted ROCK GARDEN by
// 20.61 m (Alt 75's wall, built relative to Alt 75's own centreline profile,
// crossing a neighbouring corridor that sits lower) and pushed MOUNTAIN RUN 9.39,
// EASY STREET 8.45 and STRAWBERRY FIELDS 7.29 m. Those runs feed a downstream
// deployable branched off this world and must come back BIT-IDENTICAL.
//
// So: epoch B may not write a cell that a pre-existing verified run stands on.
// This is a per-CELL test, not a per-LINE one, which is the whole point — the
// Diagonal Chute legitimately pinches to 10.8 m from Strawberry Fields' edge at
// mid-line and opens back out to 64.7 m, so clipping the LINE there would throw
// away 90 % of it (work/KT-GUARD-DECISION.md). Guarding the CELL trims only the
// stamp, exactly where the neighbour is, and gives the line back.
//
// EXEMPT — the ground epoch B exists to reshape:
//   seventyfive-chute, moseleys   the two flagship lines. Both are pre-existing
//                                 OSM runs (they are NOT `ktRuns`, which is only
//                                 the seven DERIVED lines), and stampChute /
//                                 stampKtMoguls are called directly on them.
//   the-nose, the-saddle,         the shared gate ground. Every classic line
//   saddle-face, gs-bowl          starts on the Nose and the traverse crosses the
//                                 Saddle; reshaping there is the increment.
// Everything else is protected, `rock-garden` and `dead-tree` included. That is
// STRICTER than KT-CHECKPOINT §4.2's gate, which still allowed Rock Garden a few
// metres of movement.
export const GUARD_EXEMPT = new Set(['seventyfive-chute', 'moseleys',
  'the-nose', 'the-saddle', 'saddle-face', 'gs-bowl']);
// beyond each run's half-width. work/kt_basis.mjs check 5 samples a corridor out
// to `width/2 + 24`, so the guarded zone must strictly CONTAIN the checked one —
// AND THEN SOME, because `groundZ` is BILINEAR. Suppressing the write at a cell
// centre does not stop a sample 2 m away from reading a neighbour cell that WAS
// written. At 26 m the gate still found mountain-run moving at 2 of 11,340
// samples, sub-centimetre, purely through that one-cell reach. 30 m puts 6 m —
// three raster cells — between the checked corridor and the nearest cell epoch B
// is allowed to touch, and the gate goes to zero.
export const PROTECT_HALO = 30;
// the stamp is released back to full strength over this, OUTSIDE the guarded
// zone, so a trimmed wall meets untouched ground on a ramp instead of a step.
const PROTECT_TAPER = 30;

/** 0 inside a protected corridor, ramping to 1 over PROTECT_TAPER. */
const GUARDF = new Float32Array(RNX * RNY).fill(1);
export const GUARD_STAT = { cells: 0, zero: 0, runs: 0 };
function buildGuard() {
  const pad = PROTECT_HALO + PROTECT_TAPER;
  for (const r of RUNS) {
    // A NEW LINE NEITHER GUARDS ITSELF NOR ANYTHING ELSE. `pouRuns` joins
    // `ktRuns` here for the same reason: the guard protects ground that was
    // already verified, and epoch C's own corridors were not.
    if (r.ktRuns || r.pouRuns || GUARD_EXEMPT.has(r.id)) continue;
    const pr = PREP[r.id];          // epoch A already prepped every one of these
    if (!pr) continue;
    GUARD_STAT.runs++;
    const hw = r.width / 2, m = hw + pad;
    forCells(pr.bb[0] - m, pr.bb[1] - m, pr.bb[2] + m, pr.bb[3] + m, (x, y, k) => {
      const [d] = nearest(pr, x, y, m);
      if (d > m) return;
      // 0 out to hw+HALO, then smoothly back to 1
      const g = smooth(hw + PROTECT_HALO, hw + pad, d);
      if (g < GUARDF[k]) GUARDF[k] = g;
    });
  }
  for (let k = 0; k < GUARDF.length; k++) {
    if (GUARDF[k] < 1) GUARD_STAT.cells++;
    if (GUARDF[k] <= 0) GUARD_STAT.zero++;
  }
}

export const KT_WRITE = { i0: 1e9, i1: -1e9, j0: 1e9, j1: -1e9, cells: 0 };
export const POU_WRITE = { i0: 1e9, i1: -1e9, j0: 1e9, j1: -1e9, cells: 0 };
const noteWrite = (k) => {
  const R = EPOCH === 'C' ? POU_WRITE : KT_WRITE;
  const j = (k / RNX) | 0, i = k - j * RNX;
  if (i < R.i0) R.i0 = i;
  if (i > R.i1) R.i1 = i;
  if (j < R.j0) R.j0 = j;
  if (j > R.j1) R.j1 = j;
  R.cells++;
};

/** bilinear on the FROZEN basis inside EITHER working box, on the live raster
 *  outside both. They are equal by construction everywhere outside the boxes, so
 *  the switch is seamless — work/kt_basis.mjs and work/pou_basis.mjs measure that
 *  it is rather than asserting it. */
function bil0(name, x, y) {
  let fx = (x - RX0) / RES, fy = (y - RY0) / RES;
  if (fx < 0 || fy < 0 || fx > RNX - 1.002 || fy > RNY - 1.002) return 0;
  const i = fx | 0, j = fy | 0, tx = fx - i, ty = fy - j;
  for (const B of BASIS_BOXES)
    if (i >= B.i0 && i + 1 <= B.i1 && j >= B.j0 && j + 1 <= B.j1) {
      const A = B.A[name], k = (j - B.j0) * B.w + (i - B.i0);
      return lerp(lerp(A[k], A[k + 1], tx), lerp(A[k + B.w], A[k + B.w + 1], tx), ty);
    }
  const A = BASIS_SRC[name], k = j * RNX + i;
  return lerp(lerp(A[k], A[k + 1], tx), lerp(A[k + RNX], A[k + RNX + 1], tx), ty);
}

// ------------------------------------------------------- the shape driver
// KT_SHAPE is bake_kt_runs.mjs's per-10 m confinement measurement on BARE 3DEP
// — [station, metres-to-the-+3 m-rise left, same right], 90 = unconfined. It is
// KT-RUNS.md §2's own instrument, and reproducing it gave Chute 75 at 21/32
// stations confined, median 30 m, min 14 m against the ledger's 17/30, 28 m,
// 14 m. NO SOURCE STATES A WIDTH for any line here (KT-RUNS §7.2) — this is the
// DEM's measurement of this ground and it is labelled derived wherever it shows.
function shapeAt(id, s, side) {
  const P = KT_SHAPE[id];
  if (!P || !P.length) return 34;
  const step = P.length > 1 ? P[1][0] - P[0][0] : 10;
  let f = s / step;
  f = clamp(f, 0, P.length - 1.001);
  const i = f | 0, t = f - i;
  const col = side < 0 ? 2 : 1;
  return lerp(P[i][col], P[i + 1][col], t);
}

// ------------------------------------------------------------- the CHUTE
// A true chute is a FLOOR with WALLS, and the DEM has to be believed about
// both. The floor is pulled onto the line's own smoothed longitudinal profile
// so it rides like a bed rather than a cross-slope; the walls rise only where
// the mountain does not already confine (`target > nat`), so this ADDS
// confinement to a corridor the DEM already measures and never invents one on
// open ground.
function stampChute(run, shapeId, {
  floorK = 0.70, floorMin = 6, floorMax = 20, wallW = 17, wallMax = 15,
  pull = 0.80, runnel = 1.0, wallK = 0.55,
} = {}) {
  const pr = PREP[run.id];
  const m = floorMax + wallW + 12;
  forCells(pr.bb[0] - m, pr.bb[1] - m, pr.bb[2] + m, pr.bb[3] + m, (x, y, k) => {
    // THE GUARD, first. An early return, not a zero weight: addFlat(k, 0, z)
    // still round-trips FZ through (FZ*F)/F, which is not guaranteed to be
    // bit-identical, and the gate is bit-identity.
    const g = GUARDF[k];
    if (g <= 0) return;
    const [d, z, s, side] = nearest(pr, x, y, m);
    if (d > m) return;
    const meas = shapeId ? shapeAt(shapeId, s, side) : 26;
    const fw = clamp(meas * floorK, floorMin, floorMax);
    // PRIOR GROUND, not the bare DEM, is what the caps are measured against.
    // The bare DEM is the summer hillside; the ground a neighbour's corridor is
    // ALREADY sitting on is `groundZ0`, and it is what a wall would be lifting.
    const prior = groundZ0(x, y);
    // the BED — may not move the mountain more than 3 m either way
    const bw = (1 - smooth(fw * 0.55, fw + 3, d)) * 0.95 * g;
    if (bw > 0.004) {
      addFlat(k, bw * pull, clamp(z - 0.25, prior - 3, prior + 3));
      maxTo(MRN, k, runnel * (1 - smooth(fw * 0.5, fw + 3, d)) * g);
      maxTo(ML, k, (1 - smooth(fw, fw + 9, d)) * g);
      noteWrite(k);
    }
    // the WALL
    const t = smooth(fw, fw + wallW, d);
    if (t > 0.001 && t < 0.999) {
      const hgt = clamp(meas * wallK, 4, wallMax);
      // cap the lift RELATIVE TO PRIOR GROUND. `z + hgt` is a height on the
      // CHUTE's own longitudinal profile; where the wall band crosses ground
      // that sits lower than the chute floor, that target is metres above what
      // is there and the wall lifts it. Rock Garden went up 20.61 m this way.
      const want = z + hgt * smooth(0, 0.62, t);
      const target = Math.min(want, prior + wallMax);
      if (target > prior + 0.3) {
        const w = 0.92 * (1 - smooth(0.78, 1.0, t)) * g;
        addFlat(k, w, target);
        maxTo(MWL, k, w * smooth(0.06, 0.5, t));
        noteWrite(k);
      }
    }
  });
}

// ----------------------------------------------------------- the CORNICE
// "the entrance is usually corniced and it maintains a really tough pitch all
// the way to the bottom" (SRG Skiing, yt:NCf6pnjt2Y0 @7:59) and "the tricky,
// steep and sudden drop off at the entrance of the chute" (SkiTnB,
// yt:GPoH7EDRECU). 3DEP puts the steepest 20 m at 47 m in — the same place —
// so the DEM and the prose agree without either being derived from the other.
//
// A SUMMER BARE-EARTH DEM CANNOT CONTAIN A WINTER CORNICE (KT-RUNS §7.6: "a
// winter cornice at Chute 75's entrance will not appear in a summer DEM at all
// — build it from the footage"). So this is the one place in the increment
// where height is ADDED that the DEM does not carry, and it is added as an
// explicit metres field (MCN) rather than hidden in the flatten target.
function stampCornice(run, { at: sc = 47, h = 2.6, hw = 22, back = 15, lee = 5 } = {}) {
  const pr = PREP[run.id];
  const m = hw + 12;
  forCells(pr.bb[0] - m, pr.bb[1] - m, pr.bb[2] + m, pr.bb[3] + m, (x, y, k) => {
    const g = GUARDF[k];
    if (g <= 0) return;
    const [d, , s] = nearest(pr, x, y, m);
    if (d > m || s < sc - back - 6 || s > sc + lee + 6) return;
    // build up over `back` m, then fall away over `lee` m — the drop-in
    const rise = smooth(sc - back, sc - 2, s);
    const drop = 1 - smooth(sc - 1, sc + lee, s);
    // the lip is highest at the centre of the entrance and dies at its edges
    const across = 1 - smooth(hw * 0.45, hw, Math.abs(d));
    const amt = h * rise * drop * across * g
      * (0.82 + 0.30 * fbm(x * 0.06, y * 0.06, 2, 2.1, 0.5, 37));
    if (amt > 0.01) { maxTo(MCN, k, amt); noteWrite(k); }
  });
}

// ------------------------------------------------------- the MOGUL FIELDS
// Moseley's is "the premiere mogul run at Palisades" (SRG @7:36) and "the most
// challenging mogul run in North America" (bestsnow), on a 36.7 deg p50 open
// face with no gully walls in the DEM and none in the footage. view-36 is the
// ground: broad, skied-in rolls with defined troughs, not a groomed corduroy
// field — which is why these runs carry `ktmogul` and not `moguls`.
function stampKtMoguls(run, { from = 0.06, to = 0.90, hwK = 0.98, amp = 1.0 } = {}) {
  const pr = PREP[run.id];
  const hw = (run.width / 2) * hwK, m = hw + 14;
  forCells(pr.bb[0] - m, pr.bb[1] - m, pr.bb[2] + m, pr.bb[3] + m, (x, y, k) => {
    const gd = GUARDF[k];
    if (gd <= 0) return;
    const [d, , s] = nearest(pr, x, y, m);
    if (d > m) return;
    const t = s / pr.len;
    const g = smooth(from - 0.05, from + 0.06, t) * (1 - smooth(to - 0.06, to + 0.05, t));
    const lane = 1 - smooth(hw * 0.66, hw * 1.02, d);
    const v = g * lane * amp * gd;
    if (v > 0.01) { maxTo(MB2, k, v); noteWrite(k); }
  });
}

function buildKtRuns() {
  const KR = RUNS.filter((r) => r.ktRuns);
  // THE RUN STAMPS COUNT AS EPOCH-B WRITES TOO. The first cut of this only
  // instrumented the chute/cornice/mogul stamps, so `KT_WRITE` under-reported
  // the footprint by the whole width+feather of seven new corridors and
  // work/kt_basis.mjs's containment check was passing on incomplete evidence.
  EPOCH = 'B';
  for (const r of [...KR].sort((a, b) => b.width - a.width)) stampRun(r);
  EPOCH = '';
  const R = (id) => RUNS.find((q) => q.id === id);

  // CHUTE 75 — the flagship. Floor from the DEM's own per-station measurement,
  // walls where the mountain does not already confine, and the cornice on top.
  stampChute(R('seventyfive-chute'), 'seventyfive-chute',
    { floorK: 0.70, floorMin: 7, floorMax: 19, wallW: 17, wallMax: 15, pull: 0.82 });
  stampCornice(R('seventyfive-chute'), { at: 47, h: 2.6, hw: 21, back: 15, lee: 5 });
  // ALT 75 — no measured profile of its own (it is not an OSM way, so there is
  // no centreline for the ledger to have measured); a constant 26 m stand-in is
  // used and REPORT §20 says so.
  stampChute(R('alt-75'), null,
    { floorK: 0.62, floorMin: 6, floorMax: 14, wallW: 14, wallMax: 11, pull: 0.74, runnel: 0.8 });
  // DIAGONAL CHUTE — measured, min 10 m: the tightest thing in the Oly pocket.
  stampChute(R('diagonal-chute'), 'diagonal-chute',
    { floorK: 0.64, floorMin: 5, floorMax: 14, wallW: 15, wallMax: 13, pull: 0.80, runnel: 0.9 });

  // MOSELEY'S and the four ALTERNATES — the mogul ground.
  stampKtMoguls(R('moseleys'), { from: 0.07, to: 0.93, hwK: 0.95, amp: 1.0 });
  for (const id of ['west-face-2', 'west-face-3', 'west-face-4', 'west-face-5'])
    stampKtMoguls(R(id), { from: 0.06, to: 0.90, hwK: 0.98, amp: 0.92 });
}

// ======================================================================
// EPOCH C — POULSEN'S GULLY
// ======================================================================
//
// WHAT THIS EPOCH DOES NOT DO IS THE HEADLINE. It does not build the cliff.
//
// The cliff band is BUILT GEOMETRY (scene/poulsen.mjs), not a ground reshape,
// for two independent reasons and either one alone would settle it:
//
//   1. THE GUARD CLOSES THE GROUND. Measured (work/pou_guard.mjs): along the
//      gully axis, GUARDF is 0 from s = 120 to s = 276 m, closed by LOWER DOG
//      LEG (w 52, protected at half-width + 30 m). The ledger's cliff lip is
//      56.5 m from Dog Leg's centreline and the closed radius is 56 m, so there
//      is about one metre of writable ground at the lip and none at the landing.
//      Poulsen's upper half IS Dog Leg's ground — which is not a build failure,
//      it is the geography the uploader describes: "an unavoidable sharp drop
//      down to THE MAIN PART OF THE TRAIL". Same finding shape as §20.6's Alt 75.
//
//   2. A 1.37 m/px BARE-EARTH DEM CANNOT HOLD A 5 m CLIFF. The ledger says so
//      itself, twice: §2 "a 1.37 m/px DEM smooths a cliff lip", and §6.2 "the
//      DEM's 13 m over ~17 m is a SLOPE AVERAGE across a smoothed cell, not a
//      cliff face height". This is the same call §20's cornice made, and it is
//      made the same way: the added height is explicit geometry you can point
//      at, never hidden inside a flatten target.
//
// So epoch C carves the CORRIDOR where there is room for one, and nothing else.
// Where there is no room it writes nothing at all and REPORT §21 says where.

/** metres to a +3 m rise at station `s` on side `side` (+1 = skier's right),
 *  from POU_SHAPE — KT-RUNS.md's confinement instrument run on this line by
 *  work/bake_poulsen.mjs. 90 means the mountain does not confine here at all. */
function pouShapeAt(s, side) {
  const P = POU_SHAPE;
  if (!P || !P.length) return 90;
  const step = P.length > 1 ? P[1][0] - P[0][0] : 10;
  let f = clamp(s / step, 0, P.length - 1.001);
  const i = f | 0, t = f - i;
  const col = side > 0 ? 1 : 2;              // [station, right, left]
  return lerp(P[i][col], P[i + 1][col], t);
}

/**
 * The gully floor, and A WALL ONLY WHERE THE MOUNTAIN ALREADY HAS ONE.
 *
 * POULSEN'S IS NOT A CHUTE AND THE BUILD DOES NOT PRETEND IT IS. Run KT-RUNS.md's
 * own confinement instrument on this line (work/bake_poulsen.mjs §4b) and it
 * reads 6 of 78 stations confined on both sides, median total width 138 m —
 * which by that instrument's own calibration is an OPEN FACE, the reading
 * Moseley's gets, not the 21/32 at 30 m that makes Chute 75 a chute.
 *
 * What it IS is a ONE-SIDED drainage: 53 of 78 stations are walled on the
 * skier's RIGHT (east — the Red Dog Glades spur) and essentially none on the
 * LEFT, where the mountain falls away into Red Dog Face's own drainage. That is
 * squawguide's description measured rather than paraphrased: "a skier's-LEFT
 * glade escape mid-gully leads instead to the bottom of Red Dog" — you can leave
 * to the left because the left is open.
 *
 * So: the bed is pulled onto the line's own profile, the RIGHT wall rises only
 * where `POU_SHAPE` measures confinement within `wallReach`, and there is no
 * left wall anywhere in this function. Caps are against PRIOR GROUND
 * (`groundZ0`), which is the rule that stopped Rock Garden being lifted 20.61 m.
 */
function stampGully(run, { floorHW = 9, wallW = 13, wallMax = 5, pull = 0.55,
                           wallReach = 34 } = {}) {
  const pr = PREP[run.id];
  if (!pr) return;
  const m = floorHW + wallW + 10;
  forCells(pr.bb[0] - m, pr.bb[1] - m, pr.bb[2] + m, pr.bb[3] + m, (x, y, k) => {
    // THE GUARD, first, as an EARLY RETURN and never a zero weight: addFlat(k, 0, z)
    // still round-trips FZ through (FZ*F)/F, which is not guaranteed bit-identical,
    // and the gate is bit-identity (§20.3).
    const g = GUARDF[k];
    if (g <= 0) return;
    const [d, z, s, side] = nearest(pr, x, y, m);
    if (d > m) return;
    const prior = groundZ0(x, y);
    const bw = (1 - smooth(floorHW * 0.55, floorHW + 3, d)) * 0.92 * g;
    if (bw > 0.004) {
      // the bed may not move the mountain more than 2 m either way. Poulsen's is
      // a natural drainage, not a cut corridor, and 2 m is a third of what the
      // KT chutes are allowed because there is no groomer here to have cut it.
      addFlat(k, bw * pull, clamp(z - 0.2, prior - 2, prior + 2));
      maxTo(ML, k, (1 - smooth(floorHW, floorHW + 8, d)) * g);
      noteWrite(k);
    }
    // THE RIGHT WALL, and only where measured. `side` is +1 on the skier's right
    // (stampRun's own sign convention, reused). A station whose instrument reads
    // 90 — no rise within 90 m — gets nothing at all, which is how a 138 m-wide
    // open face stays a 138 m-wide open face.
    if (side < 0) return;
    const meas = pouShapeAt(s, +1);
    if (meas > wallReach) return;
    const conf = 1 - smooth(wallReach * 0.6, wallReach, meas);   // 1 tight, 0 at reach
    const t = smooth(floorHW, floorHW + wallW, d);
    if (t > 0.001 && t < 0.999) {
      const want = z + wallMax * conf * smooth(0, 0.62, t);
      const target = Math.min(want, prior + wallMax);
      if (target > prior + 0.3) {
        const w = 0.85 * (1 - smooth(0.78, 1.0, t)) * g * conf;
        addFlat(k, w, target);
        maxTo(MPW, k, w * smooth(0.06, 0.5, t));
        noteWrite(k);
      }
    }
  });
}

function buildPouRuns() {
  EPOCH = 'C';
  const PR = RUNS.filter((r) => r.pouRuns);
  for (const r of [...PR].sort((a, b) => b.width - a.width)) stampRun(r);
  // Only the GULLY gets a floor stamp. The three entrances are drop-ins onto
  // ground that belongs to Upper Dog Leg and to the Red Dog Glades; the guard
  // closes almost all of it, and where it does not, a drop-in is a line you take
  // down existing snow, not a corridor anybody cut.
  stampGully(RUNS.find((q) => q.id === 'poulsens-gully'),
    { floorHW: 9, wallW: 13, wallMax: 5, pull: 0.55 });
  EPOCH = '';
}
buildGround();

// -------------------------------------------------------------- sampling
function bil(A, x, y) {
  let fx = (x - RX0) / RES, fy = (y - RY0) / RES;
  if (fx < 0 || fy < 0 || fx > RNX - 1.002 || fy > RNY - 1.002) return 0;
  const i = fx | 0, j = fy | 0, tx = fx - i, ty = fy - j, k = j * RNX + i;
  return lerp(lerp(A[k], A[k + 1], tx), lerp(A[k + RNX], A[k + RNX + 1], tx), ty);
}
// A DECLARATION, not a const arrow, so it is HOISTED. `stampChute` calls
// `groundZ0` during buildGround() to cap the wall against prior ground, and
// buildGround() is invoked above this line — a `const` here is in its temporal
// dead zone at that moment and throws.
function inRaster(x, y) {
  return x > RX0 + RES && y > RY0 + RES
      && x < RX0 + (RNX - 2) * RES && y < RY0 + (RNY - 2) * RES;
}

// ---------------------------------------------------------- mogul field
// Moguls are an egg-carton in the RUN's own (u along, v across) frame, skewed
// so the rows stagger, and warped by slow noise so no two bumps match. 5.6 m
// down-line by 3.9 m across, +/-0.34 m: a 0.68 m bump on a 20 deg pitch adds
// about +/-20 deg of local slope â€” a real bump field the ski physics can read,
// still rideable at speed. (Real Red Dog Face moguls run 4-7 m.)
const LU = 5.6, LV = 3.9, AMP = 0.34, TAU = Math.PI * 2;
export function mogulAt(x, y, u, v) {
  const w1 = fbm(x * 0.020, y * 0.020, 2, 2.1, 0.5, 17);
  const w2 = fbm(x * 0.016, y * 0.016, 2, 2.1, 0.5, 43);
  const uu = u / LU + 0.30 * w1;
  const vv = v / LV + 0.5 * (u / LU) + 0.34 * w2;
  const c = Math.cos(TAU * uu) * Math.cos(TAU * vv);
  return AMP * c * (0.82 + 0.30 * w2);
}

// ---- KT mogul field. Real Moseley's bumps run 4-7 m; these are 7.8 m down-line
// by 6.8 m across at +/-0.55 m, which is the TOP of the real range, and the
// reason is Nyquist, stated rather than hidden: the finest grid this face can
// afford is 2.0 m (kt-moseleys) and 2.4 m (kt-westalts), so a 4 m bump would be
// sampled twice across and alias into a corduroy shimmer instead of reading as
// a bump. A 6.8 m bump gets 3.4 and 2.8 samples. REPORT §20 carries this as a
// resolution trade, not as a measurement.
const KLU = 7.8, KLV = 6.8, KAMP = 0.55;
export function ktMogulAt(x, y, u, v) {
  const w1 = fbm(x * 0.017, y * 0.017, 2, 2.1, 0.5, 23);
  const w2 = fbm(x * 0.013, y * 0.013, 2, 2.1, 0.5, 61);
  const uu = u / KLU + 0.34 * w1;
  const vv = v / KLV + 0.5 * (u / KLU) + 0.38 * w2;
  const c = Math.cos(TAU * uu) * Math.cos(TAU * vv);
  // troughs deeper than crests are tall: a skied-in bump field is not a sine
  const s = c < 0 ? c * 1.22 : c * 0.88;
  return KAMP * s * (0.80 + 0.34 * w2);
}

// ---- fall-line sluff runnels. view-26 and view-29 are the evidence: the floor
// of Chute 75 carries continuous grooves running straight down the fall line,
// not moguls. They are CONSTANT along the line and periodic across it, which is
// exactly the (u, v) frame the run stamp already provides. 7.0 m across so a
// 2.0 m grid gets 3.5 samples.
const RLV = 7.0, RAMP = 0.28;
export function runnelAt(x, y, u, v) {
  const w = fbm(x * 0.011, y * 0.011, 2, 2.1, 0.5, 53);
  const vv = v / RLV + 0.55 * w + 0.16 * Math.sin(u * 0.055);
  return RAMP * Math.cos(TAU * vv)
    * (0.66 + 0.44 * fbm(x * 0.028, y * 0.028, 2, 2.1, 0.5, 29));
}

export function groundZ(x, y) {
  const dem = demAt(x, y);
  if (!inRaster(x, y)) return dem;
  const f = bil(F, x, y);
  let z = dem * (1 - f) + bil(FZ, x, y) * f;
  const b = bil(MB, x, y);
  if (b > 0.01) z += mogulAt(x, y, bil(BU, x, y), bil(BV, x, y)) * b;
  // KT CLASSIC RUNS (epoch B). All three are identically zero outside the KT
  // working box, so this function is bit-identical to the shipped one over the
  // whole rest of the world — work/kt_basis.mjs measures that, it is not asserted.
  const b2 = bil(MB2, x, y);
  if (b2 > 0.01) z += ktMogulAt(x, y, bil(BU, x, y), bil(BV, x, y)) * b2;
  const rn = bil(MRN, x, y);
  if (rn > 0.01) z += runnelAt(x, y, bil(BU, x, y), bil(BV, x, y)) * rn;
  const cn = bil(MCN, x, y);
  if (cn > 0.005) z += cn;
  // wind texture on the open snow away from the pistes (view-16's scoured roll)
  const g = bil(MG, x, y), k = bil(MK, x, y), p = bil(MP, x, y);
  const open = clamp(1 - g - k - p, 0, 1);
  if (open > 0.05) z += open * 0.20 * fbm(x * 0.055, y * 0.055, 3, 2.2, 0.5, 71);
  return z;
}

// ---------------------------------------------- THE FROZEN PLACEMENT BASIS
// groundZ / masksAt as they were BEFORE the KT classic-runs pass. forest.mjs
// makes every accept/reject decision on these, so every rejection loop takes
// exactly the draws it always took and no placement outside this increment's
// own clearances moves. See the epoch-B block above for why that is the rule.
export function groundZ0(x, y) {
  const dem = demAt(x, y);
  if (!inRaster(x, y)) return dem;
  const f = bil0('F', x, y);
  let z = dem * (1 - f) + bil0('FZ', x, y) * f;
  const b = bil0('MB', x, y);
  if (b > 0.01) z += mogulAt(x, y, bil0('BU', x, y), bil0('BV', x, y)) * b;
  const g = bil0('MG', x, y), k = bil0('MK', x, y), p = bil0('MP', x, y);
  const open = clamp(1 - g - k - p, 0, 1);
  if (open > 0.05) z += open * 0.20 * fbm(x * 0.055, y * 0.055, 3, 2.2, 0.5, 71);
  return z;
}
export const masksAt0 = (x, y) => (inRaster(x, y) ? {
  groom: bil0('MG', x, y), bump: bil0('MB', x, y), cat: bil0('MC', x, y),
  glade: bil0('ML', x, y), pack: bil0('MK', x, y), pave: bil0('MP', x, y),
  lift: bil0('MW', x, y), race: bil(MR, x, y), ctx: bil(MX, x, y),
  u: bil0('BU', x, y), v: bil0('BV', x, y),
} : { groom: 0, bump: 0, cat: 0, glade: 0, pack: 0, pave: 0, lift: 0, race: 0, ctx: 0, u: 0, v: 0 });
export function slopeAt0(x, y, h = 3.0) {
  const zx = (groundZ0(x + h, y) - groundZ0(x - h, y)) / (2 * h);
  const zy = (groundZ0(x, y + h) - groundZ0(x, y - h)) / (2 * h);
  return Math.atan(Math.hypot(zx, zy)) * 180 / Math.PI;
}
/** the built KT wall / cornice / mogul read, for terrain.mjs's colour pass */
export const ktMasksAt = (x, y) => (inRaster(x, y)
  ? { wall: bil(MWL, x, y), runnel: bil(MRN, x, y), ktbump: bil(MB2, x, y), cornice: bil(MCN, x, y) }
  : { wall: 0, runnel: 0, ktbump: 0, cornice: 0 });

export const masksAt = (x, y) => (inRaster(x, y) ? {
  groom: bil(MG, x, y), bump: bil(MB, x, y), cat: bil(MC, x, y), glade: bil(ML, x, y),
  pack: bil(MK, x, y), pave: bil(MP, x, y), lift: bil(MW, x, y), race: bil(MR, x, y),
  ctx: bil(MX, x, y), u: bil(BU, x, y), v: bil(BV, x, y),
  pou: bil(MPG, x, y), pouWall: bil(MPW, x, y),
} : { groom: 0, bump: 0, cat: 0, glade: 0, pack: 0, pave: 0, lift: 0, race: 0, ctx: 0,
      u: 0, v: 0, pou: 0, pouWall: 0 });

export const RASTER = { RES, RX0, RY0, RNX, RNY };
export { DEM_Z0 };

// slope in degrees, from the finished ground
export function slopeAt(x, y, h = 3.0) {
  const zx = (groundZ(x + h, y) - groundZ(x - h, y)) / (2 * h);
  const zy = (groundZ(x, y + h) - groundZ(x, y - h)) / (2 * h);
  return Math.atan(Math.hypot(zx, zy)) * 180 / Math.PI;
}
export function normalAt(x, y, h = 3.0) {
  const zx = (groundZ(x + h, y) - groundZ(x - h, y)) / (2 * h);
  const zy = (groundZ(x, y + h) - groundZ(x, y - h)) / (2 * h);
  const l = Math.hypot(zx, zy, 1);
  return [-zx / l, -zy / l, 1 / l];
}
