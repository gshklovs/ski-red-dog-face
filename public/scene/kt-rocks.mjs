// KT-22's IDENTITY LAYER — the Eagle's Nest spires, the cornice into GS Bowl,
// the Fingers reef and the aerial-driven rock field.
//
// PORTED, NOT REBUILT. Every sculpt in this file is `eagles-nest-kt22-B-truth-01`'s
// `scene/rocks.mjs` verbatim (that run's REPORT §6 carries the per-feature view
// citations: spires from views 5/6/13/7/11 + aerial-close, cornice from Greg's
// first-hand unload description + squawguide + view-9, the Fingers from views
// 4/12/2/11 + OSM stub 248622079, the rock field from the aerial's own dark-rock
// raster). Re-deriving them here would have thrown that evidence away.
//
// THE RE-REGISTRATION. The donor is ENU on the same 3DEP and the same
// Web-Mercator, but it is NOT the same frame and it is NOT a pure origin shift:
// both worlds scale Web-Mercator metres to ground metres by cos(lat0) about
// their OWN origin, and those origins are 0.0056 deg of latitude apart.
//
//     donor    phi0 39.18640  lam0 -120.24100  cos 0.7752764  z0 1900.0 m
//     merged   phi0 39.19197  lam0 -120.23108  cos 0.7749656  z0 1890.0 m
//
// so the map is a uniform scale plus a translation (work/reregister.py):
//
//     x_m = 0.999920747 * x_d - 855.861
//     y_m = 0.999920747 * y_d - 620.025
//     z_m =               z_d +  10.000
//
// VERIFIED, not assumed: transforming the donor's ENU for the eleven OSM nodes
// both worlds derived independently — KT-22's base and top, the DEM summit, the
// GS Bowl top node, McConkey's two nodes, the Fingers top, Olympic Lady's top
// and Exhibition's two terminals, plus this world's own origin — reproduces this
// world's own values with a WORST RESIDUAL OF 0.0000 m. Ignoring the 79 mm/km
// scale term would have cost 0.089 m; it is not ignored.
//
// HOW THE PORT WORKS. Rather than rewriting every hard-coded coordinate in the
// donor's sculpts (and getting one of them wrong), the sculpts run UNCHANGED in
// DONOR-FRAME coordinates against donor-frame views of this world's ground, and
// the finished vertex buffer is mapped through the transform once at the end.
// So `buildSpires` still asks for the ground at (-52, -379) and still gets the
// Eagle's Nest knob — because that is this world's (-907.9, -999.0).

import {
  buf, tri, quad, tube, prism, makeRng, rr, ri, appendBuf,
  lin, mixc, scalec, jitc, clamp, lerp, smooth, fbm, snowLace,
} from './lib/core.mjs';
import { groundZ, masksAt, slopeAt } from './ground.mjs';
import { rockAt as rockAtMerged } from './rock.mjs';
import { A } from './layout.mjs';

// ------------------------------------------------------- the transform
export const D2M = { s: 0.999920747, tx: -855.861, ty: -620.025, tz: 10.0 };
export const toMerged = (x, y, z = 0) =>
  [D2M.s * x + D2M.tx, D2M.s * y + D2M.ty, z + D2M.tz];
export const toDonor = (x, y, z = 0) =>
  [(x - D2M.tx) / D2M.s, (y - D2M.ty) / D2M.s, z - D2M.tz];

/** map a whole vertex buffer from the donor frame into this world's. */
export function bufToMerged(B) {
  for (let i = 0; i < B.pos.length; i += 3) {
    B.pos[i] = D2M.s * B.pos[i] + D2M.tx;
    B.pos[i + 1] = D2M.s * B.pos[i + 1] + D2M.ty;
    B.pos[i + 2] = B.pos[i + 2] + D2M.tz;
  }
  return B;
}

// donor-frame views of this world's ground
const gz = (xd, yd) => {
  const p = toMerged(xd, yd);
  return groundZ(p[0], p[1]) - D2M.tz;
};
const slopeD = (xd, yd, h) => {
  const p = toMerged(xd, yd);
  return slopeAt(p[0], p[1], h);
};
const masksD = (xd, yd) => {
  const p = toMerged(xd, yd);
  return masksAt(p[0], p[1]);
};
const rockAt = (xd, yd) => {
  const p = toMerged(xd, yd);
  return rockAtMerged(p[0], p[1]);
};

// donor-frame anchors, derived from THIS world's OSM-node anchors so there is
// exactly one place the numbers live
const AD = {
  ktTop: toDonor(A.ktTop[0], A.ktTop[1]),
  peakNode: toDonor(-913.4, -996.4),          // the DEM high point
  fingersTop: toDonor(-806.4, -367.5),        // OSM 248622079 top node
  fingersBot: toDonor(-736.9, -236.1),        // OSM 248622079 bottom node
  gsTop: toDonor(A.gsBowlTop[0], A.gsBowlTop[1]),
};

// The cornice search line, donor-frame, copied verbatim from the donor's
// layout.mjs CORNICE_RIM. It is only a SEARCH line: buildCornice() finds the
// actual crest per sample on the DEM, so the merge's DEM (which reads the same
// 3DEP through a different stack) puts the lip on its own convex edge.
const CORNICE_RIM = [
  [-108, -337], [-72, -336], [-36, -340], [0, -347], [36, -356],
  [72, -366], [108, -377], [144, -389],
];
/** the patrol shack, donor-frame (-134,-314) — the GS Bowl top node */
export const SHACK_D = { x: -134, y: -314, yaw: 25 };

// ==========================================================================
// Everything below this line is the donor's rocks.mjs, unchanged except that
// `gz` / `masksAt` / `slopeAt` / `rockAt` are the donor-frame views above.
// ==========================================================================

const ROCK = lin(0x544c43), ROCK_DK = lin(0x332e29), ROCK_LIT = lin(0x8d7f69);
const ROCK_TAN = lin(0x9a8a6c), ROCK_GREY = lin(0x6b6560);
const LICHEN = lin(0x74683a), LICHEN_RUST = lin(0x99672f);
const SNOW = lin(0xeef4fd), SNOW_LO = lin(0xc3d2e6);

/** MeshLambert + world-space volcanic character: tonal blotch, sub-horizontal
 *  bedding bands, fine grain and lichen spotting, all functions of world
 *  position so a face you stand next to has grain. Ported verbatim; it reads
 *  the SAME world positions either way, because the shader works in the final
 *  (merged) frame and rock grain has no preferred origin. */
export function rockMaterial(THREE) {
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  mat.customProgramCacheKey = () => 'kt-volcanic-1';
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = 'varying vec3 vRWP;\n' + shader.vertexShader.replace(
      '#include <project_vertex>',
      `vRWP = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;
       #include <project_vertex>`,
    );
    shader.fragmentShader = `
      varying vec3 vRWP;
      float khash(vec3 p){ p = fract(p * 0.3183099 + vec3(0.71,0.113,0.419)); p *= 17.0;
        return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
      float knoise(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(mix(khash(i), khash(i + vec3(1,0,0)), f.x),
                       mix(khash(i + vec3(0,1,0)), khash(i + vec3(1,1,0)), f.x), f.y),
                   mix(mix(khash(i + vec3(0,0,1)), khash(i + vec3(1,0,1)), f.x),
                       mix(khash(i + vec3(0,1,1)), khash(i + vec3(1,1,1)), f.x), f.y), f.z); }
    ` + shader.fragmentShader.replace(
      '#include <color_fragment>',
      `#include <color_fragment>
       {
         float klum = dot( diffuseColor.rgb, vec3( 0.2126, 0.7152, 0.0722 ) );
         float rocky = 1.0 - smoothstep( 0.09, 0.30, klum );
         float gd = length( vViewPosition );
         float near = 1.0 - smoothstep( 25.0, 120.0, gd );
         float blotch = knoise( vRWP * 0.33 );
         float grain  = knoise( vRWP * 3.1 );
         float speck  = knoise( vRWP * 13.0 );
         float bed = knoise( vec3( vRWP.x * 0.05, vRWP.y * 0.05, vRWP.z * 0.55 ) );
         float g = ( blotch - 0.5 ) * 0.30
                 + ( bed    - 0.5 ) * 0.34
                 + ( grain  - 0.5 ) * 0.34 * ( 0.35 + 0.65 * near )
                 + ( speck  - 0.5 ) * 0.26 * near;
         diffuseColor.rgb *= 1.0 + g * rocky;
         diffuseColor.rgb = mix( diffuseColor.rgb,
             diffuseColor.rgb * vec3( 1.16, 1.05, 0.86 ),
             smoothstep( 0.60, 0.92, blotch ) * 0.50 * rocky );
         diffuseColor.rgb = mix( diffuseColor.rgb,
             diffuseColor.rgb * vec3( 0.86, 0.93, 1.10 ),
             smoothstep( 0.42, 0.08, blotch ) * 0.40 * rocky );
         float lich = smoothstep( 0.74, 0.93, knoise( vRWP * 1.9 + 31.7 ) );
         diffuseColor.rgb = mix( diffuseColor.rgb, vec3( 0.135, 0.125, 0.045 ),
             lich * 0.55 * rocky * ( 0.35 + 0.65 * near ) );
         float rust = smoothstep( 0.80, 0.95, knoise( vRWP * 2.7 + 9.1 ) );
         diffuseColor.rgb = mix( diffuseColor.rgb, vec3( 0.28, 0.14, 0.05 ),
             rust * 0.50 * rocky * ( 0.35 + 0.65 * near ) );
       }`,
    );
  };
  return mat;
}

function towerGeo(B, rng, { x, y, z, h, r, lean = [0, 0], tiers = 6, sides = 8, snow = 0.5 }) {
  let cx = x, cy = y, cz = z, cr = r;
  const B2 = buf();
  for (let t = 0; t < tiers; t++) {
    const th = (h / tiers) * rr(rng, 0.8, 1.25);
    const band = t % 2
      ? mixc(ROCK, ROCK_GREY, rr(rng, 0.30, 0.65))
      : mixc(ROCK, ROCK_TAN, rr(rng, 0.20, 0.55));
    prism(B2, rng, {
      x: cx, y: cy, z: cz, r: cr, h: th, sides,
      taper: rr(rng, 0.68, 0.9), jit: 0.22,
      yaw: rr(rng, 0, 6.28),
      tiltX: lean[0] * th + rr(rng, -0.5, 0.5), tiltY: lean[1] * th + rr(rng, -0.5, 0.5),
      col: jitc(mixc(band, ROCK_DK, rr(rng, 0.0, 0.30)), rng, 0.20),
      colTop: jitc(mixc(ROCK_LIT, LICHEN, rr(rng, 0.0, 0.22)), rng, 0.15),
    });
    const nCol = t < tiers - 1 ? 3 : 1;
    for (let c = 0; c < nCol; c++) {
      const a = rr(rng, 0, 6.28);
      prism(B2, rng, {
        x: cx + Math.cos(a) * cr * 0.92, y: cy + Math.sin(a) * cr * 0.92, z: cz - th * 0.35,
        r: cr * rr(rng, 0.16, 0.28), h: th * rr(rng, 0.9, 1.5), sides: 5,
        taper: rr(rng, 0.7, 0.95), jit: 0.18, yaw: rr(rng, 0, 6.28),
        tiltX: lean[0] * th * 0.6 + rr(rng, -0.4, 0.4), tiltY: lean[1] * th * 0.6 + rr(rng, -0.4, 0.4),
        col: jitc(mixc(band, ROCK_GREY, rr(rng, 0.0, 0.5)), rng, 0.18),
        colTop: jitc(mixc(ROCK_LIT, LICHEN_RUST, rr(rng, 0.0, 0.3)), rng, 0.15),
      });
    }
    cx += lean[0] * th; cy += lean[1] * th; cz += th * rr(rng, 0.70, 0.84);
    cr *= rr(rng, 0.76, 0.90);
  }
  for (let i = 0; i < tiers + 6; i++) {
    const a = i % 2 ? rr(rng, 1.1, 2.1) : rr(rng, 0, 6.28);
    const hf = rr(rng, 0.08, 0.6);
    const d = r * rr(rng, 0.6, 1.15) * (1 - 0.55 * hf), zz = z + h * hf;
    prism(B2, rng, {
      x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, z: zz - 1.2,
      r: r * rr(rng, 0.2, 0.42), h: rr(rng, 1.2, 2.8), sides: 6,
      taper: rr(rng, 0.5, 0.8), jit: 0.3, yaw: rr(rng, 0, 6.28),
      col: jitc(mixc(ROCK, ROCK_GREY, rr(rng, 0, 0.45)), rng, 0.2),
      colTop: jitc(mixc(ROCK_LIT, LICHEN, 0.2), rng, 0.2),
    });
  }
  snowLace(B2, { snow: SNOW_LO, lo: 0.55, hi: 0.92, amount: snow, patchy: 0.5, seed: (x * 7 + y) | 0 });
  appendBuf(B, B2);
  return [cx, cy, cz];
}

function reefGeo(B, rng, x, y, z, r, h, snow = 0.8) {
  const B2 = buf();
  const n = ri(rng, 3, 6);
  // NOTE: the grey mix factor comes from a POSITION HASH, not from rng — the
  // rng draw sequence must stay byte-identical to the donor's verified build so
  // the fins, the outcrops and the plinth keep their verified positions.
  const gm = Math.abs(Math.sin(x * 12.9898 + y * 78.233)) * 0.45;
  for (let i = 0; i < n; i++) {
    const a = rr(rng, 0, 6.28), d = rr(rng, 0, r * 0.8);
    prism(B2, rng, {
      x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, z: z + rr(rng, -0.8, 0.1),
      r: r * rr(rng, 0.25, 0.5), h: h * rr(rng, 0.5, 1.1), sides: ri(rng, 5, 7),
      taper: rr(rng, 0.5, 0.85), jit: 0.26, yaw: rr(rng, 0, 6.28),
      tiltX: rr(rng, -0.25, 0.25) * h, tiltY: rr(rng, -0.25, 0.25) * h,
      col: jitc(mixc(ROCK, ROCK_GREY, gm + i * 0.06), rng, 0.2),
      colTop: jitc(mixc(ROCK_LIT, LICHEN, rr(rng, 0, 0.15)), rng, 0.18),
    });
  }
  snowLace(B2, { snow: SNOW, lo: 0.45, hi: 0.88, amount: snow, patchy: 0.3, seed: (x * 13 + y * 3) | 0 });
  appendBuf(B, B2);
}

// ------------------------------------------------------------- the spires
export function buildSpires(B) {
  const rng = makeRng('eagles-nest');
  const CX = -52, CY = -379;                    // mass centre — merged (-907.9, -999.0)
  const AX = [0.92, -0.39];                     // long axis, WNW -> ESE
  const Bp = buf();
  for (let i = 0; i < 110; i++) {
    const u = rr(rng, -34, 34), v = rr(rng, -16, 16);
    if (Math.abs(u) / 34 + Math.abs(v) / 16 > 1.25) continue;
    const x = CX + AX[0] * u - AX[1] * v, y = CY + AX[1] * u + AX[0] * v;
    const cent = 1 - Math.abs(u) / 40;
    // banding factor off a hash, not rng — keeps the verified draw sequence
    const bm = Math.abs(Math.sin(i * 3.7 + u * 0.13));
    const band = i % 2
      ? mixc(ROCK, ROCK_GREY, 0.15 + 0.40 * bm)
      : mixc(ROCK, ROCK_TAN, 0.10 + 0.30 * bm);
    prism(Bp, rng, {
      x, y, z: gz(x, y) - 3.0,
      r: rr(rng, 4.2, 7.0), h: rr(rng, 3.0, 6.0) + cent * 4.0, sides: ri(rng, 6, 8),
      taper: rr(rng, 0.6, 0.88), jit: 0.20, yaw: rr(rng, 0, 6.28),
      tiltX: rr(rng, -1, 1), tiltY: rr(rng, -1, 1),
      col: jitc(mixc(band, ROCK_DK, 0.10 + 0.15 * bm), rng, 0.16),
      colTop: jitc(mixc(band, ROCK_LIT, rr(rng, 0.25, 0.6)), rng, 0.14),
    });
  }
  snowLace(Bp, { snow: SNOW_LO, lo: 0.52, hi: 0.90, amount: 0.55, patchy: 0.45, seed: 4211 });
  appendBuf(B, Bp);
  // MAIN (NW) SPIRE — the statue tower (view-13's profile)
  // THE TOWERS DRAW FROM THEIR OWN STREAM. The donor's iter11 sculpt changed
  // the towers' draw count, and putting them on a separate rng keeps that churn
  // out of the shared 'eagles-nest' sequence - so the plinth, the fins and the
  // outcrop field all keep the positions the donor's REPORT verified. This
  // isolation IS the donor's spire fix, ported verbatim; dropping it (as the
  // first cut of this merge did) silently re-rolls the whole rock layout the
  // B-truth run had already been graded on.
  const trng = makeRng('eagles-nest-towers');
  const mx = -62, my = -372;
  const mainTop = towerGeo(B, trng, { x: mx, y: my, z: gz(mx, my) - 1.5, h: 17.5, r: 10.5,
                     lean: [0.07, 0.11], tiers: 7, sides: 9, snow: 0.4 });
  // SE TOWER across the notch (view-5's right-hand spire)
  const sx = -40, sy = -387;
  towerGeo(B, trng, { x: sx, y: sy, z: gz(sx, sy) - 1.5, h: 13.0, r: 8.5,
                     lean: [-0.05, 0.09], tiers: 6, sides: 8, snow: 0.45 });
  // satellite pinnacles — the multi-lobe silhouette of views 5/6
  towerGeo(B, trng, { x: mx - 8, y: my + 6, z: gz(mx - 8, my + 6) - 1.2, h: 6.5, r: 4.2,
                     lean: [0.10, 0.16], tiers: 3, sides: 7, snow: 0.5 });
  towerGeo(B, trng, { x: mx + 6, y: my + 9, z: gz(mx + 6, my + 9) - 1.2, h: 4.5, r: 3.4,
                     lean: [0.02, 0.20], tiers: 2, sides: 6, snow: 0.55 });
  towerGeo(B, trng, { x: sx + 8, y: sy + 4, z: gz(sx + 8, sy + 4) - 1.2, h: 5.0, r: 3.6,
                     lean: [-0.06, 0.14], tiers: 2, sides: 7, snow: 0.55 });
  // the STATUE TERRACE (views 8/9)
  const Bt = buf();
  for (const [du, dv, rp] of [[2.6, 1.8, 2.4], [4.4, 3.4, 1.9], [1.0, 3.8, 1.6]]) {
    prism(Bt, rng, {
      x: mainTop[0] + du, y: mainTop[1] + dv, z: mainTop[2] - rr(rng, 2.3, 2.9),
      r: rp, h: rr(rng, 1.4, 2.0), sides: 7, taper: 0.9, jit: 0.10, yaw: rr(rng, 0, 6.28),
      col: jitc(mixc(ROCK, ROCK_GREY, 0.3), rng, 0.14),
      colTop: jitc(mixc(ROCK_LIT, LICHEN, 0.25), rng, 0.12),
    });
  }
  snowLace(Bt, { snow: SNOW_LO, lo: 0.55, hi: 0.9, amount: 0.4, patchy: 0.5, seed: 977 });
  appendBuf(B, Bt);
  // the notch saddle
  reefGeo(B, rng, -51, -380, gz(-51, -380) - 1.2, 4.5, 2.2, 0.75);
  // the E face step — the 20 m drop the DEM profile shows E of the summit
  for (let i = 0; i < 7; i++) {
    const t = i / 6;
    const x = -30 + t * 26, y = -384 + t * 6 + rr(rng, -3, 3);
    reefGeo(B, rng, x, y, gz(x, y) - 1.0, rr(rng, 3, 5.5), rr(rng, 2.2, 4.5), 0.6);
  }
  // the SCRAMBLE ROUTE terraces up the W shoulder (view-7), climbable
  const st = AD.ktTop;
  for (let i = 0; i < 10; i++) {
    const t = i / 9;
    const x = lerp(st[0] + 14, mx - 4, t) + rr(rng, -2, 2);
    const y = lerp(st[1] - 6, my - 3, t) + rr(rng, -2, 2);
    reefGeo(B, rng, x, y, gz(x, y) - 1.0, rr(rng, 2.2, 3.6), rr(rng, 1.0, 1.8), 0.55);
  }
  // wind-bent summit blocks along the knife ridge toward the peak node
  for (let i = 0; i < 6; i++) {
    const t = i / 5;
    const x = lerp(mx, AD.peakNode[0], t) + rr(rng, -2.5, 2.5);
    const y = lerp(my, AD.peakNode[1], t) + rr(rng, -2.5, 2.5);
    reefGeo(B, rng, x, y, gz(x, y) - 0.8, rr(rng, 1.8, 3.2), rr(rng, 1.2, 2.4), 0.5);
  }
  return { statueD: [mainTop[0], mainTop[1], mainTop[2] - 0.3] };
}

// ------------------------------------------------------ the Fingers fins
export function buildFingers(B) {
  const rng = makeRng('the-fingers');
  const T = AD.fingersTop, Bo = AD.fingersBot;
  let dx = Bo[0] - T[0], dy = Bo[1] - T[1];
  const L = Math.hypot(dx, dy);
  dx /= L; dy /= L;
  const px = -dy, py = dx;
  // fins FLANK the chutes; the OSM stub itself is the middle chute, so no fin
  // sits at offset 0 (the donor's first ski test parked a rock on the line)
  for (const off of [-36, -21, -8, 8.5, 21.5, 35]) {
    const finAmp = 1 - Math.abs(off) / 52;
    for (let t = -0.15; t < 1.25; t += rr(rng, 0.09, 0.15)) {
      const wob = fbm(t * 3.1, off * 0.11, 2, 2, 0.5, off | 0) * 3;
      const x = T[0] + dx * L * t + px * (off + wob);
      const y = T[1] + dy * L * t + py * (off + wob);
      const mid = 1 - Math.abs(t - 0.5) * 1.3;
      const h = (2.2 + 6.5 * Math.max(0, mid) * finAmp) * rr(rng, 0.75, 1.2);
      reefGeo(B, rng, x, y, gz(x, y) - 1.2, rr(rng, 3.2, 5.4), h, 0.32);
    }
  }
}

// ------------------------------------------- the reef / outcrop field
// Density and size from the aerial's own bare-rock raster. Restricted to the
// KT side of the world (donor x < 470, i.e. merged x < -386): east of that the
// Red Dog pod has its own granite-outcrop field and doubling them up would
// stand two independent rock scatters on the same ground.
// Distance to the OSM Fingers stub (way 248622079), donor frame. The stub is a
// TWO-NODE way, so its polyline is the single segment fingersTop -> fingersBot
// and this reproduces the donor's RUN_PREP['fingers'] segment walk exactly.
function distToFingers(x, y) {
  const [ax, ay] = AD.fingersTop, [bx, by] = AD.fingersBot;
  const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1e-9;
  const t = clamp(((x - ax) * dx + (y - ay) * dy) / L2, 0, 1);
  return Math.hypot(x - ax - dx * t, y - ay - dy * t);
}

export function buildOutcrops(B, budget = 620) {
  const rng = makeRng('kt-rock-field');
  let placed = 0;
  for (let i = 0; i < 200000 && placed < budget; i++) {
    const x = rr(rng, -700, 470), y = rr(rng, -520, 700);
    const rk = clamp(rockAt(x, y), 0, 1);
    if (rk < 0.12) continue;
    const m = masksD(x, y);
    if (m.groom > 0.3 || m.pack > 0.3 || m.cat > 0.3) continue;
    if (Math.hypot(x + 57, y + 376) < 42) continue;      // keep the spire zone
    if (rng() > rk * 1.35) continue;
    // FIN BOOST, ported back from the donor: within ~60 m of the Fingers stub
    // the outcrops grow into real towers, which is what makes the reef a reef —
    // view-4 looks UP at it and view-12 looks DOWN on towers. The first cut of
    // this merge dropped the term (the donor read it off RUN_PREP['fingers'],
    // which this module does not import) and the reef quietly flattened into
    // the same scatter as the rest of the field.
    const finBoost = 1 + 2.2 * (1 - smooth(10, 60, distToFingers(x, y)));
    const sl = slopeD(x, y, 4);
    const r = rr(rng, 2.2, 4.6) * (0.8 + rk);
    const h = rr(rng, 1.6, 3.4) * (0.8 + rk * 0.8) * finBoost * (0.7 + smooth(20, 45, sl) * 0.8);
    reefGeo(B, rng, x, y, gz(x, y) - 0.9, r, Math.min(h, 11), 0.55 + 0.3 * rng());
    placed++;
  }
  return placed;
}

// ----------------------------------------------------------- the cornice
export function buildCornice(B) {
  const rim = CORNICE_RIM;
  const samples = [];
  for (let i = 0; i < rim.length - 1; i++) {
    const [ax, ay] = rim[i], [bx, by] = rim[i + 1];
    const dx = bx - ax, dy = by - ay;
    const L = Math.hypot(dx, dy);
    let nx = -dy / L, ny = dx / L;
    if (ny < 0) { nx = -nx; ny = -ny; }
    const N = Math.max(2, Math.round(L / 5));
    for (let k = 0; k <= (i === rim.length - 2 ? N : N - 1); k++) {
      const t = k / N;
      const px = ax + dx * t, py = ay + dy * t;
      let crest = null;
      for (let d = -10; d <= 34; d += 2) {
        const g0 = gz(px + nx * d, py + ny * d);
        const g1 = gz(px + nx * (d + 3), py + ny * (d + 3));
        if ((g0 - g1) / 3 > 0.53) { crest = d; break; }         // > ~28 deg down
      }
      if (crest === null) continue;
      samples.push({ x: px + nx * crest, y: py + ny * crest, nx, ny });
    }
  }
  for (let i = 0; i < samples.length - 1; i++) {
    const s0 = samples[i], s1 = samples[i + 1];
    if (Math.hypot(s1.x - s0.x, s1.y - s0.y) > 14) continue;
    const mk = (s) => {
      const over = 2.2 + 1.4 * (0.5 + 0.5 * fbm(s.x * 0.05, s.y * 0.05, 2, 2, 0.5, 7));
      const zc = gz(s.x, s.y);
      return {
        back: [s.x - s.nx * 2.5, s.y - s.ny * 2.5, gz(s.x - s.nx * 2.5, s.y - s.ny * 2.5) + 0.25],
        lipTop: [s.x + s.nx * over, s.y + s.ny * over, zc + 0.7],
        lipUnder: [s.x + s.nx * (over - 1.3), s.y + s.ny * (over - 1.3), zc - 1.2],
        foot: [s.x + s.nx * 1.0, s.y + s.ny * 1.0, gz(s.x + s.nx * 3, s.y + s.ny * 3) - 0.2],
      };
    };
    const a = mk(s0), b = mk(s1);
    quad(B, a.back, b.back, b.lipTop, a.lipTop, SNOW);
    quad(B, a.lipTop, b.lipTop, b.lipUnder, a.lipUnder, mixc(SNOW_LO, lin(0x9db4d4), 0.45));
    quad(B, a.lipUnder, b.lipUnder, b.foot, a.foot, SNOW_LO);
  }
  return samples.length;
}

// ==========================================================================
/** Build the whole identity layer and hand back MERGED-frame buffers.
 *  `hero` is collidable (you scramble the spires and stand on the cornice);
 *  `field` is the scattered outcrop scatter and is not, exactly as the Red Dog
 *  pod's own boulders are not. */
export function buildKtRocks({ outcrops = 160 } = {}) {
  const hero = buf();
  const spires = buildSpires(hero);
  buildFingers(hero);
  const corniceSamples = buildCornice(hero);
  const field = buf();
  const placed = buildOutcrops(field, outcrops);
  const statue = toMerged(spires.statueD[0], spires.statueD[1], spires.statueD[2]);
  const shack = toMerged(SHACK_D.x, SHACK_D.y);
  bufToMerged(hero);
  bufToMerged(field);
  return {
    hero, field, statue, shack: { x: shack[0], y: shack[1], yaw: SHACK_D.yaw },
    stats: { corniceSamples, outcrops: placed },
  };
}
