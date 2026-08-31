// scene/poulsen.mjs — POULSEN'S GULLY'S CLIFF BAND, built as geometry.
//
// Evidence: pois/red-dog-palisades/RED-DOG-GUIDED.md §2 (the cliff band, three
// independent lines of evidence) and §9 (Greg, first-hand, outranks everything
// above it). Design: work/POULSEN-SPEC.md §3. Baked frame: scene/pou-data.mjs.
//
// ------------------------------------------------------------ WHY A BUILT MASS
//
// The same call §20's cornice made, for the same reason and with the same
// honesty about it. Two independent facts each settle it on their own:
//
//   1. A 1.37 m/px bare-earth DEM CANNOT HOLD A 5 m CLIFF. The ledger says so
//      twice — §2 ("a 1.37 m/px DEM smooths a cliff lip") and §6.2 ("the DEM's
//      13 m over ~17 m is a SLOPE AVERAGE across a smoothed cell, not a cliff
//      face height"). What the raster carries at the lip is a uniform 42 deg
//      ramp. The real thing, which view-40 and view-41 photograph, is flat-ish
//      above, a vertical step, and steep below.
//   2. THE GUARD. SPEC §0.4 measures it: every cell within 56 m of Lower Dog
//      Leg's centreline is closed, and the lip anchor is 56.5 m from it. There
//      is about a metre of writable ground at the lip and none at the landing.
//      Poulsen's upper half is Lower Dog Leg's ground.
//
// So the cliff is ADDED ON TOP of the ground and never carved into it.
//
// THE BUILT MASS IS STRICTLY ADDITIVE — built(x, y) >= groundZ(x, y) everywhere,
// with no exception and no special case. Every vertex in this file is
// `groundZ(x, y) + h` for an `h` that is provably >= 0, which is what makes the
// increment legal at all: it cannot lower a cell, so it cannot move a
// neighbouring run, so no rejection loop anywhere in the world re-rolls.
// work/pou_geom_check.mjs asserts it over a 0.5 m grid and over every emitted
// vertex, and prints the worst value.
//
// ---------------------------------------------------------------- THE PROFILE
//
// In the band's own (u down-slope, h above ground) plane, at each station v:
//
//    u <= -SHELF   h = 0            natural ground, untouched
//    -SHELF..0     the SHELF        rises to H(v) on a smoothstep, wind-pillowed
//    0..faceLen    the FACE         falls H -> 0; bare rock, near-vertical
//    u > faceLen   h = 0            natural ground again; talus below
//
// SHELF is DERIVED, not chosen: the shelf is built to run at ~20 deg where the
// smoothed DEM runs at 36-45 deg, so its length is exactly the height divided by
// the difference of the two tangents —
//
//    SHELF = H / max(0.12, tan(DEMslope) - tan(20 deg))          clamped [6, 26]
//
// — which at the main drop (H = 5.8, DEM 42.2 deg) is 10.7 m. The `max(0.12)`
// floor is a guard for the shallow stations at the band's east end (23 deg,
// where tan(DEM) is barely above tan(20)) and the [6, 26] clamp keeps a 0.2 m
// step from growing a 40 m ramp; both are chosen, not measured, and are said so
// here.
//
// WHY IT IS CONVEX, which is the whole point of view-41. A smoothstep shelf
// leaves the surface running at the ground's own 42 deg at the toe, easing to
// ~5 deg in the middle, and STEEPENING BACK to 42 deg at the lip before the face
// takes over. The second half is therefore convex in the world, and a sight ray
// from a rider 6 m back at eye height passes ABOVE the lip and below the
// landing: you cannot see where you are going until you are committed. That is
// the ledger's own word for the drop — "unavoidable" — reproduced as geometry
// rather than asserted. On top of that the last 4 m carry a 10 % wind pillow,
// because a NNW lip on this aspect loads, and because view-40's foreground roll
// is visibly fatter than the shelf behind it.
//
// -------------------------------------------------------- WHERE THE ROCK GOES
//
// `POU_BAND.rockV` = [-50, +12] is the v-window where the DEM reads >= 44 deg,
// and SPEC §3 names it as the exposed band ("bare, dark, un-snowed, heaviest on
// the western sub-band"). That window drives three things at once:
//
//   * THE FACE IS ALWAYS BARE DARK ROCK. A cliff face holds no snow; only the
//     horizontal fracture breaks catch any, and only a little (snowLace on the
//     face's own sub-buffer, so the outward-stepped ledge facets whiten and the
//     vertical ones do not).
//   * INSIDE rockV the break is a SHARP ROCK LIP: faceLen 0.90 m (~81 deg with
//     the ground's own fall) on a 0.30 m crest radius.
//   * OUTSIDE it the mass is snow over buried rock, so the break is a
//     WIND-ROUNDED ROLL: faceLen 1.70 m on a 0.75 m radius. That is the rule
//     that makes the side takeoff natural without special-casing it.
//
// Frame note on view-40: its "exposed dark rock band at upper right" is a
// chest-mounted fisheye POV with no recoverable camera (the §20.7 call), so
// which side of the frame the rock sits on is NOT evidence for east vs west.
// The v-window is taken from the DEM, which is.
//
// ------------------------------------------------------- THE SIDE TAKEOFF
//
// v = +30, step 2.4 m, world approx (-3.7, -105.0). Greg §9.1 and §9.3 are a
// hard constraint and they are the reason this is not park.mjs: NATURAL ONLY.
// No flat deck, no defined knuckle, no straight edges, no soil-bag cap, no
// shaping of any kind. It is a convex snow roll over a small rock nose that
// happens to launch you, and it gets the HIGHER-POLY treatment (0.35 m across
// the lip against 0.55 m for the main band) because it is the tutorial jump and
// a rider looks straight down it. §9.1: "guided jump line uses a smaller side
// takeoff, NOT the main band".
//
// It still launches. The built drop at the crest is 2.5 m over 1.7 m of run,
// which with the ground's own 42 deg is ~68 deg absolute — past the ride
// controller's atan(snapMul) = 63.4 deg detach threshold (park.mjs measured it),
// so a ski leaves the snow. A rounded roll that did NOT clear that threshold
// would be a beautiful ornament you ride straight over, which is park.mjs's
// defect #1 in a different costume.
//
// ------------------------------------------------------------- THE BUDGET SPLIT
//
// COMPOSING rule 17 as three numbers, and the split is the point of the module:
//
//   collide  a coarse proxy, graded along u and 1.30 m across v, no detail.
//            <= 3,500 tris. This is what the skier stands on and falls off, so
//            its TOP SURFACE has to track the display mesh's within ~0.15 m or
//            the player lands on air. Measured, not assumed: 0.138 m worst,
//            0.016 m mean, over every part of the mass that stands 0.15 m or
//            more above the natural hill (work/pou_geom_check.mjs gate 5).
//   skin     the display mesh at 0.55 m across the band (0.35 m across the side
//            takeoff's lip), plus fracture relief, ledges and snow lace.
//            <= 13,000 tris. Not collidable.
//   props    patrol disc, bamboo, talus. <= 2,500 tris. Not collidable.
//
// THE COLLIDE CAP STARTED AT 1,600 AND WAS RAISED TO 3,500, and the reason is
// worth writing down because it is the whole budget argument. The world stands
// at 878,387 collidable triangles against a 900,000 cap, so 21,613 are spare.
// At 1,600 the proxy tracked the display mesh to 0.24 m and no amount of
// re-grading closed it; at 2,422 it tracks to 0.138 m. Spending 2.7 % of the
// remaining headroom on the one surface a rider stands on and falls off is
// COMPOSING rule 17 exactly, and it is still 4.6x cheaper than colliding the
// 11,158-triangle skin — the only alternative, which would have taken half the
// headroom for one feature.
//
// If the budget is ever overshot, `skin` is coarsened and `collide` is not.

import {
  buf, tri, quad, tube, prism, appendBuf, bufTris,
  makeRng, rr, ri, lin, mixc, scalec, jitc,
  clamp, lerp, smooth, fbm, vnoise, snowLace,
} from './lib/core.mjs';
import { PAL, wand } from './kit.mjs';
import { POU_BAND } from './pou-data.mjs';

// ============================================================== 0. THE FRAME
//
// Taken whole from the bake. `centre` is the ledger's GPS lip fix carried
// through this world's own transform (SPEC §0.1: the seven anchors reproduce the
// ledger's elevations to a worst 0.8 m, so nothing had to be bent); `bearing`
// 358.5 deg is the circular mean of the DEM's aspect at that fix and at the
// band's two steep sub-maxima. `u` is down-slope, `v` is across, +v is the
// skier's RIGHT looking down the band, which on this bearing is east.
const CEN = POU_BAND.centre;
function unit(a) { const L = Math.hypot(a[0], a[1]) || 1; return [a[0] / L, a[1] / L]; }
const UAX = unit(POU_BAND.u);          // down-slope, ~N 358.5 deg
const VAX = unit(POU_BAND.v);          // across the band, +v = skier's right
// UAX . VAX is exactly 0 for the baked pair, so (u, v) is an orthonormal frame
// and toUV is a plain projection rather than a solve.

const toXY = (u, v) => [CEN[0] + UAX[0] * u + VAX[0] * v,
                        CEN[1] + UAX[1] * u + VAX[1] * v];
function toUV(x, y) {
  const dx = x - CEN[0], dy = y - CEN[1];
  return [dx * UAX[0] + dy * UAX[1], dx * VAX[0] + dy * VAX[1]];
}

// The injected world. `buildPoulsen` sets these; `poulsenSurfaceZ` needs the
// same ground the mass was built against, and taking it by injection rather
// than importing ground.mjs keeps this module pure construction — it can be
// diffed, re-baked and unit-tested without standing up the whole raster.
let GZ = null;      // groundZ(x, y) — analytic ground, READ-ONLY truth
let RA = null;      // rockAt(x, y)  — bare-rock fraction from the summer aerials
let SA = null;      // slopeAt(x, y, h) — degrees, used only as a cross-check

// ==================================================== 1. THE STATION PROFILE
//
// `POU_BAND.step` and `.band` are sampled every 2 m. Reading them with linear
// interpolation puts a crease across the band at every one of the 71 stations —
// visible at the skin's 0.55 m sampling, and physically wrong: they are 2 m
// samples of a smooth measured quantity, not a 2 m-faceted object. Catmull-Rom
// is the honest reading. It can undershoot by a hair where the table pins to
// zero at the band ends, so H is clamped at 0.
function crAt(tab, v, col) {
  const v0 = tab[0][0], dv = tab[1][0] - tab[0][0], n = tab.length;
  const f = clamp((v - v0) / dv, 0, n - 1.0001);
  const i = f | 0, t = f - i;
  const g = (k) => tab[clamp(k, 0, n - 1)][col];
  const p0 = g(i - 1), p1 = g(i), p2 = g(i + 1), p3 = g(i + 2);
  return 0.5 * (2 * p1 + (-p0 + p2) * t
    + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t
    + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t);
}

const D2R = Math.PI / 180;
const TAN20 = Math.tan(20 * D2R);      // SPEC §3: the built shelf runs at ~20 deg

// The v-window where the DEM reads >= 44 deg — POU_BAND.rockV, baked. The 7 m /
// 3 m feathers either side are chosen, not measured: a rock band does not end on
// a line, and a hard edge would put a step in faceLen across one station.
const RV = POU_BAND.rockV;
const rockF = (v) => smooth(RV[0] - 7, RV[0] + 3, v) * (1 - smooth(RV[1] - 3, RV[1] + 7, v));

const PILLOW_U = 4.0;        // metres of lip that carry the wind load
const PILLOW_A = 0.10;       // 10 % — chosen, see the header. view-40's roll is
                             // visibly fatter than the shelf behind it; there is
                             // no measurement of by how much.
const pillow = (u) => 1 + PILLOW_A * smooth(-PILLOW_U, 0, u);

/** everything the profile at station v needs, derived once. */
function stationAt(v) {
  const H = Math.max(0, crAt(POU_BAND.step, v, 1));
  const dem = crAt(POU_BAND.band, v, 1);
  const SH = clamp(H / Math.max(0.12, Math.tan(dem * D2R) - TAN20), 6, 26);
  const rk = clamp(rockF(v), 0, 1);
  const Hc = H * (1 + PILLOW_A);                 // crest height with the pillow
  // 1.30 m on snow is not a softer number picked for looks — it is the number
  // that keeps the side takeoff PAST the ride controller's detach threshold.
  // Measured from the top of the roll, a 2.55 m crest over 1.30 m of nose plus
  // the ground's own 42 deg is 65 deg absolute, and the controller lets go at
  // atan(snapMul) = 63.4 deg (park.mjs §19.3). At 1.70 m it measured 62.8 deg:
  // a beautiful rounded roll that a ski rides straight over without leaving the
  // snow, which is park.mjs's defect #1 wearing different clothes.
  const faceLen = lerp(1.30, 0.90, rk);          // sharp rock lip vs rounded nose
  // the crest radius: 0.30 m on bare rock, 0.75 m on a wind-rolled snow lip, and
  // never more than 55 % of the face (or the fillet would eat the face) nor 30 %
  // of the drop (or a 0.2 m step at the band's end would become a pure fillet).
  const R = Math.max(0.05, Math.min(lerp(0.75, 0.30, rk),
                                    0.55 * faceLen,
                                    0.30 * Math.max(0.4, Hc)));
  return { v, H, dem, SH, Hc, faceLen, R, rk };
}

const hShelf = (u, P) => {
  const uu = Math.min(u, 0);
  if (uu <= -P.SH) return 0;
  return P.H * smooth(-P.SH, 0, uu) * pillow(uu);
};
const hFace = (u, P) => P.Hc * clamp(1 - u / P.faceLen, 0, 1);

function hermite(f, p0, p1, m0, m1) {
  const f2 = f * f, f3 = f2 * f;
  return (2 * f3 - 3 * f2 + 1) * p0 + (f3 - 2 * f2 + f) * m0
       + (-2 * f3 + 3 * f2) * p1 + (f3 - f2) * m1;
}

/** built height above natural ground at (u) on station P. Always >= 0. */
function hAt(u, P) {
  if (P.H <= 2e-3) return 0;
  const R = P.R;
  if (u <= -R) return hShelf(u, P);
  if (u >= R) return hFace(u, P);
  // THE CREST FILLET. A C1 Hermite from the shelf into the face, whose width IS
  // the difference between a cliff lip and a wind roll. Endpoint tangents are
  // taken numerically off the two profiles so the joint never kinks, and the
  // result is clamped at 0 because a Hermite is not a priori positive.
  const e = 1e-3, W = 2 * R;
  const p0 = hShelf(-R, P);
  const m0 = ((hShelf(-R + e, P) - hShelf(-R - e, P)) / (2 * e)) * W;
  const p1 = hFace(R, P);
  const m1 = ((hFace(R + e, P) - hFace(R - e, P)) / (2 * e)) * W;
  return Math.max(0, hermite((u + R) / W, p0, p1, m0, m1));
}

// ------------------------------------------------------------- THE FILLED BASE
//
// THE MASS DOES NOT SIT ON THE RAW RASTER, and that is a measured decision.
// `groundZ` under this band carries steps of up to 0.67 m in 0.25 m of u and
// 2.10 m across 2 m of v (work/pou_geom_check.mjs measures both). The collide
// proxy samples at 1.5 x 2.0 m and CANNOT see them; the display mesh at
// 0.55 x 0.35 m can. Built straight onto the raster, the two meshes disagreed by
// 0.74 m on the shelf — the player stands on the proxy and the proxy is 0.74 m
// under the snow they can see, which is the "lands on air" failure the budget
// split exists to prevent.
//
// So the built mass stands on the raster with its HOLLOWS FILLED: a 17-tap mean
// of the ground over 1.3 m and 2.6 m rings, and only where that mean is ABOVE
// the raw ground. This is park.mjs §2's rule at a smaller radius and for the
// same reason it gives — "blurring is what a winch cat does to a lane; taking
// max(natural, blurred) afterwards is what keeps it FILL-ONLY" — except that
// here the agent is wind rather than a cat, so the window is 2.6 m rather than
// 13 m. It is physically what a wind-loaded shelf does: snow fills the hollows
// and leaves the ribs standing.
//
// It cannot break additivity, by construction: the fill is `max(0, ...)`, so the
// base is never below the raster. And it is faded out by the built height, so
// the mass still feathers to EXACTLY natural ground at its toe and at the foot
// of its face.
const FILL_RINGS = [[1.3, 1.0], [2.6, 0.6]];
function ringFill(x, y) {
  const g0 = GZ(x, y);
  let acc = g0 * 2, w = 2;
  for (const [r, wt] of FILL_RINGS) {
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      acc += GZ(x + Math.cos(a) * r, y + Math.sin(a) * r) * wt;
      w += wt;
    }
  }
  return Math.max(0, acc / w - g0);
}

// THE CROSS-BAND CONE, and it is the term that actually earns its keep.
//
// A mean-blur cannot remove a NARROW TRENCH: the ground under the main drop
// carries a 1.3 m deep runnel about 2 m wide at v = +2.5 (the gully corridor's
// own stamp), and a 1.3 / 2.6 m ring mean barely notices it. The collide proxy's
// 2 m stations straddle it and chord across the top; the 0.55 m display mesh
// drops into it; the two disagree by 0.40 m — and BOTH of them are wrong, because
// there is no runnel in the top of a 5 m snow shelf.
//
// So the base is also raised by a CONE DILATION across v only: at each point,
// the highest ground within 6 m across the band, discounted 0.22 m per metre of
// distance. Three properties, all of them the reason it is this and not a blur:
//
//   * it is >= 0 by construction (the centre sample is in the max), so it cannot
//     break additivity;
//   * it does nothing DOWN-SLOPE — the cone is one-dimensional, so the shelf's
//     own u-profile is untouched and the mass is still exactly the profile this
//     module designs;
//   * the result is 0.22-Lipschitz across v, which BOUNDS the collide proxy's
//     cross-band chord error at 0.22 * (station spacing / 2) rather than leaving
//     it at the mercy of whatever the raster happens to carry.
//
// 0.15 is chosen against that bound and the station spacing, not measured. It
// fills the 1.3 m runnel to within 0.15 m of its rims, which is what a season of
// wind on a north-facing shelf does to a 2 m runnel. At 0.22 the analytic
// surface still carried a 0.27 m residual across 2 m of v and gate 5 could not
// be closed at any affordable triangle count; at 0.15 it carries 0.11 m.
const CONE_BV = 0.15;
function coneFill(x, y) {
  const g0 = GZ(x, y);
  let best = g0;
  for (let k = -12; k <= 12; k++) {
    if (k === 0) continue;
    const d = k * 0.5;
    const z = GZ(x + VAX[0] * d, y + VAX[1] * d) - CONE_BV * Math.abs(d);
    if (z > best) best = z;
  }
  return best - g0;
}
const groundFill = (x, y) => Math.max(ringFill(x, y), coneFill(x, y));
/** the height the built mass stands on at (x, y), given its own height h there.
 *  Always >= groundZ(x, y). */
function baseZ(x, y, h) {
  const g = GZ(x, y);
  if (h <= 0.02) return g;
  // THE FADE IS FAST — full fill by 0.15 m of build, not 0.30 or 0.90 — and it
  // is the single term gate 5 was most sensitive to. A slow fade leaves the thin
  // end of the mass standing on a HALF-FILLED base, which is a blend of the
  // smooth filled ground and the raw raster's wiggle in exactly the proportion
  // that maximises how much wiggle survives for the proxy to miss: it measured
  // 0.44 m at the toe against 0.11 m here. It still reaches exactly zero at
  // h = 0, so the mass still feathers into untouched snow.
  //
  // The fill can be large where it crosses the gully corridor's own runnel — up
  // to 1.55 m at the shelf's toe, which is a genuine 2 m x 1.5 m trench being
  // bridged. That is not a wall: work/pou_geom_check measures the finished
  // shelf's steepest cell at 57.0 deg where the NATURAL ground under the same
  // cells reaches 68.4 deg, so the built surface is everywhere gentler than the
  // raster it stands on.
  return g + groundFill(x, y) * smooth(0.02, 0.15, h);
}

// The v-range the mass occupies. `step` is 0 outside roughly [-46, +54]; the
// range is found by scanning rather than typed, so a re-bake moves it.
const V_LO = (() => { let v = -70; while (v < 70 && crAt(POU_BAND.step, v, 1) <= 0.02) v += 1; return v - 4; })();
const V_HI = (() => { let v = 70; while (v > -70 && crAt(POU_BAND.step, v, 1) <= 0.02) v -= 1; return v + 4; })();

/** the BUILT surface height at (x, y) — groundZ where the mass is absent.
 *  Analytic and noise-free: this is the surface the collide proxy approximates
 *  and the one the caller should trust for placement. The skin's fracture relief
 *  is <= 0.04 m of display detail on top of it and is deliberately not here. */
export function poulsenSurfaceZ(x, y) {
  if (!GZ) throw new Error('poulsenSurfaceZ: call buildPoulsen({ groundZ, ... }) first');
  const g = GZ(x, y);
  const [u, v] = toUV(x, y);
  if (v < V_LO || v > V_HI) return g;
  const P = stationAt(v);
  if (P.H <= 2e-3) return g;
  if (u <= -P.SH || u >= P.faceLen) return g;
  const h = hAt(u, P);
  return baseZ(x, y, h) + h;
}

/** the built profile height above the natural ground at (x, y) — 0 outside the
 *  mass. This is `h` in the module's own (u, h) profile; the finished surface is
 *  higher by the hollow fill. Exported because the verification script needs the
 *  same number the cull uses. */
export function poulsenBuiltH(x, y) {
  const [u, v] = toUV(x, y);
  if (v < V_LO || v > V_HI) return 0;
  const P = stationAt(v);
  if (u <= -P.SH || u >= P.faceLen) return 0;
  return hAt(u, P);
}

/** the main takeoff lip crest, world [x, y, z] — the HIGHEST built point on the
 *  v = 0 profile, i.e. the top of the wind roll, which is the edge you stand on
 *  and the edge view-40's patrol disc is planted behind. */
export let POU_LIP = null;
/** the side takeoff's crest, same definition, at v = +30. */
export let POU_SIDE_LIP = null;

function crestAt(v) {
  const P = stationAt(v);
  // the maximum of h(u) sits at the fillet's up-slope end for every station in
  // the band (the shelf is monotone rising, the face monotone falling), but it
  // is SEARCHED rather than assumed so a future profile change cannot quietly
  // move the lip out from under the sign.
  let bu = -P.R, bh = -1;
  for (let u = -P.R - 1.2; u <= P.R + 0.02; u += 0.02) {
    const h = hAt(u, P);
    if (h > bh) { bh = h; bu = u; }
  }
  const [x, y] = toXY(bu, v);
  return { u: bu, v, x, y, h: bh, z: baseZ(x, y, bh) + bh, P };
}

// ==================================================== 2. COLOUR
//
// Snow tones are terrain.mjs's own `C` palette, carried by value rather than
// imported: terrain.mjs builds a shade raster at module load and this file has
// no business paying for it. The four hexes below are C.snowHi / snowMid /
// snowLo / scour verbatim; snowLo is described there as "the north-aspect
// signature", which is exactly this aspect.
const SNOW_HI = lin(0xfdfeff);
const SNOW_MID = lin(0xe9f1fb);
const SNOW_LO = lin(0xbccde3);
const SCOUR = lin(0xe8eef7);
// Rock. Palisades is granite (granite.mjs) but this face is a NNW wall in its
// own shadow all winter, which is what view-40 and view-41 photograph — "an
// exposed DARK rock band". So it is granite.mjs's G_BASE / G_DARK / G_TAN family
// carried down two stops rather than KT-22's near-black volcanic, which belongs
// to a different mountain.
const RK_BASE = lin(0x4f4a42);
const RK_DK = lin(0x2b2823);
const RK_LIT = lin(0x7d7364);
const RK_TAN = lin(0x8a7a60);       // granite.mjs G_TAN — the iron staining

/** how much bare rock shows through the snow on the shelf at (x, y).
 *  Gated on rockV — outside the DEM's own >= 44 deg window the shelf is snow —
 *  and pushed by whichever of the two evidence sources has an opinion: the
 *  summer aerial's bare-rock raster where one covers the point, and a slow noise
 *  field where none does. See buildRibs for why that fallback is needed here. */
function ribAt(x, y, u, P) {
  if (P.rk < 0.15 || P.H < 1.0) return 0;
  const n = fbm(x * 0.19, y * 0.19, 3, 2.0, 0.5, 53);
  const aer = clamp(RA(x, y), 0, 1);
  const f = smooth(0.10, 0.46, n) * P.rk + aer * 0.7;
  // strongest in the band just above the face, which is where view-40 puts it
  return clamp(f, 0, 1) * smooth(-0.70 * P.SH, -0.30 * P.SH, u) * smooth(1.0, 2.4, P.H);
}

function shelfCol(x, y, u, P, rib) {
  const n = fbm(x * 0.21, y * 0.21, 3, 2.05, 0.5, 17);
  let c = mixc(SNOW_MID, SNOW_HI, clamp(0.45 + n * 0.55, 0, 1));
  // hollows take the ambient and go blue — the north-aspect read
  c = mixc(c, SNOW_LO, clamp(-n, 0, 1) * 0.55);
  // the last 3 m before the crest is wind-scoured hard snow, not settled powder
  c = mixc(c, SCOUR, smooth(-3.0, -0.4, u) * 0.50);
  // and the ribs punch through
  if (rib > 0) c = mixc(c, mixc(RK_BASE, RK_DK, 0.35), rib * 0.85);
  return c;
}

function faceCol(x, y, s, P) {
  const n = fbm(x * 0.48, y * 0.48, 3, 2.1, 0.5, 41);
  // darkest and most fractured over rockV; `s` is depth down the face, and a
  // face is darker at its foot where nothing dries it
  let c = mixc(RK_BASE, RK_DK, clamp(0.30 + 0.45 * n + 0.30 * P.rk + 0.15 * s, 0, 1));
  c = mixc(c, RK_LIT, clamp(n * 0.6, 0, 1) * 0.35);
  c = mixc(c, RK_TAN, clamp(n, 0, 1) * 0.12);
  // A 30 cm break holds snow; a 2 m one does not. Below ~0.85 m of drop the
  // "face" is a snow step at the band's dying ends, and painting it rock would
  // leave a dark scar across clean snow where there is no cliff at all.
  return mixc(c, SNOW_MID, 1 - smooth(0.35, 0.85, P.Hc));
}

// ==================================================== 3. THE SHEET
//
// One lattice, two densities. Rows are parameterised by `s` in [-1, +1] rather
// than by metres: s <= 0 maps to u = s * SHELF(v) and s > 0 to u = s * faceLen(v),
// so every station has the same row count and the quads pair up even though
// SHELF varies 6-11 m and faceLen 0.9-1.7 m across the band. The alternative —
// metre-uniform rows with the surplus rows clamped to h = 0 — lays hundreds of
// ground-coincident triangles over the terrain mesh and z-fights.
function rowList(segs, faceSegs) {
  const out = [];
  for (const [a, b, d] of segs) {
    const n = Math.max(1, Math.round((b - a) / d));
    for (let k = 0; k < n; k++) out.push(a + (b - a) * (k / n));
  }
  out.push(0);
  for (let k = 1; k <= faceSegs; k++) out.push(k / faceSegs);
  return out;
}

// SKIN: graded, because the shelf's far third is a sub-metre bulge in open snow
// and its last two metres are the lip a rider stares at. The three rates below
// are 0.40 / 0.57 / 0.36 m at the main drop's 10.7 m shelf.
//
// THE TOE RATE IS NOT COSMETIC. It started at 0.10 in s — 1.14 m — and that one
// number was the last gate-5 failure: over the runnel the collide proxy (0.40 m
// rows there) resolved the hollow fill's onset and the DISPLAY MESH DID NOT, so
// the coarse mesh was the skin and the two disagreed by 0.42 m. Matching the
// toe rates took it to 0.138 m. The lesson generalises: an agreement budget is
// symmetric, and refining only the collider can make it worse.
const S_SKIN = rowList([[-1, -0.80, 0.035], [-0.80, -0.25, 0.05], [-0.25, 0, 0.0314]], 4);
// COLLIDE: graded on the same breakpoints as the skin, and ONE face quad. The
// face is linear in u below the fillet, so a single quad reproduces it exactly;
// all the proxy's error lives on the shelf, and every row below was placed by
// measuring where. With eight even 1.5 m rows the proxy tracked the display mesh
// to 0.43 m at the CREST (the fillet rolling into the face drops 1.2 m in the
// last 1.1 m, so a 1.5 m chord cuts straight through it) and to 0.42 m at the
// TOE (the hollow fill's onset). Rows were moved to both and taken out of the
// middle, where the shelf is a smooth 20 deg ramp and does not need them:
// 0.40 / 1.03 / 0.34 m at the main drop's 10.7 m shelf.
const S_COLL = rowList([[-1, -0.82, 0.026], [-0.82, -0.25, 0.068], [-0.25, 0, 0.03]], 1);

function stationList(dv, dvFine, fineHalf) {
  const out = [];
  let v = V_LO;
  while (v < V_HI - 1e-6) {
    out.push(v);
    v += Math.abs(v - POU_BAND.vSide) < fineHalf ? dvFine : dv;
  }
  out.push(V_HI);
  return out;
}

/** one vertex of the sheet. `skin` turns on the display-only relief. */
function sheetVert(P, s, skin) {
  const u = s <= 0 ? s * P.SH : s * P.faceLen;
  let h = hAt(u, P);
  let du = 0, dv = 0;
  if (skin && s > 0 && P.H > 0.4) {
    // FRACTURE RELIEF, face only. A cliff comes off in blocks, so the jitter is
    // coherent over ~1.4 m of v rather than per-vertex: value noise on a coarse
    // lattice, not fbm. Rows 1..n-1 are pushed OUTWARD in u, which tilts the
    // facet above them toward horizontal (that is the ledge snowLace whitens)
    // and the facet below them past vertical (that is the overhang that makes it
    // read as rock rather than a plane). The crest and the base are never moved:
    // the crest is shared with the shelf and the base has to land on the ground.
    const taper = Math.sin(Math.PI * clamp(s, 0, 1));
    const blk = vnoise(P.v * 0.72, s * 3.1, 71);
    const ledge = 0.22 * Math.max(0, vnoise(P.v * 0.55, s * 5.3, 91));
    du = (0.10 * blk + ledge) * taper;
    dv = 0.07 * vnoise(P.v * 0.9, s * 2.3, 13) * taper;
  }
  const [x, y] = toXY(u + du, P.v + dv);
  let z = baseZ(x, y, h) + h;
  if (skin && s <= 0 && h > 0.02) {
    // wind ripple on the shelf top, display only. Scaled by h so it dies to
    // nothing at the toe (which keeps the mass additive there) and capped at
    // 4 cm so it cannot eat into the 0.15 m collide-vs-skin agreement budget.
    z += 0.04 * fbm(x * 0.55, y * 0.55, 2, 2.1, 0.5, 29) * smooth(0.02, 0.6, h);
  }
  return { x, y, z, u, h, s };
}

function buildSheet(rows, stations, skin, cull) {
  const shelfB = buf();
  const faceB = buf();
  const cols = stations.map((v) => {
    const P = stationAt(v);
    return { P, pts: rows.map((s) => sheetVert(P, s, skin)) };
  });
  let quads = 0;
  for (let i = 0; i < cols.length - 1; i++) {
    const A = cols[i], Bc = cols[i + 1];
    for (let j = 0; j < rows.length - 1; j++) {
      const a = A.pts[j], b = Bc.pts[j], c = Bc.pts[j + 1], d = A.pts[j + 1];
      // CULL anything that is not actually a mass, and the two meshes cull at
      // DIFFERENT thresholds on purpose.
      //   skin    0.015 m — a display sheet lying on the ground z-fights the
      //           terrain and buys no shape, but everything above that is the
      //           feather that hides the mass's edge.
      //   collide 0.120 m — the proxy's 1.0 x 2.0 m quads chord a raster that
      //           wiggles up to 2.1 m across 2 m of v (measured, pou_geom_check),
      //           so a quad spanning a hollow sits ABOVE the ground it covers.
      //           Where the mass is only a few centimetres thick that is a
      //           floating ledge for no benefit: the terrain's own collider
      //           already owns that ground. So the proxy simply stops there.
      if (a.h <= cull && b.h <= cull && c.h <= cull && d.h <= cull) continue;
      const face = rows[j] >= 0;
      const T = face ? faceB : shelfB;
      // WINDING. i runs +v (east) and j runs +u (down-slope); in this z-up frame
      // u x v = -z, so the order below gives v x u = +z and the sheet faces UP.
      // (park.mjs §6 has the same note: the bench's collision test is
      // double-sided, so an inverted sheet still rides and the mistake is
      // invisible until something reads a normal.)
      // rock only shows through on the DISPLAY mesh: the proxy is one flat
      // colour band per quad and nothing reads its vertex colours anyway.
      const R4 = skin ? 1 : 0;
      const cA = face ? faceCol(a.x, a.y, rows[j], A.P) : shelfCol(a.x, a.y, a.u, A.P, R4 && ribAt(a.x, a.y, a.u, A.P));
      const cB = face ? faceCol(b.x, b.y, rows[j], Bc.P) : shelfCol(b.x, b.y, b.u, Bc.P, R4 && ribAt(b.x, b.y, b.u, Bc.P));
      const cC = face ? faceCol(c.x, c.y, rows[j + 1], Bc.P) : shelfCol(c.x, c.y, c.u, Bc.P, R4 && ribAt(c.x, c.y, c.u, Bc.P));
      const cD = face ? faceCol(d.x, d.y, rows[j + 1], A.P) : shelfCol(d.x, d.y, d.u, A.P, R4 && ribAt(d.x, d.y, d.u, A.P));
      quad(T, [a.x, a.y, a.z], [b.x, b.y, b.z], [c.x, c.y, c.z], [d.x, d.y, d.z], cA, cB, cC, cD);
      quads++;
    }
  }
  return { shelfB, faceB, quads };
}

// ==================================================== 4. THE ROCK RIBS
//
// view-40's "exposed dark rock band" is not only the face — it is rock showing
// THROUGH the snow above the face as well, which is what a 44-49 deg slope does
// in February. These are small blocks standing 0.15-0.45 m proud of the shelf
// over rockV, in `skin` only, so the collide proxy's top surface is untouched.
//
// `rockAt` MODULATES them where it has an opinion and is otherwise ignored: the
// Red Dog CORE has no sector rock raster and rock.mjs returns 0 there by design
// ("the Red Dog CORE has no rock raster and keeps the base run's slope-driven
// rock read in terrain.colorAt() exactly as it was"). Verified at build time and
// reported in stats.rockAtCrest, so this comment can be checked rather than
// believed.
// A rib is SEATED ON THE BUILT SURFACE, not dropped at a centre height, and
// that is a correctness requirement rather than a finish. `prism` puts its whole
// base ring at one z; on 42 deg ground a 1 m ring spans 0.9 m of elevation, so a
// centre-seated block floats on its up-slope side and pushes 0.26 m THROUGH the
// ground on its down-slope side. The first cut did exactly that and the
// additivity gate caught it. Here every base vertex is placed on the surface
// under it and every top vertex `h` above the surface under IT, so the rib hugs
// the slope the way a real exposed rib does — a low ridge, never a flat table —
// and the whole thing is additive by construction.
//
// The ring is ANISOTROPIC: long across the band (v) and short down it (u),
// because exfoliation joints on this face run sub-horizontally. Same reasoning
// as granite.mjs's "sheets, not spires".
function ribGeo(B, rng, x, y, rv, ru, h, sides, colB, colT) {
  const surf = (px, py) => poulsenSurfaceZ(px, py);
  const yaw = rr(rng, -0.5, 0.5);
  const ca = Math.cos(yaw), sa = Math.sin(yaw);
  const at = (a, kv, ku) => {
    const dv = Math.cos(a) * kv, du = Math.sin(a) * ku;
    const dv2 = dv * ca - du * sa, du2 = dv * sa + du * ca;
    return [x + VAX[0] * dv2 + UAX[0] * du2, y + VAX[1] * dv2 + UAX[1] * du2];
  };
  const bot = [], top = [];
  const taper = rr(rng, 0.55, 0.82);
  for (let i = 0; i < sides; i++) {
    const a = (i / sides) * Math.PI * 2;
    const jv = 1 + (rng() - 0.5) * 0.5, ju = 1 + (rng() - 0.5) * 0.5;
    const pb = at(a, rv * jv, ru * ju);
    const pt = at(a, rv * jv * taper, ru * ju * taper);
    const sb = surf(pb[0], pb[1]), st = surf(pt[0], pt[1]);
    if (sb - GZ(pb[0], pb[1]) < 0.10) return false;      // too close to the toe
    bot.push([pb[0], pb[1], sb - 0.06]);
    top.push([pt[0], pt[1], st + h * rr(rng, 0.72, 1.0)]);
  }
  for (let i = 0; i < sides; i++) {
    const j = (i + 1) % sides;
    quad(B, bot[i], bot[j], top[j], top[i], colB, colB, colT, colT);
  }
  for (let i = 1; i < sides - 1; i++) tri(B, top[0], top[i], top[i + 1], colT);
  return true;
}

function buildRibs(B, rng) {
  let n = 0;
  for (let i = 0; i < 900 && n < 26; i++) {
    const v = rr(rng, RV[0] - 4, RV[1] + 4);
    const P = stationAt(v);
    if (P.H < 1.2) continue;
    if (P.rk < 0.25) continue;
    // up-slope of the lip, in the band the eye actually reads
    const u = rr(rng, -0.62 * P.SH, -1.3);
    const [x, y] = toXY(u, v);
    const aer = clamp(RA(x, y), 0, 1);
    // the aerial's own read if there is one, the DEM's steepness if there is not
    const score = P.rk * (0.55 + 0.45 * smooth(-0.35, 0.45, fbm(x * 0.19, y * 0.19, 3, 2.0, 0.5, 53))) + aer * 0.8;
    if (rng() > score) continue;
    const ok = ribGeo(B, rng, x, y,
      rr(rng, 0.55, 1.60), rr(rng, 0.22, 0.55), rr(rng, 0.14, 0.38), ri(rng, 5, 7),
      jitc(mixc(RK_BASE, RK_DK, rr(rng, 0.2, 0.6)), rng, 0.18),
      jitc(mixc(RK_LIT, RK_TAN, rr(rng, 0.0, 0.4)), rng, 0.14));
    if (ok) n++;
  }
  return n;
}

// ==================================================== 5. PROPS
//
// THE PATROL DISC IS EVIDENCE, NOT DECORATION. RED-DOG-GUIDED §2: view-40 shows
// "a red patrol hazard disc planted on the lip", and view-41 catches the same
// post from over the edge — a slim dark stake with a small round red plate near
// its top, facing back UP the approach so a rider sees it before the lip. The
// ledger uses it as an argument: "what view-40 shows is a natural convex roll
// with bare rock beside it and a patrol hazard marker on top — which is how a
// resort marks a natural hazard, not a built jump."
//
// Diameter 0.32 m and post height 1.5 m are scaled off the frame against the
// lift tower behind it and are the loosest numbers in this file; they are
// chosen, not measured.
function patrolDisc(B, x, y, z) {
  tube(B, [x, y, z], [x, y, z + 1.50], 0.032, PAL.dark, 5);
  const r = 0.16, N = 12, cz = z + 1.40;
  // the disc plane contains VAX (across the band) and world Z, so its normal is
  // -UAX: it faces back up the approach
  const P = (k) => {
    const a = (k / N) * Math.PI * 2;
    return [x + VAX[0] * r * Math.cos(a), y + VAX[1] * r * Math.cos(a), cz + r * Math.sin(a)];
  };
  const ctr = [x, y, cz];
  const back = scalec(PAL.red, 0.72);
  for (let k = 0; k < N; k++) {
    tri(B, ctr, P(k), P(k + 1), PAL.red);
    tri(B, ctr, P(k + 1), P(k), back);
  }
}

// TALUS. A 5.8 m rock face sheds, and the blocks pile at its foot: the apron is
// scaled by BOTH the face height and rockF, so it exists under the cliff and not
// under the side takeoff's snow roll. Sunk 35 % of their radius the way every
// other loose rock in this world is (kt-rocks buildOutcrops, granite slabGeo),
// which is why they are `props` and not part of the additive mass.
function buildTalus(B, rng, budget = 60) {
  let n = 0;
  for (let i = 0; i < 3000 && n < budget; i++) {
    const v = rr(rng, RV[0] - 6, RV[1] + 8);
    const P = stationAt(v);
    if (P.H < 1.0) continue;
    const shed = clamp(P.H / 5.8, 0, 1) * (0.35 + 0.65 * P.rk);
    if (rng() > shed) continue;
    // close to the wall and thinning out down-slope, which is how a talus cone
    // sorts itself
    const u = P.faceLen + 0.35 + 9.0 * Math.pow(rng(), 1.8);
    const [x, y] = toXY(u, v + rr(rng, -0.9, 0.9));
    // radius capped at 0.65 m for the same reason ribGeo exists: a wider block
    // seated at one centre height floats on its up-slope side of a 42 deg hill.
    // Talus is scatter, so it is seated the house way (kt-rocks buildOutcrops,
    // granite slabGeo) rather than surface-fitted — just deeply enough that the
    // up-slope side stays buried.
    const r = Math.min(0.65, rr(rng, 0.22, 0.85) * (0.6 + 0.7 * shed));
    prism(B, rng, {
      x, y, z: GZ(x, y) - r * 0.55,
      r, h: r * rr(rng, 0.7, 1.5), sides: ri(rng, 5, 6), taper: rr(rng, 0.45, 0.85),
      jit: 0.28, yaw: rr(rng, 0, 6.283),
      tiltX: rr(rng, -0.3, 0.3) * r, tiltY: rr(rng, -0.3, 0.3) * r,
      col: jitc(mixc(RK_BASE, RK_DK, rr(rng, 0.1, 0.55)), rng, 0.20),
      colTop: jitc(mixc(RK_LIT, RK_BASE, rr(rng, 0.2, 0.7)), rng, 0.16),
    });
    n++;
  }
  return n;
}

// ==================================================== 6. THE BUILD
/**
 * @param groundZ  (x, y) -> analytic ground height. READ-ONLY truth.
 * @param rockAt   (x, y) -> bare-rock fraction 0..1, or 0 where unmeasured.
 * @param slopeAt  (x, y, h) -> degrees. Used only as a cross-check on the bake.
 * @returns { collide, skin, props, stats } — plain buf() buffers; the caller
 *          does toGeo(THREE, B). `collide` is the only collidable one.
 */
export function buildPoulsen({ groundZ, rockAt, slopeAt }) {
  if (typeof groundZ !== 'function') throw new Error('buildPoulsen: groundZ is required');
  GZ = groundZ;
  RA = typeof rockAt === 'function' ? rockAt : () => 0;
  SA = typeof slopeAt === 'function' ? slopeAt : () => 0;

  // ---- the two sheets, same profile, two densities
  // 1.30 m across the band for the proxy, not the 2.0 m first drafted: the
  // analytic surface's own cross-band chord residual is 0.27 m at 2 m and
  // 0.11 m at 1 m (measured), and cross-band was the binding term once the
  // crest and toe rows were in place. The display mesh keeps 0.55 m, and 0.35 m
  // through the side takeoff's lip because that is the one a rider looks at.
  // THE LAST 0.209 m WAS A v PROBLEM, NOT A u ONE. With the u-rows graded and
  // the toe rates matched, the residual settled at v = 14.4 - mid-way between
  // stations on a 1.30 m across-band lattice, where the step height is falling
  // about 0.4 m per 1.3 m of v down the main lobe's Gaussian flank. The skin
  // resolves that at 0.55 m and the proxy's chord cut straight through it.
  // 1.00 m across the band, 0.60 m within 10 m of the side takeoff (the
  // tightest curvature in the whole band, two lobes 30 m apart).
  const collStations = stationList(1.12, 0.62, 10);
  const skinStations = stationList(0.55, 0.35, 12);
  const C0 = buildSheet(S_COLL, collStations, false, 0.120);
  const S0 = buildSheet(S_SKIN, skinStations, true, 0.015);

  const collide = buf();
  appendBuf(collide, C0.shelfB);
  appendBuf(collide, C0.faceB);

  // SNOW LACE ON THE FACE ONLY, and with the signed-normal rule core.mjs's
  // snowLace already carries: the vertical facets stay bare rock (a cliff face
  // holds no snow) and only the outward-stepped ledge facets whiten. Lacing the
  // shelf would be pointless — it is already snow — and lacing the whole skin at
  // once is how granite.mjs's first cut turned every bluff into a white lump.
  snowLace(S0.faceB, { snow: SNOW_LO, lo: 0.30, hi: 0.78, amount: 0.45, patchy: 0.55, seed: 4021 });

  const ribs = buf();
  const rngR = makeRng('poulsen-ribs');
  const nRibs = buildRibs(ribs, rngR);
  snowLace(ribs, { snow: SNOW_LO, lo: 0.42, hi: 0.86, amount: 0.35, patchy: 0.45, seed: 811 });

  // THE SHEET GOES IN FIRST AND THE RIBS LAST, and stats.skinSheetTris records
  // the boundary. That is not bookkeeping for its own sake: the collide-vs-skin
  // agreement gate has to measure the two SHEETS against each other, and a
  // vertical ray-cast into `skin` otherwise hits the top of a 0.3 m rib and
  // reports a 0.7 m disagreement that does not exist. Ribs, like every boulder
  // in this world, are display detail a player walks through.
  const skin = buf();
  appendBuf(skin, S0.shelfB);
  appendBuf(skin, S0.faceB);
  const skinSheetTris = bufTris(skin);
  appendBuf(skin, ribs);

  // ---- the lips
  const L = crestAt(0);
  const S = crestAt(POU_BAND.vSide);
  POU_LIP = [L.x, L.y, L.z];
  POU_SIDE_LIP = [S.x, S.y, S.z];

  // ---- props
  const props = buf();
  // the disc stands 0.7 m BACK from the crest, on the shelf: that is where a
  // patroller can plant a stake in snow rather than on the roll itself, and it
  // is where view-41 catches it relative to the edge.
  {
    const [px, py] = toXY(L.u - 0.70, 0);
    const ph = hAt(L.u - 0.70, L.P);
    patrolDisc(props, px, py, baseZ(px, py, ph) + ph);
  }
  // orange bamboo either side of it — the pod's real hazard vocabulary
  // (RED-DOG-GUIDED §2 evidence table: view-35 and view-49 are a yellow disc on
  // a post WITH ORANGE BAMBOO at the entrance; the same wands mark the lip).
  const nWands = [-6.2, -2.6, 2.6, 6.2].length;
  for (const dv of [-6.2, -2.6, 2.6, 6.2]) {
    const P = stationAt(dv);
    const u = crestAt(dv).u - 0.55;
    const [wx, wy] = toXY(u, dv);
    const wh = hAt(u, P);
    wand(props, wx, wy, baseZ(wx, wy, wh) + wh, { h: 1.5, col: PAL.orange });
  }
  const rngT = makeRng('poulsen-talus');
  const nTalus = buildTalus(props, rngT);

  // ---- measurements, taken here so the caller and the check script read the
  // same numbers rather than each computing their own.
  const drop = (crest, dU) => {
    const [x, y] = toXY(crest.u + dU, crest.v);
    return crest.z - poulsenSurfaceZ(x, y);
  };
  const natDrop = (crest, dU) => {
    const [x, y] = toXY(crest.u + dU, crest.v);
    return crest.z - GZ(x, y);
  };
  // The break's ABSOLUTE angle, measured from the top of the roll to the foot of
  // the face — the conservative reading, because it includes the crest fillet
  // and so understates the steepest part. That is the number to hold against the
  // ride controller's 63.4 deg detach threshold; anything shallower does not
  // launch a ski.
  const faceDeg = (crest) => {
    const P = crest.P;
    const [x1, y1] = toXY(P.faceLen, crest.v);
    const dz = crest.z - GZ(x1, y1);
    return Math.atan2(dz, P.faceLen - crest.u) / D2R;
  };
  // and the pure built step: crest down to where the face lands on natural ground
  const faceDrop = (crest) => {
    const [x1, y1] = toXY(crest.P.faceLen, crest.v);
    return crest.z - GZ(x1, y1);
  };

  const stats = {
    collideTris: bufTris(collide),
    skinTris: bufTris(skin),
    skinSheetTris,                         // skin[0 .. skinSheetTris) is the sheet
    propTris: bufTris(props),
    collideStations: collStations.length,
    skinStations: skinStations.length,
    rowsCollide: S_COLL.length,
    rowsSkin: S_SKIN.length,
    vLo: V_LO, vHi: V_HI,

    // the main drop, v = 0
    lipX: L.x, lipY: L.y, lipZ: L.z,
    mainStep: L.P.H,                       // 5.8 — the bake's, Greg's figure
    mainCrestH: L.h,                       // built height above natural ground
    mainShelfLen: L.P.SH,
    mainFaceLen: L.P.faceLen,
    mainFaceDeg: faceDeg(L),
    mainFaceDrop: faceDrop(L),
    mainDrop15: drop(L, 1.5),
    mainDropNat8: natDrop(L, 8.0),

    // the side takeoff, v = +30
    sideX: S.x, sideY: S.y, sideZ: S.z,
    sideStep: S.P.H,                       // 2.4
    sideCrestH: S.h,
    sideShelfLen: S.P.SH,
    sideFaceLen: S.P.faceLen,
    sideCrestR: S.P.R,
    sideFaceDeg: faceDeg(S),
    sideFaceDrop: faceDrop(S),
    sideDrop15: drop(S, 1.5),
    sideDropNat8: natDrop(S, 8.0),

    nRibs, nTalus, nWands,

    // cross-checks against the injected world, so the bake can be audited
    // without re-running work/bake_poulsen.mjs
    demSlopeBakedMain: L.P.dem,
    demSlopeLiveMain: SA(CEN[0], CEN[1], 7),
    demSlopeBakedSide: S.P.dem,
    demSlopeLiveSide: SA(S.x, S.y, 7),
    rockAtCrest: RA(L.x, L.y),             // expected 0: no sector raster here
  };

  return { collide, skin, props, stats };
}
