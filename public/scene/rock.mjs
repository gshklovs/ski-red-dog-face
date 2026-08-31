// Bare-rock fraction, sampled from the summer aerials (sector-rock.mjs).
//
// Red Dog is a tree mountain: `annotations.md` says so and the aerial agrees —
// the Red Dog frame reads 5.2 % bare rock. KT-22 is a rock mountain: the
// 600 m aerial-close frame over the summit reads 26.2 %, and the Eagle's Nest
// massif in it is a near-black volcanic mass with snow lace. That difference
// is the single most recognisable thing about the two ends of this world, so
// it is measured off the photograph rather than inferred from slope alone.
//
// rockAt(x,y) in 0..1 = the fraction of that 2 m patch that the summer imagery
// reads as bare rock: not canopy, not snow, on ground the lidar says is steeper
// than 30 deg, and carrying either the blue-dark signature of rock in shadow or
// the low-saturation mid-luminance signature of lit rock and scree
// (work/bake_sector.py). Returns 0 outside every sector raster — the Red Dog
// CORE has no rock raster and keeps the base run's slope-driven rock read
// in terrain.colorAt() exactly as it was.

import { lerp, smooth } from './lib/core.mjs';
import { SECTOR_ROCKS } from './sector-rock.mjs';

function decodeRect(g) {
  const s = atob(g.b64), n = g.nx * g.ny, out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = s.charCodeAt(i) / 255;
  return { ...g, a: out };
}
const SEC = SECTOR_ROCKS.map(decodeRect);

function rectAt(G, x, y) {
  let fx = (x - G.x0) / G.res - 0.5, fy = (y - G.y0) / G.res - 0.5;
  if (fx < 0 || fy < 0 || fx > G.nx - 1.002 || fy > G.ny - 1.002) return null;
  const i = fx | 0, j = fy | 0, tx = fx - i, ty = fy - j, k = j * G.nx + i;
  return lerp(lerp(G.a[k], G.a[k + 1], tx), lerp(G.a[k + G.nx], G.a[k + G.nx + 1], tx), ty);
}
const rectInset = (G, x, y) => Math.min(x - G.x0, G.x0 + G.nx * G.res - x,
                                        y - G.y0, G.y0 + G.ny * G.res - y);

/** bare-rock fraction 0..1; 0 where no sector raster covers the point. */
export function rockAt(x, y) {
  let v = 0;
  for (const G of SEC) {
    const s = rectInset(G, x, y);
    if (s <= 0) continue;
    const r = rectAt(G, x, y);
    if (r !== null) v = Math.max(v, r * smooth(0, 30, s));   // feather to 0 at the edge
  }
  return v;
}

export const ROCK_FRAMES = SEC.map((g) => ({ ...g, a: null }));
