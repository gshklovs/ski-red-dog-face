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

import { clamp, lerp, smooth, fbm, makeRng, rr, ri } from './lib/core.mjs';
import { groundZ, slopeAt, demAt, RUN_PREP,
         groundZ0, masksAt0, slopeAt0, KT_WORK, POU_WORK } from './ground.mjs';
import { canopyAt } from './canopy.mjs';
import { rockAt } from './rock.mjs';
import { RUNS, LIFTS, CORE, TIGHT, UTIGHT_E, UTIGHT_W, SECTORS, LOTS, BUILDINGS,
         inSector, inCoreBox, sectorOwner, sectorDist } from './layout.mjs';
import { UPPER_BUILDINGS } from './upper-props.mjs';
import { parkVeto } from './park.mjs';
import { VILLAGE_BUILDINGS } from './village-props.mjs';

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
  const keep = (A) => A.filter((p) => !upperVeto(p[0], p[1]) && !inVillage(p[0], p[1])
                                      && !pv(p[0], p[1]) && !kv(p[0], p[1]) && !uv(p[0], p[1]))
    .map((p) => (inKtBox(p[0], p[1]) || inPouBox(p[0], p[1])
      ? [p[0], p[1], groundZ(p[0], p[1]), p[3], p[4]] : p));
  return { big: keep(big), mid: keep(mid), small: keep(small),
           snags: keep(snags), rocks: keep(rocks), boulders: keep(boulders) };
}
