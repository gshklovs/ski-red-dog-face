// Terrain meshes and the winter surface read.
//
// Five indexed, smooth-normal grids, all sampling the same groundZ():
//   bump   1.13 m  the mogul fields (Red Dog Face + Lower Dog Leg guts)
//   piste  1.70 m  every other run corridor
//   core   3.40 m  the playable pod
//   mid    9.00 m  the rest of the dem-tight frame
//   wide  34.00 m  the dem-wide frame (KT-22 massif, valley floor)
//   <sector> 5.00 m  each promoted sector's corridor band (EXHIBITION)
//   rim   90.00 m  the collidable end-of-data ring outside dem-wide
// plus a non-collidable polar `far` apron for the skyline.
// Adjacent grids share a one-cell overlap ring so the resolution change never
// opens a crack.
//
// COLOUR. No textures anywhere. The winter read is written into vertex colours:
//   * a baked SUN SHADE raster — lambert against a 215 deg / 33 deg afternoon
//     sun, times a marched cast-shadow term. On a north-facing face this is
//     what separates the lit west-tilted micro-slopes from the blue east-tilted
//     ones, and it is what makes 419 m of real relief read as relief.
//   * a sky-occlusion term (gullies and the corridor edges go bluer)
//   * per-style tint: groomed corduroy banding, mogul shading by local slope,
//     wind-scoured off-piste, plowed asphalt + snow berms at the base.

import { lin, mixc, clamp, lerp, smooth, fbm, vnoise } from './lib/core.mjs';
import { groundZ, demAt, masksAt, mogulAt, RASTER } from './ground.mjs';
import { rockAt } from './rock.mjs';
import { CORE, TIGHT, WIDE, WIDE_W, WORLD, PLAY, PLAY0, rasterOrigin, RIM, MASSIF, KT_DETAIL, SECTORS, FAR_R, sectorDist, sectorOwner, inSector, inCoreBox } from './layout.mjs';

// ------------------------------------------------------------------- sun
// Late-January afternoon. Azimuth measured from north, clockwise.
export const SUN_AZ = 215, SUN_EL = 33;
const az = SUN_AZ * Math.PI / 180, el = SUN_EL * Math.PI / 180;
export const SUN_DIR = [Math.sin(az) * Math.cos(el), Math.cos(az) * Math.cos(el), Math.sin(el)];

const C = {
  snowHi:   lin(0xfdfeff),   // full sun on packed snow
  snowMid:  lin(0xe9f1fb),
  snowLo:   lin(0xbccde3),   // blue shadow — the north-aspect signature
  snowDeep: lin(0x93a9c6),
  groom:    lin(0xfafcff),
  scour:    lin(0xe8eef7),
  packed:   lin(0xdde5ef),
  rock:     lin(0x6c655c),
  rockLit:  lin(0x8d8577),
  granite:  lin(0xa39a88),   // the summer-granite outcrops of view-14 / the aerial
  volcanic: lin(0x3b3a3c),   // KT-22's near-black volcanic rock (annotations.md,
                             // and aerial-close measures the Eagle's Nest east
                             // face at RGB (2.7, 12.7, 14.6) — luminance 10)
  pave:     lin(0x4e5054),
  dye:      lin(0x3f86dd),   // the blue course dye of views 27 / 28
  berm:     lin(0xdfe6ee),
  timber:   lin(0x4a4034),
  canopy:   lin(0x1c2b21),   // far forest read from above
  canopyLo: lin(0x14201a),
};

// ------------------------------------------------------- baked shade raster
// 5 m cells over the whole dem-tight frame. 14-step march toward the sun.
// Spans TIGHT u PLAY, so a promoted sector gets the same cast-shadow and
// sky-occlusion read as the core rather than falling off the edge of it.
// Origin FROZEN at the pre-increment extent and grown west in whole 5 m cells,
// for the same reason the ground raster is (ground.mjs): a shifted lattice
// would have re-shaded the whole front side.
const SH_RES = 5.0;
const SH_X0 = rasterOrigin(Math.min(TIGHT.x0, PLAY0.x0) - 40, Math.min(TIGHT.x0, PLAY.x0) - 40, SH_RES);
const SH_Y0 = rasterOrigin(Math.min(TIGHT.y0, PLAY0.y0) - 40, Math.min(TIGHT.y0, PLAY.y0) - 40, SH_RES);
const SH_NX = Math.ceil((Math.max(TIGHT.x1, PLAY.x1) - SH_X0 + 40) / SH_RES) + 1;
const SH_NY = Math.ceil((Math.max(TIGHT.y1, PLAY.y1) - SH_Y0 + 40) / SH_RES) + 1;
const SHADE = new Float32Array(SH_NX * SH_NY);
const SKY = new Float32Array(SH_NX * SH_NY);

function bakeShade() {
  const s = SUN_DIR;
  const sl = Math.hypot(s[0], s[1]) || 1;
  const sx = s[0] / sl, sy = s[1] / sl, tanEl = s[2] / sl;
  for (let j = 0; j < SH_NY; j++) {
    const y = SH_Y0 + j * SH_RES;
    for (let i = 0; i < SH_NX; i++) {
      const x = SH_X0 + i * SH_RES;
      const z0 = demAt(x, y);
      // cast shadow: is anything along the sun bearing above the sun ray?
      let occ = 0;
      for (let m = 1; m <= 14; m++) {
        const d = m * m * 3.2 + 6;                  // 9 .. 646 m, quadratic spacing
        const h = demAt(x + sx * d, y + sy * d) - (z0 + tanEl * d);
        if (h > 0) { occ = Math.max(occ, smooth(0, 14, h)); if (occ > 0.97) break; }
      }
      SHADE[j * SH_NX + i] = 1 - occ;
      // sky occlusion: how much of the dome the point can see (8 rays, short)
      let sky = 0;
      for (let a = 0; a < 8; a++) {
        const th = (a / 8) * Math.PI * 2;
        const rx = Math.cos(th), ry = Math.sin(th);
        let hi = 0;
        for (let m = 1; m <= 4; m++) {
          const d = m * 22;
          hi = Math.max(hi, (demAt(x + rx * d, y + ry * d) - z0) / d);
        }
        sky += 1 - clamp(hi, 0, 1);
      }
      SKY[j * SH_NX + i] = sky / 8;
    }
  }
}
bakeShade();

function shBil(A, x, y) {
  let fx = (x - SH_X0) / SH_RES, fy = (y - SH_Y0) / SH_RES;
  if (fx < 0 || fy < 0 || fx > SH_NX - 1.002 || fy > SH_NY - 1.002) return A === SKY ? 1 : 1;
  const i = fx | 0, j = fy | 0, tx = fx - i, ty = fy - j, k = j * SH_NX + i;
  return lerp(lerp(A[k], A[k + 1], tx), lerp(A[k + SH_NX], A[k + SH_NX + 1], tx), ty);
}

// ------------------------------------------------------------ ground colour
// `res` is the grid step the caller is sampling on. The wind-scour tint runs on
// an 11 m noise whose top octave is ~5 m; sampled on a 5 m lattice that aliases
// into a visible checkerboard (caught in pass 15 on the promoted sector, and it
// was quietly on terrain-mid/wide too). Coarse grids get the low-frequency half
// of the same field, so the read is the same and the moire is gone.
export function colorAt(x, y, z, nx, ny, nz, res = 1.7) {
  const coarse = res > 4;
  const m = masksAt(x, y);
  const lam = clamp(nx * SUN_DIR[0] + ny * SUN_DIR[1] + nz * SUN_DIR[2], 0, 1);
  const cast = shBil(SHADE, x, y);
  const sky = shBil(SKY, x, y);
  // The vertex colour is ALBEDO, not shading: the scene's directional light
  // already does the lambert term, and doing it twice is what turns a 419 m
  // north-facing face into a grey slab. What the baked pass adds is the two
  // things a real-time light cannot do over a kilometre of mountain — the
  // terrain's own CAST SHADOW along the sun bearing, and SKY OCCLUSION in the
  // gullies. Snow albedo is ~0.85 and it scatters between slopes, so shadow
  // means bluer, not darker.
  const light = clamp(0.62 + 0.30 * cast + 0.26 * (sky - 0.72), 0, 1.25);
  let c;
  if (light > 0.86) c = mixc(C.snowMid, C.snowHi, smooth(0.86, 1.05, light));
  else if (light > 0.62) c = mixc(C.snowLo, C.snowMid, smooth(0.62, 0.86, light));
  else c = mixc(C.snowDeep, C.snowLo, smooth(0.34, 0.62, light));

  const n1 = coarse ? 0.5 + 0.5 * fbm(x * 0.040, y * 0.040, 1, 2.2, 0.5, 13)
                    : 0.5 + 0.5 * fbm(x * 0.09, y * 0.09, 2, 2.2, 0.5, 13);
  const n2 = 0.5 + 0.5 * fbm(x * 0.013, y * 0.013, 3, 2.1, 0.5, 29);

  // off-piste: wind scour and a bit more blue in the hollows
  const open = clamp(1 - m.groom - m.pack - m.pave - m.cat, 0, 1);
  if (open > 0.05) c = mixc(c, mixc(c, C.scour, 0.35), open * smooth(0.45, 0.9, n1) * 0.5);

  // groomed: cleaner and brighter, with 5.2 m groomer-pass banding across the run
  if (m.groom > 0.08) {
    const band = 0.5 + 0.5 * Math.cos((m.v / 5.2) * Math.PI * 2);
    let g = mixc(c, C.groom, 0.42);
    g = [g[0] * (0.988 + 0.024 * band), g[1] * (0.988 + 0.024 * band), g[2] * (0.99 + 0.02 * band)];
    c = mixc(c, g, smooth(0.05, 0.55, m.groom));
  }
  // GS race venue on Red Dog Face: blue dye lines painted down the course
  // (views 27 and 28). The course is a sine about the corridor centreline,
  // 58 m period, +/-19 m — the rhythm the dye arcs in view-27 describe.
  if (m.race > 0.12) {
    const dv = 11 * Math.sin((m.u / 42) * Math.PI * 2);
    const dd = Math.abs(m.v - dv);
    const paint = (1 - smooth(1.2, 3.0, dd)) * smooth(0.12, 0.4, m.race) * (1 - smooth(15, 24, Math.abs(m.v)));
    if (paint > 0.01) c = mixc(c, C.dye, paint * 0.85);
  }
  // cat track: packed, a touch grey, with a plowed shoulder
  if (m.cat > 0.08) c = mixc(c, C.packed, smooth(0.05, 0.6, m.cat) * 0.65);
  // base area: skied-out packed snow
  if (m.pack > 0.05) c = mixc(c, mixc(C.packed, C.snowMid, n1 * 0.5), smooth(0.05, 0.7, m.pack) * 0.8);
  // plowed lots and roads: asphalt with snow berms round the edge
  if (m.pave > 0.05) {
    const p = smooth(0.25, 0.72, m.pave);
    c = mixc(c, mixc(C.berm, C.pave, smooth(0.45, 0.9, m.pave)), p);
  }

  // rock: steep faces and wind-blasted ridge crest lose their snow (view-14's
  // granite; the aerial shows outcrop punching through the trees)
  const steep = smooth(0.62, 0.90, 1 - nz);                  // ~38 deg -> ~64 deg
  let bare = steep * smooth(0.35, 0.72, n2) * (1 - m.groom * 0.9) * (1 - m.pave);
  // KT-22 IS A ROCK MOUNTAIN AND RED DOG IS NOT, and that is a measurement,
  // not a slope threshold: rockAt() is the summer aerials' own bare-rock read
  // over the promoted sectors (rock.mjs). It ADDS to the slope-driven term
  // rather than replacing it, so the Red Dog core — which has no rock raster
  // and reads 5.2 % rock in its own frame anyway — is bit-identical to the
  // base run, while the Eagle's Nest massif, the Fingers reef and the West
  // Face darken to the volcanic rock the photograph actually shows.
  // POULSEN'S CLIFF BAND. `rockAt` is the summer aerials' bare-rock read over the
  // PROMOTED SECTORS only and returns 0 across the whole Red Dog CORE (rock.mjs
  // says so), so the band would otherwise get nothing but the generic slope term.
  // view-40 is explicit that there is "an exposed dark rock band" beside the
  // takeoff, and the built wall mask is where this increment put it, so the mask
  // raises `bare` directly. It is a colour read only — the rock a rider actually
  // sees up close is real geometry in poulsen.mjs.
  if (m.pouWall > 0.05) bare = clamp(bare + m.pouWall * 0.55 * smooth(0.30, 0.70, 1 - nz), 0, 1);
  const rk0 = rockAt(x, y);
  if (rk0 > 0.02) {
    const alp = rk0 * (1 - m.groom * 0.95) * (1 - m.pack) * (1 - m.pave)
              * (0.42 + 0.58 * smooth(0.30, 0.72, 1 - nz));   // still needs some pitch
    bare = clamp(bare + alp * 0.95, 0, 1);
  }
  if (bare > 0.02) {
    // the KT rock is dark volcanic with snow lace, not Red Dog's pale granite:
    // the mix walks toward C.rock as the measured rock fraction rises
    const rkc = mixc(mixc(C.rock, C.rockLit, 0.35 + 0.5 * cast), C.granite,
                     smooth(0.55, 0.9, n1) * 0.55 * (1 - 0.75 * rk0));
    const volc = mixc(rkc, C.volcanic, smooth(0.15, 0.65, rk0) * (0.55 + 0.35 * (1 - cast)));
    c = mixc(c, volc, clamp(bare * 1.25, 0, 0.88));
    // snow lace in the ledges: the aerial's signature for this massif is white
    // bands lying in a near-black face, not a uniform grey
    if (rk0 > 0.25) {
      const lace = smooth(0.55, 0.92, 0.5 + 0.5 * fbm(x * 0.055, y * 0.021, 3, 2.3, 0.55, 83));
      c = mixc(c, C.snowMid, lace * rk0 * 0.42 * (1 - m.groom));
    }
  }
  // Beyond the pod the ground reads as canopy from a distance. The distance is
  // measured from the Red Dog pod's own centre, which was fine when the world
  // was 3.2 km across — and would have washed the ENTIRE upper mountain to
  // forest green, because the Gold Coast bench is 2,690 m from that point.
  // West of x = -1600 the measure eases over to "how far from a promoted
  // centreline", so the upper mountain's own playable ground reads as the open
  // snowfield it is. East of -1600 — the whole front side, every KT sector
  // included — the number is bit-identical to what it always was.
  const rPod = Math.hypot(x + 250, y + 275);
  const wUp = smooth(-1600, -2000, x);
  const r = wUp <= 0 ? rPod : lerp(rPod, Math.min(rPod, 1000 + sectorDist(x, y)), wUp);
  if (r > 1300) {
    const far = smooth(1300, 2600, r);
    c = mixc(c, mixc(C.canopyLo, C.canopy, n2), far * 0.42 * (0.35 + 0.65 * (1 - smooth(300, 480, z))));
  }
  const j = coarse ? 1 : 0.965 + 0.07 * vnoise(x * 0.31, y * 0.31, 47);
  return [c[0] * j, c[1] * j, c[2] * j];
}

// ------------------------------------------------------------- mesh helper
function normal(x, y, h) {
  const zx = (groundZ(x + h, y) - groundZ(x - h, y)) / (2 * h);
  const zy = (groundZ(x, y + h) - groundZ(x, y - h)) / (2 * h);
  const l = Math.hypot(zx, zy, 1);
  return [-zx / l, -zy / l, 1 / l];
}

function gridMesh(THREE, x0, x1, y0, y1, step, { keep = null, name = 'terrain', nh = 0 } = {}) {
  const nx = Math.round((x1 - x0) / step), ny = Math.round((y1 - y0) / step);
  const vx = nx + 1, vy = ny + 1;
  const pos = new Float32Array(vx * vy * 3);
  const col = new Float32Array(vx * vy * 3);
  const H = nh || step * 0.9;
  for (let j = 0; j <= ny; j++) {
    for (let i = 0; i <= nx; i++) {
      const x = x0 + i * step, y = y0 + j * step;
      const z = groundZ(x, y);
      const k = (j * vx + i) * 3;
      pos[k] = x; pos[k + 1] = y; pos[k + 2] = z;
      const n = normal(x, y, H);
      const c = colorAt(x, y, z, n[0], n[1], n[2], step);
      col[k] = c[0]; col[k + 1] = c[1]; col[k + 2] = c[2];
    }
  }
  const idx = [];
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      if (keep && !keep(x0 + (i + 0.5) * step, y0 + (j + 0.5) * step)) continue;
      const a = j * vx + i, b = a + 1, c2 = a + vx, d = c2 + 1;
      idx.push(a, b, d, a, d, c2);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  g.computeBoundingSphere();
  const mesh = new THREE.Mesh(g, null);
  mesh.name = name;
  return mesh;
}

// a subdivided mesh over a marked subset of the core lattice, vertices deduped
function detailMesh(THREE, R, step, sub, cells, nx, ny, name) {
  const fs = step / sub, vnx = nx * sub + 1;
  const vmap = new Map();
  const pos = [], col = [], idx = [];
  const H = fs * 0.85;
  const vert = (fi, fj) => {
    const key = fj * vnx + fi;
    let v = vmap.get(key);
    if (v !== undefined) return v;
    const x = R.x0 + fi * fs, y = R.y0 + fj * fs;
    const z = groundZ(x, y);
    const n = normal(x, y, H);
    const c = colorAt(x, y, z, n[0], n[1], n[2], fs);
    v = pos.length / 3;
    pos.push(x, y, z); col.push(c[0], c[1], c[2]);
    vmap.set(key, v);
    return v;
  };
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      if (!cells[j * nx + i]) continue;
      for (let sj = 0; sj < sub; sj++) {
        for (let si = 0; si < sub; si++) {
          const fi = i * sub + si, fj = j * sub + sj;
          const a = vert(fi, fj), b = vert(fi + 1, fj), c2 = vert(fi, fj + 1), d = vert(fi + 1, fj + 1);
          idx.push(a, b, d, a, d, c2);
        }
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
  g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(col), 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  g.computeBoundingSphere();
  const mesh = new THREE.Mesh(g, null);
  mesh.name = name;
  return mesh;
}

const dilate = (src, nx, ny) => {
  const out = new Uint8Array(nx * ny);
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      if (src[j * nx + i]) continue;
      let near = 0;
      for (let dj = -1; dj <= 1 && !near; dj++) {
        for (let di = -1; di <= 1; di++) {
          const ii = i + di, jj = j + dj;
          if (ii >= 0 && jj >= 0 && ii < nx && jj < ny && src[jj * nx + ii]) { near = 1; break; }
        }
      }
      if (near) out[j * nx + i] = 1;
    }
  }
  return out;
};

export const CORE_STEP = 3.4;

export function buildTerrain(THREE, material, materialFar) {
  const R = CORE, step = CORE_STEP;
  const nx = Math.round((R.x1 - R.x0) / step), ny = Math.round((R.y1 - R.y0) / step);
  const isB = new Uint8Array(nx * ny), isP = new Uint8Array(nx * ny);
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const x = R.x0 + (i + 0.5) * step, y = R.y0 + (j + 0.5) * step;
      const m = masksAt(x, y);
      // THE BASE FLATS COME OUT OF THE 1.70 m MESH. The base run put `pack`
      // (the base run-out) in the corridor mesh, and with the merge's west arm
      // and the KT-22 apron that is 71,000 m2 of DEAD FLAT valley floor being
      // built at 1.70 m for 49 k collidable triangles. A flat has nothing for
      // a 1.70 m grid to resolve that a 3.40 m grid does not, and this is the
      // first reclaim the merge takes (COMPOSING rule 17: it is not a feature
      // anyone rides, it is the ground they stop on). The pistes, the cat
      // tracks and the mogul fields keep every triangle they had.
      // (`runout` also raises MG so it gets the corduroy colour, so the flats
      // are excluded by their own MK mask rather than by style.)
      //
      // THE CONTEXT RUNS COME OUT TOO. Far East, Heidi's and Red Dog Ridge are
      // what the base run itself calls "pod context: the neighbouring named
      // runs that fall inside the terrain frame" — none is signed, none is part
      // of a descent, and between them they are 63,000 m2 of 1.70 m corridor.
      // They keep their carve, their corduroy and their forest hole; they ride
      // the 3.40 m core grid. COMPOSING rule 17: the ride line gets the budget,
      // and these are not it.
      // POULSEN'S GULLY JOINS THE 1.70 m CORRIDOR MESH, and it is the only thing
      // increment 21 asks of the terrain grid. The gully is a 24 m corridor and
      // the CORE grid is 3.40 m — seven cells across the whole run, which is the
      // same "cannot be resolved as what it is" §20 found on Chute 75, at a
      // smaller scale. `detailMesh` subdivides core cells IN PLACE and `coreKeep`
      // excludes exactly those cells, so this is a pure resolution change with no
      // new grid boundary anywhere and therefore no new seam to open. It costs
      // three times the triangles over the corridor and nothing anywhere else.
      if (m.bump > 0.03) isB[j * nx + i] = 1;
      else if ((m.groom > 0.03 || m.cat > 0.05 || m.pou > 0.05) && m.pack < 0.28 && m.ctx < 0.3)
        isP[j * nx + i] = 1;
    }
  }
  const ringB = dilate(isB, nx, ny);
  const bothBP = new Uint8Array(nx * ny);
  for (let k = 0; k < bothBP.length; k++) bothBP[k] = isB[k] || isP[k] ? 1 : 0;
  const ringP = dilate(bothBP, nx, ny);

  // bump mesh renders B + its ring; piste mesh renders P + ringB + ringP;
  // the core mesh renders everything except B and P (so it also carries ringP).
  const bCells = new Uint8Array(nx * ny), pCells = new Uint8Array(nx * ny);
  for (let k = 0; k < nx * ny; k++) {
    bCells[k] = isB[k] || ringB[k] ? 1 : 0;
    pCells[k] = isP[k] || ringB[k] || ringP[k] ? 1 : 0;
  }
  const bump = detailMesh(THREE, R, step, 3, bCells, nx, ny, 'terrain-bump');
  const piste = detailMesh(THREE, R, step, 2, pCells, nx, ny, 'terrain-piste');

  const coreKeep = (x, y) => {
    const i = Math.floor((x - R.x0) / step), j = Math.floor((y - R.y0) / step);
    if (i < 0 || j < 0 || i >= nx || j >= ny) return true;
    return !(isB[j * nx + i] || isP[j * nx + i]);
  };
  const core = gridMesh(THREE, R.x0, R.x1, R.y0, R.y1, step, { keep: coreKeep, name: 'terrain-core' });

  // ------------------------------------------------- promoted sectors
  // One collidable corridor-grade grid per sector, over the band within
  // `reach` m of that sector's own OSM centrelines. It overlaps CORE by one
  // cell on the inside and is overlapped by mid/wide by one cell on the
  // outside, so a resolution change never opens a crack anywhere.
  // ------------------------------------------ the KT-22 hero zones (2.00 m)
  // Built FIRST and owned by nobody else: every coarser grid below yields to
  // them, inset by one of its own cells so the resolution change always has a
  // one-cell overlap ring and can never open a crack.
  // `owns()` is the box test for a solid box and the corridor test for a
  // corridor box (layout.mjs). A coarse grid yields where the detail mesh
  // actually BUILDS, inset by one of the coarse grid's own cells, so the two
  // overlap by a ring along the whole boundary instead of abutting — §14.4, and
  // the same rule that fixed the 33-hole seam at x = -710.
  const inDetail = (x, y, pad = 0) => KT_DETAIL.some((D) => D.owns(x, y, pad));
  const details = KT_DETAIL.map((D, di) => {
    // A detail box yields to every detail box listed BEFORE it, inset by one of
    // ITS OWN cells — so a 4.0 m wall shell overlaps the 2.0 m core it wraps by
    // a 4.0 m ring instead of abutting it. The first three boxes do not overlap
    // anything, so `prior` is empty for them and they are bit-identical.
    const prior = KT_DETAIL.slice(0, di);
    const keep = D.hw
      ? (x, y) => D.owns(x, y, 0) && !prior.some((E) => E.owns(x, y, D.step))
      : null;
    const m = gridMesh(THREE, D.x0, D.x1, D.y0, D.y1, D.step,
                       { name: 'terrain-' + D.id, nh: D.step * 0.9, keep });
    m.userData.detail = D.id;
    return m;
  });

  const sectors = SECTORS.map((S) => {
    // SIBLING-SECTOR OVERLAP RING. Every coarse grid in this file yields to the
    // grid below it with a one-cell overlap, so a resolution change can never
    // open a crack. Between two PROMOTED SECTORS there was no such ring: each
    // sector built only the cells `sectorOwner()` handed it, and the four sector
    // grids sit on four different, unaligned lattices (6.0 / 8.0 / 5.0 / 10.0 m).
    // Along an ownership boundary that is an exclusive test between two grids
    // whose cell centres do not line up, so wherever A's centre fell on B's side
    // and B's centre on A's, NEITHER built the cell and the floor opened. The
    // seam sweep caught 13 such holes on the exhibition|kt22 and
    // olympiclady|exhibition boundaries — four of them within 3.3 m of a
    // centreline, i.e. in the middle of a corridor someone skis.
    //
    // The fix is the ring the coarse grids already have: a sector also builds
    // ONE OF ITS OWN CELLS past the boundary into its neighbour, wherever the
    // point is still inside its own `reach`. The two grids then overlap by a
    // cell along every shared edge instead of abutting exactly.
    const nearMine = (x, y) => {
      const r = S.step * 1.0;      // exactly one of this sector's own cells
      for (let a = 0; a < 8; a++) {
        const th = a * Math.PI / 4;
        const O = sectorOwner(x + Math.cos(th) * r, y + Math.sin(th) * r);
        if (O && O.id === S.id) return true;
      }
      return false;
    };
    const owns = (x, y) => {
      if (sectorDist(x, y) >= S.reach) return false;
      const O = sectorOwner(x, y);
      if (!O) return false;
      return O.id === S.id || nearMine(x, y);
    };
    const keep = (x, y) => owns(x, y) && !inCoreBox(x, y, S.step) && !inDetail(x, y, S.step);
    const G = S.grown;
    const m = gridMesh(THREE, G.x0, G.x1, G.y0, G.y1, S.step,
                       { keep, name: 'terrain-' + S.id, nh: S.step * 0.9 });
    m.userData.sector = S.id;
    return m;
  });
  // a cell belongs to a sector if it is inside that sector's band shrunk by one
  // cell of the coarser grid that would otherwise own it — which is what gives
  // the one-cell overlap ring on the outside of every promoted sector
  const takenBy = (x, y, cell) => inSector(x, y, cell);

  // ------------------------------------------------------- the MASSIF
  // A 14 m bridge grid over the KT-22 summit block, between the sector bands
  // (5.0 m) and terrain-wide (34 m). Not a promotion: it carves nothing the
  // sectors did not already carve, it is just the one landform in this world
  // that is looked at from 2.5 km away and cannot be allowed to step straight
  // from 5 m to 34 m. 5.3 k triangles, collidable.
  const inMassifBox = (x, y, pad = 0) =>
    x > MASSIF.x0 + pad && x < MASSIF.x1 - pad && y > MASSIF.y0 + pad && y < MASSIF.y1 - pad;
  const massif = gridMesh(THREE, MASSIF.x0, MASSIF.x1, MASSIF.y0, MASSIF.y1, MASSIF.step,
                          { keep: (x, y) => !takenBy(x, y, MASSIF.step) && !inDetail(x, y, MASSIF.step),
                            name: 'terrain-massif', nh: MASSIF.step * 0.9 });

  const inCore = (x, y) => x > R.x0 + 6 && x < R.x1 - 6 && y > R.y0 + 6 && y < R.y1 - 6;
  // 15 m rather than the base run's 9, and 38 m rather than 34: the surrounds
  // are where the KT-22 hero zones' triangles came from. Neither is ever closer
  // than 240 m (mid) or 700 m (wide) to anything anyone skis.
  const mid = gridMesh(THREE, TIGHT.x0, TIGHT.x1, TIGHT.y0, TIGHT.y1, 15,
                       { keep: (x, y) => !inCore(x, y) && !takenBy(x, y, 15)
                                         && !inMassifBox(x, y, 15) && !inDetail(x, y, 15),
                         name: 'terrain-mid', nh: 8 });
  // THE INSET IS ONE OF *TERRAIN-WIDE'S* CELLS, NOT ONE OF TERRAIN-MID'S.
  // This yielded at TIGHT +/- 15 m — one mid cell — and a 38 m grid cannot
  // honour a 15 m inset: the wide cell spanning x[-712,-674] has its centre at
  // -693, which is inside the inset, so it was dropped; terrain-mid starts at
  // x = -710; and the 2 m strip between them was owned by nobody. The first
  // transect ever run exactly along that line (increment 1's `DEM SEAM:
  // dem-tight-e | red-dog/dem-tight at x=-710.35`) fell straight through it —
  // 33 holes in 400 samples. Inset by 38 and the two grids overlap by a cell
  // along the whole of TIGHT's edge, which is what §14.4 says they must.
  const inMid = (x, y) => x > TIGHT.x0 + 38 && x < TIGHT.x1 - 38 && y > TIGHT.y0 + 38 && y < TIGHT.y1 - 38;
  const wide = gridMesh(THREE, WIDE.x0, WIDE.x1, WIDE.y0, WIDE.y1, 38,
                        { keep: (x, y) => !inMid(x, y) && !takenBy(x, y, 38)
                                          && !inMassifBox(x, y, 38) && !inDetail(x, y, 38),
                          name: 'terrain-wide', nh: 20 });

  // ------------------------------------------- the WEST surround (increment 1)
  // red-dog/dem-wide stops at x = -1852 and the Gold Coast bench is at -2932, so
  // the merged world's coarse surround simply did not reach the upper mountain.
  // This is the same 38 m grid over the upper bundle's own 3600 m dem-wide
  // frame, yielding by one of its own cells to terrain-wide, to every promoted
  // sector and to the massif — so the two surrounds overlap by a cell along
  // their whole shared boundary (§14.4) instead of abutting.
  const inWideBox = (x, y, pad = 0) =>
    x > WIDE.x0 + pad && x < WIDE.x1 - pad && y > WIDE.y0 + pad && y < WIDE.y1 - pad;
  const wideW = gridMesh(THREE, WIDE_W.x0, WIDE_W.x1, WIDE_W.y0, WIDE_W.y1, 38,
                         { keep: (x, y) => !inWideBox(x, y, 38) && !takenBy(x, y, 38)
                                           && !inMassifBox(x, y, 38) && !inDetail(x, y, 38),
                           name: 'terrain-wide-w', nh: 20 });

  const rim = buildRim(THREE);

  for (const m of [bump, piste, core, ...details, ...sectors, massif, mid, wide, wideW, rim]) {
    m.material = material; m.receiveShadow = true;
  }
  bump.castShadow = false; piste.castShadow = false; core.castShadow = true;
  mid.castShadow = false; wide.castShadow = false; rim.castShadow = false;
  wideW.castShadow = false;
  massif.castShadow = false;
  for (const m of sectors) m.castShadow = false;
  // the one shadow map's ortho box is 430 m about the Red Dog pod and does not
  // reach the KT summit 1.4 km away; the terrain's own cast shadow there is
  // baked into the vertex colour (SHADE) instead, as it is for every other grid
  for (const m of details) m.castShadow = false;
  return { bump, piste, core, details, sectors, massif, mid, wide, wideW, rim,
           far: buildFar(THREE, materialFar) };
}

// ------------------------------------------------------ end-of-data rim
// Where the 3200 m dem-wide frame ends there is genuinely no elevation data.
// Rather than an invisible wall (or a hole to fall through), the world closes
// with a collidable 80 m ring that holds the dem-wide edge for its first 700 m
// — demAt() already carries the frame edge outward and lets it fall away — and
// then rises 260 m over the last 400 m: a long, gentle, skiable snow rise that
// turns you round. It is scenery-grade, faceted at 80 m, and it is the only
// place in the world where the ground is not a DEM read.
// It now wraps WORLD — the union of red-dog/dem-wide and the upper bundle's own
// 3600 m frame — rather than red-dog/dem-wide alone, because the west half of
// the world is 2.1 km further out than it was.
function buildRim(THREE) {
  const P = RIM.pad, st = RIM.step;
  const x0 = WORLD.x0 - P, x1 = WORLD.x1 + P, y0 = WORLD.y0 - P, y1 = WORLD.y1 + P;
  const outside = (x, y) => Math.max(WORLD.x0 - x, x - WORLD.x1, WORLD.y0 - y, y - WORLD.y1);
  const zRim = (x, y) => {
    const d = Math.max(0, outside(x, y));
    return demAt(x, y) + smooth(RIM.holdM, P, d) * RIM.riseM;
  };
  const nx = Math.round((x1 - x0) / st), ny = Math.round((y1 - y0) / st);
  const vx = nx + 1, vy = ny + 1;
  const pos = new Float32Array(vx * vy * 3), col = new Float32Array(vx * vy * 3);
  for (let j = 0; j <= ny; j++) {
    for (let i = 0; i <= nx; i++) {
      const x = x0 + i * st, y = y0 + j * st, z = zRim(x, y);
      const k = (j * vx + i) * 3;
      pos[k] = x; pos[k + 1] = y; pos[k + 2] = z;
      const h = st;
      const gx = (zRim(x + h, y) - zRim(x - h, y)) / (2 * h);
      const gy = (zRim(x, y + h) - zRim(x, y - h)) / (2 * h);
      const l = Math.hypot(gx, gy, 1);
      const c = colorAt(x, y, z, -gx / l, -gy / l, 1 / l, st);
      col[k] = c[0]; col[k + 1] = c[1]; col[k + 2] = c[2];
    }
  }
  // WHAT THE RIM YIELDS TO IS THE TWO WIDE GRIDS, NOT THE `WORLD` RECTANGLE —
  // and that one word is increment 22's second class-1 defect, the biggest hole
  // in the world by area. `WORLD` is the bounding RECTANGLE of the union of
  // red-dog/dem-wide and the upper bundle's own 3600 m frame, and those two
  // boxes DO NOT TILE IT: red-dog/dem-wide runs y[-1875, 1325] while
  // upper/dem-wide runs y[-2019, 1581] over a different x range, so the
  // rectangle contains two 1.7 km strips — x[-367, 1348] by y[-2019, -1875]
  // and the same x by y[1325, 1581] — that neither wide grid builds. The rim
  // skipped them because `outside(WORLD) < -st` reads them as "inside, somebody
  // else's problem", and nobody else had them. 0.56 km2 of open floor, inside
  // the world, 8,820 NULL probes at 8 m sampling. It cost 1.1 k triangles to
  // close, because the rim's own grid already spans them.
  const coveredByWide = (x, y) =>
    (x > WIDE.x0 + st && x < WIDE.x1 - st && y > WIDE.y0 + st && y < WIDE.y1 - st)
    || (x > WIDE_W.x0 + st && x < WIDE_W.x1 - st && y > WIDE_W.y0 + st && y < WIDE_W.y1 - st);
  const idx = [];
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const cx = x0 + (i + 0.5) * st, cy = y0 + (j + 0.5) * st;
      // yield only where a wide grid actually BUILDS, inset by one rim cell so
      // the two overlap by a ring along the whole boundary (§14.4's rule, the
      // same one that closed the 33-hole seam at x = -710)
      if (coveredByWide(cx, cy)) continue;
      const a = j * vx + i, b = a + 1, c2 = a + vx, d = c2 + 1;
      idx.push(a, b, d, a, d, c2);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  g.computeBoundingSphere();
  const mesh = new THREE.Mesh(g, null);
  mesh.name = 'terrain-rim';
  return mesh;
}

// -------------------------------------------------------------- far apron
// A coarse polar shell from the dem-wide edge out to the skyline. Not a
// collider: it is scenery. It carries the far Sierra ridges that close the
// north wall of Olympic Valley in views 13, 19, 21, 22 and 26.
function buildFar(THREE, material) {
  // Re-centred on WORLD for increment 1. The apron used to orbit (-250, -275)
  // — red-dog/dem-wide's own centre — at r0 = 2,760 m, and the Gold Coast bench
  // is 2,690 m from that point: the backdrop would have been drawn ON TOP of
  // the new ground. Centring it on the union frame and starting it outside the
  // rim is the only way the west half of the world can have a skyline at all.
  const CXX = (WORLD.x0 + WORLD.x1) / 2, CYY = (WORLD.y0 + WORLD.y1) / 2;
  // starts OUTSIDE the collidable end-of-data rim, so the backdrop never sits
  // above ground the player can actually stand on
  // 20 x 104 rings rather than 24 x 118. This shell starts 2.8 km out and its
  // job is a hazed skyline silhouette; the extra rings were resolving detail
  // that the haze mix erases anyway. Fifth dressing reclaim (REPORT §14.7).
  const r0 = Math.hypot(WORLD.x1 - WORLD.x0, WORLD.y1 - WORLD.y0) / 2 + RIM.pad + 60;
  const NR = 20, NA = 104;
  const pos = [], col = [], idx = [];
  const ring = (ri) => r0 * Math.pow(FAR_R / r0, ri / NR);
  for (let ri = 0; ri <= NR; ri++) {
    const r = ring(ri);
    for (let ai = 0; ai <= NA; ai++) {
      const a = (ai / NA) * Math.PI * 2;
      const x = CXX + Math.cos(a) * r, y = CYY + Math.sin(a) * r;
      let z;
      if (ri === 0) z = demAt(x, y) + RIM.riseM;      // meets the rim's lip
      else {
        const t = ri / NR;
        const base = 300 - 250 * smooth(0.0, 0.92, t);
        // amplitude falls with distance so the outer rings do not stack ABOVE
        // the real dem-wide skyline and read as a cloud bank
        const ridge = Math.pow(1 - Math.abs(fbm(x * 0.00068, y * 0.00068, 5, 2.05, 0.58, 5)), 1.4) * 470 * (0.95 - 0.42 * t);
        const roll = fbm(x * 0.00035, y * 0.00035, 3, 2.1, 0.5, 61) * 240;
        z = base + ridge * 0.80 + roll - 30;
        if (ri <= 2) z = lerp(demAt(x, y) + RIM.riseM, z, smooth(0, 2, ri));
      }
      pos.push(x, y, z);
      const t = ri / NR;
      const snowy = smooth(210, 430, z);
      // the north wall of Olympic Valley: forest bands with snow above, not a
      // wash. Haze only really takes hold in the outer third.
      let c = mixc(lin(0x2f4438), lin(0x7d93ab), snowy * 0.80);
      c = mixc(c, lin(0xdde7f3), smooth(280, 540, z) * 0.82);
      c = mixc(c, lin(0xcfdff0), smooth(0.06, 0.72, t) * 0.90);           // haze
      col.push(c[0], c[1], c[2]);
    }
  }
  const W = NA + 1;
  for (let ri = 0; ri < NR; ri++) {
    for (let ai = 0; ai < NA; ai++) {
      const a = ri * W + ai, b = a + 1, c2 = a + W, d = c2 + 1;
      idx.push(a, b, d, a, d, c2);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
  g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(col), 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  g.computeBoundingSphere();
  const mesh = new THREE.Mesh(g, material);
  mesh.name = 'far-country';
  return mesh;
}

export { SHADE, SKY, shBil };
