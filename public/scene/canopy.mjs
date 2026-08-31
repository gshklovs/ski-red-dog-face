// Canopy density sampled from the summer aerials (canopy-data.mjs).
// canopyAt(x,y) in 0..1 = the fraction of that patch of ground that is real
// conifer canopy in ArcGIS World Imagery. The forest is placed against this,
// so the tree striping of the pod is the striping in the photograph.

import { clamp, lerp, smooth } from './lib/core.mjs';
import { CAN_TIGHT, CAN_WIDE } from './canopy-data.mjs';
import { SECTOR_CANOPIES } from './sector-canopy.mjs';

function decode(g) {
  const s = atob(g.b64), n = g.n, out = new Float32Array(n * n);
  for (let i = 0; i < n * n; i++) out[i] = s.charCodeAt(i) / 255;
  return { ...g, a: out };
}
const T = decode(CAN_TIGHT);
const W = decode(CAN_WIDE);

function grid(G, x, y) {
  const c = G.span / G.n;
  let fx = (x - G.ox + G.span / 2) / c - 0.5, fy = (y - G.oy + G.span / 2) / c - 0.5;
  fx = clamp(fx, 0, G.n - 1.001); fy = clamp(fy, 0, G.n - 1.001);
  const i = fx | 0, j = fy | 0, tx = fx - i, ty = fy - j, k = j * G.n + i;
  return lerp(lerp(G.a[k], G.a[k + 1], tx), lerp(G.a[k + G.n], G.a[k + G.n + 1], tx), ty);
}
const inset = (G, x, y) => Math.min(G.span / 2 - Math.abs(x - G.ox), G.span / 2 - Math.abs(y - G.oy));

// Promoted-sector crops: the same aerial-2.jpg pixels as CAN_WIDE, but read at
// 2.0 m/px instead of 6.25 m/px over the sector only. Rect grids, so they get
// their own decode/sample pair.
function decodeRect(g) {
  const s = atob(g.b64), n = g.nx * g.ny, out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = s.charCodeAt(i) / 255;
  return { ...g, a: out };
}
const SEC = SECTOR_CANOPIES.map(decodeRect);

function rectAt(G, x, y) {
  let fx = (x - G.x0) / G.res - 0.5, fy = (y - G.y0) / G.res - 0.5;
  if (fx < 0 || fy < 0 || fx > G.nx - 1.002 || fy > G.ny - 1.002) return null;
  const i = fx | 0, j = fy | 0, tx = fx - i, ty = fy - j, k = j * G.nx + i;
  return lerp(lerp(G.a[k], G.a[k + 1], tx), lerp(G.a[k + G.nx], G.a[k + G.nx + 1], tx), ty);
}
const rectInset = (G, x, y) => Math.min(x - G.x0, G.x0 + G.nx * G.res - x,
                                        y - G.y0, G.y0 + G.ny * G.res - y);

export function canopyAt(x, y) {
  // UPPER MOUNTAIN INCREMENT 1. This used to return -1 the moment the point left
  // red-dog/aerial-2's 3200 m frame, which meant the four new sectors' own 2 m
  // crops — cut from WV02 2025-10-21 at 0.29-0.34 m/px, 1.1 km beyond that
  // frame — were decoded and then never read. A sector crop now answers on its
  // own where no wide frame covers the point. East of x = -1852 nothing changes:
  // CAN_WIDE still supplies the base and the crops still feather into it.
  const iw = inset(W, x, y);
  let w = iw > 2 ? grid(W, x, y) : null;
  // a promoted sector reads its own finer crop, feathered into CAN_WIDE
  for (const G of SEC) {
    const s = rectInset(G, x, y);
    if (s <= 0) continue;
    const v = rectAt(G, x, y);
    if (v === null) continue;
    w = w === null ? v : lerp(w, v, smooth(0, 30, s));
  }
  if (w === null) return -1;                    // outside every aerial: caller decides
  const t = inset(T, x, y);
  if (t <= 0) return w;
  return lerp(w, grid(T, x, y), smooth(0, 40, t));
}

export const CANOPY_FRAMES = {
  tight: { ...T, a: null }, wide: { ...W, a: null },
  sectors: SEC.map((g) => ({ ...g, a: null })),
};
