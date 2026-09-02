// The forest — placed against the real canopy, not a hand-written field.
//
// Base density = canopyAt(x,y), the per-cell conifer fraction measured off
// ArcGIS World Imagery (aerial.jpg at 1.95 m/px inside the 1000 m pod frame,
// aerial-2.jpg at 6.25 m/px outside it). So the tree bands, the islands left
// standing inside Red Dog Face, the thinning toward the ridge and the hard
// edges of every cut corridor are the ones in the photograph.
//
// Two corrections are applied on top, and only two:
//   * the piste raster punches the corridors out exactly (the aerial's cut
//     edges are soft because of summer shadow; the GPS centreline is not)
//   * the Red Dog Express swath is cleared, because the aerial predates the
//     2023 realignment and still shows canopy under the new line
// Everything else is the photograph.

import { clamp, lerp, smooth, fbm, makeRng, rr, ri, lin, mixc } from './lib/core.mjs';
import { groundZ, slopeAt, demAt, RUN_PREP,
         groundZ0, masksAt0, slopeAt0, KT_WORK, POU_WORK } from './ground.mjs';
import { canopyAt } from './canopy.mjs';
import { rockAt } from './rock.mjs';
import { FIN_RIBS, FIN_CHUTES, FIN_NOSES } from './kt-runs-data.mjs';
import { RUNS, LIFTS, CORE, TIGHT, UTIGHT_E, UTIGHT_W, SECTORS, LOTS, BUILDINGS,
         inSector, inCoreBox, sectorOwner, sectorDist } from './layout.mjs';
import { UPPER_BUILDINGS } from './upper-props.mjs';
import { parkVeto } from './park.mjs';
import { VILLAGE_BUILDINGS } from './village-props.mjs';

// ==========================================================================
// THE SILHOUETTES — lookbook option T1.
//
// Every tier class shipped ONE geometry seed, so every big fir in the world was
// literally the same tree: same trunk lean, same seven skirt radii, same snow
// lace, rotated about z and scaled. At the range the corridor-lining band is
// actually looked at (renders/trees/T1/before/treeline-close.png) the repeat is
// the first thing the eye finds — the same notch in the same skirt, six times
// across the frame.
//
// TREE_SEEDS_PER_LOD = 3 geometry seeds per class. `firGeo`'s triangle count is
// a function of `tiers` and `sides` alone and never of the seed, so this is a
// ZERO-TRIANGLE change: it costs three InstancedMeshes per class instead of one
// (+6 draws) and two extra copies of a 67- / 36- / 22-triangle buffer (~27 kB).
//
// INDEX 0 IS THE SHIPPED SEED for each class, deliberately: a third of every
// stand is bit-identical to the world before this change, and the diff a
// reviewer looks at is only the two new silhouettes.
export const TREE_SEEDS_PER_LOD = 3;
export const TREE_SEEDS = {
  big: [3, 41, 77],       // 7 tiers x 7 sides
  mid: [9, 53, 89],       // 4 x 5
  far: [21, 61, 103],     // 4 x 4, lite trunk
};

/** Which silhouette the tree at (x, y) wears.
 *
 *  A HASH OF THE POSITION, NOT A DRAW, and that is the whole design. Every
 *  placement loop in `placeForest` is a rejection loop over one shared rng (see
 *  the header of `distToRuns` below, and REPORT §17.3): a single extra call on
 *  that stream moves every snag, granite outcrop and boulder placed after it.
 *  This function is called AFTER placement, reads nothing but x and y, and is
 *  therefore free and stable across builds — the same tree wears the same
 *  silhouette in every world anyone ever builds from this run.
 *
 *  The mixing is a 32-bit integer avalanche over the two coordinates quantised
 *  to ~3 cm. Measured over the shipped forest: every class lands inside
 *  32-35 % per bucket, and two trees standing within 12 m of each other share a
 *  silhouette 33.4 % of the time (8,855 such pairs among the big firs) — i.e.
 *  the hash is not banded, which a plain `(x + y) % 3` very much would be. */
export function treeVariant(x, y, n = TREE_SEEDS_PER_LOD) {
  let h = Math.imul((Math.round(x * 32.7) | 0) ^ 0x9e3779b9, 0x85ebca6b);
  h = Math.imul((h ^ (Math.round(y * 32.7) | 0)) ^ (h >>> 13), 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) % n;
}

// ==========================================================================
// THE SNOW LOAD — lookbook option T3.
//
// MEASURED FIRST, because the number is the whole argument. `firGeo` already
// ends with `snowLace(B, { lo: 0.30, hi: 0.86, amount: flock })`, and the fir's
// canopy is a stack of narrow cones — a red fir is a SPIRE, radius ~0.085 h —
// so its skirt faces are steep and their up-component is small. Over the nine
// shipped prototypes (work/, three seeds x three classes) the canopy triangles'
// signed nz runs:
//
//   big  min 0.024  p25 0.131  median 0.221  p75 0.278  max 0.361
//   mid  min 0.002  p25 0.067  median 0.118  p75 0.178  max 0.265
//   far  min -0.014 p25 0.063  median 0.114  p75 0.146  max 0.223
//
// Against `lo = 0.30` that is smooth(0.30, 0.86, 0.36) = 0.030 at the single
// FLATTEST triangle on the biggest tree, times amount 0.32 — a 1 % blend. The
// shipped world therefore has, to three decimal places, NO SNOW ON ANY FIR AT
// ALL. The lace call was written for granite (where nz reaches 0.9 on a ledge)
// and copied onto a tree it cannot touch. That is why Greg could not see it.
//
// AND THE THRESHOLD HAS TO BE PER TIER, not per tree — that is the second half
// of the fix, and the first cut got it wrong. Re-basing the curve on the whole
// canopy's range (lo 0.02, hi 0.22 for the big fir) whitens by TIER, because nz
// falls monotonically up the tree: the skirt radius runs 1.42 R at the bottom
// to 0.28 R at the top while the tier height is constant, so the bottom tiers
// sit at nz 0.36 and the spire at 0.07. Every face of the lower half went past
// full blend and the render came back a stand of white cones
// (renders/trees/T3/, first pass).
//
// The canopy triangles are laid down in tier order, exactly `sides` of them per
// tier (49 = 7x7 big, 20 = 5x4 mid, 16 = 4x4 far — checked, and asserted below
// by simply not touching anything that does not group evenly). So each tier is
// normalised against ITS OWN min and max: the flattest faces of every tier take
// the load, the steepest of every tier stay bare needle, and the white runs all
// the way up the tree instead of drowning the bottom of it. Within a tier the
// spread is real and comes from the shipped geometry — `firGeo` jitters each
// ring vertex's radius over 0.78-1.12 of the tier radius, so no two faces of a
// tier have the same pitch.
//
// A weak ABSOLUTE term rides on top (0.74 + 0.26 x the face's own nz over
// 0.04-0.30) so a big fir's broad lower skirts still carry visibly more snow
// than its spire. That is the Sierra read: plates down every tier, heaviest
// where the branch is widest.
//
// TRUNKS ARE EXCLUDED BY COLOUR, NOT BY ANGLE, and that is not a nicety: the
// tapered trunk tubes reach nz 0.061 and the canopy starts at 0.002, so the two
// populations OVERLAP and no threshold can separate them. Every needle colour
// in kit.mjs's palette has g > r (needle 0x1e3527, needleLo, needleHi, pineGrn)
// and every bark colour has r > g (bark 0x342a22, barkRed, barkPale); `jitc`,
// `scalec` and `mixc` between greens all preserve the ordering. One compare per
// triangle, and the bark is untouched to the bit.
//
// COST: this rewrites ~375 floats in nine prototype colour buffers at bake
// time. Zero triangles, zero draw calls, zero runtime, zero bytes of transfer
// (the geometry is generated in the browser, not shipped). Geometric snow caps
// were priced at +27k triangles and rejected.
const TREE_SNOW = lin(0xf2f7ff);        // sunlit new snow, a touch above PAL.snow

/** The canopy triangles of a fir prototype, in build order, with their signed
 *  face normals. Bark is excluded by the r-vs-g colour test above. */
function canopyFaces(B) {
  const P = B.pos, C = B.col, out = [];
  for (let t = 0; t < P.length; t += 9) {
    if (C[t + 1] <= C[t]) continue;                       // bark: r > g. leave it.
    const ax = P[t], ay = P[t + 1], az = P[t + 2];
    const e1x = P[t + 3] - ax, e1y = P[t + 4] - ay, e1z = P[t + 5] - az;
    const e2x = P[t + 6] - ax, e2y = P[t + 7] - ay, e2z = P[t + 8] - az;
    const nx = e1y * e2z - e1z * e2y, ny = e1z * e2x - e1x * e2z, nz = e1x * e2y - e1y * e2x;
    const len = Math.hypot(nx, ny, nz) || 1;
    out.push({ t, nx: nx / len, ny: ny / len, nz: nz / len });
  }
  return out;
}

/** Blend the canopy triangles of a fir prototype toward snow, per tier.
 *  `B` is a kit.mjs buffer; it is mutated in place, at bake time, once. */
export function firSnowLoad(B, { snow = TREE_SNOW, sides, lo = 0.30, hi = 0.86,
                                 amount, patchy = 0.22, seed = 17 } = {}) {
  const C = B.col;
  const rng = makeRng(seed);
  const F = canopyFaces(B);
  const n = Math.max(1, sides | 0);
  for (let g = 0; g < F.length; g += n) {
    const tier = F.slice(g, g + n);
    let mn = Infinity, mx = -Infinity;
    for (const f of tier) { if (f.nz < mn) mn = f.nz; if (f.nz > mx) mx = f.nz; }
    const span = Math.max(1e-4, mx - mn);
    for (const face of tier) {
      // r: this face's pitch as a fraction of ITS OWN tier's spread
      const r = (face.nz - mn) / span;
      let f = smooth(lo, hi, r) * amount
              * (0.74 + 0.26 * smooth(0.04, 0.30, face.nz));
      f *= 1 - patchy * rng();
      if (f <= 0.002) continue;
      for (let k = 0; k < 3; k++) {
        const o = face.t + k * 3;
        C[o] = lerp(C[o], snow[0], f);
        C[o + 1] = lerp(C[o + 1], snow[1], f);
        C[o + 2] = lerp(C[o + 2], snow[2], f);
      }
    }
  }
  return B;
}

// ==========================================================================
// THE TWO-TONE CANOPY — lookbook option T4.
//
// Each tier already writes a darker ring and a lighter apex, which is a
// VERTICAL gradient and reads as nothing at 60 m: `scalec(col, 0.82)` on two of
// three vertices, on a face that is 12 px tall. What a conifer stand actually
// shows from a chairlift is a HORIZONTAL split — a hard terminator down the
// crown, pale blue-green into the sun, deep blue-green away from it. (T4 cut
// that split warm/cold and it read as a lime; see the T4b note on the two
// greens below — the split is one hue family now and the contrast is value.)
//
// THE ROTATION PROBLEM, WHICH IS THE WHOLE DESIGN DECISION HERE.
//
// The split has to be baked into the prototype, because the prototype is what
// the ten thousand instances share. But `placeForest` gives every tree a yaw of
// `rr(rng, 0, 6.283)`, and an instanced mesh rotates its geometry — colours
// included. A baked sun side on a randomly-yawed tree faces the sun a fifth of
// the time and faces AWAY from it a fifth of the time, and the half of the
// forest with its bright side in shadow does not read as variety, it reads as
// broken lighting: MeshLambertMaterial is already shading these faces against
// the real SUN_DIR, so a mis-oriented albedo split fights the light instead of
// amplifying it. There is no per-vertex function of the LOCAL frame that
// survives an arbitrary yaw, because yaw is exactly the degree of freedom the
// split is defined on. So one of the two has to give.
//
// YAW GIVES — BUT ±20° IS THE WRONG PRICE, AND THE PLATE SAYS SO. The obvious
// answer is to pin the yaw hard, ±20°, so the baked terminator is always within
// a fifth of a turn of the truth. That was cut and shot first, and the
// chair-eye plate came back a ROW OF CLONES: the fir's own ring period is
// 360/7 = 51° for the big class, so a 40° window is less than one period and
// every big fir in the frame presents the same three skirt faces at the same
// three angles — which is precisely the repeat T1 exists to break. Worse, it
// takes T3 with it: the snow plates are chosen per tier by face rank, so with
// the yaw pinned the SAME faces are white on every tree in the world, and from
// a camera that does not happen to face them the whole stand loses its snow.
//
// So the band is the SUN'S OWN HALF OF THE COMPASS: ±90°. That is the weakest
// constraint that still does the one job a yaw lock is for — no tree's lit side
// ever points away from the sun; at the extremes it points across it, where the
// Lambert term is grazing and neither reading is wrong. 180° of freedom is
// three and a half ring periods for the big fir and two for the far one, so the
// stand keeps its variety (renders/trees/T4/_trial-yaw.png is the ±90 plate
// against a free-yaw plate: the difference is small, which is the point — the
// constraint is nearly free, so take it).
//
// `firYaw` replaces the placement yaw for the three fir classes ONLY — snags,
// boulders and granite keep theirs. The jitter inside the band is a POSITION
// HASH, not an rng draw, for the same reason `treeVariant` is: every placement
// loop in `placeForest` is a rejection loop over one shared stream (REPORT
// §17.3), so a single extra call there would move every snag, outcrop and
// boulder in the pod. This one is called at instancing time and reads nothing
// but x and y.
//
// WHAT THIS DOES *NOT* CLAIM: with a ±90° band the baked terminator is not the
// real one, tree by tree. It is not meant to be — MeshLambertMaterial already
// computes the real one, exactly, per face, per frame, and no albedo can beat
// it at that. The bake's job is CONTRAST: to give the light term something with
// range to work on, instead of one near-black green whose lit and shade sides
// differ by the ambient floor. The constraint is there so the two never fight.
//
// COST: zero. Same 375 vertices, same triangle count, same draw calls, and the
// yaw was already a per-instance matrix compose.
export const FIR_YAW_BAND = 90 * Math.PI / 180;

/** The yaw a fir wears, so its baked sun side stays sun side. A 32-bit
 *  avalanche over (x, y) — different constants from `treeVariant` so the two
 *  hashes do not correlate and the seed buckets do not land in yaw bands. */
export function firYaw(x, y) {
  let h = Math.imul((Math.round(x * 41.3) | 0) ^ 0x27d4eb2f, 0x165667b1);
  h = Math.imul((h ^ (Math.round(y * 41.3) | 0)) ^ (h >>> 15), 0x9e3779b1);
  h ^= h >>> 16;
  return ((h >>> 0) / 4294967296 * 2 - 1) * FIR_YAW_BAND;
}

// THE TWO GREENS — and the T4b correction, which is the reason they are what
// they are now.
//
// THE CONTRAST IS BOUGHT BY LIFTING THE SUN SIDE, NOT BY CRUSHING THE SHADE
// SIDE. That part of T4 stands and is not up for revisiting: the first cut took
// the shade side to lin(0x0d1a22) at 0.52 over a 0.42 gain and the chair-eye
// plate came back a wall of black cut-outs (renders/trees/T4/, first pass).
// This material is ALREADY lit — MeshLambertMaterial shades every face against
// SUN_DIR, so the shade side arrives at the framebuffer with the light term
// already low, and kit.mjs's needle base (0x1e3527) is nearly black to begin
// with; multiplying two dark things gives a silhouette. Both poses Greg judges
// look almost straight up-sun (treeline-close bears 232°, far-tier 222°,
// against SUN_AZ 215°), so the shade side is most of what either frame shows.
//
// WHAT T4 GOT WRONG WAS THE HUE IT LIFTED INTO. T4 lifted the sun side toward
// lin(0x93c063) on the argument that a low January sun is orange, so the lit
// needles should go WARM. Greg's playtest: "the trees look too warm to be Tahoe
// trees." He is right, and the buffer says exactly how wrong, measured off the
// baked prototypes (work/tree_needle_probe.mjs, mean canopy face by sun dot):
//
//                 T4 lit               T4 shade
//   big   #7fa857 rgb(127,168, 87)   #214237 rgb(33,66,55)
//   mid   #80a857 rgb(128,168, 87)   #224337 rgb(34,67,55)
//   far   #7fa857 rgb(127,168, 87)   #214236 rgb(33,66,54)
//
// hue 90° on the lit side, with B (87) BELOW R (127). That is a lime. The
// species this stand is made of — red fir, Jeffrey pine, mountain hemlock — are
// GLAUCOUS: the needle carries a waxy bloom, so it is blue-green to begin with,
// and in winter light the lit side goes LIGHTER AND GREYER, never yellower.
// Warm light on a cool needle desaturates it toward the sky; it does not rotate
// its hue through yellow. The orange-sun argument confuses the ILLUMINANT with
// the ALBEDO, and the illuminant is the one thing already handled — the sun
// colour is in terrain.mjs's light, and it multiplies whatever albedo is here.
// Baking the warmth in a second time is what made the stand read Cascade-in-
// August instead of Sierra-in-January.
//
// SO THE SPLIT IS NOW ONE HUE FAMILY AND THE CONTRAST LIVES IN VALUE. Both
// sides sit in blue-green; the lit side is lifted in value and DESATURATED, the
// shade side is deep and saturated. Measured on the same probe:
//
//                 T4b lit              T4b shade
//   big   #7ca997 rgb(124,169,151)   #1d433d rgb(29,67,61)
//   mid   #7ca997 rgb(124,169,151)   #1e443e rgb(30,68,62)
//   far   #7ca997 rgb(124,169,151)   #1d433d rgb(29,67,61)
//
//   lit   hue 156°  V 169  sat 0.27      (T4: hue 90°, V 168, sat 0.48)
//   shade hue 170°  V  67  sat 0.57      (T4: hue 159°, V 66, sat 0.50)
//
// THE VALUE LADDER IS UNCHANGED TO WITHIN A CODE VALUE — lit 169 vs T4's 168,
// shade 67 vs 66 — which is the point of the fix and the check on it: nothing
// about the light/dark read Greg approved in T4 moves, only the hue does. The
// lit side is not made darker to cool it, and the shade side is not made
// heavier to compensate.
//
// ALL THREE LODs LAND ON THE SAME PAIR, deliberately: the mid and far classes
// share these constants and their needle bases differ only by firGeo's own
// jitter, so the 640 m stand in renders/trees/T4b/*far-tier* reads as the same
// cold forest as the corridor band, not as a second species behind it.
//
// The mixes moved with the colours (litMix 0.72 -> 0.76, shadeMix 0.46 -> 0.60)
// and only to hit those numbers: the base needle is hue ~140 and dark, so it
// drags a low-mix result back toward green. Measured over the candidate sweep,
// a cold shade target at the old shadeMix 0.46 comes back at 162°, short of the
// band, and 0.60 is the smallest mix that puts it at 170; litMix 0.76 is what
// holds the lit side's VALUE at T4's 169 while its hue rotates 66° cooler.
//
// ONE THING THIS DOES NOT CONTROL, AND IT IS WORTH KNOWING. These are albedos.
// The scene's sky ambient is blue, and it adds roughly +40° of hue to every
// needle on the way to the framebuffer: T4's own shade side is 159° here and
// reads 187-190° in the plate, and T4b's 156° lit side reads 193-199°. So the
// screen is bluer than these constants, uniformly, and always was — the numbers
// to compare against a reference photograph are the plate's, not these. What
// changed is the sign of the thing Greg objected to: the brightest tenth of the
// sunlit needle pixels went from rgb(78,107,69), B nine BELOW R, to
// rgb(76,108,117), B forty-one ABOVE it, at the same pixels and the same value.
//
// The snow is NOT touched. TREE_SNOW is lin(0xf2f7ff), already a cold white,
// and Greg's note on T3 was that the plates work; a bluer white was available
// and not taken, because the warmth complaint measures out entirely in the
// needle hue above and the plates are the part that is already right.
const NEEDLE_LIT = lin(0x8cbdaa);
const NEEDLE_SHADE = lin(0x1b4a48);

/** Split a fir prototype's canopy into a sun side and a shade side, against the
 *  world sun bearing, at bake time. Run BEFORE `firSnowLoad` so the snow plates
 *  sit on top of the split rather than being tinted by it. */
export function firTwoTone(B, { sunAz, lit = NEEDLE_LIT, shade = NEEDLE_SHADE,
                                litMix = 0.76, shadeMix = 0.60, shadeGain = 1.0,
                                edge = 0.14 } = {}) {
  const C = B.col;
  const a = sunAz * Math.PI / 180;
  const sx = Math.sin(a), sy = Math.cos(a);     // terrain.mjs SUN_DIR's own convention
  for (const face of canopyFaces(B)) {
    const hl = Math.hypot(face.nx, face.ny) || 1e-6;
    // +1 straight into the sun, -1 straight away from it
    const d = (face.nx * sx + face.ny * sy) / hl;
    // a HARD terminator: `edge` is the whole width of the transition, so at
    // most one of a tier's faces is ever caught between the two greens
    const k = smooth(-edge, edge, d);
    for (let j = 0; j < 3; j++) {
      const o = face.t + j * 3;
      for (let c = 0; c < 3; c++) {
        const base = C[o + c];
        const L = lerp(base, lit[c], litMix);
        const S = lerp(base * shadeGain, shade[c], shadeMix);
        C[o + c] = lerp(S, L, k);
      }
    }
  }
  return B;
}

export function distToRuns(x, y) {
  let best = 1e9;
  for (const r of RUNS) {
    // THE KT CLASSIC RUNS ARE INVISIBLE TO THIS FUNCTION, ON PURPOSE. It gates
    // pass 1 (`dr > 95`) and the sector mid pass (`distToRuns > 80`), both of
    // which sit BEFORE an rng draw — so letting seven new centrelines into it
    // would change how many candidates every loop after them consumes and move
    // every snag, granite outcrop and boulder in the Red Dog pod. Their tree
    // clearance is `ktVeto`, applied post-draw in `keep()` below.
    // POULSEN'S FOUR LINES ARE INVISIBLE HERE FOR EXACTLY THE SAME REASON, and
    // this is not a precaution — it is a bug that was caught by the tree count.
    // The first cut of increment 21 added the lines to RUNS without adding them
    // here, and the world came back with 25,169 trees against a baseline of
    // 25,142 and 195 granite outcrops against 193. Twenty-seven trees is not a
    // rounding error, it is proof that four new centrelines had changed how many
    // candidates the shared rng stream consumed, and every placement drawn after
    // them had moved. Their clearance is `pouVeto`, post-draw, below.
    if (r.ktRuns || r.pouRuns) continue;
    const pr = RUN_PREP[r.id];
    if (!pr) continue;
    if (x < pr.bb[0] - 140 || x > pr.bb[2] + 140 || y < pr.bb[1] - 140 || y > pr.bb[3] + 140) continue;
    for (const s of pr.seg) {
      if (x < s.x0 - best || x > s.x1 + best || y < s.y0 - best || y > s.y1 + best) continue;
      const px = x - s.ax, py = y - s.ay;
      const t = clamp((px * s.dx + py * s.dy) / s.L2, 0, 1);
      const d = Math.hypot(px - s.dx * t, py - s.dy * t);
      if (d < best) best = d;
    }
  }
  return best;
}

// Lift stations need a clear apron: the unload flat, the maze, the load carpet.
//
// ONLY THE FIVE FRONT-SIDE LINES ARE IN HERE, and that is deliberate. Every
// placement loop below is a REJECTION loop drawing from a shared rng, so a
// predicate that runs BEFORE the draw changes how many draws are consumed and
// moves every tree, snag, granite outcrop and boulder placed after it. The Gold
// Coast Funitel's base station is at (-389.1, +428.8) — inside the Red Dog
// CORE — so adding it here would have re-rolled the pod's whole forest to keep
// 179 m2 of ground clear (measured: work/probe_forest.mjs). Increment 1's own
// vetoes are `upperVeto()` instead, and every loop applies them AFTER its draw:
// the same ground is kept clear, and not one front-side placement moves.
const UPPER_LIFTS = new Set(['gold-coast-funitel', 'gold-coast-express']);
export const STATIONS = LIFTS.filter((L) => !UPPER_LIFTS.has(L.id))
  .flatMap((L) => [L.pts[0], L.pts[L.pts.length - 1]]);
export const UPPER_STATIONS = LIFTS.filter((L) => UPPER_LIFTS.has(L.id))
  .flatMap((L) => [L.pts[0], L.pts[L.pts.length - 1]]);
export function nearStation(x, y, r) {
  for (const s of STATIONS) if (Math.hypot(x - s[0], y - s[1]) < r) return true;
  return false;
}
/** increment 1's own clearances — the Funitel's two stations, Gold Coast
 *  Express's two, and the real OSM footprints of the Gold Coast lodge, the
 *  High Camp complex and the Funitel base house. Applied POST-DRAW. */
export function upperVeto(x, y) {
  for (const s of UPPER_STATIONS) if (Math.hypot(x - s[0], y - s[1]) < 30) return true;
  for (const b of UPPER_BUILDINGS)
    if (inBox(x, y, b.c[0], b.c[1], b.len, b.wid, b.yaw, 8)) return true;
  return false;
}

const inBox = (x, y, cx, cy, sx, sy, yawDeg, pad = 0) => {
  const a = yawDeg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
  const dx = x - cx, dy = y - cy;
  return Math.abs(dx * c + dy * s) < sx / 2 + pad && Math.abs(-dx * s + dy * c) < sy / 2 + pad;
};

// THE KT CLASSIC RUNS' OWN CLEARANCE. Applied POST-DRAW in `keep()`, never
// inside a loop — REPORT §17.3's rule.
//
// THE HALF-WIDTHS ARE DELIBERATELY NARROW, and that is a FIDELITY decision, not
// a budget one. view-27 is the inside of Chute 75 and it has MATURE FIRS
// STANDING ON THE SKIER'S-RIGHT BANK, a few metres off the floor; view-26 has
// them on the left. The trees on the rim are part of what makes the chute read
// as a chute from inside it — clearing a 40 m corridor would have deleted the
// single best cue the footage gives. So the veto takes the FLOOR and the mogul
// ride line and nothing else, and the rim keeps every tree the canopy raster
// gave it. (COMPOSING rule 15, and the same argument PARK.md §6 makes for the
// pines standing inside the park envelope.)
const KT_CLEAR = [
  ['seventyfive-chute', 13], ['alt-75', 10], ['diagonal-chute', 9],
  ['moseleys', 20], ['west-face-2', 17], ['west-face-3', 17],
  ['west-face-4', 17], ['west-face-5', 17], ['waterfall-gully', 11],
];
export function ktVeto(x, y) {
  if (!(x > KT_WORK.x0 && x < KT_WORK.x1 && y > KT_WORK.y0 && y < KT_WORK.y1)) return false;
  for (const [id, hw] of KT_CLEAR) {
    const pr = RUN_PREP[id];
    if (!pr) continue;
    if (x < pr.bb[0] - hw || x > pr.bb[2] + hw || y < pr.bb[1] - hw || y > pr.bb[3] + hw) continue;
    for (const s of pr.seg) {
      if (x < s.x0 - hw || x > s.x1 + hw || y < s.y0 - hw || y > s.y1 + hw) continue;
      const px = x - s.ax, py = y - s.ay;
      let t = (px * s.dx + py * s.dy) / s.L2; t = t < 0 ? 0 : t > 1 ? 1 : t;
      if (Math.hypot(px - s.dx * t, py - s.dy * t) < hw) return true;
    }
  }
  // AND NO FIR ON A BUILT WALL. `forestDensity` already refuses a 50 deg face,
  // but it decides on the FROZEN basis, where the chute walls do not yet exist.
  // Re-testing the LIVE slope here is free (it is post-draw) and it is what
  // keeps a 25 m fir off the rock wall the reshape just raised.
  return slopeAt(x, y, 6) > 50;
}

// POULSEN'S GULLY'S OWN CLEARANCE. Applied POST-DRAW in `keep()`, never inside a
// loop — REPORT §17.3's rule, for the third time.
//
// THE HALF-WIDTH IS 8 m AND THAT IS DELIBERATELY NARROW, for the same reason
// KT_CLEAR's is. Poulsen's is a TREED drainage: the ledger calls it
// "claustrophobic" (squawguide), views 44-46 are shot between trees, and the
// aerial cannot even trace the floor because it lies in tree shadow (§6.4). The
// trees ARE the feature. So the veto takes the floor a rider actually skis and
// nothing else, and the banks keep every tree the canopy raster gave them.
const POU_CLEAR = [['poulsens-gully', 8], ['pou-entrance-1', 6],
                   ['pou-entrance-2', 6], ['pou-entrance-3', 6]];
export function pouVeto(x, y) {
  if (!(x > POU_WORK.x0 && x < POU_WORK.x1 && y > POU_WORK.y0 && y < POU_WORK.y1)) return false;
  for (const [id, hw] of POU_CLEAR) {
    const pr = RUN_PREP[id];
    if (!pr) continue;
    if (x < pr.bb[0] - hw || x > pr.bb[2] + hw || y < pr.bb[1] - hw || y > pr.bb[3] + hw) continue;
    for (const s of pr.seg) {
      if (x < s.x0 - hw || x > s.x1 + hw || y < s.y0 - hw || y > s.y1 + hw) continue;
      const px = x - s.ax, py = y - s.ay;
      let t = (px * s.dx + py * s.dy) / s.L2; t = t < 0 ? 0 : t > 1 ? 1 : t;
      if (Math.hypot(px - s.dx * t, py - s.dy * t) < hw) return true;
    }
  }
  return false;
}

// ==========================================================================
// THE FINGERS' OWN CLEARANCE — increment 23. Applied POST-DRAW in `keep()`,
// never inside a loop; REPORT §17.3's rule for the fourth time.
//
// GREG'S ASK IS THE SPEC: "remove the trees that are on the cliff part". His
// reference photo and view-4 agree about where that is — the reef's rock band
// carries NO mature firs at all, only a handful of wind-bent pines on its crest
// and its shoulders, while the bench above it and the runout below it are
// treed. The canopy raster does not know that: aerial-2 reads 87-100 % canopy
// over most of the reef (work/fin_probe.mjs), because in summer imagery the
// reef's own shadow classifies as conifer.
//
// SO THE VETO IS A SLOPE TEST, NOT A BOX. A tree goes if it is inside the reef's
// band AND standing on ground steeper than `FIN_SLOPE`. That keeps every tree on
// the bench, in the runout and out on the low-angle shoulders — which is
// precisely the arrangement both photographs show — and takes only the ones
// standing on the cliff. It is measured on the LIVE ground, which for this
// increment is the same as the basis (nothing here writes the raster), and it is
// free because it runs after every loop has finished.
//
// THE BAND IS A ZONE, AND IT USED TO BE A LINE BUFFER — increment 24's fix.
//
// Increment 23 vetoed a tree if it stood within 15 m of one of the eleven baked
// lines AND on ground over 33 deg. It took 118 TREES out of the 628 standing
// inside the working box, and Greg's verdict on the top-down proof render was
// the obvious one: the reef was still fully treed. Two reasons, both structural
// rather than a matter of degree:
//
//   1. A 15 m BUFFER ROUND A LINE IS NOT A BAND. Increment 23's chutes were
//      short and scattered — three of the five ended up strung across the
//      runout — so eleven buffers round eleven short lines covered a fraction of
//      the face and left a lattice of treed gaps between them.
//   2. 33 deg WAS TOO HIGH A GATE. The reef's own measured slope over the rib
//      crests runs 23-63 deg with a long shoulder in the low thirties, so a
//      33 deg gate spared a third of the band.
//
// So the clearance is now A ZONE, and the zone is DERIVED FROM THE BAKE rather
// than typed: every station of every rib and every chute is projected into the
// OSM stub's own (down-slope, across-slope) frame, and the band is the bounding
// rectangle of all of them in that frame, grown by FIN_PAD on all four sides.
// In world XY that is an oriented quadrilateral covering the whole built reef —
// the ribs, the chutes between them, and one tree-length of margin outside the
// outer ribs. It is measured at load, so it follows the bake: re-run
// work/bake_fingers.mjs with different offsets and the cleared zone moves with
// them and cannot drift out of step with the rock.
//
//   band, this bake   s [-6.0, 197.2] m down the stub, o [-41.0, 94.5] m across
//   FIN_PAD  14 m     one mature fir's own crown radius outside the outer rib
//   FIN_SLOPE 27 deg  still a SLOPE TEST and still for the reason increment 23
//                     gave: what Greg asked to remove is "the trees that are on
//                     the cliff part", and a bench inside the band is not the
//                     cliff. 25 trees stand on sub-27 deg ground inside the zone
//                     and they stay, which is what stops the clearance reading
//                     as a rectangle somebody drew.
//
// MEASURED YIELD: 373 trees stand inside the padded band and 348 of them go,
// out of the 628 in the box — against increment 23's 118. The 280 that stay are
// the bench above the reef, the runout below it and the low-angle shoulders
// either side, which is the arrangement both photographs show. Zero big firs
// are taken because zero stand here: the box holds 169 mid and 459 small and no
// big at all, so the reef was scrubbed in the placement long before this veto.
// work/fin_forest.mjs prints all of it and asserts the post-draw rule.
const FIN_BOX = { x0: -905, x1: -675, y0: -430, y1: -185 };
const FIN_PAD = 14, FIN_SLOPE = 27;
const FIN_BAND = (() => {
  const S = RUNS.find((r) => r.id === 'the-fingers').pts;
  const T0 = S[0], B0 = S[S.length - 1];
  let ax = B0[0] - T0[0], ay = B0[1] - T0[1];
  const L = Math.hypot(ax, ay) || 1; ax /= L; ay /= L;
  const nx = -ay, ny = ax;                       // +n is Greg's right, see the bake
  let s0 = Infinity, s1 = -Infinity, o0 = Infinity, o1 = -Infinity;
  for (const A of [...FIN_RIBS, ...FIN_CHUTES]) {
    for (const p of A) {
      const dx = p[0] - T0[0], dy = p[1] - T0[1];
      const s = dx * ax + dy * ay, o = dx * nx + dy * ny;
      if (s < s0) s0 = s; if (s > s1) s1 = s;
      if (o < o0) o0 = o; if (o > o1) o1 = o;
    }
  }
  return { x0: T0[0], y0: T0[1], ax, ay, nx, ny,
           s0: s0 - FIN_PAD, s1: s1 + FIN_PAD, o0: o0 - FIN_PAD, o1: o1 + FIN_PAD };
})();
// ---- AND THE SIX LANDING CORRIDORS — INCREMENT 25.
//
// The v3 spines each END IN A DROP you air (scene/kt-rocks.mjs §THE FINGERS,
// FIN_NOSES), and a landing with a mature fir standing in it is worse than a
// flat one. The band above cannot cover them: it is the bounding rectangle of
// the ribs and chutes, and increment 25 CUT EVERY SPINE BACK to the last
// station with a proven landing — so the ground a rider now flies onto is 25 to
// 45 m BELOW the reef's own band, and most of it is below FIN_BOX's own y1
// (-185) as well.
//
// MEASURED, WHICH IS WHY THIS EXISTS: with the band alone, the 45 m fall-line
// corridor under the six noses held 0, 8, 9, 18, 44 and 30 trees within 14 m of
// the centreline, the nearest 3.2 m off it. work/fin_ride.mjs lands the body 26
// to 42 m out from each lip, so those are trees in the landing zone.
//
// So the corridor is the fall line itself, walked 46 m from each nose, with a
// half-width that TAPERS 13 m -> 8 m over the run. It is a corridor and not a
// clearing: 8 m is one fir's crown either side of a rider's line, the glades
// below and beside it are untouched, and the taper is why the cleared ground
// reads as a chute mouth rather than as a rectangle somebody drew.
//
// NO SLOPE GATE HERE, deliberately, and that is the one difference from the
// band. The band's slope test exists because Greg asked for the trees off "the
// cliff part" and a bench inside the band is not the cliff; a landing is a
// landing at any angle, and the bake has already refused to put a nose over
// ground shallower than 34 deg.
const LAND_RUN = 46, LAND_W0 = 13, LAND_W1 = 8;
const LAND_LINES = FIN_NOSES.map((N) => {
  // the FROZEN basis, like everything else placement reads: nothing in
  // increment 25 writes the raster, so this is also the live ground.
  let x = N.x, y = N.y, d = 0;
  const P = [[x, y, 0]];
  while (d < LAND_RUN) {
    const h = 3.0;
    const gx = (groundZ0(x + h, y) - groundZ0(x - h, y)) / (2 * h);
    const gy = (groundZ0(x, y + h) - groundZ0(x, y - h)) / (2 * h);
    const g = Math.hypot(gx, gy) || 1e-9;
    x += (-gx / g) * 2.5; y += (-gy / g) * 2.5; d += 2.5;
    P.push([x, y, d]);
  }
  return P;
});
/** true if (x, y) is inside a nose's landing corridor. Exported so
 *  work/fin_forest.mjs can assert WHERE the extra trees came from rather than
 *  widening a box until the gate stops complaining. */
export function landVeto(x, y) {
  for (const P of LAND_LINES) {
    for (let i = 0; i < P.length - 1; i++) {
      const a = P[i], b = P[i + 1];
      const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy || 1e-9;
      let t = ((x - a[0]) * dx + (y - a[1]) * dy) / L2; t = t < 0 ? 0 : t > 1 ? 1 : t;
      const dist = Math.hypot(x - a[0] - dx * t, y - a[1] - dy * t);
      const s = a[2] + t * (b[2] - a[2]);
      if (dist < LAND_W0 + (LAND_W1 - LAND_W0) * (s / LAND_RUN)) return true;
    }
  }
  return false;
}

export function finVeto(x, y) {
  // the landing corridors first — they reach BELOW FIN_BOX, which is the whole
  // reason they are a separate test rather than a wider band
  if (landVeto(x, y)) return true;
  if (!(x > FIN_BOX.x0 && x < FIN_BOX.x1 && y > FIN_BOX.y0 && y < FIN_BOX.y1)) return false;
  const F = FIN_BAND;
  const dx = x - F.x0, dy = y - F.y0;
  const s = dx * F.ax + dy * F.ay;
  if (s < F.s0 || s > F.s1) return false;
  const o = dx * F.nx + dy * F.ny;
  if (o < F.o0 || o > F.o1) return false;
  return slopeAt(x, y, 6) > FIN_SLOPE;
}

export function forestDensity(x, y) {
  // THE FROZEN BASIS, not the live rasters. `masksAt0` / `slopeAt0` are the
  // ground as it stood before the KT classic-runs pass (ground.mjs epoch A), so
  // this function returns exactly what it always returned and every rejection
  // loop below takes exactly the draws it always took. The consequence — that
  // trees are still placed as if the chute walls and the mogul fields were not
  // there — is settled AFTER every loop finishes, by `ktVeto` and the re-seat
  // in `keep()`. work/kt_forest.mjs is the hash that proves it.
  const m = masksAt0(x, y);
  // the pistes, the plowed base and the lift swath cut hard holes
  const cut = clamp(m.groom * 1.2 + m.pack * 1.25 + m.pave * 1.35 + m.cat * 1.2 + m.lift * 1.15, 0, 1);
  if (cut > 0.26) return 0;
  let can = canopyAt(x, y);
  if (can < 0) {                                  // beyond both aerials
    can = clamp(1 - smooth(430, 600, demAt(x, y)), 0, 1) * 0.65;
  }
  // the aerial reads a stand as ~solid; a real stand is ~0.02 trees/m^2, so the
  // fraction maps almost 1:1 onto placement probability.
  let d = smooth(0.06, 0.52, can);
  d *= 1 - smooth(0.05, 0.26, cut);
  // glades keep their trees but thinned to skiable spacing
  if (m.glade > 0.08) d *= lerp(1, 0.34, smooth(0.08, 0.55, m.glade));
  // nothing grows on a 50 deg rock face or in the lots
  d *= 1 - smooth(42, 58, slopeAt0(x, y, 6));
  // ...nor on measured bare rock. The canopy classifier reads alpine scrub in
  // the gullies of the Eagle's Nest massif as canopy — correctly, there IS
  // scrub there — but a 25 m fir standing on a snow-laced volcanic rib is the
  // single worst thing this merge could put in front of the player. The
  // measured rock fraction (rock.mjs) thins the stand hard and never quite to
  // zero, so the krummholz the photograph shows survives.
  const rk = rockAt(x, y);
  if (rk > 0.05) d *= 1 - 0.92 * smooth(0.10, 0.62, rk);
  if (nearStation(x, y, 30)) return 0;
  for (const L of LOTS) if (inBox(x, y, L.c[0], L.c[1], L.s[0], L.s[1], L.yaw, 12)) return 0;
  for (const b of BUILDINGS) if (inBox(x, y, b[0], b[1], b[2], b[3], b[5], 7)) return 0;
  // increment 1's own clearances are NOT tested here — see upperVeto() above.
  return clamp(d, 0, 1);
}

export function placeForest(opts = {}) {
  const rng = makeRng('red-dog-forest');
  const big = [], mid = [], small = [];
  // THE MERGE'S TREE BUDGET. The base run ran 3,900 / 9,200 / 2,000 over the
  // Red Dog CORE alone. The world is now 2.5 km across with four promoted
  // sectors, and trees are 55 % of its whole triangle budget, so the general
  // pod pool and the cheap surround pool are the merge's third reclaim.
  // NB (the big corridor-lining firs — the ones you ski past, and the tree
  // striping that is the most recognisable thing about the Red Dog face) is
  // NOT touched: COMPOSING rule 17.
  const NB = opts.big || 3900, NM = opts.mid || 8000, NS = opts.small || 950;
  const X0 = CORE.x0 - 40, X1 = CORE.x1 + 40, Y0 = CORE.y0 - 40, Y1 = CORE.y1 + 40;

  // pass 1: the tree WALLS — big firs within 95 m of a run centreline
  for (let i = 0; i < 300000 && big.length < NB; i++) {
    const x = rr(rng, X0, X1), y = rr(rng, Y0, Y1);
    const dr = distToRuns(x, y);
    if (dr > 95) continue;
    const dn = forestDensity(x, y);
    if (dn <= 0 || rng() > dn * (0.55 + 0.55 * (1 - smooth(6, 95, dr)))) continue;
    big.push([x, y, groundZ(x, y), rr(rng, 0, 6.283), rr(rng, 0.72, 1.30)]);
  }
  // pass 2: the rest of the pod
  for (let i = 0; i < 340000 && mid.length < NM; i++) {
    const x = rr(rng, X0, X1), y = rr(rng, Y0, Y1);
    const dn = forestDensity(x, y);
    if (dn <= 0 || rng() > dn * 0.9) continue;
    mid.push([x, y, groundZ(x, y), rr(rng, 0, 6.283), rr(rng, 0.62, 1.14)]);
  }
  // pass 2b: the PROMOTED SECTORS. Same density field, same canopy source
  // (aerial-2 read at 2.0 m/px over the sector instead of 6.25), but the trees
  // are hung off groundZ — the carved corridors punch their holes here now —
  // and they draw from the two cheaper LODs, because a promoted sector is
  // corridor-grade: the fidelity budget stays on the CORE the pod rides.
  // FOUR sectors now, so the budget is PER SECTOR and proportional to how much
  // band each one has. The base run's caps were global (`mid.length < NM+NSB`),
  // which with more than one sector let the first one eat the whole allowance
  // and left the rest bare — the merge's first build had a treeless KT-22 for
  // exactly that reason. Weights are set by band area, and they are also where
  // the merge's tree budget is spent: the KT front side is largely above the
  // stand line and needs fewer trees than Exhibition, which is all forest.
  // EXHIBITION is held at the base run's own 900/2500 (to 850/2400) so the
  // sector Greg already skied does not thin under the merge. KT-22 and KT-22
  // WEST get less per square metre than Exhibition on purpose and not only for
  // budget: 44 % of the KT band's canopy raster is canopy against Exhibition's
  // 45 %, but a third of the KT band is measured bare rock, and the rock
  // suppression in forestDensity() takes most of those placements out anyway.
  //
  // UPPER MOUNTAIN INCREMENT 1 — DELIBERATELY THE SPARSEST GROUND IN THE WORLD,
  // and that is a measurement, not a saving. The bundle's own corridor-width
  // walk saturated on 54-100 % of its rays: "the ray reached 60 m each side
  // without finding canopy at all... The upper mountain is OPEN BOWL, not a
  // corridor mountain. Build it as open terrain with named lines drawn on it,
  // not as glades." (pois/palisades-upper/README.md §2.4.) The sector canopy
  // rasters agree from the other side: 21.9 % over the Gold Coast band and
  // 35.5 % under the Funitel line, against 44.5-46.4 % over the two KT bands.
  // So per kilometre of band these four carry roughly a third of the front
  // side's trees, and the ones they do carry are the scattered mature pines
  // standing IN the snowfield that view-8 shows, not a stand with a lane cut
  // through it.
  const SEC_TREES = {
    exhibition:  { mid: 850, small: 2400 },
    olympiclady: { mid: 230, small: 640 },
    kt22:        { mid: 600, small: 1700 },
    ktwest:      { mid: 320, small: 950 },
    mountainrun: { mid: 620, small: 1500 },
    upperrunout: { mid: 300, small: 800 },
    funitel:     { mid: 150, small: 420 },
    goldcoast:   { mid: 140, small: 380 },
  };
  //
  // RNG DISCIPLINE, and it is the merge's own hard-won lesson (REPORT §14.3:
  // "a ported sculpt that consumes a different number of random draws produces
  // a different world, silently"). The four front-side sectors are FIRST in
  // SECTORS and keep drawing from the shared `red-dog-forest` stream in exactly
  // the order and count they always did, so their forests are bit-identical.
  // Increment 1's four sectors draw from their OWN stream instead of extending
  // the shared one — otherwise every surround tree, snag, granite outcrop and
  // boulder in the Red Dog pod (all placed AFTER this loop) would have moved,
  // for no reason but the order of a for-loop.
  const rngU = makeRng('upper-mountain-forest');
  const FRONT = new Set(['exhibition', 'olympiclady', 'kt22', 'ktwest']);
  const bandOf = (x, y) => {
    const S = sectorOwner(x, y);
    return S && sectorDist(x, y) < S.reach ? S.id : null;
  };
  const inBandFront = (x, y) => {
    const id = bandOf(x, y);
    return !!id && FRONT.has(id) && !inCoreBox(x, y, 4);
  };
  const inBandUpper = (x, y) => {
    const id = bandOf(x, y);
    return !!id && !FRONT.has(id);
  };
  const inBand = (x, y) => inSector(x, y) && !inCoreBox(x, y, 4);
  for (const S of SECTORS) {
    const B = S.box;
    const q = SEC_TREES[S.id] || { mid: 400, small: 1200 };
    const R = FRONT.has(S.id) ? rng : rngU;
    const midTarget = mid.length + q.mid, smallTarget = small.length + q.small;
    for (let i = 0; i < 260000 && mid.length < midTarget; i++) {
      const x = rr(R, B.x0, B.x1), y = rr(R, B.y0, B.y1);
      if (!inBand(x, y) || distToRuns(x, y) > 80) continue;
      const dn = forestDensity(x, y);
      if (dn <= 0 || R() > dn * 0.95) continue;
      mid.push([x, y, groundZ(x, y), rr(R, 0, 6.283), rr(R, 0.72, 1.24)]);
    }
    for (let i = 0; i < 300000 && small.length < smallTarget; i++) {
      const x = rr(R, B.x0, B.x1), y = rr(R, B.y0, B.y1);
      if (!inBand(x, y)) continue;
      const dn = forestDensity(x, y);
      if (dn <= 0 || R() > dn * 0.85) continue;
      small.push([x, y, groundZ(x, y), rr(R, 0, 6.283), rr(R, 0.7, 1.3)]);
    }
  }

  // pass 3: the surrounding country, straight off aerial-2. Thinned from 4200
  // to make room for the promoted sector — these are the cheapest, furthest
  // trees in the world and the sector took over the part of the surround that
  // anyone actually looks at.
  // ...into its OWN array. `small.length < surroundTarget` would otherwise have
  // meant that dropping one tree after the draw made the loop take one more
  // candidate, which is a stream change by the back door. The pass draws
  // exactly what it always drew; the drop happens at the end (`keep`, below).
  const surround = [];
  for (let i = 0; i < 340000 && surround.length < NS; i++) {
    const x = rr(rng, TIGHT.x0 - 900, TIGHT.x1 + 640), y = rr(rng, TIGHT.y0 - 780, TIGHT.y1 + 640);
    if (x > X0 && x < X1 && y > Y0 && y < Y1) continue;
    // FRONT-side bands only, on purpose: this test sits BEFORE the rng draw
    // below, so widening it to increment 1's bands would have changed how many
    // draws this loop consumes and moved every snag, outcrop and boulder in the
    // pod. Increment 1's bands are filtered out AFTER the draw instead — same
    // trees skipped, same stream.
    if (inBandFront(x, y)) continue;            // the sector places its own
    let can = canopyAt(x, y);
    if (can < 0) can = clamp(1 - smooth(430, 600, demAt(x, y)), 0, 1) * 0.55;
    // The surround pass does NOT go through forestDensity (it is deliberately
    // cheap), so it needs the same two vetoes explicitly — otherwise the merge
    // grows the surround west over the KT-22 massif and stands firs on the
    // Eagle's Nest ribs, 34 m terrain grid and all.
    const rk = rockAt(x, y);
    if (rk > 0.05) can *= 1 - 0.92 * smooth(0.10, 0.62, rk);
    can *= 1 - smooth(40, 56, slopeAt0(x, y, 9));
    const d = smooth(0.12, 0.66, can);
    if (rng() > d * 0.7) continue;
    surround.push([x, y, demAt(x, y), rr(rng, 0, 6.283), rr(rng, 0.75, 1.4)]);
  }
  // increment 1's bands place their own trees, so the surround yields to them —
  // and its `demAt` z would sit above or below their carved corridors anyway
  small.push(...surround.filter((p) => !inBandUpper(p[0], p[1])));

  // pass 3b: THE WEST SURROUND, increment 1. Everything above stops at
  // x = -1610; the upper mountain runs to x = -3510 and would otherwise be
  // bare ground outside its four bands. Same cheap treatment as pass 3 and its
  // own stream, over the two new tight tiles only — beyond them the elevation
  // data is 7 m/px and a tree there is a pixel.
  {
    const X0w = UTIGHT_W.x0, X1w = UTIGHT_E.x1, Y0w = UTIGHT_E.y0, Y1w = UTIGHT_E.y1;
    const target = small.length + (opts.westSmall || 1250);
    for (let i = 0; i < 420000 && small.length < target; i++) {
      const x = rr(rngU, X0w, X1w), y = rr(rngU, Y0w, Y1w);
      if (x > TIGHT.x0 - 900) continue;         // pass 3 already covers east of this
      if (inBand(x, y)) continue;
      let can = canopyAt(x, y);
      if (can < 0) can = clamp(1 - smooth(430, 600, demAt(x, y)), 0, 1) * 0.42;
      const rk = rockAt(x, y);
      if (rk > 0.05) can *= 1 - 0.92 * smooth(0.10, 0.62, rk);
      can *= 1 - smooth(40, 56, slopeAt0(x, y, 9));
      // THE UPPER MOUNTAIN IS OPEN BOWL. The same density curve as pass 3 would
      // put a continuous stand on the Gold Coast bench, and the aerial says
      // 21.9 % canopy there. 0.45 rather than 0.7, and a higher floor.
      const d = smooth(0.18, 0.72, can);
      if (rngU() > d * 0.45) continue;
      if (upperVeto(x, y)) continue;
      small.push([x, y, demAt(x, y), rr(rngU, 0, 6.283), rr(rngU, 0.75, 1.4)]);
    }
  }

  const snags = [];
  for (let i = 0; i < 40000 && snags.length < 70; i++) {
    const x = rr(rng, X0, X1), y = rr(rng, Y0, Y1);
    if (forestDensity(x, y) < 0.5 || distToRuns(x, y) > 120 || rng() > 0.25) continue;
    snags.push([x, y, groundZ(x, y), rr(rng, 0, 6.283), rr(rng, 0.6, 1.25)]);
  }

  // granite: where the aerial has no canopy AND the DEM is steep, or high on
  // the wind-scoured ridge (view-14, view-16).
  const rocks = [], boulders = [];
  for (let i = 0; i < 120000 && rocks.length < 85; i++) {
    const x = rr(rng, X0, X1), y = rr(rng, Y0, Y1);
    const m = masksAt0(x, y);
    if (m.groom > 0.25 || m.pave > 0.1 || m.pack > 0.2 || m.cat > 0.3) continue;
    if (nearStation(x, y, 36)) continue;
    // THE HEIGHT IN THE TEST IS THE BASIS HEIGHT, the height in the RESULT is
    // the built one. This loop's x-range is CORE +/- 40 m, which reaches to
    // x = -510 and therefore OVERLAPS the Olympic Lady pocket, where the
    // Diagonal Chute and Waterfall Gully stamps land. Testing against the live
    // `groundZ` would have made a granite outcrop's ACCEPTANCE depend on the
    // new pocket ground and moved outcrops on the Red Dog face.
    const sl = slopeAt0(x, y, 6), z0 = groundZ0(x, y);
    const bare = 1 - clamp(canopyAt(x, y), 0, 1);
    if (rng() > (smooth(36, 52, sl) * 0.45 + smooth(360, 440, z0) * 0.22) * (0.25 + bare)) continue;
    rocks.push([x, y, groundZ(x, y), rr(rng, 0, 6.283), rr(rng, 0.45, 1.05)]);
  }
  for (let i = 0; i < 80000 && boulders.length < 110; i++) {
    const x = rr(rng, X0, X1), y = rr(rng, Y0, Y1);
    const m = masksAt0(x, y);
    if (m.groom > 0.35 || m.pave > 0.1 || nearStation(x, y, 36)) continue;
    if (rng() > smooth(24, 46, slopeAt0(x, y, 5)) * 0.35 + 0.03) continue;
    boulders.push([x, y, groundZ(x, y), rr(rng, 0, 6.283), rr(rng, 0.35, 0.9)]);
  }
  // ---------------------------------------------------------- the LAST word
  // Increment 1's clearances are applied HERE, after every loop has finished,
  // and never inside one. A rejection loop's output is a function of how many
  // draws it takes, so vetoing a candidate mid-loop — even after its own draw —
  // makes the loop take one more candidate and every placement after it moves.
  // Filtering the finished arrays keeps the Funitel base terminal, the Gold
  // Coast lodge and the High Camp blocks clear of trees while leaving the Red
  // Dog pod's forest, snags, granite outcrops and boulders bit-identical to the
  // world the merge verified. Cost, measured by work/probe_forest.mjs: a
  // handful of trees on 179 m2 of ground where a lift station now stands.
  //
  // INCREMENT 2 ADDS THE VILLAGE TO THE SAME FILTER, for the same reason and by
  // the same route. `forestDensity()` above vetoes tree cells against
  // `layout.mjs` BUILDINGS — the 24 eyeballed rectangles increment 2 replaced
  // with 122 real OSM plans — so the veto stopped covering what is actually
  // built, and `work/_treeclash.mjs` counts **51 props standing inside a mapped
  // village building**: 7 big firs, 27 mid, 16 far and one boulder. Widening
  // `forestDensity` would have been the obvious fix and it is the wrong one: it
  // changes how many draws the rejection loops take and therefore moves every
  // tree in the world. Filtering the finished arrays removes exactly those 51
  // and leaves every other placement bit-identical.
  const inRing = (ring, x, y) => {
    let c = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const a = ring[i], b = ring[j];
      if ((a[1] > y) !== (b[1] > y)
          && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) c = !c;
    }
    return c;
  };
  // only the village box is searched — 122 rings against 26,000 trees over the
  // whole world would be the build's slowest loop for nothing
  const VB = VILLAGE_BUILDINGS.filter(() => true);
  const inVillage = (x, y) => (x > -920 && x < 320 && y > 230 && y < 1000
    && VB.some((b) => inRing(b.ring, x, y)));
  // INCREMENT 3 ADDS THE GOLD COAST PARK to the same filter, by the same route
  // and for the same reason. `parkVeto()` clears the ride line and the built
  // features and nothing else: PARK.md §6 and COMPOSING rule 15 both insist the
  // pines INSIDE the park envelope are the point — "the park is threaded around
  // live trees, not laid on a clear pad" (view-80, view-84, view-93) — so the
  // shoulders keep every tree the canopy raster gave them.
  // `opts.noParkVeto` is a TEST HOOK and nothing else: work/park_forest.mjs
  // builds the arrays both ways in one process and hashes them, which is how
  // increment 3 proves the same thing §17.3 proved with `work/probe_forest.mjs`
  // — that a post-draw filter cannot move a placement it does not remove.
  const pv = opts.noParkVeto ? () => false : parkVeto;
  // THE KT CLASSIC RUNS JOIN THE SAME FILTER, by the same route and for the same
  // reason — and they add one thing the three before them did not need: a
  // RE-SEAT. The chute walls, the cornice and the two mogul fields MOVE THE
  // GROUND, and every tree in those arrays was hung on `groundZ` at draw time,
  // which for a KT tree is now the wrong height. So inside the KT working box a
  // survivor's z is re-read off the built ground.
  //
  // x AND y ARE NEVER TOUCHED, anywhere, by either step. That is the whole
  // invariance claim and it is exactly what work/kt_forest.mjs measures: every
  // placement in the world is at a bit-identical (x, y); the only differences
  // are trees REMOVED inside the KT clearance, and z re-read inside the KT box.
  const kv = opts.noKtVeto ? () => false : ktVeto;
  // POULSEN'S JOINS THE SAME FILTER by the same route, and brings the same
  // RE-SEAT: epoch C moves the ground inside POU_WORK (mean 0.13 m, max 2.45 m),
  // and every tree in these arrays was hung on `groundZ` at draw time, which for
  // a tree in the gully is now the wrong height.
  //
  // x AND y ARE NEVER TOUCHED, anywhere, by either step. That is the whole
  // invariance claim, and work/pou_forest.mjs measures it: every placement in the
  // world is at a bit-identical (x, y); the only differences are trees REMOVED
  // inside the Poulsen clearance and z re-read inside the Poulsen box.
  const uv = opts.noPouVeto ? () => false : pouVeto;
  const inKtBox = (x, y) => x > KT_WORK.x0 && x < KT_WORK.x1
                         && y > KT_WORK.y0 && y < KT_WORK.y1;
  const inPouBox = (x, y) => x > POU_WORK.x0 && x < POU_WORK.x1
                          && y > POU_WORK.y0 && y < POU_WORK.y1;
  // THE FINGERS JOINS THE SAME FILTER, by the same route, for the fifth time —
  // and it brings NO re-seat, because increment 23 writes no ground at all: its
  // ribs are built geometry standing on an untouched hill (scene/kt-rocks.mjs's
  // header), so a surviving tree's z is still the z it was drawn on.
  //
  // `opts.noFinVeto` is a TEST HOOK: work/fin_forest.mjs builds the arrays both
  // ways in one process and hashes them, which is how this increment proves what
  // work/park_forest.mjs and work/probe_forest.mjs proved before it — that a
  // post-draw filter cannot move a placement it does not remove.
  const fv = opts.noFinVeto ? () => false : finVeto;
  const keep = (A) => A.filter((p) => !upperVeto(p[0], p[1]) && !inVillage(p[0], p[1])
                                      && !pv(p[0], p[1]) && !kv(p[0], p[1]) && !uv(p[0], p[1])
                                      && !fv(p[0], p[1]))
    .map((p) => (inKtBox(p[0], p[1]) || inPouBox(p[0], p[1])
      ? [p[0], p[1], groundZ(p[0], p[1]), p[3], p[4]] : p));
  return { big: keep(big), mid: keep(mid), small: keep(small),
           snags: keep(snags), rocks: keep(rocks), boulders: keep(boulders) };
}
