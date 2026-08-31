// scene/park.mjs — THE GOLD COAST TERRAIN PARK, early-March 2026.
//
// Evidence: pois/palisades-upper/PARK.md and views 73-93 of that bundle's
// views.json. Season pinned 2025-26; the DAY modelled is the early-March 2026
// configuration — "Gold Coast now features a new three-pack of larger jumps,
// along with the return of the famous Gold Coast Hip" (blog.palisadestahoe.com
// 2026-03-06) plus the rail garden that views 78/80/83/88/90 film in January
// and March.
//
// ---------------------------------------------------------------- WHY A PAD
//
// The park is built as its OWN high-resolution surface laid ON the existing
// snow, not as a stamp into ground.mjs's raster. That is not a shortcut, it is
// the only correct route here, for three separate reasons:
//
//   1. FRONT-SIDE INVARIANCE. `forestDensity()` reads `masksAt()`, and every
//      forest placement loop is a REJECTION loop drawing from a shared rng.
//      Adding a groom stamp anywhere changes how many draws those loops take
//      and moves every tree, snag, outcrop and boulder in the world — including
//      the Red Dog pod's, whose placement hashes REPORT §17.3 publishes.
//      Nothing in ground.mjs, layout.mjs or terrain.mjs's stamp path is touched
//      by this file, so those hashes cannot move.
//   2. THE GRANITE. `granite.mjs` vetoes bluff candidates on `m.groom > 0.22`.
//      A groom stamp on this corridor would silently delete bluffs and re-roll
//      that stream too.
//   3. FIDELITY. `terrain-goldcoast` rides a 6.00 m grid and the corridor above
//      x = -3510 is off its clip entirely. A jump lip needs 0.25 m. A pad owns
//      its own lattice and can put the triangles exactly where the ride line is,
//      which is COMPOSING rule 17's whole point.
//
// The pad is FILL-ONLY: it never cuts below the natural 3DEP surface, because a
// cut would sink beneath the terrain mesh and disappear. Park crews push snow;
// they do not excavate the mountain. Every height in here is snow ON the hill.
//
// ------------------------------------------------------- WHY THE LIPS ARE CUT
//
// Measured, not guessed (see REPORT §19.3). The bench's ride controller pins the
// body to the ground every frame while grounded and only lets go when the
// surface falls away steeper than atan(snapMul) = 63.4 deg:
//
//     const snap = Math.max(T.snapDown, hypot(vel.x, vel.z) * dt * S.snapMul);
//     ... else if (gy !== null && wasGrounded && vel.y <= 0 && pos.y - gy <= snap)
//         { pos.y = gy; vel.y = 0; grounded = true; }        // stick to downhill
//
// So a beautifully transitioned 30 deg kicker does NOTHING on skis: the rider
// rides up it and is glued straight back down the other side. A ski leaves the
// ground only off a genuine EDGE. That is also what view-82 photographs — the
// takeoff wall rises to a crisp crest and the snow simply ENDS, with the gap and
// the landing beyond — so the sim's requirement and the evidence agree, and both
// say the same thing: build the lip as a lip.
//
// Every takeoff here is therefore: curved in-run transition -> straight kick ->
// a rounded 0.55 m crown -> a 74 deg back face into the gap. The crown sheds its
// slope over ~1.1 m, which is inside the <= 2-3 m the BIKE's crest detach needs
// (bike.js lipDetach), so the same geometry launches both gears for two
// different reasons.
//
// ------------------------------------------------------------- SHOULDER ANGLE
//
// Every side batter in this file is <= 40 deg. The controller's wall test rejects
// a face as ground at |ny| < 0.72, i.e. 43.9 deg, and the Joyride run's defect #2
// is exactly this: 51.8 deg shoulders meant "a rider who drifted a metre off the
// crown slammed into the side of the jump they were riding". 40 deg is the number
// that run settled on and it is the number used here.

import {
  buf, tri, quad, box, tube, plate, makeRng, rr, ri, pick,
  lin, mixc, clamp, lerp, smooth, fbm,
} from './lib/core.mjs';
import { LIFTS } from './layout.mjs';
import { groundZ } from './ground.mjs';
import { PAL } from './kit.mjs';

const rad = (d) => d * Math.PI / 180;
const TAN = (d) => Math.tan(rad(d));

// ============================================================ 1. THE SPINE
//
// Stationing `t` runs from 0 at the Gold Coast Express TOP terminal down the
// corridor to ~926 m at the base, which is the direction the lap is ridden
// (views 73 -> 79). The park's own centreline is the lift line carrying a
// lateral offset `v`: +v is the RIDER'S RIGHT looking down the corridor.
//
// The offset is not decoration. It is three pieces of evidence:
//   * view-84 (the park wide, mid-slope looking down): "the chairlift line at
//     LEFT with a small terminal building" — so the upper lanes sit RIGHT of the
//     line.
//   * view-81: "the Gold Coast Express chairs DIRECTLY OVERHEAD" — the lane
//     crosses under the line somewhere below that.
//   * view-89, THE PLACEMENT ANCHOR: at the foot of the park the "GOLD COAST
//     lodge ahead-left, the SNOWMAKING POND immediately right, park boundary
//     poles between them". So the lower lane threads LEFT of the pond.
// The DEM agrees about the pond without being asked: a dead-flat 535.90 m water
// plateau sits at t = 640..730, v = -28..+48, which is 244 m up-corridor from the
// GCX base — exactly where PARK.md §1 measures it in the 2025-10-21 aerial.
const GCX = LIFTS.find((L) => L.id === 'gold-coast-express');
const LINE = [...GCX.pts].reverse();          // top -> base

// lateral offset of the park spine from the lift line, [s, v] on the RAW line.
//
// THE CURVE IS SMOOTHED, AND THAT IS A CORRECTNESS REQUIREMENT, NOT A FINISH.
// A pad swept along a spine folds where the spine's turn radius drops below the
// pad's half-width: the outer lattice stretches, the inner lattice crosses over
// itself, and the collider reads the stacked triangles as a wall. That is the
// Joyride run's defect #1 verbatim — "a rider at 12.1 m/s was stopped dead to
// 4.3 m/s in 17 ms". The first cut of this file drove the offset with a chain of
// short smoothsteps and produced a 14.1 m minimum turn radius under a 44 m
// half-width; work/park_slope.mjs found it as near-vertical triangles in open
// snow. The knots below are therefore passed through a wide box blur and the
// resulting minimum radius is ASSERTED against the pad width at module load.
const VOFF = [
  [0, 16], [120, 20], [300, 22], [400, 20],
  [520, 0], [640, -44], [730, -52], [820, -34], [926, -14],
];

function buildSpine() {
  // arclength along the raw lift line
  const cum = [0];
  for (let i = 1; i < LINE.length; i++) {
    cum.push(cum[i - 1] + Math.hypot(LINE[i][0] - LINE[i - 1][0], LINE[i][1] - LINE[i - 1][1]));
  }
  const L = cum[cum.length - 1];
  const lineAt = (s) => {
    const q = clamp(s, 0, L);
    let i = 0;
    while (i < cum.length - 2 && cum[i + 1] < q) i++;
    const f = (q - cum[i]) / (cum[i + 1] - cum[i] || 1);
    const ax = LINE[i][0], ay = LINE[i][1], bx = LINE[i + 1][0], by = LINE[i + 1][1];
    const dl = Math.hypot(bx - ax, by - ay) || 1;
    return { x: lerp(ax, bx, f), y: lerp(ay, by, f), ux: (bx - ax) / dl, uy: (by - ay) / dl };
  };
  // piecewise-linear through the knots, then five passes of a +/-26 m box blur.
  // Blurring a polyline is what makes the result C2-ish: a smoothstep chain is
  // continuous in slope but its CURVATURE jumps at every knot, and curvature is
  // exactly what folds a swept lattice.
  const DS = 1.0, NB = Math.ceil(L / DS) + 1;
  const off = new Float32Array(NB);
  for (let i = 0; i < NB; i++) {
    const q = i * DS;
    let v = VOFF[VOFF.length - 1][1];
    if (q <= VOFF[0][0]) v = VOFF[0][1];
    else for (let k = 1; k < VOFF.length; k++) {
      if (q <= VOFF[k][0]) {
        const a = VOFF[k - 1], b = VOFF[k];
        v = lerp(a[1], b[1], (q - a[0]) / (b[0] - a[0]));
        break;
      }
    }
    off[i] = v;
  }
  const half = Math.round(26 / DS);
  let cur = off;
  for (let pass = 0; pass < 5; pass++) {
    const nx = new Float32Array(NB);
    for (let i = 0; i < NB; i++) {
      let acc = 0, w = 0;
      for (let k = -half; k <= half; k++) {
        acc += cur[clamp(i + k, 0, NB - 1)]; w++;
      }
      nx[i] = acc / w;
    }
    cur = nx;
  }
  const voffAt = (q) => {
    const f = clamp(q / DS, 0, NB - 1.001);
    const i = f | 0;
    return lerp(cur[i], cur[i + 1], f - i);
  };
  // sample the offset curve, then re-derive arclength and tangents ON IT, so
  // `t` is real distance along the ridden line and the frame never shears
  const P = [];
  for (let s = 0; s <= L + 0.001; s += 2) {
    const p = lineAt(s), v = voffAt(s);
    P.push([p.x + p.uy * v, p.y - p.ux * v]);
  }
  const c2 = [0];
  for (let i = 1; i < P.length; i++) {
    c2.push(c2[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
  }
  return { P, cum: c2, L: c2[c2.length - 1], lineAt, rawL: L };
}
const SPINE = buildSpine();
export const PARK_LEN = SPINE.L;

/** the spine's tightest turn, in metres. Must stay well above PAD_HW. */
export function minTurnRadius() {
  let mn = 1e9, at = 0;
  for (let t = 3; t < SPINE.L - 3; t += 1) {
    const a = atT(t - 1.5), b = atT(t + 1.5);
    let d = Math.atan2(b.uy, b.ux) - Math.atan2(a.uy, a.ux);
    while (d > Math.PI) d -= 2 * Math.PI;
    while (d < -Math.PI) d += 2 * Math.PI;
    const k = Math.abs(d) / 3;
    const R = k > 1e-9 ? 1 / k : 1e9;
    if (R < mn) { mn = R; at = t; }
  }
  return { R: mn, t: at };
}

/** frame at station t: position and the unit vectors along (u) and right (w). */
export function atT(t) {
  const q = clamp(t, 0, SPINE.L);
  const C = SPINE.cum;
  let i = 0;
  while (i < C.length - 2 && C[i + 1] < q) i++;
  const f = (q - C[i]) / (C[i + 1] - C[i] || 1);
  const a = SPINE.P[i], b = SPINE.P[i + 1];
  const dl = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  const ux = (b[0] - a[0]) / dl, uy = (b[1] - a[1]) / dl;
  return { x: lerp(a[0], b[0], f), y: lerp(a[1], b[1], f), ux, uy, wx: uy, wy: -ux };
}

/** lane (t, v) -> world (x, y). +v is the rider's right. */
export const toWorld = (t, v) => {
  const p = atT(t);
  return [p.x + p.wx * v, p.y + p.wy * v];
};

/** world (x, y) -> { t, v } by nearest point on the spine polyline. */
export function toLane(x, y) {
  let bt = 0, bv = 0, bd = 1e9;
  const P = SPINE.P, C = SPINE.cum;
  for (let i = 0; i < P.length - 1; i++) {
    const ax = P[i][0], ay = P[i][1];
    const dx = P[i + 1][0] - ax, dy = P[i + 1][1] - ay;
    const l2 = dx * dx + dy * dy || 1e-9;
    const f = clamp(((x - ax) * dx + (y - ay) * dy) / l2, 0, 1);
    const qx = ax + dx * f, qy = ay + dy * f;
    const d = Math.hypot(x - qx, y - qy);
    if (d < bd) {
      bd = d;
      bt = C[i] + (C[i + 1] - C[i]) * f;
      const dl = Math.hypot(dx, dy) || 1;
      bv = ((x - qx) * (dy / dl) + (y - qy) * (-dx / dl));
    }
  }
  return { t: bt, v: bv, d: bd };
}

// ==================================================== 2. THE LANE SURFACE
//
// `PROF[i]` is the park's own longitudinal profile: the natural 3DEP ground
// under the spine, box-blurred over +/-13 m. Blurring is what a winch cat does to
// a lane; taking `max(natural, blurred)` afterwards is what keeps it FILL-ONLY.
const PROF_DT = 1.0;
const PROF_N = Math.ceil(SPINE.L / PROF_DT) + 1;
const PROF = new Float32Array(PROF_N);        // blurred centreline z
const CROSS = new Float32Array(PROF_N);       // natural cross-slope, dz/dv
{
  const raw = new Float32Array(PROF_N);
  for (let i = 0; i < PROF_N; i++) {
    const [x, y] = toWorld(i * PROF_DT, 0);
    raw[i] = groundZ(x, y);
  }
  const W = 13;                                // metres of blur half-window
  const n = Math.round(W / PROF_DT);
  for (let i = 0; i < PROF_N; i++) {
    let s = 0, w = 0;
    for (let k = -n; k <= n; k++) {
      const j = clamp(i + k, 0, PROF_N - 1);
      const g = 1 - Math.abs(k) / (n + 1);
      s += raw[j] * g; w += g;
    }
    PROF[i] = s / w;
  }
  for (let i = 0; i < PROF_N; i++) {
    const t = i * PROF_DT;
    const [ax, ay] = toWorld(t, -26), [bx, by] = toWorld(t, 26);
    CROSS[i] = (groundZ(bx, by) - groundZ(ax, ay)) / 52;
  }
}
const profZ = (t) => {
  const f = clamp(t / PROF_DT, 0, PROF_N - 1.001);
  const i = f | 0;
  return lerp(PROF[i], PROF[i + 1], f - i);
};
const crossAt = (t) => {
  const f = clamp(t / PROF_DT, 0, PROF_N - 1.001);
  const i = f | 0;
  return lerp(CROSS[i], CROSS[i + 1], f - i);
};
/** lane pitch in degrees at t — used to size the features to the hill. */
export const pitchAt = (t) => Math.atan2(profZ(Math.max(0, t - 6)) - profZ(t + 6), 12) * 180 / Math.PI;

// The pad's half-width, and where it is switched off entirely.
//   * the SNOWMAKING POND, t 632..742, v -34..+54 — measured off the DEM's own
//     dead-flat 535.90 m water plateau, widened by a 6 m boundary margin. The
//     real park keeps riders off it with boundary poles (view-89) and so does
//     this one.
//   * the two lift stations: nothing is built inside the Gold Coast Express
//     UNLOAD flat at the top or its LOAD apron at the base, because the world
//     already put a lifthouse, a queue corral and a ski rack there and REPORT
//     §18.1 measured the walk-up at 8/8 standing on that ground.
const PAD_HW = 38;                               // metres each side of the spine
const POND = { t0: 626, t1: 748, v0: -36, v1: 60 };

function padMask(t, v) {
  // longitudinal ends: fade in below the unload flat, fade out at the plaza foot
  let m = smooth(30, 52, t) * (1 - smooth(902, 924, t));
  // lateral rim
  const a = Math.abs(v);
  m *= 1 - smooth(PAD_HW - 11, PAD_HW - 1, a);
  // the pond, plus its boundary margin
  if (t > POND.t0 - 44 && t < POND.t1 + 44) {
    const [x, y] = toWorld(t, v);
    const L = toLaneRawPond(x, y);
    const din = Math.min(
      Math.min(L.t - POND.t0, POND.t1 - L.t),
      Math.min(L.v - POND.v0, POND.v1 - L.v),
    );
    // the fade starts just 5 m outside the box, not 14: the box already carries
    // 6-14 m of margin over the measured water, and a 14 m outward fade sank the
    // RIDE LINE by up to 0.48 m at t = 628-644 (work/park_probe.mjs)
    m *= 1 - smooth(-5, 3, din);
  }
  return clamp(m, 0, 1);
}
// the pond box is expressed against the RAW lift line, not the offset spine,
// because that is the frame it was measured in
function toLaneRawPond(x, y) {
  const C = SPINE.cum;
  let bt = 0, bv = 0, bd = 1e9;
  for (let s = POND.t0 - 40; s <= POND.t1 + 40; s += 4) {
    const p = SPINE.lineAt(s);
    const d = Math.hypot(x - p.x, y - p.y);
    if (d < bd) { bd = d; bt = s; bv = (x - p.x) * p.uy + (y - p.y) * (-p.ux); }
  }
  return { t: bt, v: bv };
}

export const padMaskAt = padMask;

const MINFILL = 0.62;     // the pushed-snow floor: the lane always stands proud
const MAXFILL = 3.60;     // how much a crew will fill a hollow before riding it

/** world z of the graded lane (no features) at lane coords. */
export function laneZ(t, v) {
  const [x, y] = toWorld(t, v);
  const g = groundZ(x, y);
  const target = profZ(t) + crossAt(t) * v * 0.34;   // keep 34% of the cross-slope
  const raw = target - g;
  const fill = raw > 0 ? MAXFILL * (1 - Math.exp(-raw / MAXFILL)) : 0;
  return g + MINFILL + fill;
}

// ==================================================== 3. FEATURE PRIMITIVES

/** a flat-topped shape: crown of half-width `hw` at height `h`, battered sides.
 *
 * THE BATTER ANGLE IS PER-FEATURE, and the reason is a corner. The controller's
 * wall test measures the ABSOLUTE slope of the triangle it hits, and where a
 * ramp pitched at A meets a side batter pitched at B the corner triangle is
 * steeper than either: atan(sqrt(tan^2 A + tan^2 B)). A 41 deg hip face with
 * 40 deg batters makes a 50.4 deg corner — a wall, on the shoulder of the
 * feature the rider is trying to ride, which is exactly the Joyride run's
 * defect #2. So a steep face gets a SHALLOW batter, and the corner is what is
 * held under 43 deg rather than either face on its own. Audited in
 * work/park_slope.mjs; every value below is the one that audit passed. */
const SIDE_DEFAULT = TAN(34);
const JUMP_SIDE = TAN(30);      // ramps at 26-33 deg -> corners at 40-43 deg
const HIP_SIDE  = TAN(24);      // a 37 deg face needs a 24 deg batter to stay under 43
function crownCut(h, v, vc, hw, side = SIDE_DEFAULT) {
  if (h <= 0) return 0;
  const d = Math.abs(v - vc) - hw;
  if (d <= 0) return h;
  // round the shoulder over 0.9 m so it is a sculpted edge, not a knife
  const c = d * side;
  const r = 0.9 * side;
  const k = c < r ? c * c / (2 * r) : c - r / 2;
  return Math.max(0, h - k);
}

/** cubic Hermite: value at f in [0,1] given endpoint values and tangents. */
function hermite(f, p0, p1, m0, m1) {
  const f2 = f * f, f3 = f2 * f;
  return (2 * f3 - 3 * f2 + 1) * p0 + (f3 - 2 * f2 + f) * m0
       + (-2 * f3 + 3 * f2) * p1 + (f3 - f2) * m1;
}

// ==================================================== 4. THE FEATURE LEDGER
//
// STATIONING IS INFERRED, AND CONSTRAINED. PARK.md escalation 3 is explicit:
// "Ride ORDER is proven; metres-along-the-line is not. Do not fabricate
// stationing." So the order below is the evidence (views 73 -> 79 for the lap,
// plus the rails/jumps interleave the 03:30-04:18 laps prove) and the SPACING is
// taken from a physical constraint rather than invented: the Gold Coast Express
// carries NINE towers on this line, evenly spaced at 87.1 m, and a cat cannot
// build a 70 m jump through a tower footing. The nine bays between them are what
// sets each feature's station. Tower stations from the top: 113, 201, 288, 376,
// 463, 551, 638, 725, 813 m.
//
// SIZES. There is no published 2025-26 dimension for any jump (PARK.md §5), so
// every number here is a labelled proxy:
//   * the ladder ENDS on 65 ft, the only XL figure ever published for this exact
//     park (blog 2023-05-06, and SAM's April-2025 SuperUnknown build on the same
//     corridor), and steps down in the 10 ft interval the resort's own 2023
//     three-jump series used ("25 ft / 35 ft / 45 ft", blog 2023-01-27).
//   * the HIP is 30 ft tall x 25 ft wide x 50 ft long — the MARCH 2025 build,
//     SAM Nov 2025. Labelled, not presented as a 2025-26 measurement.
//   * the WALL RIDE is 12 x 16 ft — April 2025, SAM. Same caveat, and its zone
//     is only PROBABLE (view-91).
// The BUILT lip-to-knuckle gaps are shorter than the nominal ft figures and that
// is deliberate and measured: see REPORT §19.4. A ski launches FLAT here (no
// pop), so range = v * sqrt(2h/16), and a nominal 65 ft gap off a reachable
// 20 m/s in-run puts the rider on the knuckle rather than the landing. The
// features are built at their full nominal MASS — takeoff height, landing length,
// footprint — and the gaps are set to what the ride actually clears.

// `gap` is the BUILT lip-to-knuckle distance and it is shorter than the nominal
// ft figure. That is a measured decision, not a compromise made quietly:
// a ski leaves this engine's lip FLAT (no pop is applied by the surface), so the
// flight is a pure projectile under g = 16 m/s^2 and drops 8*(G/v)^2 metres over
// a gap G at speed v. Clearing the knuckle therefore needs
//        lipH - deckH  >=  8 * (gap / v)^2
// and the gaps below are solved for the in-run speed each jump actually
// delivers (measured on the bench, REPORT §19.5), so a rider who never touches
// SPACE still lands past the knuckle. Popping at the lip adds 4.5 m/s of
// vertical and sends the same rider deep into the landing, which is the right
// relationship between input and reward.
const JUMPS = [
  { id: 'jump-1', name: 'JUMP 1', nominalFt: 45, t0: 122,
    inrun: 22, kick: 16.0, lipA: 26, lipH: 5.4, gap: 10.5,
    deckH: 2.2, landA: 31, hwLip: 5.6, hwLand: 9.5, vc: 1 },
  { id: 'jump-2', name: 'JUMP 2', nominalFt: 55, t0: 208,
    inrun: 23, kick: 17.0, lipA: 27, lipH: 6.4, gap: 12.0,
    deckH: 2.6, landA: 32, hwLip: 6.1, hwLand: 10.5, vc: 0 },
  { id: 'jump-3', name: 'JUMP 3', nominalFt: 65, t0: 294,
    inrun: 25, kick: 18.5, lipA: 28, lipH: 7.4, gap: 13.5,
    deckH: 3.0, landA: 33, hwLip: 6.6, hwLand: 11.5, vc: -1 },
];

// station bookkeeping for each jump
for (const J of JUMPS) {
  J.tKickStart = J.t0 + J.inrun;               // in-run -> the transition begins
  J.tLip = J.tKickStart + J.kick;              // the crest
  // THE BACK FACE FALLS ONTO A DECK, NOT INTO A PIT — and this is the shape the
  // evidence asked for all along. PARK.md's jump-profile row reads "steep
  // takeoff wall, FLAT DECK, defined knuckle, straight landing", built from
  // view-82, and that is a TABLETOP.
  //
  // The first cut built a bare gap instead: the 74 deg back face ran all the way
  // down to the lane, the natural lane ran on, and a wedge rose to the knuckle.
  // It rides beautifully when you clear it and it is a TRAP when you do not — a
  // V with a 74 deg wall behind and a rising face in front. A skier who lands in
  // it wipes out, scrubs to 30 % of speed, cannot climb out, and is finished.
  // work/park_ride.mjs found exactly that, three runs running: cleared jump 2's
  // lip at 21.7-22.6 m/s and then sat at 0.1 m/s for the remaining 355 m of the
  // park. The instrumented run pinned it to lane t = 249.0, v = -1.0 — jump 2's
  // lip is at t = 248.0 and the foot of its back face at t = 249.6, so the rider
  // was stopped in the bottom of the V. There was no respawn and no error to say
  // so; a silent trap is the worst thing a playable world can ship, and no
  // amount of shoulder-angle tuning removes it, because the trap is the SHAPE.
  //
  // A deck fixes it the way a real tabletop does. The lip still ends in a 74 deg
  // edge — far past the controller's 63.4 deg snap, so a ski still launches —
  // but that edge now drops onto a flat deck `deckH` above the lane instead of
  // into a hole. Come up short and you land on the deck and ride on; carry speed
  // and you fly the deck and land on the wall past the knuckle. There is nowhere
  // on the feature that can hold a rider.
  J.backDrop = J.lipH - J.deckH;
  J.tBack = J.tLip + 0.55 + J.backDrop / TAN(74);
  J.tKnuck = J.tLip + J.gap;                   // the knuckle: the deck's edge
  const lam = TAN(Math.max(6, pitchAt(J.tKnuck)));
  // the landing: a single eased curve whose slope AT the knuckle is exactly
  // (tan(landA) - tan(lane)) and which runs out tangent to the lane. One curve,
  // so there is no crease between "the landing" and "the runout" — which is what
  // a cat operator's blade actually leaves.
  J.landRate = Math.max(0.12, TAN(J.landA) - lam);
  J.landLen = 2.4 * J.deckH / J.landRate;
  J.tEnd = J.tKnuck + 1.6 + J.landLen;
}

/** height of a jump above the lane at (t, v). Always >= 0: fill-only. */
function jumpH(J, t, v) {
  if (t < J.tKickStart - 1 || t > J.tEnd + 1) return 0;
  let h = 0, hw = J.hwLip;

  if (t < J.tLip) {
    // ---- THE TAKEOFF WALL. A curved scoop out of the lane into a straight
    // kick, which is how a cat operator actually cuts one: a radius transition
    // and then a constant-angle wall to the lip. Never 2-3 flat facets.
    const kickTan = TAN(J.lipA);
    const fStr = 0.34;                          // straight kick = last 34%
    const tStr = J.tKickStart + J.kick * (1 - fStr);
    const zLip = laneZ(J.tLip, J.vc) + J.lipH;
    const zStr = zLip - (J.tLip - tStr) * kickTan;
    if (t >= tStr) {
      h = (zLip - (J.tLip - t) * kickTan) - laneZ(t, J.vc);
    } else {
      // Hermite from the lane (tangent = the lane's own slope, so the ramp
      // grows out of the snow with no step to catch an edge on) to the kick
      const span = J.kick * (1 - fStr);
      const f = (t - J.tKickStart) / span;
      const z0 = laneZ(J.tKickStart, J.vc);
      const m0 = -TAN(pitchAt(J.tKickStart)) * span;
      const m1 = kickTan * span;
      h = hermite(f, z0, zStr, m0, m1) - laneZ(t, J.vc);
    }
    // the ramp is wider at its foot and narrows to the lip — view-82's taper
    const fw = clamp((t - J.tKickStart) / (J.tLip - J.tKickStart), 0, 1);
    hw = lerp(J.hwLip + 4.2, J.hwLip, fw * fw);
  } else if (t < J.tBack) {
    // ---- THE LIP: a 0.55 m rounded crown, then a 74 deg back face. The crown
    // sheds its slope over ~1.1 m, inside the <= 2-3 m the bike's crest detach
    // needs; the back face is far past the ski controller's 63.4 deg snap, so
    // this one edge is what launches both gears, for two different reasons.
    const zLip = laneZ(J.tLip, J.vc) + J.lipH;
    const d = t - J.tLip;
    const R = 0.55;
    const z = d < R ? zLip - (R - Math.sqrt(Math.max(0, R * R - d * d)))
                    : zLip - R - (d - R) * TAN(74);
    h = Math.max(J.deckH, z - laneZ(t, J.vc));
    hw = J.hwLip;
  } else if (t < J.tKnuck) {
    // ---- THE DECK. Flat, and "flat" means parallel to the lane rather than
    // level, so the height a rider has to clear does not grow across the gap.
    h = J.deckH;
    hw = lerp(J.hwLip + 0.6, J.hwLand * 0.9,
              clamp((t - J.tBack) / Math.max(1, J.tKnuck - J.tBack), 0, 1));
  } else {
    // ---- THE KNUCKLE CROWN AND THE LANDING. A 1.6 m radius rolls the crown
    // over into the landing, which is one eased curve from there back to the
    // lane. The knuckle is a defined EDGE you can see from the in-run, which is
    // what COMPOSING rule 17 asks a landing to have.
    const d = t - J.tKnuck;
    const R = 1.6;
    if (d < R) {
      const f = d / R;
      h = J.deckH - (1 - Math.sqrt(Math.max(0, 1 - f * f))) * R * J.landRate;
    } else {
      const dd = clamp((d - R) / J.landLen, 0, 1);
      const hK = J.deckH - (R * J.landRate) * 0.35;
      h = hK * (1 - dd) ** 2.4;
    }
    const fw = clamp(d / 12, 0, 1);
    hw = lerp(J.hwLand * 0.85, J.hwLand, smooth(0, 1, fw));
  }
  if (h <= 0) return 0;
  return crownCut(h, v, J.vc, hw, JUMP_SIDE);
}

// ------------------------------------------------------------ THE DROP-IN
// view-74: "the drop-in roller, a lift tower dead ahead and a bare dirt-and-rock
// shoulder immediately right of the lane". Tower 9 stands at t = 113, which is
// exactly where that frame puts it, so the roller is the bay above it.
const ROLLER = { t0: 62, tCrest: 84, t1: 108, h: 2.35, hw: 15, vc: 4 };
function rollerH(t, v) {
  if (t < ROLLER.t0 || t > ROLLER.t1) return 0;
  // a rounded roller: rise, crest, and a 24 deg backside that hands the rider
  // speed into jump 1. Deliberately shallower than the snap threshold — this is
  // a speed generator, not a jump.
  let h;
  if (t < ROLLER.tCrest) {
    const f = (t - ROLLER.t0) / (ROLLER.tCrest - ROLLER.t0);
    h = ROLLER.h * smooth(0, 1, f);
  } else {
    const f = (t - ROLLER.tCrest) / (ROLLER.t1 - ROLLER.tCrest);
    h = ROLLER.h * (1 - smooth(0, 1, f));
  }
  return crownCut(h, v, ROLLER.vc, ROLLER.hw);
}

// ------------------------------------------------------- THE GOLD COAST HIP
//
// view-77 and blog 2026-03-06. NOT a fourth jump: Ski Area Management on this
// exact feature — "To control speed before the rail section of the Gold Coast
// terrain park, the Palisades Tahoe crew built a massive hip that pointed riders
// toward the drop-in for a popular S-rail." So it is a speed brake and a
// REDIRECT, and it is built here as one: its axis is yawed 34 deg to the rider's
// LEFT, its landing throws you at the tube rail in the next bay, and the lane's
// own offset curve swings 40 m left across the same 80 m. The lift line crosses
// overhead here, which is view-81's frame and SAM's "crowd-pleaser under the
// Gold Coast chair".
//
// Dimensions are the March-2025 proxy: 30 ft tall (9.14 m), 25 ft wide (7.62 m
// crest), 50 ft long (15.24 m of takeoff face). view-77 scales against a rider
// standing on the crest and agrees in kind.
const HIP = {
  tc: 512,                     // station of the crest
  yaw: -24,                    // degrees, rotated toward the rider's left
  vc: 6,                       // the crest sits 6 m right of the ride line, so
                               // the lane runs ONTO the face rather than past it
  H: 9.14,                     // 30 ft — the March-2025 proxy, SAM Nov 2025
  Wc: 7.62,                    // 25 ft crest width, same proxy
  ridge: 15.24,                // 50 ft — read as the CREST RIDGE, see below
  faceA: 37, landA: 34,
  lipDrop: 3.20,               // the sharp step off the crest
};
// THE FACE IS LONGER THAN THE 50 ft PROXY, and that is a correction the engine
// forced and the geometry justifies. SAM's "30 ft tall x 25 ft wide x 50 ft
// long" cannot all three be a takeoff face: 9.14 m of rise over 15.24 m is a
// 31 deg mean, and a transition eased out of the snow at both ends peaks at
// ~1.5x its mean — 46 deg, on top of the hill's own 17 deg. That is 52 deg
// absolute, and the controller reads anything over 43.9 deg as a WALL and
// bounces the rider off the feature they are trying to ride. So the 50 ft is
// carried as the crest RIDGE length, which is what view-77's long corduroyed
// crest actually shows, and the face is sized from the angle instead:
//   faceLen = 1.5 * H / (tan(37 deg) - tan(lane))
// The mound is the documented 30 ft tall and 25 ft wide across the crest. The
// face length is derived, and is listed as derived in REPORT §19.2.
HIP.lanePitch = 0;             // filled in below, once pitchAt() exists

// Derived, not chosen: every hip rate is expressed ABSOLUTE (against horizontal)
// and then converted to a rate relative to the lane, because the lane is already
// descending under the feature and it is the ABSOLUTE angle the controller's
// wall test measures.
{
  const lam = TAN(Math.max(6, pitchAt(HIP.tc)));
  HIP.lanePitch = pitchAt(HIP.tc);
  HIP.faceRate = Math.max(0.18, TAN(HIP.faceA) - lam);
  HIP.faceLen = 1.5 * HIP.H / HIP.faceRate;
  HIP.landRate = Math.max(0.15, TAN(HIP.landA) - lam);
  HIP.stepRate = TAN(76) - lam;
  HIP.landLen = HIP.H / HIP.landRate;
}

function hipLocal(t, v) {
  // rotate into the hip's own frame: p along its fall line, q across the crest
  const c = Math.cos(rad(HIP.yaw)), s = Math.sin(rad(HIP.yaw));
  const dt = t - HIP.tc, dv = v - HIP.vc;
  return { p: dt * c - dv * s, q: dt * s + dv * c };
}
function hipH(t, v) {
  if (t < HIP.tc - HIP.faceLen - 40 || t > HIP.tc + 70) return 0;
  const { p, q } = hipLocal(t, v);
  let h;
  if (p < -HIP.faceLen) {
    return 0;
  } else if (p < 0) {
    // ---- THE FACE. A quarterpipe-ish transition, tangent to the lane at the
    // foot and steepening to 41 deg just under the crest. Corduroy runs straight
    // up this face in view-77, and it is one continuous eased curve — never the
    // 2-3 flat facets COMPOSING rule 17 is about.
    const f = (p + HIP.faceLen) / HIP.faceLen;
    h = HIP.H * (f * f * (3 - 2 * f));
  } else {
    // ---- THE CREST LIP AND THE LANDING, swept down and away to the left.
    // A hip is ridden, not cleared — SAM calls this one a speed brake — but a
    // hip crest is still a LIP and riders air off it, which is what view-77's
    // rider standing on the crest is doing. So the crest carries a 0.35 m crown
    // and then a 1.45 m step at 68 deg before the landing wall opens out. That
    // step is past the controller's 63.4 deg snap, so the hip launches a ski;
    // everything after it is a 34 deg landing that catches one.
    // THE STEP IS TAPERED ACROSS THE CREST. It is sharp on the ridge, where the
    // rider takes off, and rounds away toward the flanks — which is what a
    // 20-foot vert scraper leaves on a hip, and which also keeps the flank
    // triangles off the controller's 43.9 deg wall threshold. A step that ran
    // the full width put 273 triangles at up to 70 deg on ground a rider drifts
    // across sideways.
    // THE TAPER HOLDS FULL DEPTH ACROSS THE RIDEABLE CREST, and that width is
    // measured rather than chosen. The first cut tapered from 0.30*Wc, so a
    // rider crossing 4 m off the crest centre — which is where work/park_ride.mjs
    // actually crossed, at lane v = 2 — met a step of only 1.70 m. Over one
    // 0.44 m frame at 12 m/s that is a 0.88 m drop against a 0.89 m snap
    // (snap = max(snapDown 0.45, speed * dt * snapMul)), and the hip returned
    // ZERO airborne frames while looking, in every render, exactly like a hip.
    // Full depth now runs to 1.05*Wc and the step is 3.20 m at 76 deg, which
    // measures 1.72-1.81 m of drop per frame across the whole rideable crest
    // against a 1.07 m snap — a 1.6x margin instead of a 0.99x one.
    const drop = HIP.lipDrop * (1 - smooth(HIP.Wc * 1.05, HIP.Wc * 2.25, Math.abs(q)));
    const R = 0.35;
    if (p < R) {
      h = HIP.H - (R - Math.sqrt(Math.max(0, R * R - p * p)));
    } else {
      const dStep = Math.max(0.05, drop / HIP.stepRate);
      const d = p - R;
      h = d < dStep
        ? HIP.H - R - d * HIP.stepRate
        : HIP.H - R - drop - (d - dStep) * HIP.landRate;
    }
    if (h <= 0) return 0;
  }
  if (h <= 0) return 0;
  // across the crest: a flat ridge of half-width Wc/2 widening down the landing
  const hw = p < 0
    ? lerp(HIP.Wc / 2 + HIP.ridge * 0.62, HIP.Wc / 2, clamp((p + HIP.faceLen) / HIP.faceLen, 0, 1) ** 0.8)
    : HIP.Wc / 2 + 9 * clamp(p / 18, 0, 1);
  return crownCut(h, q, 0, hw, HIP_SIDE);
}

// ------------------------------------------------ SNOW DECKS FOR THE JIBS
//
// "orange kinked flat bar on a SNOW DECK" (view-83), "a long orange rail on a
// SNOW DECK" (view-90, corroborated in spring by view-93). A jib deck is a
// raised, flat, battered pad the rail is set into; the rider rides up onto the
// deck, along the feature and off the end.
//
// EVERY DECK IS >= 0.95 m HIGH AND HAS A <= 22 deg LEAD-IN RAMP. That is a
// measured constraint, not a style choice: the controller step-ups anything
// within 0.55 m of the feet for free, ignores its vertical sides on a downward
// ray, and treats a face over 43.9 deg as a wall — so a deck between 0.55 and
// 0.67 m tall is a GHOST the player walks through. Nothing here is in that band.
const DECKS = [
  // t0, t1 = the flat top; lead/tail = ramp lengths; vc, hw, h
  { id: 'deck-box-1', t0: 176, t1: 196, lead: 9, tail: 7, vc: -19, hw: 5.0, h: 1.05 },
  { id: 'deck-flatbar', t0: 262, t1: 282, lead: 9, tail: 7, vc: 20, hw: 4.6, h: 1.10 },
  { id: 'deck-floor', t0: 392, t1: 424, lead: 11, tail: 9, vc: -14, hw: 8.5, h: 1.15 },
  { id: 'deck-striped', t0: 424, t1: 448, lead: 8, tail: 8, vc: 16, hw: 4.4, h: 1.00 },
  { id: 'deck-tube', t0: 572, t1: 600, lead: 11, tail: 9, vc: -6, hw: 5.4, h: 1.25 },
  { id: 'deck-wall', t0: 656, t1: 682, lead: 12, tail: 9, vc: -16, hw: 11.5, h: 1.10 },
  { id: 'deck-lower', t0: 786, t1: 814, lead: 10, tail: 9, vc: -8, hw: 5.2, h: 1.15 },
];
function deckH(D, t, v) {
  const a = D.t0 - D.lead, b = D.t1 + D.tail;
  if (t < a || t > b) return 0;
  let h;
  if (t < D.t0) h = D.h * smooth(a, D.t0, t);
  else if (t <= D.t1) h = D.h;
  else h = D.h * (1 - smooth(D.t1, b, t));
  return crownCut(h, v, D.vc, D.hw);
}

// --------------------------------------------------------- THE BASE PLAZA
// view-79: "the park run-out into the base plaza — orange SLOW banner fencing, a
// small operator structure, spectators and a lift beyond. Where the lane rejoins
// public snow."
const PLAZA = { t0: 826, t1: 900, hw: 30, vc: -20 };
function plazaH(t, v) {
  if (t < PLAZA.t0 - 14 || t > PLAZA.t1 + 6) return 0;
  const h = 0.42 * smooth(PLAZA.t0 - 14, PLAZA.t0 + 6, t) * (1 - smooth(PLAZA.t1 - 10, PLAZA.t1 + 6, t));
  return crownCut(h, v, PLAZA.vc, PLAZA.hw);
}

// ------------------------------------------------------- THE WHOLE SURFACE
/** total built height above the graded lane at lane coords. */
export function featureH(t, v) {
  let h = rollerH(t, v) + hipH(t, v) + plazaH(t, v);
  for (const J of JUMPS) h += jumpH(J, t, v);
  for (const D of DECKS) h += deckH(D, t, v);
  return h;
}

/** the park's finished world z at lane coords, and its mask. */
export function parkZ(t, v) {
  const m = padMask(t, v);
  if (m <= 0.001) {
    const [x, y] = toWorld(t, v);
    return groundZ(x, y) - 0.55;
  }
  const base = laneZ(t, v);
  const [x, y] = toWorld(t, v);
  const g = groundZ(x, y);
  const lane = lerp(g - 0.55, base, m);
  return lane + featureH(t, v) * m;
}

/** world (x,y) -> park surface z, or null if outside the pad. Props use this. */
export function parkSurfaceZ(x, y) {
  const L = toLane(x, y);
  if (L.t < 24 || L.t > SPINE.L - 12 || Math.abs(L.v) > PAD_HW - 2) return null;
  if (padMask(L.t, L.v) < 0.35) return null;
  return parkZ(L.t, L.v);
}

// ==================================================== 5. THE TREE CLEARANCE
//
// COMPOSING rule 15 and PARK.md §6 both insist on it: "MATURE PINES STANDING
// INSIDE THE LANES" (view-80, view-84, view-93) — "the park is threaded around
// live trees, not laid on a clear pad". So this veto is deliberately NARROW: it
// clears the ride line and the built features and NOTHING else, and the pines on
// the shoulders inside the park envelope are left exactly where the aerial's
// canopy raster put them.
//
// It is applied POST-DRAW in forest.mjs's `keep()`, never inside a placement
// loop — REPORT §17.3's rule. Filtering the finished arrays cannot move a single
// front-side tree; widening `forestDensity()` would have moved all 25,990.
const VETO_BOX = { x0: -3830, x1: -2850, y0: -560, y1: -230 };
export function parkVeto(x, y) {
  if (x < VETO_BOX.x0 || x > VETO_BOX.x1 || y < VETO_BOX.y0 || y > VETO_BOX.y1) return false;
  const L = toLane(x, y);
  if (L.t < 18 || L.t > SPINE.L - 4) return false;
  // the ride line itself
  if (Math.abs(L.v) < 25) return true;
  // and anything standing on a built feature
  return featureH(L.t, L.v) > 0.25;
}

// ==================================================== 6. MESHING THE SURFACE
//
// A non-uniform lattice. Density is spent where COMPOSING rule 17 says to spend
// it — lips, crowns, knuckles and the hip crest at 0.25-0.35 m, ramps at 0.8 m,
// plain lane at 3.2 m — so a lip is a sculpted edge with a dozen samples through
// it rather than the two flat facets Greg's "they don't look like ramps" verdict
// was about.
function stationList() {
  const zones = [];
  const add = (a, b, d) => zones.push([a, b, d]);
  for (const J of JUMPS) {
    add(J.tKickStart - 2, J.tLip - 2.6, 0.65);    // the sculpted transition
    add(J.tLip - 2.6, J.tBack + 0.6, 0.22);       // the crown and the back face
    add(J.tBack, J.tKnuck - 1.5, 1.4);            // the deck
    add(J.tKnuck - 1.5, J.tKnuck + 3.0, 0.26);    // the knuckle
    add(J.tKnuck + 3.0, J.tEnd + 2, 1.1);         // the landing
  }
  add(ROLLER.t0 - 2, ROLLER.t1 + 2, 1.6);
  add(HIP.tc - HIP.faceLen - 30, HIP.tc + 66, 1.7);
  add(HIP.tc - HIP.faceLen, HIP.tc - 8, 0.9);     // the face's sculpted transition
  add(HIP.tc - 8, HIP.tc + 9, 0.20);              // the hip crest and its lip
  for (const D of DECKS) {
    // a deck is a FLAT pad: its body needs no density, its four edges do
    add(D.t0 - D.lead - 2, D.t1 + D.tail + 2, 2.4);
    add(D.t0 - D.lead - 1, D.t0 - D.lead + 2, 0.6);
    add(D.t0 - 2.0, D.t0 + 2.0, 0.34);            // the deck's leading edge
    add(D.t1 - 2.0, D.t1 + 2.0, 0.34);
    add(D.t1 + D.tail - 2, D.t1 + D.tail + 1, 0.6);
  }
  add(PLAZA.t0 - 16, PLAZA.t1 + 8, 3.4);

  const stepAt = (t) => {
    let d = 4.0;
    for (const z of zones) if (t >= z[0] && t <= z[1]) d = Math.min(d, z[2]);
    return d;
  };
  const out = [0];
  let t = 0;
  while (t < SPINE.L) {
    t = Math.min(t + stepAt(t), SPINE.L);
    // never emit a row closer than 12 cm to the last one: a sliver row is two
    // near-degenerate triangles per lateral column and buys no shape
    if (t - out[out.length - 1] < 0.12) { if (t >= SPINE.L) break; continue; }
    out.push(t);
  }
  if (out[out.length - 1] < SPINE.L - 1e-6) out.push(SPINE.L);
  return out;
}

function lateralList() {
  // Graded: coarse on the outer shoulders, fine across the whole feature band.
  // Built by integer index rather than by accumulating a float, because
  // -44 + 5*3.4 evaluates to -27.000000000000004, which slipped past a `< -27`
  // guard and duplicated the -27 column — 1,974 zero-area triangles that the
  // slope audit could not tell from vertical walls.
  const out = [];
  const push = (v) => { if (!out.length || v - out[out.length - 1] > 0.2) out.push(v); };
  for (let i = 0; i <= 3; i++) push(-PAD_HW + i * 3.7);
  for (let i = 0; i <= 39; i++) push(-25.5 + i * 1.45);
  for (let i = 1; i <= 2; i++) push(31.05 + i * 3.5);
  return out;
}

// snow colour. The photographs are a groomed park in flat winter light: a
// blue-white body, warmer where the sun catches a face, and the tiller passes
// visible as broad bands. Fine corduroy is 8 cm and cannot survive this lattice,
// so what is modelled is the thing that IS resolvable — the ~4.4 m tiller pass —
// plus a scoured tone on the shoulders where mid-January cover is thin (view-74,
// view-86: "bare dirt and rock immediately beside the groomed lane").
const SNOW_HI = lin(0xf4f8ff);
const SNOW_MID = lin(0xdfe9f7);
const SNOW_LO = lin(0xbfd0e6);
const SNOW_SHOULDER = lin(0xa8b4bc);
function snowColour(t, v, h, slope) {
  // tiller passes run down the fall line, so they band across v
  const band = Math.sin(v / 4.4 * Math.PI) * 0.5 + 0.5;
  let c = mixc(SNOW_MID, SNOW_HI, band * 0.55);
  // built features are fresh pushed snow and read brighter and cooler
  c = mixc(c, SNOW_HI, clamp(h / 6, 0, 1) * 0.35);
  // scoops and the undersides of walls take the ambient and go blue
  c = mixc(c, SNOW_LO, clamp(slope / 42, 0, 1) * 0.55);
  // the shoulders thin out into scoured cover
  const edge = smooth(PAD_HW - 17, PAD_HW - 5, Math.abs(v));
  c = mixc(c, SNOW_SHOULDER, edge * 0.5 * (1 - clamp(h, 0, 1)));
  // and a little slow noise so it is not a flat wash
  const [x, y] = toWorld(t, v);
  const n = fbm(x * 0.035, y * 0.035, 2, 2.1, 0.5, 61);
  return mixc(c, SNOW_LO, clamp(n * 0.5 + 0.25, 0, 1) * 0.14);
}

/** the park's snow surface, as an indexed BufferGeometry with smooth normals. */
export function buildParkSurface(THREE) {
  const TS = stationList(), VS = lateralList();
  const nU = TS.length, nV = VS.length;
  const pos = new Float32Array(nU * nV * 3);
  const col = new Float32Array(nU * nV * 3);
  const live = new Uint8Array(nU * nV);
  const Z = new Float32Array(nU * nV);

  for (let i = 0; i < nU; i++) {
    const t = TS[i];
    for (let j = 0; j < nV; j++) {
      const v = VS[j];
      const k = i * nV + j;
      const [x, y] = toWorld(t, v);
      const z = parkZ(t, v);
      Z[k] = z;
      pos[k * 3] = x; pos[k * 3 + 1] = y; pos[k * 3 + 2] = z;
      live[k] = padMask(t, v) > 0.02 ? 1 : 0;
    }
  }
  // colour needs the local slope, so it runs after the height pass
  for (let i = 0; i < nU; i++) {
    const t = TS[i];
    for (let j = 0; j < nV; j++) {
      const k = i * nV + j;
      const v = VS[j];
      const ip = Math.min(nU - 1, i + 1), im = Math.max(0, i - 1);
      const jp = Math.min(nV - 1, j + 1), jm = Math.max(0, j - 1);
      const du = Math.max(0.05, TS[ip] - TS[im]);
      const dv = Math.max(0.05, VS[jp] - VS[jm]);
      const gu = (Z[ip * nV + j] - Z[im * nV + j]) / du;
      const gv = (Z[i * nV + jp] - Z[i * nV + jm]) / dv;
      const slope = Math.atan(Math.hypot(gu, gv)) * 180 / Math.PI;
      const h = Math.max(0, featureH(t, v));
      const c = snowColour(t, v, h, slope);
      col[k * 3] = c[0]; col[k * 3 + 1] = c[1]; col[k * 3 + 2] = c[2];
    }
  }
  const idx = [];
  for (let i = 0; i < nU - 1; i++) {
    for (let j = 0; j < nV - 1; j++) {
      const a = i * nV + j, b = a + 1, c = a + nV, d = c + 1;
      if (!live[a] && !live[b] && !live[c] && !live[d]) continue;
      // WINDING. `i` runs down-corridor along u and `j` runs to the rider's
      // RIGHT along w, and in this z-up frame u x w = -z — so the obvious
      // (a, c, b) order faces the triangles DOWNWARD. The bench's collision test
      // is deliberately double-sided ("geometry we walk on is authored with all
      // sorts of winding, and a one-sided test silently drops floors"), so an
      // inverted park still RIDES perfectly and the mistake is invisible from
      // the saddle; it shows up as a park that is backface-culled out of every
      // render and lit from underneath. work/park_probe.mjs caught it as
      // "ride line, not on the park: 889 of 900" — a front-side raycast could
      // not see the surface the player was standing on.
      idx.push(a, b, c, b, d, c);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  g.computeBoundingSphere();
  return { geo: g, tris: idx.length / 3, nU, nV };
}

// ==================================================== 7. THE JIBS AND PROPS
//
// "Everything is orange. Rails, boxes, tube rails, course flags, boundary
// netting, the SLOW banner fence. The big features carry a white PALISADES
// TAHOE wordmark (view-78, view-80, view-88)." — PARK.md §6.
//
// RIDEABILITY IS A MEASURED CONSTRAINT, TWICE OVER.
//
// WIDTH. The ground probe is a single downward ray, so what holds a rider on a
// jib is the fall-line term off its top surface. The Eastnor run measured this
// on shipped geometry: a 2.3 m deck is routine, a 0.48 m diameter log is "a
// balance move", and a 0.23 m scaffold pole is "near-impossible". The tube rails
// here are 0.30 m in diameter — which is what a resort round tube rail actually
// is — so they are a balance move, and the box and the dance floor are the
// features anyone can ride.
//
// HEIGHT. Every jib top sits within 0.55 m of the deck it stands on, because
// 0.55 m is `T.stepUp`: at or under it the controller lifts the rider on for
// free, and above it the horizontal knee probe at feet + 0.67 m hits the jib's
// vertical side, reads |ny| ~ 0 and treats the rail as a WALL. A 0.72 m flat bar
// is not a hard feature in this engine, it is a fence. The visible height of
// each feature is carried by the SNOW DECK under it instead — 1.0-1.25 m with a
// <= 22 deg lead-in ramp — which is what "a rail set on a snow deck" (view-83,
// view-90, view-93) means anyway.
export const PARK_ORANGE = lin(0xe8641c);
const RAIL_STEEL = lin(0xc9ced3);
const PLY = lin(0xb99a68);
const DECKBLACK = lin(0x1a1c20);

/** a jib set on a deck: returns the rail's own top line for the wordmark. */
function railLegs(B, pts, top, col) {
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const zg = parkSurfaceZ(p[0], p[1]);
    if (zg === null) continue;
    tube(B, [p[0], p[1], zg - 0.1], [p[0], p[1], p[2]], 0.055, PAL.dark, 5);
    // a foot plate so the leg does not float on a lattice edge
    box(B, { x: p[0], y: p[1], z: zg - 0.08, sx: 0.42, sy: 0.42, sz: 0.09, col: PAL.dark });
  }
}

// ==================================================== 8. THE PUBLIC BUILDER

export function buildPark(THREE, deps) {
  const { SOLID, SMOOTH, SHEET, toGeo, wordmarkTexture, boardMesh, faceBoard,
          fenceRun, bannerWall, wand, skierGeo, hutGeo, place } = deps;
  const rng = makeRng('gold-coast-park');
  const out = { meshes: [], colliders: [], markers: [], notes: [], stats: {} };

  // ------------------------------------------------------------ the snow
  const S = buildParkSurface(THREE);
  const surf = new THREE.Mesh(S.geo, SMOOTH);
  surf.name = 'park-snow';
  surf.castShadow = true; surf.receiveShadow = true;
  out.meshes.push(surf); out.colliders.push(surf);
  out.stats.surfaceTris = S.tris;
  out.stats.lattice = `${S.nU} x ${S.nV}`;

  // ------------------------------------------------------------ the jibs
  const Bj = buf();          // collidable jib structures
  const Bp = buf();          // non-collidable dressing: flags, netting, poles
  const wordmarks = [];      // [pos, nx, ny, w, h, text]

  const lane = (t, v) => {
    const [x, y] = toWorld(t, v);
    return [x, y, parkZ(t, v)];
  };
  const laneDir = (t) => { const p = atT(t); return [p.ux, p.uy]; };
  // props stand on the PARK, not on the mountain under it. `kit.mjs`'s fence and
  // wand helpers take a ground function, so they get this one.
  const parkGz = (x, y) => {
    const z = parkSurfaceZ(x, y);
    return z === null ? groundZ(x, y) : z;
  };

  // --- 1. the orange PALISADES TAHOE BOX (view-80, view-81). A flat/down box in
  //        the rail garden with a second orange feature beyond it. Bay B's
  //        shoulder, interleaved with jump 1 rather than blocked off in a
  //        separate zone, which is what the 03:30-04:18 laps prove.
  {
    const D = DECKS[0];
    const a = lane(D.t0 + 1.5, D.vc), b = lane(D.t1 - 1.5, D.vc);
    const w = 1.30, h = 0.50;
    boxJib(Bj, a, b, w, h, PARK_ORANGE, PLY);
    wordmarks.push({ a, b, w, h, text: 'PALISADES TAHOE' });
    out.markers.push({ t: (D.t0 + D.t1) / 2, v: D.vc, label: 'box' });
  }
  // --- 2. the orange KINKED FLAT BAR on a snow deck (view-83)
  {
    const D = DECKS[1];
    const m = (D.t0 + D.t1) / 2;
    const p0 = lane(D.t0 + 1, D.vc - 1.2);
    const p1 = lane(m - 1.5, D.vc + 0.4);
    const p2 = lane(m + 1.5, D.vc + 0.4);
    const p3 = lane(D.t1 - 1, D.vc - 1.0);
    // the kink: a flat middle section lifted above two sloping legs
    const z = Math.max(p0[2], p3[2]) + 0.42;
    const k1 = [p1[0], p1[1], z], k2 = [p2[0], p2[1], z];
    tube(Bj, [p0[0], p0[1], p0[2] + 0.26], k1, 0.075, PARK_ORANGE, 8);
    tube(Bj, k1, k2, 0.075, PARK_ORANGE, 8);
    tube(Bj, k2, [p3[0], p3[1], p3[2] + 0.26], 0.075, PARK_ORANGE, 8);
    railLegs(Bj, [[p0[0], p0[1], p0[2] + 0.26], k1, k2, [p3[0], p3[1], p3[2] + 0.26]]);
  }
  // --- 3. the BLACK DANCE FLOOR (yt:kjYaU_n6eFw@14:44) — a big low flat box
  {
    const D = DECKS[2];
    const a = lane(D.t0 + 2, D.vc), b = lane(D.t1 - 2, D.vc);
    boxJib(Bj, a, b, 3.6, 0.44, DECKBLACK, DECKBLACK);
  }
  // --- 4. the STRIPED ORANGE/BLACK TUBE (view-84)
  {
    const D = DECKS[3];
    const a = lane(D.t0 + 1.5, D.vc), b = lane(D.t1 - 1.5, D.vc);
    stripedTube(Bj, a, b, 0.15, 0.32);
  }
  // --- 5. THE ORANGE PALISADES TAHOE TUBE RAIL — the rail the hip feeds
  //        (view-77 -> view-78 is one continuous lap; view-88 is the March
  //        second source). This is the flow break the park is built around.
  {
    const D = DECKS[4];
    const a = lane(D.t0 + 1.5, D.vc + 1.4), b = lane(D.t1 - 1.5, D.vc - 1.4);
    const z0 = a[2] + 0.34, z1 = b[2] + 0.22;      // a gentle down rail
    const p0 = [a[0], a[1], z0], p1 = [b[0], b[1], z1];
    tube(Bj, p0, p1, 0.15, PARK_ORANGE, 10);
    railLegs(Bj, [p0, [lerp(p0[0], p1[0], 0.5), lerp(p0[1], p1[1], 0.5), lerp(z0, z1, 0.5)], p1]);
    wordmarks.push({ a: p0, b: p1, w: 0.30, h: 0.30, text: 'PALISADES TAHOE', tube: true });
    out.markers.push({ t: (D.t0 + D.t1) / 2, v: D.vc, label: 'tube-rail' });
  }
  // --- 6. THE A-FRAME PLYWOOD WALL RIDE (view-91). 12 x 16 ft, April-2025
  //        proxy. ZONE PROBABLE, not confirmed — PARK.md escalation 5.
  //        Built at 39 deg faces: the controller reads anything over 43.9 deg as
  //        a wall and bounces the rider off it, so a true vertical wall ride is
  //        not rideable in this engine and 39 deg is the steepest that leaves
  //        margin. Stated as a deviation from the reference in REPORT §19.2.
  {
    const D = DECKS[5];
    aFrameWall(Bj, D, lane, laneDir);
  }
  // --- 7. the LONG ORANGE RAIL on a snow deck, lower park (view-90 / view-93)
  {
    const D = DECKS[6];
    const a = lane(D.t0 + 1.5, D.vc), b = lane(D.t1 - 1.5, D.vc);
    const p0 = [a[0], a[1], a[2] + 0.32], p1 = [b[0], b[1], b[2] + 0.22];
    tube(Bj, p0, p1, 0.14, PARK_ORANGE, 10);
    railLegs(Bj, [p0, [lerp(p0[0], p1[0], 0.5), lerp(p0[1], p1[1], 0.5), lerp(p0[2], p1[2], 0.5)], p1]);
  }

  // ------------------------------------------------------- THE TOP GATE
  // view-73 (January) and view-86 (March, independent second source): "black
  // SMITH-branded wall panels bolted to a park-crew shipping container standing
  // on the snow... Riders unload the chair and drop straight in from here."
  // The park's front door is a container, not a building — PARK.md §6 — so that
  // is what is built. It is a collider, and it is the one prop in this file that
  // is, because a 12 m steel box is a thing you walk into.
  {
    const t = 46, v = 21;
    const c = lane(t, v);
    const [ux, uy] = laneDir(t);
    const yaw = Math.atan2(uy, ux) + rad(8);
    // a 40 ft ISO container: 12.19 x 2.44 x 2.59 m
    box(Bj, { x: c[0], y: c[1], z: c[2] - 0.25, sx: 12.19, sy: 2.44, sz: 2.59,
              yaw, col: lin(0x2a3138), colTop: lin(0x1d2329) });
    // the corrugation, as ribs rather than a texture: eleven vertical creases a
    // side is what makes a container read as a container at 30 m
    const cs = Math.cos(yaw), sn = Math.sin(yaw);
    for (let i = -5; i <= 5; i++) {
      const lx = i * 1.05;
      for (const ly of [-1.28, 1.28]) {
        const px = c[0] + lx * cs - ly * sn, py = c[1] + lx * sn + ly * cs;
        tube(Bj, [px, py, c[2] - 0.25], [px, py, c[2] + 2.30], 0.05, lin(0x232a30), 3);
      }
    }
    // the SMITH panel wall bolted along the down-valley flank
    const pw = 9.2, ph = 2.35;
    const off = 1.42;
    const bx = c[0] - off * sn, by = c[1] + off * cs;
    wordmarks.push({ board: [bx, by, c[2] + 1.45], nx: -sn, ny: cs, w: pw, h: ph,
                     text: 'SMITH', fg: '#e9edf1', bg: '#15181c' });
    out.markers.push({ t, v, label: 'top-gate' });
    // the drop-in gate itself: two orange posts and a banner across the lane
    const g0 = lane(64, 4), g1 = lane(64, 24);
    fenceRun(Bp, [[g0[0], g0[1]], [g1[0], g1[1]]], parkGz, { h: 1.9, col: PARK_ORANGE });
  }

  // ------------------------------------------- ORANGE COURSE FLAGS AND POLES
  // "an orange course flag planted beside the knuckle" (view-75); view-82 has
  // two of them framing the takeoff; view-87 "orange course flags on the
  // shoulder". They are the park's own signage system and they are how a rider
  // reads where the lip is from the in-run, so they go where the evidence puts
  // them: at the lip and at the knuckle, on both shoulders.
  const flagAt = (t, v, tall) => {
    const p = lane(t, v);
    if (!isFinite(p[2])) return;
    const h = tall ? 3.1 : 2.35;
    tube(Bp, [p[0], p[1], p[2]], [p[0], p[1], p[2] + h], 0.045, PAL.dark, 4);
    // a triangular pennant, both faces
    const [ux, uy] = laneDir(t);
    const a = [p[0], p[1], p[2] + h];
    const b = [p[0] + ux * 1.15, p[1] + uy * 1.15, p[2] + h - 0.18];
    const d = [p[0], p[1], p[2] + h - 0.95];
    tri(Bp, a, b, d, PARK_ORANGE);
    tri(Bp, a, d, b, PARK_ORANGE);
  };
  for (const J of JUMPS) {
    flagAt(J.tLip - 1, J.vc - J.hwLip - 2.2, true);
    flagAt(J.tLip - 1, J.vc + J.hwLip + 2.2, true);
    flagAt(J.tKnuck, J.vc - J.hwLand - 2.6, false);
    flagAt(J.tKnuck, J.vc + J.hwLand + 2.6, false);
    flagAt(J.tKickStart - 6, J.vc + J.hwLip + 6, false);
  }
  flagAt(HIP.tc - 2, HIP.vc + 13, true);
  flagAt(HIP.tc + 4, HIP.vc - 13, true);

  // "candy-striped marker poles in the lower park" — view-85
  for (let i = 0; i < 9; i++) {
    const t = 700 + i * 26, v = (i % 2 ? -1 : 1) * (17 + (i % 3) * 4) - 6;
    const p = lane(t, v);
    if (!isFinite(p[2])) continue;
    for (let k = 0; k < 6; k++) {
      tube(Bp, [p[0], p[1], p[2] + k * 0.42], [p[0], p[1], p[2] + (k + 1) * 0.42],
           0.05, k % 2 ? PAL.white : PARK_ORANGE, 4);
    }
  }

  // ------------------------------------------------- THE POND BOUNDARY LINE
  // view-89: "the SNOWMAKING POND immediately right with its straight retaining
  // wall and cable fence, PARK BOUNDARY POLES between them". The pond is real
  // and it is measured — a dead-flat 535.90 m water plateau in the 3DEP — so the
  // boundary that keeps riders off it is built where the water actually is.
  {
    const pts = [];
    for (let t = 620; t <= 790; t += 12) {
      const p = lane(t, 26);
      if (isFinite(p[2])) pts.push([p[0], p[1]]);
    }
    if (pts.length > 1) fenceRun(Bp, pts, parkGz, { h: 1.35, col: PARK_ORANGE, band: false });
    for (const q of pts) wand(Bp, q[0], q[1], parkGz(q[0], q[1]), { h: 1.5, col: PARK_ORANGE });
  }

  // ---------------------------------------------------------- THE BASE PLAZA
  // view-79: "orange SLOW banner fencing, a small operator structure,
  // spectators and a lift beyond. Where the lane rejoins public snow."
  {
    const fa = [], fb = [];
    for (let t = 836; t <= 906; t += 10) {
      const a = lane(t, PLAZA.vc - 26), b = lane(t, PLAZA.vc + 24);
      if (isFinite(a[2])) fa.push([a[0], a[1]]);
      if (isFinite(b[2])) fb.push([b[0], b[1]]);
    }
    if (fa.length > 1) bannerWall(Bp, fa, parkGz, { h: 1.2 });
    if (fb.length > 1) fenceRun(Bp, fb, parkGz, { h: 1.15, col: PARK_ORANGE });
    // the small operator structure
    const o = lane(848, PLAZA.vc - 21);
    const [ux, uy] = laneDir(848);
    if (isFinite(o[2])) {
      place(Bj, hutGeo(77, 3.4, 2.6, 2.5, PAL.timber), o[0], o[1], o[2] - 0.2,
            Math.atan2(uy, ux));
    }
    // spectators along the fence, and the January session's on-snow demo crowd
    for (let i = 0; i < 14; i++) {
      const t = 840 + rr(rng, 0, 62);
      const v = PLAZA.vc + (rng() < 0.5 ? -1 : 1) * rr(rng, 19, 25);
      const p = lane(t, v);
      if (!isFinite(p[2])) continue;
      place(Bp, skierGeo(200 + i, pick(rng, PAL.jacket), { skis: false }),
            p[0], p[1], p[2], rr(rng, 0, 6.283));
    }
  }

  // ------------------------------------------------------ TOWER SNOW GUNS
  // "Tall lattice tower snow guns and mast poles along the corridor" — view-75,
  // view-76, view-84. They sit on the shoulders, clear of the ride line.
  for (const [t, v] of [[150, -30], [268, 30], [352, -31], [452, 30], [612, -30], [742, 24]]) {
    const p = lane(t, v);
    if (!isFinite(p[2])) continue;
    const H = 9.5;
    for (const s of [-0.42, 0.42]) {
      tube(Bp, [p[0] + s, p[1] - 0.42, p[2]], [p[0] + s * 0.25, p[1] - 0.1, p[2] + H], 0.055, PAL.galv, 4);
      tube(Bp, [p[0] + s, p[1] + 0.42, p[2]], [p[0] + s * 0.25, p[1] + 0.1, p[2] + H], 0.055, PAL.galv, 4);
    }
    for (let k = 1; k < 7; k++) {
      const z = p[2] + k * H / 7, w = 0.42 * (1 - k / 9);
      tube(Bp, [p[0] - w, p[1] - w, z], [p[0] + w, p[1] + w, z], 0.03, PAL.galv, 3);
      tube(Bp, [p[0] - w, p[1] + w, z], [p[0] + w, p[1] - w, z], 0.03, PAL.galv, 3);
    }
    tube(Bp, [p[0], p[1], p[2] + H], [p[0] + 1.5, p[1], p[2] + H + 0.5], 0.16, PAL.steelLo, 6);
  }

  const jibMesh = new THREE.Mesh(toGeo(THREE, Bj), SHEET);
  jibMesh.name = 'park-jibs';
  jibMesh.castShadow = true; jibMesh.receiveShadow = true;
  out.meshes.push(jibMesh); out.colliders.push(jibMesh);
  out.stats.jibTris = Bj.pos.length / 9;

  // The dressing is deliberately NOT a collider. REPORT §18.1's ride fix is
  // explicit about why: the first cut of the lift queue put its rails in
  // `lift-structures` and immediately re-broke the thing it was built to fix —
  // bodies stopped 3.6-3.9 m short of their own lift, "held off by the rail that
  // was supposed to show them where to stand". Flags, netting, banner fence,
  // marker poles and snow guns are signage you can walk through.
  const propMesh = new THREE.Mesh(toGeo(THREE, Bp), SHEET);
  propMesh.name = 'park-props';
  propMesh.castShadow = false; propMesh.receiveShadow = false;
  out.meshes.push(propMesh);
  out.stats.propTris = Bp.pos.length / 9;

  // ------------------------------------------------------------ WORDMARKS
  // "The big features carry a white PALISADES TAHOE wordmark (view-78, view-80,
  // view-88)" and the top gate carries SMITH (view-73, view-86).
  //
  // 1024 x 256, mipmaps OFF, LinearFilter — signs.mjs's `wordmarkTexture`
  // already enforces it, and the reason is in its own comment: 1024 x 290 with
  // mipmaps renders PURE BLACK under the render harness's software GL path while
  // looking correct in real Chrome. Every board here goes through that one
  // function so the failure cannot come back through a side door.
  for (const W of wordmarks) {
    const tex = wordmarkTexture(THREE, W.text, W.fg || '#f4f7fa', W.bg || '#d4560f');
    if (!tex) continue;                      // headless Node: no 2D canvas
    const m = boardMesh(THREE, tex, W.w, W.h, { doubleSided: true, unlit: true });
    if (W.board) {
      faceBoard(THREE, m, W.board, W.nx, W.ny);
    } else {
      const mid = [(W.a[0] + W.b[0]) / 2, (W.a[1] + W.b[1]) / 2, (W.a[2] + W.b[2]) / 2];
      const dx = W.b[0] - W.a[0], dy = W.b[1] - W.a[1];
      const L = Math.hypot(dx, dy) || 1;
      const nx = dy / L, ny = -dx / L;
      const r = W.tube ? 0.16 : W.w / 2 + 0.02;
      faceBoard(THREE, m, [mid[0] + nx * r, mid[1] + ny * r, mid[2] + (W.tube ? 0 : W.h / 2)], nx, ny);
      m.scale.set(L / W.w, 1, 1);
      if (W.tube) m.scale.set(L / W.w, 0.9, 1);
    }
    out.meshes.push(m);
  }

  out.stats.minTurnRadius = minTurnRadius();
  out.rng = rng;
  return out;
}

// ---- jib primitives -------------------------------------------------------

function boxJib(B, a, b, w, h, side, top) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const L = Math.hypot(dx, dy) || 1;
  const ux = dx / L, uy = dy / L, wx = uy, wy = -ux;
  const P = (f, s, z) => [a[0] + ux * L * f + wx * s, a[1] + uy * L * f + wy * s,
                          lerp(a[2], b[2], f) + z];
  const hw = w / 2;
  // a jib box is a plywood lid on a steel frame: the top face is its own colour
  // and the four sides are the painted skin
  const c0 = P(0, -hw, 0), c1 = P(1, -hw, 0), c2 = P(1, hw, 0), c3 = P(0, hw, 0);
  const t0 = P(0, -hw, h), t1 = P(1, -hw, h), t2 = P(1, hw, h), t3 = P(0, hw, h);
  quad(B, c0, c1, t1, t0, side);
  quad(B, c2, c3, t3, t2, side);
  quad(B, c1, c2, t2, t1, side);
  quad(B, c3, c0, t0, t3, side);
  quad(B, t0, t1, t2, t3, top);
  // edge framing along both top rails — recognizable carpentry, COMPOSING 17
  const e = 0.055;
  for (const s of [-hw, hw]) {
    const q0 = P(0, s, h), q1 = P(1, s, h);
    tube(B, [q0[0], q0[1], q0[2] + e], [q1[0], q1[1], q1[2] + e], e, RAIL_STEEL, 5);
  }
}

function stripedTube(B, a, b, r, lift) {
  const p0 = [a[0], a[1], a[2] + lift], p1 = [b[0], b[1], b[2] + lift * 0.8];
  const N = 9;
  for (let i = 0; i < N; i++) {
    const f0 = i / N, f1 = (i + 1) / N;
    const q0 = [lerp(p0[0], p1[0], f0), lerp(p0[1], p1[1], f0), lerp(p0[2], p1[2], f0)];
    const q1 = [lerp(p0[0], p1[0], f1), lerp(p0[1], p1[1], f1), lerp(p0[2], p1[2], f1)];
    tube(B, q0, q1, r, i % 2 ? PAL.black : PARK_ORANGE, 8);
  }
  railLegs(B, [p0, [lerp(p0[0], p1[0], 0.5), lerp(p0[1], p1[1], 0.5), lerp(p0[2], p1[2], 0.5)], p1]);
}

function aFrameWall(B, D, lane, laneDir) {
  // 12 x 16 ft proxy: 3.66 m tall, 4.88 m long along the ridge.
  const H = 3.66, LEN = 4.88;   // 12 x 16 ft, the April-2025 proxy
  const t = (D.t0 + D.t1) / 2;
  // OFFSET OFF THE RIDE LINE, ON PURPOSE. The ridge runs down the lane, which
  // means the uphill GABLE — a vertical plywood triangle 3.66 m tall — faces
  // straight back up the deck. A rider coming down the deck centreline would
  // meet it head-on, and the controller reads a vertical face as a wall and
  // stops them dead. A wall ride is a feature you steer AT and ride UP the face
  // of; it is not something you ride into the end of, in this engine or on
  // snow. So the A-frame sits 8 m right of the deck centreline, its near foot
  // 3.5 m off the ride line, and the lane passes beside it. The first cut used
  // 4 m and work/park_ride.mjs drove straight into the gable and stopped dead at
  // lane t = 667 — the offset has to clear the FOOT, not the ridge.
  const c = lane(t, D.vc + 8);
  const [ux, uy] = laneDir(t);
  const wx = uy, wy = -ux;
  // 41 deg faces => the half-base is H / tan(41)
  const half = H / TAN(39);
  const P = (f, s, z) => [c[0] + ux * LEN * f + wx * s, c[1] + uy * LEN * f + wy * s, c[2] + z];
  const ridgeA = P(-0.5, 0, H), ridgeB = P(0.5, 0, H);
  const footA0 = P(-0.5, -half, 0), footA1 = P(-0.5, half, 0);
  const footB0 = P(0.5, -half, 0), footB1 = P(0.5, half, 0);
  // the two plywood faces
  quad(B, footA0, footB0, ridgeB, ridgeA, PLY);
  quad(B, footA1, ridgeA, ridgeB, footB1, PLY);
  // gable ends, painted orange
  tri(B, footA0, ridgeA, footA1, PARK_ORANGE);
  tri(B, footB0, footB1, ridgeB, PARK_ORANGE);
  // ridge beam and four corner posts — visible carpentry, not an extruded box
  tube(B, ridgeA, ridgeB, 0.085, PAL.timber, 5);
  for (const [p, q] of [[footA0, ridgeA], [footA1, ridgeA], [footB0, ridgeB], [footB1, ridgeB]]) {
    tube(B, p, q, 0.06, PAL.timberLo, 4);
  }
}

export { JUMPS, HIP, DECKS, ROLLER, PLAZA, POND, PAD_HW };
