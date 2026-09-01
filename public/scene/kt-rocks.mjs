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
  buf, tri, quad, tube, prism, makeRng, rr, ri, appendBuf, bufTris,
  lin, mixc, scalec, jitc, clamp, lerp, smooth, fbm, snowLace,
} from './lib/core.mjs';
import { groundZ, masksAt, slopeAt } from './ground.mjs';
import { rockAt as rockAtMerged } from './rock.mjs';
import { A } from './layout.mjs';
import { FIN_RIBS, FIN_CHUTES } from './kt-runs-data.mjs';
// specs/0005 L4. The layer is registered ONCE, in granite.mjs (the other rock
// material's home); this module splices the same three GLSL strings into its own
// shader so both rock materials share one uniform block and one set of dials.
// granite.mjs imports nothing from here, so there is no cycle.
import { ROCK_LOOK_PARS_VERT, ROCK_LOOK_VERT, ROCK_LOOK_PARS_FRAG,
         ROCK_LOOK_FRAG } from './granite.mjs';

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
    shader.vertexShader = 'varying vec3 vRWP;\n' + ROCK_LOOK_PARS_VERT + shader.vertexShader.replace(
      '#include <project_vertex>',
      `vRWP = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;
       ${ROCK_LOOK_VERT}
       #include <project_vertex>`,
    );
    shader.fragmentShader = ROCK_LOOK_PARS_FRAG + `
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
${ROCK_LOOK_FRAG('blotch')}
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

// ==========================================================================
// THE FINGERS — INCREMENT 25 (v3). RIDEABLE SNOW SPINES, FLATIRON SLAB BANDS,
// AND A CLIFF-JUMPABLE NOSE ON EVERY ONE OF THEM.
// ==========================================================================
//
// GREG'S VERDICT ON INCREMENT 24, verbatim:
//
//     "it seems like the agent only built these fence style ridges instead of
//      these flatiron stacked rocks that are rideable in the real fingers,
//      could we make this more badass and cliff-jumpable like the real ones,
//      here are some first person fingers footage."
//
// He is right and the five frames he supplied are what says so. The ground
// truth for everything below is that footage (Screenshot 2026-09-01 001430,
// 001434, 001439, 001444, 001502) plus the tuning request's own ref.jpg, and
// where any prose disagrees with the frames the frames win. What they show:
//
//   * THE RIDER'S OWN LINE IS THE CREST OF A SPINE. Skis on top of it for the
//     whole clip, snow unbroken from the crest down both flanks into the
//     gullies either side, no vertical face anywhere along its length. The
//     crest is wide enough to hold a turn — 001430 and 001434 both have several
//     metres of rolled snow either side of the tips before it falls away.
//   * THE ROCK IS A BAND ON THE FLANK, NOT A WALL ON THE CREST. Granite breaks
//     out of the flanks and around the noses as DARK STACKED SLABS lying with
//     the dip of the hill — flatirons — with snow filling between them. 001444
//     and 001502 both carry a stepped slab band on the skier's right flank,
//     well below the crest line, and the crest itself is clean snow.
//   * EVERY SPINE ENDS IN A NOSE DROP. 001439 and 001502 are shot at the lip:
//     the spine stops and below it is steep clean snow into the apron. That is
//     the badass line — ride the crest, air the nose, land in the apron.
//
// Increment 24 built `w = 1.6 + 0.22 h` about a crest, i.e. a 9 m base under a
// 13 m wall of rock, and from any angle that is a fence. It is gone. What is
// NOT gone is FIN_CHUTES: the five lanes are Greg-approved positions and the
// bake's §1a-§1e failures still stand behind them, so not one chute station
// moves in this rebuild.
//
// ---- WHAT THIS FILE BUILDS, AND WHICH BUFFER EACH PIECE GOES IN
//
// Two buffers, and the split is the collidable budget spent deliberately —
// exactly the rule scene/poulsen.mjs's header sets out and world.mjs's
// `poulsen-cliff-collide` implements:
//
//   HERO (collidable — `kt-eagles-nest`, pushed into world.colliders)
//     the SPINE SHELL: a swept surface from one chute line, over the rounded
//     crest, down to the next chute line. This is the thing you ski, so it is
//     the thing that gets collision, and it is sampled at SPINE_STEP and
//     PROF_T — coarse enough to be affordable and fine enough that a 40 deg
//     crest is a surface and not a staircase.
//     ...plus the NOSE FACE, because you have to be able to fall off it.
//
//   FIELD (visual only — `kt-rock-field`, in the scene and NOT in colliders)
//     the FLATIRON SLABS. They live on the flanks between t 0.42 and 0.92 of
//     the half-width and around the noses — ground a rider crosses at speed on
//     a 45-55 deg cross-fall and never stands on — so colliding them would buy
//     nothing but a ski-catcher, and the budget for them does not exist: the
//     world sits at 895,213 of 900,000 collidable triangles.
//
// STRICTLY ADDITIVE, STILL, and it is still the whole legal basis. Every vertex
// is `ground(x, y) + dz` for a provably non-negative dz, and the profile is
// EXACTLY ZERO at t = +/-1, so the shell's two base rings lie on the terrain and
// the chute floors are untouched raster. This increment writes no ground cell,
// so forest.mjs's rejection loops take the draws they always took and
// work/kt_basis.mjs and work/pou_basis.mjs come back unchanged.
// work/fin_geom_check.mjs measures that rather than asserting it.

/** Catmull-Rom resample of a baked spine to `step` metres, carrying the four
 *  per-station quantities the sweep needs: crest height, measured bare-rock
 *  fraction, and the two half-widths. */
function resampleSpine(S, step) {
  const cum = [0];
  for (let i = 1; i < S.length; i++)
    cum.push(cum[i - 1] + Math.hypot(S[i][0] - S[i - 1][0], S[i][1] - S[i - 1][1]));
  const L = cum[cum.length - 1];
  const cols = [0, 1, 3, 5, 6, 7];                    // x, y, h, rock, wl, wr
  if (!(L > step)) return S.map((s) => cols.map((c) => s[c]));
  const g = (k, c) => S[clamp(k, 0, S.length - 1)][c];
  const cr = (i, t, c) => {
    const p0 = g(i - 1, c), p1 = g(i, c), p2 = g(i + 1, c), p3 = g(i + 2, c);
    return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t
      + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t);
  };
  const out = [];
  const n = Math.max(2, Math.round(L / step));
  for (let k = 0; k <= n; k++) {
    const s = (L * k) / n;
    let i = 0; while (i < cum.length - 2 && cum[i + 1] < s) i++;
    const t = clamp((s - cum[i]) / ((cum[i + 1] - cum[i]) || 1), 0, 1);
    out.push([cr(i, t, 0), cr(i, t, 1), Math.max(0, cr(i, t, 3)),
              clamp(cr(i, t, 5), 0, 1), Math.max(4, cr(i, t, 6)), Math.max(4, cr(i, t, 7))]);
  }
  // the last station carries the nose drop and a Catmull-Rom pass must not
  // round it off: the lip is a chosen number (FIN_STATS.noseH) and the whole
  // jump is measured against it.
  const last = S[S.length - 1];
  out[out.length - 1] = [last[0], last[1], last[3], last[5], last[6], last[7]];
  return out;
}

// ---- THE STATION STEP AND THE CROSS-SECTION, both budget numbers.
//
// The shell costs 2 * (PROF_T.length - 1) triangles per station gap and every
// one of them is COLLIDABLE, so these two constants are the feature's price.
// At 3.0 m and 15 profile points the six spines (652 m of crest) cost ~5.9 k
// collidable triangles — inside what increment 24's blade and teeth cost
// together (5,710), on a budget with 4,787 spare. The detail that would have
// wanted a finer step lives in the field buffer instead, where it is free.
//
// 3.0 m is also honest against what it is approximating: the terrain under it
// is a 1.56 m/px bare-earth DEM resampled to a 2.0 m stamp, so a 3 m chord on a
// 40 deg crest is the same order of fidelity as the ground it sits on.
const SPINE_STEP = 3.0;

// THE CROSS-SECTION. `t` runs -1 (one chute floor) through 0 (the crest) to +1
// (the next chute floor) and the profile is the bake's own:
//
//     dz(t) = h * (1 - t^2)^1.35
//
// chosen there for two properties that are the entire "rideable" claim, and
// re-stated here because this is the file that has to honour them:
//   * FLAT AT THE CREST. dz/dt = 0 at t = 0, so the +/-0.19 band — about 4 m
//     across on a 10 m half-width — falls 3.4 % of h. On a 9 m spine that is a
//     30 cm crown over 4 m: a rider stands on it and turns on it.
//   * TANGENT TO THE GROUND at t = +/-1. The spine melts into the chute floor
//     with no crease and no step for a ski to catch, which is what killed the
//     fence: a blade has a base edge and a spine does not.
// Its steepest point is t ~ 0.6, running 1.40 * h / w — 48 deg of cross-fall on
// a 9 m spine over an 11 m half-width, which is what the footage's flanks read.
//
// The samples are DENSER AT THE EDGES AND AT THE STEEPEST BAND and sparser over
// the flat crest, because that is where the curvature is. Fifteen points, and
// the outermost pair (0.955) is what keeps the last metre of flank from
// chording across the ground and reading as a lip.
const PROF_T = [-1, -0.955, -0.88, -0.75, -0.58, -0.38, -0.19, 0,
                0.19, 0.38, 0.58, 0.75, 0.88, 0.955, 1];
const PROF_P = PROF_T.map((t) => Math.pow(Math.max(0, 1 - t * t), 1.35));

/** one spine's station frames + surface rows, in the donor frame.
 *  Each frame carries everything the slab band needs, so the slabs sit ON the
 *  shell by construction rather than near it. */
function spineRows(P, seed) {
  const F = [];
  for (let k = 0; k < P.length; k++) {
    const [x, y, h0, rk, wl, wr] = P[k];
    const a = P[Math.max(0, k - 1)], b = P[Math.min(P.length - 1, k + 1)];
    let tx = b[0] - a[0], ty = b[1] - a[1];
    const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
    // the crest tangent points DOWNHILL (FIN_RIBS descends), so n = (-ty, tx)
    // is the +t side and a strip wound prev[i] -> row[i] -> row[i+1] has an
    // UPWARD normal. That is derived, not chosen — the winding bug of increment
    // 24 was exactly this arithmetic done by hand — and work/fin_wind_check.mjs
    // re-measures it off the shipped buffer either way.
    const nx = -ty, ny = tx;
    // A SNOW SPINE IS NOT A ROCK FIN AND DOES NOT BREAK LIKE ONE. Increment 24
    // modulated its blade height by 0.72-1.28 to make broken rock; here the
    // same term is 0.92-1.08, because the footage's spines swell and pinch
    // gently and a snow roll that lost a quarter of its height every 12 m would
    // read as moguls.
    // (`fbm` here returns -1..+1 about zero, NOT 0..1. Increment 24's blade
    // wrote `fbm(...) - 0.5` for its crest wander and `0.72 + 0.56 * fbm` for
    // its height break, which biased both terms hard to one side — the wander
    // ran -1.5..+0.5, so every rib leaned the same way. Every noise term below
    // is written against the real range.)
    const brk = 0.96 + 0.09 * fbm(x * 0.031, y * 0.031, 2, 2.1, 0.5, seed);
    const h = h0 * brk;
    // ...and the crest WANDERS across its own line, tapered to nothing at the
    // two base rings so the spine still dies exactly on the chute lines.
    const wob = fbm(x * 0.048, y * 0.048, 2, 2.1, 0.5, seed + 11);
    const f = { x, y, tx, ty, nx, ny, h, rk, wl, wr, wob, seed, row: null };
    f.row = PROF_T.map((t) => shellPoint(f, t));
    F.push(f);
  }
  return F;
}

/** THE SHELL SURFACE AT ANY CROSS-PARAMETER, and there is exactly ONE of these
 *  because the slabs have to sit on the surface that SHIPS rather than on an
 *  idealised one. The first cut had a second, smoother `surfAt` for the slabs;
 *  the crest wander and the wind ripple then put plates up to 0.3 m off the
 *  shell, and work/fin_wind_check.mjs found grazing rays from the crest
 *  slipping under a floating plate and hitting the far side of it from behind.
 *  One function, one surface.
 *
 *  WIND TEXTURE is bounded so it cannot break additivity: the multiplier is
 *  1 +/- 0.095 * shape and `dz` is clamped at 0 besides. The footage's crests
 *  are wind-buffed rather than smooth and this is what stops a 20 m wide snow
 *  surface reading as extruded plastic. `shape` is 0 at both feet, so the two
 *  base rings stay EXACTLY on the terrain — texture, wander and all. */
function shellPoint(f, t) {
  const tc = clamp(t, -1, 1);
  const w = tc < 0 ? f.wl : f.wr;
  const shape = Math.max(0, 1 - tc * tc);
  const off = tc * w + f.wob * Math.min(f.wl, f.wr) * 0.11 * shape;
  const px = f.x + f.nx * off, py = f.y + f.ny * off;
  // ONE OCTAVE, AND ITS WAVELENGTH IS SET BY THE STATION STEP. The first cut
  // added a second term at 0.62 (a 1.6 m wavelength) on top of this one, and a
  // surface sampled every 3.0 m along the crest and 1.5-2.5 m across cannot
  // carry it: it aliased straight into the facet normals, and under a flat-
  // shaded material that is not texture, it is a field of white and blue
  // triangular shards — visible in the first crest render as a 3 m facet the
  // size of a garage door. 0.13 is a ~7.7 m wavelength, three samples per
  // period, and it reads as wind-buffed snow instead of as a mistake.
  const rip = 0.055 * fbm(px * 0.13, py * 0.13, 2, 2.1, 0.5, f.seed + 3);
  const dz = Math.max(0, Math.pow(shape, 1.35) * f.h * (1 + rip * shape));
  return [px, py, gz(px, py) + dz];
}

/** ...and THE SHIPPED SHELL IS FACETED, which is a different surface again.
 *  `shellPoint` is the smooth surface the strip is SAMPLED from; what actually
 *  gets drawn is the chord between two PROF_T samples, and the smooth surface
 *  can stand up to ~0.3 m above that chord where the 1.6 m wind ripple falls
 *  between two samples. A slab whose feet were placed on the smooth surface
 *  therefore floated over the drawn one, and work/fin_wind_check.mjs found
 *  grazing crest rays going in under the float and hitting the plate's far
 *  inner face from behind — three of them, twice, through two different
 *  attempts at fixing it by hand.
 *
 *  So a slab's feet are placed by INTERPOLATING THE ROW THAT SHIPS. This lands
 *  exactly on the drawn facet across the section; `SLAB_SINK` covers the
 *  remaining chord error along the crest and through each quad's diagonal. */
function rowAt(f, t) {
  const tc = clamp(t, -1, 1);
  let i = 0;
  while (i < PROF_T.length - 2 && PROF_T[i + 1] < tc) i++;
  const u = clamp((tc - PROF_T[i]) / (PROF_T[i + 1] - PROF_T[i]), 0, 1);
  const a = f.row[i], b = f.row[i + 1];
  return [lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u) - SLAB_SINK];
}
const SLAB_SINK = 0.14;

/** emit a quad with whichever winding puts its normal on the same side as
 *  `ref`. Getting this by hand is what made increment 24's blade see-through;
 *  every face in this section is emitted through here or through the strip
 *  loop, whose orientation is derived above and measured by the wind gate. */
function quadOut(B, a, b, c, d, ref, cA, cB, cC, cD) {
  const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
  const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
  const fx = uy * vz - uz * vy, fy = uz * vx - ux * vz, fz = ux * vy - uy * vx;
  if (fx * ref[0] + fy * ref[1] + fz * ref[2] >= 0) quad(B, a, b, c, d, cA, cB, cC, cD);
  else quad(B, a, d, c, b, cA, cD, cC, cB);
}

/** the same thing with the reference DERIVED instead of typed: the outward
 *  direction of a face on a convex body is centre-of-face minus centre-of-body.
 *  A slab is convex, so this is exact for all four of its faces, and it is what
 *  the flatirons use — the first cut named the four references by hand (up,
 *  downhill, +n, -n) and work/fin_wind_check.mjs found three back-facing slab
 *  sides from the crests, which is precisely the class of bug hand-naming a
 *  winding produces. */
function quadHull(B, a, b, c, d, C, cA, cB, cC, cD) {
  const mx = (a[0] + b[0] + c[0] + d[0]) / 4 - C[0];
  const my = (a[1] + b[1] + c[1] + d[1]) / 4 - C[1];
  const mz = (a[2] + b[2] + c[2] + d[2]) / 4 - C[2];
  quadOut(B, a, b, c, d, [mx, my, mz], cA, cB, cC, cD);
}

// the snow palette for the shell. A spine is not one white: the crest catches
// the light, the flanks fall into shade, and the wind leaves the crown scoured
// paler than the lee. All three are functions of position and of `t`, so a
// facet you stand next to has tone. (rockMaterial's volcanic grain multiplies
// by `rocky = 1 - smoothstep(0.09, 0.30, luma)`, which is ~0 for every colour
// here — so the shell renders as clean flat-shaded snow inside the rock mesh
// and needs no material of its own.)
function snowTone(px, py, t, rng) {
  const wind = 0.5 + 0.5 * fbm(px * 0.085, py * 0.085, 2, 2.05, 0.5, 4181);
  const c0 = mixc(SNOW, SNOW_LO, clamp(0.10 + 0.42 * Math.abs(t) - 0.16 * wind, 0, 0.62));
  return jitc(c0, rng, 0.022);
}

/** the spine shell + its nose face. Returns the triangles emitted. */
function spineShell(B, rng, F, seed) {
  const t0 = bufTris(B);
  for (let k = 1; k < F.length; k++) {
    const prev = F[k - 1].row, row = F[k].row;
    for (let i = 0; i < PROF_T.length - 1; i++) {
      const cA = snowTone(prev[i][0], prev[i][1], PROF_T[i], rng);
      const cB = snowTone(row[i + 1][0], row[i + 1][1], PROF_T[i + 1], rng);
      quad(B, prev[i], row[i], row[i + 1], prev[i + 1], cA, cA, cB, cB);
    }
  }
  // ---- THE NOSE FACE.
  //
  // The last station stands FIN_STATS.noseH above the hill and the ground drops
  // away under it, so the face is that ring run NOSE_LIP metres down the crest's
  // own direction and dropped onto the terrain. On a 34 deg landing a 5.5 m lip
  // over 1.1 m of run is an 80 deg face: a drop you air, not a roll you ride.
  //
  // It is ONE RING, welded to the hill at its foot, so it is additive by the
  // same argument as the shell, it cannot overhang, and it cannot hide a shell.
  // And because the profile already tapers to zero at both feet, the face is a
  // ROUNDED PROW — the full drop is at the crest and it feathers to nothing in
  // the gullies. That is 001502, and it is also why the big number is safe to
  // build: you can only take it by being on the crest.
  const NOSE_LIP = 1.1;
  const f = F[F.length - 1];
  const lip = f.row, foot = [];
  for (let i = 0; i < lip.length; i++) {
    const px = lip[i][0] + f.tx * NOSE_LIP, py = lip[i][1] + f.ty * NOSE_LIP;
    foot.push([px, py, gz(px, py)]);
  }
  const ref = [f.tx, f.ty, 0.35];                     // out of the face, downhill
  for (let i = 0; i < lip.length - 1; i++) {
    // the lip line whitens, the face itself is shaded snow — a fresh break in a
    // wind slab, which is what every one of these noses is
    const cT = snowTone(lip[i][0], lip[i][1], PROF_T[i] * 0.5, rng);
    const cB = jitc(mixc(SNOW_LO, lin(0x9db4d4), 0.38), rng, 0.05);
    quadOut(B, lip[i], foot[i], foot[i + 1], lip[i + 1], ref, cT, cB, cB, cT);
  }
  return bufTris(B) - t0;
}

// ==========================================================================
// THE FLATIRON SLABS — the thing Greg named, built where the footage puts it.
// ==========================================================================
//
// A flatiron is a bedding plane that the hillside has cut across: a flat slab
// LYING WITH THE DIP, its uphill edge buried in the slope and its downhill edge
// standing proud as a step, with the next one below overlapping it. That is
// exactly the read on the right flank of 001444 and 001502 — a stepped band of
// dark plates, snow lying in the gaps between them, running down the flank and
// wrapping the nose — and it is NOT a boulder field and NOT a wall.
//
// So a slab here is FOUR CORNERS ON THE SPINE SURFACE, raised: the uphill pair
// by a few centimetres, the downhill pair by SLAB_H, and a riser dropped from
// the downhill edge back to the surface. Four quads, eight triangles, and the
// corners come from `surfAt` so every slab lies on the shell rather than near
// it. About a third of them carry a second, smaller plate set back uphill —
// that is the STACK, and it is what makes a band read as strata instead of as
// scattered tiles.
//
// WHERE THEY GO, and all three terms are measured or from the footage:
//   * the FLANK BAND, t 0.42-0.92. Off the crest, because the footage's crest
//     is clean snow you ski; off the chute floor, because a chute floor with
//     rock in it is a stuck spot and work/fin_ride.mjs finds those the hard way.
//   * a BAND, not a scatter. `patch` is a smoothstep on a 24 m-wavelength fbm
//     along the crest, so the slabs arrive in coherent runs of ten to thirty
//     metres with clean snow between them — which is the footage's read and the
//     one thing a per-slab probability cannot produce.
//   * modulated by `rockAt`, the aerial's own bare-rock raster and the same
//     signal that places every other outcrop in this file. It MODULATES rather
//     than gates, and that is deliberate: the raster is stubbed to zero in the
//     deploy build (RASTER_OUTCROPS below) and reads 0 over most of this reef
//     even in the lab, so hanging the whole band on it built 67 slabs on six
//     spines — measured, and a reef with no rock on it is the fence bug with a
//     different shape.
//   * FORCED ON AROUND EVERY NOSE. The last ~26 m of every spine gets the band
//     regardless, because every nose in the footage breaks rock at the lip and
//     that is what makes a drop read as a drop when you look back up at it.
const SLAB_BAND = [0.40, 0.93];
// A PLATE SPANS TWO STATIONS (6 m) AND A NEW ONE STARTS EVERY ONE (3 m), so
// they SHINGLE: each plate's uphill half lies under the one above it and only
// its downhill half is exposed. That is what "stacked" means and what 001444
// shows — a continuous overlapping stair down the flank, not a row of separate
// ledges. Plates that spanned a single station came out as 3 m stubs and read
// as rubble.
const SLAB_SPAN = 2, SLAB_STRIDE = 1;
// AND THE STEP IS BOUNDED BY THE FALL ACROSS THE PLATE, which is the difference
// between a flatiron and a fin. A bedding plane lies WITH the dip: over 6 m of
// a 48 deg flank the ground drops ~6 m, and a plate that rises 1.8 m at its
// downhill edge — which the first cut's `th` did — is tilted back out of the
// hill and renders as a black blade sticking out of the snow. That is exactly
// what the first nose-from-below render came back with. Capping the rise at
// 45 % of the plate's own fall keeps every plate DESCENDING, at about half the
// flank's angle, with its downhill edge standing off as a step. 1.15 m is the
// absolute ceiling on top of that: these are ledges, not towers.
const SLAB_RISE_FRAC = 0.45, SLAB_RISE_MAX = 1.15;

/** ONE PLATE, CLOSED ON FIVE SIDES. Four base corners (uphill pair, downhill
 *  pair, in that order), a lift at the uphill edge and a thickness at the
 *  downhill one: the top lies with the dip, the downhill edge drops back to the
 *  base as a riser, and the two sides and the uphill end close it.
 *
 *  THE UPHILL END AND THE TWO SIDES ARE NOT OPTIONAL, which the second and
 *  third attempts at this both learnt the hard way. The stacked plate was first
 *  built as a bare top + riser, on the reasoning that its own sides are hidden
 *  by the plate under it — they are not, at a grazing angle from the crest, and
 *  a ray that goes in the open side hits the riser's INNER face and comes back
 *  as a back-facing first hit in work/fin_wind_check.mjs §3. Both plates go
 *  through here now and the gate is what says so. The base itself is left open
 *  and that is safe: it is buried, by SLAB_SINK on the shell and by lying on
 *  the plate below in the stack.
 *  @returns 10 triangles. */
function emitPlate(B, bUL, bUR, bDL, bDR, lift, th, cTop, cRis) {
  const up = (q, d) => [q[0], q[1], q[2] + d];
  const pUL = up(bUL, lift), pUR = up(bUR, lift);
  const pDL = up(bDL, th), pDR = up(bDR, th);
  const C = [(bUL[0] + bUR[0] + bDL[0] + bDR[0] + pDL[0] + pDR[0]) / 6,
             (bUL[1] + bUR[1] + bDL[1] + bDR[1] + pDL[1] + pDR[1]) / 6,
             (bUL[2] + bUR[2] + bDL[2] + bDR[2] + pDL[2] + pDR[2]) / 6];
  quadHull(B, pUL, pUR, pDR, pDL, C, cTop);      // the plate, lying with the dip
  quadHull(B, pDL, pDR, bDR, bDL, C, cRis);      // the step at its downhill edge
  quadHull(B, pUL, pDL, bDL, bUL, C, cRis);      // its two sides
  quadHull(B, pUR, pDR, bDR, bUR, C, cRis);
  quadHull(B, pUL, pUR, bUR, bUL, C, cRis);      // and its uphill end
  return { pUL, pUR, pDL, pDR };
}

// ---- AND THE ROCK AT THE LIP, which is what makes a nose read as a DROP.
//
// The first v3 renders had the spine shells and the flank bands right and the
// noses still reading as rounded snow prows from below — `spine4-nose-from-
// below` and `spine6-nose-from-below` both came back with a smooth white mound
// where the drop is. That is a real miss against the footage: 001502 and
// 001439 are shot at the lip and BOTH have granite breaking out of it. A snow
// roll and a cliff look the same from underneath until there is rock in the
// break.
//
// So every nose gets a band of plates set into its own drop face, proud of it
// by half a metre, running from the lip down onto the apron below — three
// either side of the crest.
//
// THEY START AT |t| = 0.30 AND THE CENTRE OF THE LIP IS LEFT CLEAN, which is
// both the footage and a playability decision. In 001502 the take-off is a
// tongue of snow with rock either side; and these plates are in the VISUAL
// buffer, so rock over the line a rider actually launches from would be rock a
// rider flies through. Off the line it is scenery; on the line it would be a
// bug you can see.
function noseRock(B, rng, F, seed) {
  let n = 0;
  const RUN = 2.6;                      // m of face the band covers, lip to apron
  for (let back = 0; back < 2; back++) {
    const f = F[F.length - 1 - back];
    if (!f || f.h < 2.0) continue;
    for (const sg of [-1, 1]) {
      for (let j = 0; j < 3; j++) {
        if (rng() > (back ? 0.45 : 0.92)) continue;
        const tA = sg * clamp(0.30 + j * 0.19 + rr(rng, -0.03, 0.03), 0.26, 0.94);
        const tB = sg * clamp(0.30 + (j + 1) * 0.19 - rr(rng, 0.02, 0.07), 0.26, 0.96);
        const lA = rowAt(f, tA), lB = rowAt(f, tB);
        const foot = (q) => { const x = q[0] + f.tx * RUN, y = q[1] + f.ty * RUN;
          return [x, y, gz(x, y)]; };
        const fA = foot(lA), fB = foot(lB);
        // the face's own outward normal, DERIVED from the quad rather than
        // assumed, then forced to point downhill so `pro` is always outward
        const ux = lB[0] - lA[0], uy = lB[1] - lA[1], uz = lB[2] - lA[2];
        const vx = fA[0] - lA[0], vy = fA[1] - lA[1], vz = fA[2] - lA[2];
        let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
        const L = Math.hypot(nx, ny, nz) || 1; nx /= L; ny /= L; nz /= L;
        if (nx * f.tx + ny * f.ty < 0) { nx = -nx; ny = -ny; nz = -nz; }
        const pro = rr(rng, 0.34, 0.78) * (back ? 0.7 : 1);
        const o = (q) => [q[0] + nx * pro, q[1] + ny * pro, q[2] + nz * pro];
        const oA = o(lA), oB = o(lB), ofA = o(fA), ofB = o(fB);
        const P8 = [lA, lB, fA, fB, oA, oB, ofA, ofB];
        const C = [0, 1, 2].map((k) => P8.reduce((a, q) => a + q[k], 0) / 8);
        const base = mixc(ROCK, j % 2 ? ROCK_GREY : ROCK_TAN, rr(rng, 0.14, 0.40));
        const cTop = jitc(mixc(base, ROCK_DK, rr(rng, 0.16, 0.40)), rng, 0.14);
        const cRis = jitc(mixc(base, ROCK_DK, rr(rng, 0.46, 0.72)), rng, 0.12);
        quadHull(B, oA, oB, ofB, ofA, C, cTop);      // the face of the band
        quadHull(B, lA, lB, oB, oA, C, cTop);        // its top edge, at the lip
        quadHull(B, fA, fB, ofB, ofA, C, cRis);      // its foot, on the apron
        quadHull(B, lA, fA, ofA, oA, C, cRis);       // and its two sides
        quadHull(B, lB, fB, ofB, oB, C, cRis);
        n++;
      }
    }
  }
  return n;
}

function flatironBand(B, rng, F, seed) {
  let n = 0;
  const nStat = F.length;
  // arc length from the nose, for the nose-band boost
  const back = new Array(nStat).fill(0);
  for (let k = nStat - 2; k >= 0; k--)
    back[k] = back[k + 1] + Math.hypot(F[k + 1].x - F[k].x, F[k + 1].y - F[k].y);

  for (let k = 1; k + SLAB_SPAN < nStat; k += SLAB_STRIDE) {
    const f0 = F[k], f1 = F[k + SLAB_SPAN];
    if (f0.h < 2.2) continue;                        // no flank yet to break out of
    const noseBoost = 1 - smooth(4, 26, back[k]);    // 1 at the lip, 0 by 26 m up
    for (const sg of [-1, 1]) {
      // the two flanks band INDEPENDENTLY — a spine with the same rock in the
      // same place on both sides is a symmetric extrusion, which is the read
      // this rebuild exists to get rid of
      const bandNoise = fbm(f0.x * 0.043 + sg * 40, f0.y * 0.043, 2, 2.1, 0.5, seed + 61);
      // a HARD-EDGED patch rather than a soft one: inside a band nearly every
      // station plates, outside it none do, and the edge is a few metres. A soft
      // gate spreads the same slab count evenly and reads as gravel. The
      // thresholds straddle ZERO because `fbm` is -1..+1 about zero.
      const patch = smooth(-0.07, 0.09, bandNoise);
      const g = patch * (0.78 + 0.22 * f0.rk) + 0.85 * noseBoost;
      if (rng() > g) continue;
      const tiers = 1 + (rng() < 0.62 ? 1 : 0) + (rng() < 0.30 ? 1 : 0);
      for (let j = 0; j < tiers; j++) {
        const tc = SLAB_BAND[0] + (SLAB_BAND[1] - SLAB_BAND[0])
                 * ((j + 0.5) / tiers + (rng() - 0.5) * 0.16);
        const halfW = rr(rng, 0.14, 0.26);            // half-width in t
        const tA = clamp(tc - halfW, 0.30, 0.97) * sg;
        const tB = clamp(tc + halfW, 0.30, 0.97) * sg;
        const uL = rowAt(f0, tA), uR = rowAt(f0, tB);
        const dL = rowAt(f1, tA), dR = rowAt(f1, tB);
        // the step height: taller where the spine is taller and at the nose,
        // then bounded by the plate's own fall (SLAB_RISE_FRAC) so it lies with
        // the dip instead of standing out of it
        const fall = Math.max(0.2, ((uL[2] + uR[2]) - (dL[2] + dR[2])) / 2);
        const th = Math.min(SLAB_RISE_MAX, fall * SLAB_RISE_FRAC,
          rr(rng, 0.45, 1.0) * (0.55 + 0.055 * f0.h) * (1 + 0.45 * noseBoost));
        // banded granite: alternate tiers take the grey and the tan, and the
        // riser is always the darkest face on the plate because it is the one
        // in its own shadow — which is how a stepped band reads as stepped
        const base = mixc(ROCK, (k + j) % 2 ? ROCK_GREY : ROCK_TAN, rr(rng, 0.18, 0.46));
        const cTop = jitc(mixc(base, ROCK_DK, rr(rng, 0.10, 0.34)), rng, 0.14);
        const cRis = jitc(mixc(base, ROCK_DK, rr(rng, 0.44, 0.70)), rng, 0.12);
        // the uphill edge stays buried by SLAB_SINK alone: it is the downhill
        // one that has to stand proud, and a flatiron's uphill edge is under
        // the hill by definition.
        const T = emitPlate(B, uL, uR, dL, dR, 0.0, th, cTop, cRis);
        n++;
        // ---- THE STACK. A second, shorter plate SET BACK UPHILL on top of the
        // first, standing on its top surface: that is the whole difference
        // between "a step" and "stacked", and it is what "flatiron stacked
        // rocks" names. About a third of the plates carry one.
        if (rng() < 0.36) {
          const mid = (a, b, u) => [lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u)];
          const v0 = 0.08, v1 = rr(rng, 0.52, 0.70);
          const c2 = jitc(mixc(base, ROCK_LIT, rr(rng, 0.06, 0.26)), rng, 0.13);
          emitPlate(B, mid(T.pUL, T.pDL, v0), mid(T.pUR, T.pDR, v0),
                       mid(T.pUL, T.pDL, v1), mid(T.pUR, T.pDR, v1),
                       0.0, Math.min(SLAB_RISE_MAX * 0.7, fall * (v1 - v0) * SLAB_RISE_FRAC,
                                     th * rr(rng, 0.5, 0.85)), c2, cRis);
          n++;
        }
      }
    }
  }
  return n;
}

export const FIN_STAT = {
  spines: 0, ribs: 0, shellTris: 0, slabs: 0, noseRocks: 0, slabTris: 0, crestM: 0,
};

/** Build the Fingers.
 *  @param B   the COLLIDABLE hero buffer — the spine shells and their noses.
 *  @param Bv  the VISUAL-ONLY buffer (world.mjs's `kt-rock-field`) — the
 *             flatiron slab bands. Omitted, they go in `B` and the collidable
 *             cost rises; every shipped path passes it. */
export function buildFingers(B, Bv = null) {
  const rng = makeRng('the-fingers-spines');
  const B2 = buf();                                   // shell: snow, laced last
  const B3 = buf();                                   // slabs: rock
  FIN_STAT.spines = 0; FIN_STAT.shellTris = 0;
  FIN_STAT.slabs = 0; FIN_STAT.noseRocks = 0; FIN_STAT.crestM = 0;
  for (let i = 0; i < FIN_RIBS.length; i++) {
    // the baked crest is in THIS WORLD's frame; everything in this module works
    // in the donor frame and is mapped back once at the end (see the header), so
    // the crest is carried across here and nowhere else.
    const S = FIN_RIBS[i].map((s) => {
      const d = toDonor(s[0], s[1]);
      return [d[0], d[1], s[2], s[3], s[4], s[5], s[6], s[7], s[8]];
    });
    if (S.length < 3) continue;
    const P = resampleSpine(S, SPINE_STEP);
    if (P.length < 3) continue;
    const F = spineRows(P, i * 13 + 3);
    FIN_STAT.shellTris += spineShell(B2, rng, F, i * 13 + 3);
    FIN_STAT.slabs += flatironBand(B3, rng, F, i * 13 + 3);
    FIN_STAT.noseRocks += noseRock(B3, rng, F, i * 13 + 3);
    for (let k = 1; k < F.length; k++)
      FIN_STAT.crestM += Math.hypot(F[k].x - F[k - 1].x, F[k].y - F[k - 1].y);
    FIN_STAT.spines++;
  }
  FIN_STAT.ribs = FIN_STAT.spines;                    // the gates' old name
  FIN_STAT.slabTris = bufTris(B3);
  // The shell is snow already; the lace only lifts the up-facing facets a
  // little further so the crest reads brighter than the flanks under a low sun.
  snowLace(B2, { snow: SNOW, lo: 0.72, hi: 0.99, amount: 0.30, patchy: 0.22, seed: 2511 });
  // The slabs get the opposite treatment and a deliberately small amount: what
  // the footage shows is DARK rock with snow lying in the gaps between plates,
  // not white plates. Only the flattest tops take any, and they take a third.
  snowLace(B3, { snow: SNOW_LO, lo: 0.80, hi: 0.99, amount: 0.34, patchy: 0.45, seed: 2512 });
  if (!Bv) appendBuf(B2, B3);
  appendBuf(B, B2);
  if (Bv) appendBuf(Bv, B3);
  return FIN_STAT;
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

// INCREMENT 23 — the chute floors, in the DONOR frame, so the scatter above can
// be kept OUT of the five lines a rider actually skis. A 3 m boulder standing in
// the middle of a 16 m chute floor is not character, it is a stuck spot, and the
// ride harness finds it the hard way.
const CHUTE_D = FIN_CHUTES.map((P) => P.map((p) => {
  const d = toDonor(p[0], p[1]);
  return [d[0], d[1]];
}));
function inChuteFloor(x, y, hw) {
  for (const P of CHUTE_D) {
    for (let i = 0; i < P.length - 1; i++) {
      const a = P[i], b = P[i + 1];
      const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy || 1e-9;
      let t = ((x - a[0]) * dx + (y - a[1]) * dy) / L2; t = t < 0 ? 0 : t > 1 ? 1 : t;
      if (Math.hypot(x - a[0] - dx * t, y - a[1] - dy * t) < hw) return true;
    }
  }
  return false;
}

const BIN = buf();
export const OUT_STAT = { skipped: 0 };

// DEPLOY PARITY — THE RASTER-SEEDED SCATTER IS OFF IN THE LAB.
//
// The shipped Red Dog build stubs `SECTOR_ROCKS` to [] (export manifest D13.2),
// so in the deploy `rockAt()` returns 0 everywhere, the `rk < 0.12` test below
// rejects every candidate, and the KT top has NO scattered outcrops at all.
// Greg has ridden both and asked for the deployed look back: "when I go to KT,
// there are no scattered rocks at the top... I prefer that". specs/0003 makes
// the deploy the reference, so the lab matches it — with a named switch rather
// than a deleted function, because the raster and every line below it are still
// good work and flipping this back is one character.
//
// THIS GATES THE RASTER SCATTER ONLY. Everything authored or traced stays:
// buildSpires (the Eagle's Nest summit knob and its towers), buildCornice, and
// buildFingers' five traced chutes and six ribs — that reef is the increment
// Greg asked to keep, and it is geometry placed on a photograph rather than 160
// boulders a raster threw at a 1.1 km box.
const RASTER_OUTCROPS = false;

export function buildOutcrops(B, budget = 620) {
  if (!RASTER_OUTCROPS) { OUT_STAT.skipped = 0; return 0; }
  const rng = makeRng('kt-rock-field');
  OUT_STAT.skipped = 0;
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
    const snow = 0.55 + 0.3 * rng();
    // THE OUTCROP IS STILL DRAWN — INTO A BIN. `reefGeo` itself consumes rng
    // draws (3-6 prisms, each with its own jitter), so simply not calling it for
    // a boulder inside a chute floor would change the shared `kt-rock-field`
    // stream and move every outcrop placed after it. So the geometry is built
    // exactly as it always was and thrown into a scratch buffer instead of the
    // scene: same draws, same count, same positions for everything else, and no
    // 3 m block standing in the middle of a 16 m chute floor for the ride
    // harness to find the hard way. (The post-draw rule of REPORT §17.3, applied
    // inside a loop that writes straight into a buffer.)
    const dst = inChuteFloor(x, y, 7.5) ? BIN : B;
    if (dst === BIN) OUT_STAT.skipped++;
    reefGeo(dst, rng, x, y, gz(x, y) - 0.9, r, Math.min(h, 11), snow);
    BIN.pos.length = 0; BIN.col.length = 0;
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
  const field = buf();
  const spires = buildSpires(hero);
  // THE FINGERS SPLITS ACROSS BOTH BUFFERS, deliberately: the spine shells and
  // their nose faces are what a rider skis and fall off, so they are collidable;
  // the flatiron slab bands sit on 45-55 deg flanks nobody stands on and go in
  // the visual buffer, where the world has 620 k of render headroom and zero
  // collidable headroom. See §THE FINGERS above and scene/poulsen.mjs's header
  // for the same trade made on the cliff band.
  buildFingers(hero, field);
  const corniceSamples = buildCornice(hero);
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
