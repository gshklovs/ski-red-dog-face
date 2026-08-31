// The fill kit: red fir / Jeffrey pine, granite, skiers, cars, base buildings,
// fences, trail signs. Everything is a flat vertex-coloured buffer built once
// and instanced or merged — no textures except the sign/terminal lettering
// canvases in signs.mjs.

import {
  buf, tri, quad, box, tube, prism, plate, makeRng, rr, ri, pick,
  lin, mixc, scalec, jitc, clamp, lerp, smooth, snowLace,
} from './lib/core.mjs';

export const PAL = {
  bark:     lin(0x342a22), barkRed: lin(0x4a3529), barkPale: lin(0x6d5c4c),
  needle:   lin(0x1e3527), needleLo: lin(0x14251b), needleHi: lin(0x2e5138),
  pineGrn:  lin(0x27412e),
  snow:     lin(0xeef4fd), snowLo: lin(0xc3d2e6),
  rock:     lin(0x59544c), rockLo: lin(0x3e3a34), granite: lin(0x7d7566),
  steel:    lin(0x9aa2a8), steelLo: lin(0x6d757c), galv: lin(0xb6bcc0),
  dark:     lin(0x23262a), black: lin(0x121417),
  white:    lin(0xeef1f4), offWhite: lin(0xd8dde2),
  red:      lin(0xc32026), redLo: lin(0x8e1418),
  yellow:   lin(0xe0b422), orange: lin(0xe07422), blue: lin(0x2c62b4),
  green:    lin(0x2f8a44),
  timber:   lin(0x5a4634), timberLo: lin(0x3d2f22), stucco: lin(0xc9b391),
  roof:     lin(0x3a3a3e), glass: lin(0x2b3a4a),
  asphalt:  lin(0x44464a),
  jacket:   [lin(0xd2402f), lin(0x2f6fd2), lin(0xe0b422), lin(0x27a35a), lin(0xe8e8ea), lin(0x8b3fbc)],
};

// ------------------------------------------------------------------- trees
// Red fir: a narrow spire with a long bare trunk (view-20's trunk spacing and
// bark colour), stacked skirts that narrow upward, snow lace on every
// up-facing face. `tiers` and `sides` set the LOD.
// `lite` collapses the two-segment trunk into one 3-sided taper. At the range
// the cheapest LOD is used (200 m+) the trunk is a few pixels of bark under the
// skirts, and this is where the triangles for the promoted sector came from.
export function firGeo(seed, { h = 26, tiers = 6, sides = 7, lean = 0.05, flock = 0.30, lite = false } = {}) {
  const rng = makeRng(seed);
  const B = buf();
  const R = h * rr(rng, 0.072, 0.098);          // red fir is a narrow SPIRE
  const bare = h * rr(rng, 0.16, 0.27);         // trunk visible below the skirts
  const tilt = [rr(rng, -lean, lean), rr(rng, -lean, lean)];
  const bark = jitc(rng() < 0.35 ? PAL.barkRed : PAL.bark, rng, 0.16);
  const trunkTop = [tilt[0] * h, tilt[1] * h, h * 0.99];
  if (lite) {
    tube(B, [0, 0, 0], trunkTop, R * 0.28, bark, 3, R * 0.04);
  } else {
    tube(B, [0, 0, 0], [tilt[0] * h * 0.5, tilt[1] * h * 0.5, h * 0.55], R * 0.30, bark, sides > 5 ? 5 : 4, R * 0.16);
    tube(B, [tilt[0] * h * 0.5, tilt[1] * h * 0.5, h * 0.55], trunkTop, R * 0.16, bark, 4, R * 0.03);
  }
  const needle = mixc(PAL.needle, rng() < 0.4 ? PAL.pineGrn : PAL.needleLo, rng());
  for (let t = 0; t < tiers; t++) {
    const f = t / (tiers - 1);
    const z0 = bare + (h - bare) * f * 0.92;
    const rad = R * (1.42 - 1.14 * f) * rr(rng, 0.88, 1.12);
    const hh = (h - bare) / tiers * rr(rng, 1.7, 2.3);
    const cx = tilt[0] * z0, cy = tilt[1] * z0;
    const apex = [cx + tilt[0] * hh, cy + tilt[1] * hh, z0 + hh];
    const col = mixc(needle, PAL.needleHi, 0.05 + 0.34 * f);
    const ring = [];
    for (let i = 0; i < sides; i++) {
      const a = (i / sides) * Math.PI * 2 + t * 0.7;
      const rj = rad * (0.78 + 0.34 * ((i * 7 + t * 3) % 5) / 5);
      ring.push([cx + Math.cos(a) * rj, cy + Math.sin(a) * rj, z0 - hh * 0.14]);
    }
    for (let i = 0; i < sides; i++) tri(B, ring[i], ring[(i + 1) % sides], apex, scalec(col, 0.82), col, col);
  }
  snowLace(B, { snow: PAL.snowLo, lo: 0.30, hi: 0.86, amount: flock, patchy: 0.55, seed: seed + 7 });
  return B;
}

// Jeffrey pine: rounder, sparser, warmer bark — the wind-bent ones out of rock
export function pineGeo(seed, { h = 20, sides = 6 } = {}) {
  const rng = makeRng(seed);
  const B = buf();
  const R = h * 0.16;
  const bark = jitc(PAL.barkPale, rng, 0.2);
  tube(B, [0, 0, 0], [rr(rng, -1, 1), rr(rng, -1, 1), h * 0.62], R * 0.22, bark, 4, R * 0.11);
  const needle = mixc(PAL.pineGrn, PAL.needleHi, rr(rng, 0.1, 0.6));
  for (let t = 0; t < 3; t++) {
    const z0 = h * (0.55 + t * 0.16);
    const rad = R * (1.5 - 0.4 * t);
    const cx = rr(rng, -1.4, 1.4), cy = rr(rng, -1.4, 1.4);
    prism(B, rng, { x: cx, y: cy, z: z0, r: rad, h: h * 0.20, sides, taper: t === 2 ? 0.15 : 0.72,
                    jit: 0.30, col: scalec(needle, 0.85), colTop: needle });
  }
  snowLace(B, { snow: PAL.snow, lo: 0.3, hi: 0.85, amount: 0.3, patchy: 0.5, seed: seed + 3 });
  return B;
}

export function snagGeo(seed, { h = 16 } = {}) {
  const rng = makeRng(seed);
  const B = buf();
  const c = jitc(PAL.barkPale, rng, 0.25);
  tube(B, [0, 0, 0], [rr(rng, -0.6, 0.6), rr(rng, -0.6, 0.6), h], h * 0.045, c, 4, h * 0.012);
  for (let i = 0; i < 3; i++) {
    const z = h * rr(rng, 0.45, 0.9), a = rr(rng, 0, 6.28), L = h * rr(rng, 0.12, 0.24);
    tube(B, [0, 0, z], [Math.cos(a) * L, Math.sin(a) * L, z + rr(rng, -1, 2)], h * 0.014, c, 3);
  }
  return B;
}

// --------------------------------------------------------------- granite
export function boulderGeo(seed, r = 2.2) {
  const rng = makeRng(seed);
  const B = buf();
  const n = ri(rng, 2, 4);
  for (let i = 0; i < n; i++) {
    const rr2 = r * rr(rng, 0.42, 0.8);
    prism(B, rng, {
      x: rr(rng, -r * 0.5, r * 0.5), y: rr(rng, -r * 0.5, r * 0.5), z: rr(rng, -r * 0.35, r * 0.2),
      r: rr2, h: rr2 * rr(rng, 0.7, 1.5), sides: ri(rng, 5, 7), taper: rr(rng, 0.45, 0.85),
      jit: 0.26, yaw: rr(rng, 0, 6.28), tiltX: rr(rng, -0.3, 0.3) * rr2, tiltY: rr(rng, -0.3, 0.3) * rr2,
      col: jitc(PAL.rockLo, rng, 0.18), colTop: jitc(PAL.rock, rng, 0.16),
    });
  }
  snowLace(B, { snow: PAL.snow, lo: 0.42, hi: 0.86, amount: 0.85, patchy: 0.22, seed: seed + 11 });
  return B;
}

// outcrop: a low blocky reef of granite, used on the ridge and in the trees
export function outcropGeo(seed, r = 5, h = 2.4) {
  const rng = makeRng(seed);
  const B = buf();
  for (let i = 0; i < ri(rng, 4, 7); i++) {
    const a = rr(rng, 0, 6.28), d = rr(rng, 0, r);
    prism(B, rng, {
      x: Math.cos(a) * d, y: Math.sin(a) * d, z: rr(rng, -0.6, 0.1),
      r: rr(rng, r * 0.18, r * 0.36), h: h * rr(rng, 0.4, 0.95), sides: ri(rng, 5, 7),
      taper: rr(rng, 0.5, 0.9), jit: 0.24, yaw: rr(rng, 0, 6.28),
      col: jitc(PAL.rockLo, rng, 0.2), colTop: jitc(PAL.granite, rng, 0.14),
    });
  }
  snowLace(B, { snow: PAL.snow, lo: 0.40, hi: 0.84, amount: 0.75, patchy: 0.3, seed: seed + 5 });
  return B;
}

// ---------------------------------------------------------------- people
// A skier: boots-to-helmet stack plus skis. Origin at the snow.
export function skierGeo(seed, jacket, { skis = true, sit = false } = {}) {
  const rng = makeRng(seed);
  const B = buf();
  const j = jacket || pick(rng, PAL.jacket);
  const pants = rng() < 0.5 ? PAL.dark : lin(0x2e3742);
  if (sit) {
    box(B, { x: 0, y: 0, z: 0.10, sx: 0.44, sy: 0.30, sz: 0.42, col: pants });     // thighs fwd
    box(B, { x: 0, y: -0.24, z: 0.40, sx: 0.46, sy: 0.30, sz: 0.56, col: j });
    box(B, { x: 0, y: -0.26, z: 0.96, sx: 0.24, sy: 0.24, sz: 0.24, col: PAL.dark });
    if (skis) for (const s of [-0.12, 0.12]) {
      box(B, { x: s, y: 0.30, z: -0.62, sx: 0.10, sy: 1.68, sz: 0.05, col: rng() < 0.5 ? PAL.red : PAL.white });
      box(B, { x: s, y: 0.16, z: -0.60, sx: 0.10, sy: 0.14, sz: 0.55, col: PAL.dark });
    }
    return B;
  }
  const lean = rr(rng, 0.0, 0.16);
  box(B, { x: -0.13, y: 0, z: 0.09, sx: 0.16, sy: 0.30, sz: 0.66, col: pants });
  box(B, { x: 0.13, y: 0, z: 0.09, sx: 0.16, sy: 0.30, sz: 0.66, col: pants });
  box(B, { x: 0, y: lean * 0.4, z: 0.72, sx: 0.44, sy: 0.28, sz: 0.52, col: j });
  box(B, { x: -0.27, y: lean * 0.5, z: 0.74, sx: 0.13, sy: 0.16, sz: 0.44, col: scalec(j, 0.85) });
  box(B, { x: 0.27, y: lean * 0.5, z: 0.74, sx: 0.13, sy: 0.16, sz: 0.44, col: scalec(j, 0.85) });
  box(B, { x: 0, y: lean * 0.9, z: 1.24, sx: 0.23, sy: 0.24, sz: 0.24, col: PAL.dark });
  box(B, { x: 0, y: lean * 0.9 + 0.11, z: 1.30, sx: 0.20, sy: 0.05, sz: 0.09, col: PAL.glass });
  if (skis) for (const s of [-0.16, 0.16]) {
    box(B, { x: s, y: -0.28, z: 0.0, sx: 0.10, sy: 1.72, sz: 0.045, col: rng() < 0.5 ? PAL.red : PAL.yellow });
    box(B, { x: s, y: -0.02, z: 0.02, sx: 0.11, sy: 0.15, sz: 0.11, col: PAL.dark });
  }
  return B;
}

// ------------------------------------------------------------------ cars
export function carGeo(seed) {
  const rng = makeRng(seed);
  const B = buf();
  const body = jitc(pick(rng, [lin(0x9aa0a6), lin(0x2c3138), lin(0xb9bec4), lin(0x7d2b28),
                               lin(0x24405f), lin(0xe4e6e8), lin(0x3d4a3c)]), rng, 0.1);
  const L = rr(rng, 4.2, 4.9), Wd = rr(rng, 1.75, 1.95), H = rr(rng, 0.62, 0.78);
  box(B, { x: 0, y: 0, z: 0.28, sx: Wd, sy: L, sz: H, col: body });
  box(B, { x: 0, y: -0.15, z: 0.28 + H, sx: Wd * 0.86, sy: L * 0.48, sz: 0.48, col: mixc(body, PAL.glass, 0.55) });
  box(B, { x: 0, y: -0.15, z: 0.28 + H + 0.48, sx: Wd * 0.82, sy: L * 0.46, sz: 0.06, col: PAL.snow });
  for (const sx of [-1, 1]) for (const sy of [-1, 1])
    box(B, { x: sx * Wd * 0.46, y: sy * L * 0.32, z: 0.02, sx: 0.16, sy: 0.62, sz: 0.56, col: PAL.black });
  return B;
}

// Distant-lot car: body + glasshouse only, 24 triangles against carGeo's 84.
// The three lots north of y = +600 are 200-290 m from anything you ski and read
// as rows of coloured blocks at that range; the fidelity they were spending is
// worth more on the promoted sector's ground. (COMPOSING rule 17: background
// dressing loses before anything the player rides.)
export function carGeoLo(seed) {
  const rng = makeRng(seed);
  const B = buf();
  const body = jitc(pick(rng, [lin(0x9aa0a6), lin(0x2c3138), lin(0xb9bec4), lin(0x7d2b28),
                               lin(0x24405f), lin(0xe4e6e8), lin(0x3d4a3c)]), rng, 0.1);
  const L = rr(rng, 4.2, 4.9), Wd = rr(rng, 1.75, 1.95), H = rr(rng, 0.62, 0.78);
  box(B, { x: 0, y: 0, z: 0.16, sx: Wd, sy: L, sz: H + 0.12, col: body });
  box(B, { x: 0, y: -0.15, z: 0.28 + H, sx: Wd * 0.86, sy: L * 0.48, sz: 0.52,
           col: mixc(body, PAL.glass, 0.55) });
  return B;
}

export function snowcatGeo(seed) {
  const rng = makeRng(seed);
  const B = buf();
  box(B, { x: 0, y: 0, z: 0.35, sx: 2.5, sy: 4.6, sz: 0.9, col: PAL.red });
  box(B, { x: 0, y: -0.5, z: 1.25, sx: 2.1, sy: 1.9, sz: 1.1, col: PAL.glass });
  box(B, { x: 0, y: -0.5, z: 2.35, sx: 2.2, sy: 2.0, sz: 0.12, col: PAL.snow });
  for (const s of [-1, 1]) box(B, { x: s * 1.35, y: 0, z: 0.05, sx: 0.7, sy: 4.4, sz: 0.7, col: PAL.black });
  box(B, { x: 0, y: -2.9, z: 0.35, sx: 3.6, sy: 0.28, sz: 1.0, col: PAL.steelLo });   // blade
  box(B, { x: 0, y: 2.7, z: 0.3, sx: 2.9, sy: 0.9, sz: 0.6, col: PAL.steelLo });      // tiller
  return B;
}

// ------------------------------------------------------------- structures
// Base-area lodges: gabled timber-and-stucco blocks with heavy snow on the roof
// (views 13, 24, 29). storeys x 3.4 m.
export function lodgeGeo(seed, sx, sy, storeys, kind = 'lodge') {
  const rng = makeRng(seed);
  const B = buf();
  const h = storeys * 3.4;
  const wall = kind === 'transit' ? mixc(PAL.stucco, PAL.timberLo, 0.55)
    : mixc(PAL.stucco, PAL.timber, rr(rng, 0.25, 0.7));
  box(B, { x: 0, y: 0, z: 0, sx, sy, sz: h, col: wall });
  // window bands
  for (let s = 1; s <= storeys; s++) {
    const z = (s - 1) * 3.4 + 1.3;
    for (const [ax, ay, w] of [[0, sy / 2 + 0.02, sx], [0, -sy / 2 - 0.02, sx]]) {
      box(B, { x: ax, y: ay, z, sx: w * 0.86, sy: 0.06, sz: 1.25, col: PAL.glass });
    }
    for (const ax of [sx / 2 + 0.02, -sx / 2 - 0.02]) {
      box(B, { x: ax, y: 0, z, sx: 0.06, sy: sy * 0.84, sz: 1.25, col: PAL.glass });
    }
  }
  // gable roof, ridge along y, with a snow cap
  const rh = Math.min(4.4, Math.max(2.0, sx * 0.20));
  const ov = 0.9;
  const A = [-sx / 2 - ov, -sy / 2 - ov, h], Bp = [sx / 2 + ov, -sy / 2 - ov, h];
  const Cc = [sx / 2 + ov, sy / 2 + ov, h], D = [-sx / 2 - ov, sy / 2 + ov, h];
  const r0 = [0, -sy / 2 - ov, h + rh], r1 = [0, sy / 2 + ov, h + rh];
  quad(B, A, Bp, r0, r0, PAL.roof);
  quad(B, D, r1, r1, Cc, PAL.roof);
  quad(B, A, r0, r1, D, PAL.roof);
  quad(B, Bp, Cc, r1, r0, PAL.roof);
  // snow slab on both pitches
  const lift = 0.34;
  const A2 = [A[0] * 0.97, A[1] * 0.97, h + lift * 0.4], B2 = [Bp[0] * 0.97, Bp[1] * 0.97, h + lift * 0.4];
  const C2 = [Cc[0] * 0.97, Cc[1] * 0.97, h + lift * 0.4], D2 = [D[0] * 0.97, D[1] * 0.97, h + lift * 0.4];
  const s0 = [0, r0[1] * 0.97, h + rh + lift], s1 = [0, r1[1] * 0.97, h + rh + lift];
  quad(B, A2, s0, s1, D2, PAL.snow);
  quad(B, B2, C2, s1, s0, PAL.snow);
  return B;
}

export function hutGeo(seed, sx = 4.2, sy = 3.0, h = 2.6, col = null) {
  const rng = makeRng(seed);
  const B = buf();
  box(B, { x: 0, y: 0, z: 0, sx, sy, sz: h, col: col || PAL.offWhite });
  box(B, { x: 0, y: -sy / 2 - 0.02, z: h * 0.45, sx: sx * 0.5, sy: 0.06, sz: 0.9, col: PAL.glass });
  box(B, { x: 0, y: 0, z: h, sx: sx + 0.5, sy: sy + 0.5, sz: 0.20, col: PAL.roof });
  box(B, { x: 0, y: 0, z: h + 0.20, sx: sx + 0.4, sy: sy + 0.4, sz: 0.26, col: PAL.snow });
  return B;
}

// snow fence / slow-zone rope: posts + a webbing band
export function fenceRun(B, pts, gz, { h = 1.15, col = PAL.orange, post = PAL.dark, band = true } = {}) {
  for (let i = 0; i < pts.length; i++) {
    const [x, y] = pts[i];
    const z = gz(x, y);
    tube(B, [x, y, z], [x, y, z + h], 0.045, post, 4);
  }
  if (!band) return;
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
    const az = gz(ax, ay), bz = gz(bx, by);
    const a0 = [ax, ay, az + h * 0.86], b0 = [bx, by, bz + h * 0.86];
    const a1 = [ax, ay, az + h * 0.46], b1 = [bx, by, bz + h * 0.46];
    quad(B, a1, b1, b0, a0, col);
    quad(B, a0, b0, b1, a1, col);
  }
}

// bamboo slalom / boundary wand
export function wand(B, x, y, z, { h = 1.5, col = PAL.yellow } = {}) {
  tube(B, [x, y, z], [x + 0.06, y, z + h], 0.028, col, 3);
}

// ------------------------------------------------------------ race venue
// The Stifel Palisades Tahoe Cup GS course on Red Dog Face (views 26-28):
// continuous red A-net down both sides of the course, blue/red gate panels on
// the dye line, and the e-tron finish arch with a banner wall at the foot.
export function aNet(B, pts, gz, { h = 1.75, col = null } = {}) {
  const c = col || PAL.red;
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
    const az = gz(ax, ay), bz = gz(bx, by);
    if (i % 2 === 0) tube(B, [ax, ay, az], [ax, ay, az + h], 0.05, PAL.steelLo, 4);
    const a0 = [ax, ay, az + h], b0 = [bx, by, bz + h];
    const a1 = [ax, ay, az + 0.06], b1 = [bx, by, bz + 0.06];
    quad(B, a1, b1, b0, a0, c);
    quad(B, a0, b0, b1, a1, scalec(c, 0.8));
  }
}

export function gatePanel(B, x, y, z, yaw, col) {
  const c = Math.cos(yaw), s = Math.sin(yaw);
  for (const off of [-0.42, 0.42]) {
    tube(B, [x - s * off, y + c * off, z], [x - s * off, y + c * off, z + 1.55], 0.028, PAL.steel, 3);
  }
  const P = (u, h) => [x - s * u, y + c * u, z + h];
  quad(B, P(-0.42, 0.62), P(0.42, 0.62), P(0.42, 1.40), P(-0.42, 1.40), col);
  quad(B, P(-0.42, 1.40), P(0.42, 1.40), P(0.42, 0.62), P(-0.42, 0.62), scalec(col, 0.8));
}

export function finishArch(B, x, y, z, yaw, { span = 22, h = 6.4 } = {}) {
  const c = Math.cos(yaw), s = Math.sin(yaw);
  const P = (u, v, hh) => [x + u * c - v * s, y + u * s + v * c, z + hh];
  for (const u of [-span / 2, span / 2]) {
    box(B, { x: P(u, 0, 0)[0], y: P(u, 0, 0)[1], z, sx: 0.75, sy: 0.75, sz: h, yaw, col: PAL.red });
  }
  // banner beam across the top only
  quad(B, P(-span / 2, -0.55, h - 1.3), P(span / 2, -0.55, h - 1.3), P(span / 2, -0.55, h), P(-span / 2, -0.55, h), PAL.red);
  quad(B, P(-span / 2, 0.55, h), P(span / 2, 0.55, h), P(span / 2, 0.55, h - 1.3), P(-span / 2, 0.55, h - 1.3), PAL.red);
  quad(B, P(-span / 2, -0.55, h), P(span / 2, -0.55, h), P(span / 2, 0.55, h), P(-span / 2, 0.55, h), scalec(PAL.red, 0.75));
}

// low sponsor banner wall along the finish arena (view-26's blue/white run)
export function bannerWall(B, pts, gz, { h = 1.25 } = {}) {
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
    const az = gz(ax, ay), bz = gz(bx, by);
    const col = i % 2 ? PAL.blue : PAL.white;
    quad(B, [ax, ay, az], [bx, by, bz], [bx, by, bz + h], [ax, ay, az + h], col);
    quad(B, [ax, ay, az + h], [bx, by, bz + h], [bx, by, bz], [ax, ay, az], scalec(col, 0.8));
  }
}

export function liftMazeGeo(seed, w = 16, d = 12) {
  const rng = makeRng(seed);
  const B = buf();
  for (let i = 0; i < 5; i++) {
    const x = -w / 2 + i * (w / 4);
    const pts = [];
    for (let j = 0; j <= 4; j++) pts.push([x, -d / 2 + j * (d / 4)]);
    fenceRun(B, pts, () => 0, { h: 1.0, col: PAL.red, post: PAL.steelLo });
  }
  return B;
}

// ==========================================================================
// KT-22 SUMMIT PROPS — ported verbatim from eagles-nest-kt22-B-truth-01's
// kit.mjs, which composed each of them from the bundle's reference photos:
//   eagleGeo    the Shane McConkey memorial, black steel silhouette with swept
//               wing slats, on the main spire top          (views 8 / 9)
//   flagLine    the prayer-flag string from the statue to the rock  (view 8)
//   dangerSign  the DANGER CLIFF AREA board at the top of the Fingers (view 12)
//   handline    the fixed steel-cable handline up the scramble route (view 7)
// They are geometry in a local frame and carry no world coordinates, so the
// port is a copy — the placement is what goes through the transform.
// ==========================================================================
// string. Origin at the base of the stand.
export function eagleGeo(seed) {
  const rng = makeRng(seed);
  const B = buf();
  const K = PAL.black;
  // stand: two angled legs + crossbar
  tube(B, [-0.35, 0.15, 0], [0, 0, 0.85], 0.05, PAL.dark, 4);
  tube(B, [0.35, 0.15, 0], [0, 0, 0.85], 0.05, PAL.dark, 4);
  tube(B, [0, -0.4, 0], [0, 0, 0.85], 0.05, PAL.dark, 4);
  // body: an arced stack of thin boxes leaning forward (perched eagle)
  const segs = 7;
  for (let i = 0; i < segs; i++) {
    const f = i / (segs - 1);
    const z = 0.85 + f * 1.15;
    const y = -0.15 + Math.sin(f * 2.2) * 0.28;
    const w = 0.34 * (1 - f * 0.55);
    box(B, { x: 0, y, z, sx: w, sy: 0.30 * (1 - f * 0.4), sz: 0.20, col: K });
  }
  // head + beak
  box(B, { x: 0, y: 0.28, z: 2.08, sx: 0.16, sy: 0.22, sz: 0.18, col: K });
  box(B, { x: 0, y: 0.42, z: 2.10, sx: 0.06, sy: 0.12, sz: 0.07, col: PAL.steelLo });
  // wings: swept-back ribbon slats, folded (view-8's silhouette)
  for (const s of [-1, 1]) {
    for (let i = 0; i < 6; i++) {
      const f = i / 5;
      const a = [s * 0.12, -0.1 - f * 0.15, 1.0 + f * 0.9];
      const b = [s * (0.35 + f * 0.35), -0.55 - f * 0.55, 0.65 + f * 0.55];
      const w = 0.09 * (1 - f * 0.3);
      quad(B, [a[0] - w * s, a[1], a[2]], [a[0] + w * s, a[1], a[2] + 0.05],
           [b[0] + w * s, b[1], b[2] + 0.05], [b[0] - w * s, b[1], b[2]], K);
      quad(B, [b[0] - w * s, b[1], b[2]], [b[0] + w * s, b[1], b[2] + 0.05],
           [a[0] + w * s, a[1], a[2] + 0.05], [a[0] - w * s, a[1], a[2]], scalec(K, 1.6));
    }
    // tail feathers
    box(B, { x: s * 0.08, y: -0.72, z: 0.72, sx: 0.10, sy: 0.55, sz: 0.05, col: K });
  }
  return B;
}

// prayer-flag string from the statue to a rock: little coloured quads on a line
export function flagLine(B, p0, p1, rng) {
  tube(B, p0, p1, 0.012, PAL.dark, 3);
  const cols = [PAL.red, PAL.yellow, PAL.green, PAL.blue, PAL.white];
  const L = Math.hypot(p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]);
  const n = Math.max(3, Math.floor(L / 0.35));
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const sag = 0.18 * Math.sin(Math.PI * t);
    const x = lerp(p0[0], p1[0], t), y = lerp(p0[1], p1[1], t), z = lerp(p0[2], p1[2], t) - sag;
    const c = cols[i % 5];
    const dx = (p1[0] - p0[0]) / L * 0.13, dy = (p1[1] - p0[1]) / L * 0.13;
    quad(B, [x - dx, y - dy, z], [x + dx, y + dy, z], [x + dx, y + dy, z - 0.2], [x - dx, y - dy, z - 0.2], c);
    quad(B, [x - dx, y - dy, z - 0.2], [x + dx, y + dy, z - 0.2], [x + dx, y + dy, z], [x - dx, y - dy, z], scalec(c, 0.8));
  }
}

// the DANGER CLIFF AREA board of view-12: orange board on a post
export function dangerSign(B, x, y, z, yaw) {
  const c = Math.cos(yaw), s = Math.sin(yaw);
  tube(B, [x, y, z], [x, y, z + 1.9], 0.05, PAL.dark, 4);
  const P = (u, h) => [x - s * u, y + c * u, z + h];
  quad(B, P(-0.45, 1.15), P(0.45, 1.15), P(0.45, 1.78), P(-0.45, 1.78), PAL.orange);
  quad(B, P(-0.45, 1.78), P(0.45, 1.78), P(0.45, 1.15), P(-0.45, 1.15), scalec(PAL.orange, 0.8));
}

// fixed steel-cable handline up the scramble (view-7)
export function handline(B, pts, gz) {
  let prev = null;
  for (const [x, y] of pts) {
    const z = gz(x, y) + 0.75;
    tube(B, [x, y, z - 0.75], [x, y, z], 0.03, PAL.steelLo, 4);
    if (prev) tube(B, prev, [x, y, z], 0.02, PAL.steel, 3);
    prev = [x, y, z];
  }
}

// ------------------------------------------------- OSM-footprint buildings
// UPPER MOUNTAIN INCREMENT 1. The Gold Coast complex and High Camp are real
// mapped OSM `building` ways (work/bake_upper_props.py -> upper-props.mjs), so
// they are EXTRUDED FROM THEIR OWN PLAN rather than approximated by a box the
// way the base-village massing had to be. `ring` is world-frame ENU, open.
//
//   gold-coast-lodge  view-9 / view-18: "a long three-storey red-and-black
//                     building with a glazed south face, an outdoor deck full
//                     of tables, and GOLD COAST lettered across the deck fascia"
//   high-camp         view-10: "heavy concrete-and-glass multi-storey blocks
//                     with the granite ridge behind"
//
// The deck is hung on the ring's SOUTH-facing edges only — the ones whose
// outward normal points south — which is where view-9 puts it and where the
// sun is at 215 deg / 33 deg.
export function ringBuilding(B, ring, z0, {
  storeys = 3, wall = null, roof = null, glass = 0.62, deck = 0, story = 3.6,
} = {}) {
  const n = ring.length;
  const h = storeys * story;
  const W = wall || mixc(PAL.timber, PAL.redLo, 0.45);
  const RF = roof || PAL.roof;
  // centroid, for the inward test
  let cx = 0, cy = 0;
  for (const p of ring) { cx += p[0]; cy += p[1]; }
  cx /= n; cy /= n;
  for (let i = 0; i < n; i++) {
    const a = ring[i], b = ring[(i + 1) % n];
    const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
    // outward normal
    let nx = dy / L, ny = -dx / L;
    if ((a[0] + dx / 2 - cx) * nx + (a[1] + dy / 2 - cy) * ny < 0) { nx = -nx; ny = -ny; }
    const shade = 0.86 + 0.20 * clamp(-ny * 0.6 - nx * 0.5 + 0.5, 0, 1);
    quad(B, [a[0], a[1], z0], [b[0], b[1], z0], [b[0], b[1], z0 + h], [a[0], a[1], z0 + h],
         scalec(W, shade));
    // glazing bands, one per storey, inset a hair so they do not z-fight
    for (let s = 0; s < storeys; s++) {
      const zb = z0 + s * story + story * 0.34;
      const gw = ny < -0.25 ? glass : glass * 0.55;      // the SOUTH face is the glazed one
      const m0 = 0.5 - gw / 2, m1 = 0.5 + gw / 2;
      const p0 = [a[0] + dx * m0 + nx * 0.05, a[1] + dy * m0 + ny * 0.05];
      const p1 = [a[0] + dx * m1 + nx * 0.05, a[1] + dy * m1 + ny * 0.05];
      quad(B, [p0[0], p0[1], zb], [p1[0], p1[1], zb],
           [p1[0], p1[1], zb + story * 0.42], [p0[0], p0[1], zb + story * 0.42], PAL.glass);
    }
    // outdoor deck on the south flank (view-9)
    if (deck > 0 && ny < -0.35) {
      const d0 = [a[0] + nx * deck, a[1] + ny * deck], d1 = [b[0] + nx * deck, b[1] + ny * deck];
      const dz = z0 + story * 0.30;
      quad(B, [a[0], a[1], dz], [b[0], b[1], dz], [d1[0], d1[1], dz], [d0[0], d0[1], dz], PAL.timberLo);
      quad(B, [d0[0], d0[1], dz], [d1[0], d1[1], dz],
           [d1[0], d1[1], dz + 1.05], [d0[0], d0[1], dz + 1.05], PAL.timber);   // deck fascia
    }
  }
  // flat roof with a parapet and a snow slab
  plate(B, ring.map((p) => [p[0], p[1], z0 + h]), RF);
  plate(B, ring.map((p) => [p[0], p[1], z0 + h + 0.55]).reverse(), PAL.snow);
  for (let i = 0; i < n; i++) {
    const a = ring[i], b = ring[(i + 1) % n];
    quad(B, [a[0], a[1], z0 + h], [b[0], b[1], z0 + h],
         [b[0], b[1], z0 + h + 0.55], [a[0], a[1], z0 + h + 0.55], scalec(RF, 1.1));
  }
}

// a rank of deck tables — view-9's "outdoor deck full of tables"
export function deckTables(B, ring, z0, rng, nMax = 14) {
  let cx = 0, cy = 0;
  for (const p of ring) { cx += p[0]; cy += p[1]; }
  cx /= ring.length; cy /= ring.length;
  let placed = 0;
  for (let i = 0; i < ring.length && placed < nMax; i++) {
    const a = ring[i], b = ring[(i + 1) % ring.length];
    const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
    let nx = dy / L, ny = -dx / L;
    if ((a[0] + dx / 2 - cx) * nx + (a[1] + dy / 2 - cy) * ny < 0) { nx = -nx; ny = -ny; }
    if (ny > -0.35) continue;
    for (let t = 0.12; t < 0.9 && placed < nMax; t += 0.16) {
      const x = a[0] + dx * t + nx * rr(rng, 1.6, 4.6);
      const y = a[1] + dy * t + ny * rr(rng, 1.6, 4.6);
      const z = z0 + 3.6 * 0.30;
      box(B, { x, y, z: z + 0.70, sx: 1.5, sy: 0.85, sz: 0.09, col: PAL.timberLo });
      for (const s of [-1, 1]) tube(B, [x + s * 0.6, y, z], [x + s * 0.6, y, z + 0.70], 0.05, PAL.dark, 4);
      placed++;
    }
  }
}
