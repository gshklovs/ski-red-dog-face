// THE VILLAGE AT PALISADES TAHOE — the base area, rebuilt from mapped plans.
//
// Greg, on the flagship world: arriving off Mountain Run has to read as "the
// village". Increment 1 shipped it as 24 eyeballed rectangles with FLAT roofs
// (`layout.mjs` BUILDINGS + `kit.mjs` lodgeGeo/ringBuilding), and a flat roof is
// the one thing the Village at Palisades does not have anywhere: it is a single
// 2002-2004 build in one idiom — four storeys, ochre and barn-red stucco over a
// stone base, deep-eaved STEEP HIPPED roofs with dormers, and a continuous
// timber balcony band on every upper floor. Roofs and balconies are what you
// actually see from the top of Mountain Run, so they are what this module
// spends its triangles on.
//
// Plans are real: `village-props.mjs`, 124 OSM building ways through this
// world's own transform (work/bake_village.py). Nothing here is placed by eye.
//
// ROOFS OVER ARBITRARY PLANS. The mall blocks are L- and U-shaped, so an
// oriented-bounding-box gable would hang in mid air over the re-entrant corners.
// Instead each roof is an INWARD OFFSET of the building's own ring, lifted:
// every vertex steps toward the polygon centroid by min(inset, 0.42 * its own
// distance to the centroid) — the cap keeps the offset ring from crossing itself
// on a thin wing — and the ring-to-ring band is the pitch. That is a hip roof
// over any plan, for two triangles an edge, and it follows the real footprint.

import { buf, quad, tri, box, tube, plate, makeRng, rr, ri, lin, mixc, scalec, jitc, clamp, smooth } from './lib/core.mjs';
import { PAL } from './kit.mjs';
import { VILLAGE_BUILDINGS, VILLAGE_MALL } from './village-props.mjs';

// The palette is off the photographs, not off a mood board. view-46 is the
// mall block to build first ("ochre/tan stucco over a granite base course, deep
// gabled dormers breaking the eaves, TEAL-GREEN shutters, timber X-braced
// balconies on every upper floor"); view-55 is the same street in 2007 summer
// with nothing hidden under snow; view-36 and view-51 put the ochre blocks and
// their BROWN roofs next to the Funitel terminal for scale.
//
// The roofs are brown, not slate. Increment 1's flat grey parapets are the
// single biggest reason the base area did not read as this village.
const STUCCO = [lin(0xc0a678), lin(0xcdbb96), lin(0xa8845c), lin(0xb08a5e), lin(0x99694c)];
const STONE = lin(0x7d766c);          // the granite base course, grey-buff
const ROOF_V = [lin(0x5a4232), lin(0x4a382c), lin(0x6b503a)];
const BALC = lin(0x5a4128);
const BALC_HI = lin(0x7d5f3c);
const SHUTTER = lin(0x2e6b5e);        // view-46's teal-green shutters
// Swept pavers in a snow village read PALE, not black: view-51's plaza is a
// warm mid-grey with snow blown across it. The first cut used the asphalt tone
// and the mall came back as tarmac patches lying on the snowfield.
const PAVER = lin(0x968e84);

const STOREY = 3.5;

/** centroid of a ring */
function ringC(ring) {
  let cx = 0, cy = 0;
  for (const p of ring) { cx += p[0]; cy += p[1]; }
  return [cx / ring.length, cy / ring.length];
}

/** inward-offset copy of a ring, capped so a thin wing cannot fold through 0 */
function inset(ring, d) {
  const [cx, cy] = ringC(ring);
  return ring.map((p) => {
    const dx = cx - p[0], dy = cy - p[1], L = Math.hypot(dx, dy) || 1;
    const k = Math.min(d, L * 0.42);
    return [p[0] + dx / L * k, p[1] + dy / L * k];
  });
}

/** outward-offset copy — the eave overhang */
const outset = (ring, d) => inset(ring, -d);

// ---------------------------------------------------------------- one building
// `ring` open (first vertex not repeated), ENU metres. z0 is the ground it
// stands on. Walls, a glazing + balcony band per upper storey, a hipped roof
// with eaves and a snow slab, dormers on the long faces of the big blocks.
export function villageBuilding(B, ring, z0, {
  storeys = 3, wall = null, roof = null, rng = null, balconies = true,
  dormers = 0, stoneBase = true, story = STOREY,
} = {}) {
  const n = ring.length;
  const h = storeys * story;
  const W = wall || STUCCO[1];
  const RF = roof || ROOF_V[0];
  const [cx, cy] = ringC(ring);
  const base = stoneBase ? Math.min(1.5, story * 0.42) : 0;

  const edge = (i) => {
    const a = ring[i], b = ring[(i + 1) % n];
    const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
    let nx = dy / L, ny = -dx / L;
    if ((a[0] + dx / 2 - cx) * nx + (a[1] + dy / 2 - cy) * ny < 0) { nx = -nx; ny = -ny; }
    return { a, b, dx, dy, L, nx, ny };
  };

  for (let i = 0; i < n; i++) {
    const { a, b, dx, dy, L, nx, ny } = edge(i);
    // south faces catch the sun: the same shade term the rest of the world uses
    const shade = 0.84 + 0.24 * clamp(-ny * 0.6 - nx * 0.5 + 0.5, 0, 1);
    if (base > 0) {
      quad(B, [a[0], a[1], z0], [b[0], b[1], z0], [b[0], b[1], z0 + base], [a[0], a[1], z0 + base],
           scalec(STONE, shade));
    }
    quad(B, [a[0], a[1], z0 + base], [b[0], b[1], z0 + base],
         [b[0], b[1], z0 + h], [a[0], a[1], z0 + h], scalec(W, shade));

    if (L < 3.5) continue;                      // a 3 m return gets no windows
    for (let s = 0; s < storeys; s++) {
      const zb = z0 + s * story + story * 0.36;
      const gw = 0.80, m0 = 0.5 - gw / 2, m1 = 0.5 + gw / 2;
      const p0 = [a[0] + dx * m0 + nx * 0.06, a[1] + dy * m0 + ny * 0.06];
      const p1 = [a[0] + dx * m1 + nx * 0.06, a[1] + dy * m1 + ny * 0.06];
      quad(B, [p0[0], p0[1], zb], [p1[0], p1[1], zb],
           [p1[0], p1[1], zb + story * 0.40], [p0[0], p0[1], zb + story * 0.40], PAL.glass);
      // TEAL-GREEN SHUTTERS either side of the window band (view-46). Two
      // quads, and they are the only saturated colour on the whole block.
      for (const m of [m0 - 0.055, m1 + 0.005]) {
        const q0 = [a[0] + dx * m + nx * 0.07, a[1] + dy * m + ny * 0.07];
        const q1 = [a[0] + dx * (m + 0.05) + nx * 0.07, a[1] + dy * (m + 0.05) + ny * 0.07];
        quad(B, [q0[0], q0[1], zb], [q1[0], q1[1], zb],
             [q1[0], q1[1], zb + story * 0.40], [q0[0], q0[1], zb + story * 0.40], SHUTTER);
      }
      // THE BALCONY BAND. Every upper floor of the mall carries one and it is
      // the village's loudest horizontal line — a deck plate, a fascia, a rail,
      // and the X-BRACING view-46 calls out, which is what stops the band
      // reading as a shelf.
      if (balconies && s >= 1 && L > 6) {
        const d = 1.5, zd = z0 + s * story + story * 0.30;
        const q0 = [a[0] + dx * 0.06, a[1] + dy * 0.06];
        const q1 = [a[0] + dx * 0.94, a[1] + dy * 0.94];
        const r0 = [q0[0] + nx * d, q0[1] + ny * d], r1 = [q1[0] + nx * d, q1[1] + ny * d];
        quad(B, [q0[0], q0[1], zd], [q1[0], q1[1], zd], [r1[0], r1[1], zd], [r0[0], r0[1], zd], BALC_HI);
        quad(B, [r0[0], r0[1], zd - 0.28], [r1[0], r1[1], zd - 0.28],
             [r1[0], r1[1], zd], [r0[0], r0[1], zd], BALC);
        quad(B, [r0[0], r0[1], zd], [r1[0], r1[1], zd],
             [r1[0], r1[1], zd + 1.02], [r0[0], r0[1], zd + 1.02], scalec(BALC, 1.12));
        // the X, one panel every ~4 m of rail
        const nX = Math.max(1, Math.round(L / 4.2));
        for (let k = 0; k < nX; k++) {
          const t0 = k / nX, t1 = (k + 1) / nX;
          const A0 = [r0[0] + (r1[0] - r0[0]) * t0, r0[1] + (r1[1] - r0[1]) * t0];
          const A1 = [r0[0] + (r1[0] - r0[0]) * t1, r0[1] + (r1[1] - r0[1]) * t1];
          const w = 0.16;
          quad(B, [A0[0] + nx * 0.03, A0[1] + ny * 0.03, zd],
               [A0[0] + nx * 0.03, A0[1] + ny * 0.03, zd + w],
               [A1[0] + nx * 0.03, A1[1] + ny * 0.03, zd + 1.02],
               [A1[0] + nx * 0.03, A1[1] + ny * 0.03, zd + 1.02 - w], scalec(BALC_HI, 1.1));
          quad(B, [A1[0] + nx * 0.03, A1[1] + ny * 0.03, zd],
               [A1[0] + nx * 0.03, A1[1] + ny * 0.03, zd + w],
               [A0[0] + nx * 0.03, A0[1] + ny * 0.03, zd + 1.02],
               [A0[0] + nx * 0.03, A0[1] + ny * 0.03, zd + 1.02 - w], scalec(BALC_HI, 1.1));
        }
      }
    }
  }

  // ------------------------------------------------------------- the roof
  // Steep: the Village's pitch is close to 45 deg and the eaves are deep.
  const eaveD = 1.25;
  const eave = outset(ring, eaveD);
  const span = Math.max(6, Math.min(26, Math.hypot(
    Math.max(...ring.map((p) => p[0])) - Math.min(...ring.map((p) => p[0])),
    Math.max(...ring.map((p) => p[1])) - Math.min(...ring.map((p) => p[1]))) * 0.5));
  const rh = clamp(span * 0.38, 2.6, 9.5);
  const ridge = inset(eave, span * 0.52);
  const ze = z0 + h, zr = ze + rh;

  for (let i = 0; i < n; i++) {
    const a = eave[i], b = eave[(i + 1) % n];
    const c = ridge[(i + 1) % n], d = ridge[i];
    const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
    let nx = dy / L, ny = -dx / L;
    if ((a[0] + dx / 2 - cx) * nx + (a[1] + dy / 2 - cy) * ny < 0) { nx = -nx; ny = -ny; }
    const shade = 0.88 + 0.20 * clamp(-ny * 0.5 + 0.5, 0, 1);
    quad(B, [a[0], a[1], ze], [b[0], b[1], ze], [c[0], c[1], zr], [d[0], d[1], zr], scalec(RF, shade));
    // snow on the pitch, a hair proud of it
    quad(B, [a[0], a[1], ze + 0.16], [b[0], b[1], ze + 0.16],
         [c[0], c[1], zr + 0.16], [d[0], d[1], zr + 0.16], scalec(PAL.snow, 0.94));
    // eave fascia — the deep shadow line under a Tahoe roof
    quad(B, [a[0], a[1], ze - 0.42], [b[0], b[1], ze - 0.42],
         [b[0], b[1], ze], [a[0], a[1], ze], scalec(RF, 0.72));
  }
  plate(B, ridge.map((p) => [p[0], p[1], zr]), scalec(RF, 1.06));
  plate(B, ridge.map((p) => [p[0], p[1], zr + 0.12]), PAL.snow);

  // ---------------------------------------------------------- the dormers
  // Gabled dormers on the longest sunlit face — the detail that stops a big
  // hipped block reading as a tent.
  if (dormers > 0 && rng) {
    let bi = 0, bl = 0;
    for (let i = 0; i < n; i++) {
      const e = edge(i);
      const score = e.L * (0.4 + 0.6 * clamp(-e.ny, 0, 1));
      if (score > bl) { bl = score; bi = i; }
    }
    const { a, dx, dy, L, nx, ny } = edge(bi);
    const k = Math.min(dormers, Math.max(1, Math.floor(L / 11)));
    for (let j = 0; j < k; j++) {
      const t = (j + 0.5) / k;
      const px = a[0] + dx * t + nx * (eaveD - 0.9);
      const py = a[1] + dy * t + ny * (eaveD - 0.9);
      const w = 2.6, dep = 2.4, dh = 2.2;
      const ux = dx / L, uy = dy / L;
      const c0 = [px - ux * w / 2, py - uy * w / 2], c1 = [px + ux * w / 2, py + uy * w / 2];
      const b0 = [c0[0] - nx * dep, c0[1] - ny * dep], b1 = [c1[0] - nx * dep, c1[1] - ny * dep];
      const apex = [px - nx * dep * 0.5, py - ny * dep * 0.5, ze + dh + 0.9];
      // cheeks, face, glazing and two roof planes
      quad(B, [c0[0], c0[1], ze], [c0[0], c0[1], ze + dh], [b0[0], b0[1], ze + dh], [b0[0], b0[1], ze], scalec(RF, 0.82));
      quad(B, [c1[0], c1[1], ze], [b1[0], b1[1], ze], [b1[0], b1[1], ze + dh], [c1[0], c1[1], ze + dh], scalec(RF, 0.95));
      quad(B, [c0[0], c0[1], ze], [c1[0], c1[1], ze], [c1[0], c1[1], ze + dh], [c0[0], c0[1], ze + dh], scalec(W, 1.02));
      quad(B, [c0[0] + ux * 0.4 + nx * 0.05, c0[1] + uy * 0.4 + ny * 0.05, ze + 0.5],
           [c1[0] - ux * 0.4 + nx * 0.05, c1[1] - uy * 0.4 + ny * 0.05, ze + 0.5],
           [c1[0] - ux * 0.4 + nx * 0.05, c1[1] - uy * 0.4 + ny * 0.05, ze + dh - 0.35],
           [c0[0] + ux * 0.4 + nx * 0.05, c0[1] + uy * 0.4 + ny * 0.05, ze + dh - 0.35], PAL.glass);
      tri(B, [c0[0], c0[1], ze + dh], [c1[0], c1[1], ze + dh], apex, scalec(RF, 1.12));
      tri(B, [c0[0], c0[1], ze + dh], apex, [b0[0], b0[1], ze + dh], scalec(RF, 0.9));
      tri(B, [c1[0], c1[1], ze + dh], [b1[0], b1[1], ze + dh], apex, scalec(RF, 0.9));
    }
  }
}

// -------------------------------------------------------------- the whole thing
/**
 * @param gz        groundZ(x, y)
 * @param veto      (building) => true to skip it — kept clear of a lift's load
 *                  point and off the ski runs; see world.mjs `villageVeto`
 */
export function buildVillage(gz, veto = () => false) {
  const B = buf();
  const rng = makeRng('village-2026');
  let built = 0, skipped = 0;

  // ---- the paved mall the buildings stand on. OSM's pedestrian ways ARE the
  // mall's centrelines; 9 m either side of them is the paver field of view-16.
  const Bp = buf();
  for (const w of VILLAGE_MALL) {
    for (let i = 0; i < w.pts.length - 1; i++) {
      const [ax, ay] = w.pts[i], [bx, by] = w.pts[i + 1];
      const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1;
      if (L > 90) continue;                    // a stray long connector, not mall
      const hw = w.area ? 9 : 3.4;
      const nx = dy / L * hw, ny = -dx / L * hw;
      const z = 0.10;
      quad(Bp, [ax + nx, ay + ny, gz(ax + nx, ay + ny) + z],
              [bx + nx, by + ny, gz(bx + nx, by + ny) + z],
              [bx - nx, by - ny, gz(bx - nx, by - ny) + z],
              [ax - nx, ay - ny, gz(ax - nx, ay - ny) + z], jitc(PAVER, rng, 0.06));
    }
  }

  for (const b of VILLAGE_BUILDINGS) {
    if (veto(b)) { skipped++; continue; }
    let z0 = 1e9;
    for (const p of b.ring) z0 = Math.min(z0, gz(p[0], p[1]));
    z0 -= 0.5;
    const big = b.area >= 1200;
    villageBuilding(B, b.ring, z0, {
      storeys: b.storeys,
      wall: jitc(STUCCO[ri(rng, 0, STUCCO.length - 1)], rng, 0.10),
      roof: jitc(ROOF_V[ri(rng, 0, ROOF_V.length - 1)], rng, 0.08),
      rng,
      balconies: b.storeys >= 2,
      dormers: big ? 3 : (b.storeys >= 3 ? 1 : 0),
      stoneBase: b.storeys >= 2,
    });
    built++;
  }
  return { B, plaza: Bp, built, skipped, total: VILLAGE_BUILDINGS.length };
}

export { VILLAGE_BUILDINGS, VILLAGE_MALL };
