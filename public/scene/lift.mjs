// Chairlift kit — parameterised by a polyline, so any lift in the resort can be
// built from its OSM aerialway way. Red Dog Express is the hero: a 2023
// detachable six-pack, 917 m plan / 397 m vertical, with a hard breakover in
// the middle third carrying FOUR visibly angled towers (view-7) and two
// unusually tall towers where the line crosses OVER Far East.
//
// Terminals are the barrel-vault Leitner-Poma sheds of views 8 / 10 / 11:
// a glazed clerestory running the length of the curved roof, white sheet-metal
// flanks with RED DOG lettering, two splayed grey pylons, bullwheel underneath.

import { buf, tri, quad, box, tube, prism, plate, makeRng, rr, lin, mixc, scalec, clamp, lerp } from './lib/core.mjs';
import { PAL } from './kit.mjs';

// ------------------------------------------------------------ line frame
export function lineFrame(pts, gz) {
  const P = pts.map((p) => [p[0], p[1]]);
  const cum = [0];
  for (let i = 1; i < P.length; i++) cum.push(cum[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
  const L = cum[cum.length - 1];
  const at = (s) => {
    s = clamp(s, 0, L);
    let i = 1;
    while (i < cum.length - 1 && cum[i] < s) i++;
    const t = (s - cum[i - 1]) / ((cum[i] - cum[i - 1]) || 1);
    const x = lerp(P[i - 1][0], P[i][0], t), y = lerp(P[i - 1][1], P[i][1], t);
    const dx = P[i][0] - P[i - 1][0], dy = P[i][1] - P[i - 1][1];
    const d = Math.hypot(dx, dy) || 1;
    return { x, y, ux: dx / d, uy: dy / d, z: gz(x, y) };
  };
  return { P, cum, L, at };
}

// -------------------------------------------------------------- terminals
// yaw is the direction of the line (radians, atan2(uy,ux)).
// `drive` = the base (drive) terminal, which sits lower and carries the maze.
export function terminal(B, seed, { x, y, z, yaw, len = 26, w = 7.2, deck = 4.6, name = true }) {
  const rng = makeRng(seed);
  const c = Math.cos(yaw), s = Math.sin(yaw);
  const P = (u, v, h) => [x + u * c - v * s, y + u * s + v * c, z + h];
  // two splayed pylons
  for (const u of [-len * 0.24, len * 0.24]) {
    const top = deck;
    quad(B, P(u - 2.6, -1.9, 0), P(u + 2.6, -1.9, 0), P(u + 1.0, -0.9, top), P(u - 1.0, -0.9, top), PAL.steelLo);
    quad(B, P(u - 2.6, 1.9, 0), P(u - 1.0, 0.9, top), P(u + 1.0, 0.9, top), P(u + 2.6, 1.9, 0), PAL.steelLo);
    quad(B, P(u - 2.6, -1.9, 0), P(u - 1.0, -0.9, top), P(u - 1.0, 0.9, top), P(u - 2.6, 1.9, 0), scalec(PAL.steelLo, 0.85));
    quad(B, P(u + 2.6, -1.9, 0), P(u + 2.6, 1.9, 0), P(u + 1.0, 0.9, top), P(u + 1.0, -0.9, top), scalec(PAL.steelLo, 0.85));
    // concrete plinth
    quad(B, P(u - 3.0, -2.3, 0.1), P(u + 3.0, -2.3, 0.1), P(u + 3.0, 2.3, 0.1), P(u - 3.0, 2.3, 0.1), lin(0x7d7c78));
  }
  // deck slab
  const hw = w / 2;
  quad(B, P(-len / 2, -hw, deck), P(len / 2, -hw, deck), P(len / 2, hw, deck), P(-len / 2, hw, deck), PAL.steelLo);
  // flanks: white sheet metal
  const bodyH = 1.9;
  for (const v of [-hw, hw]) {
    const nrm = v > 0 ? 1 : -1;
    quad(B, P(-len / 2, v, deck), P(len / 2, v, deck), P(len / 2, v, deck + bodyH), P(-len / 2, v, deck + bodyH),
         nrm > 0 ? PAL.white : scalec(PAL.white, 0.93));
  }
  quad(B, P(-len / 2, -hw, deck), P(-len / 2, -hw, deck + bodyH), P(-len / 2, hw, deck + bodyH), P(-len / 2, hw, deck), PAL.offWhite);
  quad(B, P(len / 2, -hw, deck), P(len / 2, hw, deck), P(len / 2, hw, deck + bodyH), P(len / 2, -hw, deck + bodyH), PAL.offWhite);
  // barrel-vault roof with a glazed clerestory band
  const NS = 9, rise = 2.9;
  const arc = (i) => {
    const t = i / NS, a = Math.PI * t;
    return [Math.cos(a) * hw * 1.06, deck + bodyH + Math.sin(a) * rise];
  };
  for (let i = 0; i < NS; i++) {
    const [v0, h0] = arc(i), [v1, h1] = arc(i + 1);
    const glass = i >= 1 && i <= NS - 2;
    const col = glass ? PAL.glass : PAL.offWhite;
    quad(B, P(-len / 2, v0, h0), P(len / 2, v0, h0), P(len / 2, v1, h1), P(-len / 2, v1, h1), col);
    quad(B, P(-len / 2, v1, h1), P(len / 2, v1, h1), P(len / 2, v0, h0), P(-len / 2, v0, h0), scalec(col, 0.7));
    // white mullion ribs every other panel
    if (glass) for (const u of [-len * 0.36, -len * 0.12, len * 0.12, len * 0.36]) {
      quad(B, P(u - 0.14, v0, h0 + 0.01), P(u + 0.14, v0, h0 + 0.01), P(u + 0.14, v1, h1 + 0.01), P(u - 0.14, v1, h1 + 0.01), PAL.white);
    }
  }
  // end caps of the vault
  for (const u of [-len / 2, len / 2]) {
    const pts = [];
    for (let i = 0; i <= NS; i++) { const [v, h] = arc(i); pts.push(P(u, v, h)); }
    pts.push(P(u, hw * 1.06, deck + bodyH), P(u, -hw * 1.06, deck + bodyH));
    plate(B, pts, PAL.offWhite);
    plate(B, pts.slice().reverse(), scalec(PAL.offWhite, 0.9));
  }
  // bullwheel + rail under the deck
  const bw = 2.1;
  for (const u of [-len * 0.34, len * 0.34]) {
    tube(B, P(u, 0, deck - 1.5), P(u, 0, deck - 0.1), 0.22, PAL.steel, 6);
    const ring = [];
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      ring.push(P(u + Math.cos(a) * bw, Math.sin(a) * bw, deck - 1.5));
    }
    plate(B, ring, PAL.steelLo);
    plate(B, ring.slice().reverse(), scalec(PAL.steelLo, 0.8));
  }
  for (const v of [-1.5, 1.5]) {
    tube(B, P(-len / 2 - 2, v, deck - 1.2), P(len / 2 + 2, v, deck - 1.2), 0.09, PAL.steelLo, 4);
  }
  return { signAt: (v) => P(0, v, deck + 0.95), signYaw: yaw, len, w, deck, bodyH };
}

// ------------------------------------------------------------------ towers
// kind: 'std' | 'angled' | 'tall'
export function tower(B, seed, { x, y, z, yaw, h = 11, kind = 'std', n = 0 }) {
  const rng = makeRng(seed);
  const c = Math.cos(yaw), s = Math.sin(yaw);
  const P = (u, v, hh) => [x + u * c - v * s, y + u * s + v * c, z + hh];
  const lean = kind === 'angled' ? -0.20 : 0;             // leans back down-line
  const topU = lean * h;
  const R = kind === 'tall' ? 0.50 : 0.42;
  // column (splayed base)
  tube(B, P(0, 0, 0), P(topU * 0.5, 0, h * 0.5), R * 1.35, PAL.galv, 7, R * 1.05);
  tube(B, P(topU * 0.5, 0, h * 0.5), P(topU, 0, h), R * 1.05, PAL.galv, 7, R * 0.9);
  // base plate / plinth
  quad(B, P(-1.5, -1.5, 0.08), P(1.5, -1.5, 0.08), P(1.5, 1.5, 0.08), P(-1.5, 1.5, 0.08), lin(0x77756f));
  if (kind === 'angled') {
    // the second, forward leg that gives the breakover towers their A-shape
    tube(B, P(2.6, 0, 0), P(topU * 0.85, 0, h * 0.86), R * 1.05, PAL.galv, 6, R * 0.8);
  }
  // crossarm
  const armW = kind === 'tall' ? 3.4 : 3.0;
  // the crossarm is a braced lattice, not a stick — looking up at a Red Dog
  // tower from the chair (view-7) it is mostly crossarm and sheave train
  tube(B, P(topU, -armW, h), P(topU, armW, h), 0.22, PAL.galv, 6);
  tube(B, P(topU, -armW, h - 0.85), P(topU, armW, h - 0.85), 0.15, PAL.galv, 5);
  for (const v of [-armW * 0.72, -armW * 0.3, armW * 0.3, armW * 0.72]) {
    tube(B, P(topU, v, h), P(topU, v * 0.28, h - 0.85), 0.075, PAL.galv, 4);
  }
  // sheave trains, one each side, hanging under the arm, tilted on the breakover
  const tilt = kind === 'angled' ? 0.30 : 0.06;
  for (const side of [-1, 1]) {
    const v = side * (armW - 0.35);
    const drop = 0.95;
    tube(B, P(topU, v, h), P(topU + tilt * 1.2, v, h - drop), 0.15, PAL.galv, 5);
    const NS = kind === 'angled' ? 8 : 6, sp = 0.58;
    for (let i = 0; i < NS; i++) {
      const u = topU + (i - (NS - 1) / 2) * sp;
      const dz = h - drop - Math.abs(i - (NS - 1) / 2) * sp * tilt;
      tube(B, P(u, v - 0.30, dz), P(u, v + 0.30, dz), 0.165, PAL.steel, 7);
    }
    // the beam the sheaves hang from
    const uu0 = topU - (NS / 2) * sp, uu1 = topU + (NS / 2) * sp;
    tube(B, P(uu0, v, h - drop + 0.26), P(uu1, v, h - drop + 0.26), 0.11, PAL.galv, 5);
  }
  // ladder + catwalk
  for (const v of [-0.30, 0.30]) tube(B, P(-R * 1.9, v, 0.4), P(topU - R * 1.6, v, h - 0.6), 0.035, PAL.galv, 3);
  for (let i = 1; i * 0.42 < h - 1.0; i++) {
    const t = (i * 0.42) / h;
    tube(B, P(-R * 1.9 + topU * t, -0.30, i * 0.42), P(-R * 1.9 + topU * t, 0.30, i * 0.42), 0.022, PAL.galv, 3);
  }
  // number plate (view-14 of the sibling bundle: blue plates; Red Dog uses white)
  if (n) box(B, { x: P(0.1, -0.75, h * 0.55)[0], y: P(0.1, -0.75, h * 0.55)[1], z: P(0, 0, h * 0.55)[2],
                  sx: 0.6, sy: 0.05, sz: 0.6, yaw, col: PAL.white });
  return { top: P(topU, 0, h), armW };
}

// ------------------------------------------ THE ROPE/GROUND CLEARANCE SOLVE
// MAP-CLEANUP INCREMENT 22, defect class 2. Six of the seven lines set their
// tower heights from a LOCAL CURVATURE HEURISTIC —
//   `h = 11.0 + clamp(-conv * 46, -3.5, 9)`
// — which looks at 30 m either side of the tower foot and never asks the only
// question that matters: does the rope that hangs BETWEEN two towers clear the
// ground under it? It does not, in five places, and the measurement is
// `harness/lints/cable-clearance.mjs`:
//
//   RED DOG      span 9  -4.39 m   span 12  -5.44 m
//   FAR EAST     span 9  -0.32 m
//   OLYMPIC LADY span 11 -2.01 m
//   KT-22        span 25 -2.20 m
//
// Four of the five are the FINAL span, and that is structural rather than bad
// luck: the old placement ran `S0 = 26 .. S1 = L - 26` and spread the towers
// evenly *between* those, which makes the two end spans ~40 % LONGER than every
// interior span while anchoring them on the two LOWEST nodes on the line. The
// end spans should be the short ones.
//
// So the fix is three things, and none of them touches the ground raster:
//   1. the towers are spread over the WHOLE line (`s_i = L * i / (n+1)`), so
//      every span including the two end spans is the same length;
//   2. this solver then raises tower tops until the rope clears — SAG INCLUDED,
//      which the Funitel's own solver never was (it clears the straight chord
//      and then hangs a 2.6 m sag under it);
//   3. it is RAISE-ONLY. Every tower that already worked keeps the height it
//      had, so `L.tall` / `L.angled` and the whole read of the line survive.
//
// THE REQUIREMENT TAPERS INTO THE TERMINALS, and it has to. A rope arrives at a
// terminal AT DECK HEIGHT — that is what a terminal is — so demanding 6 m of
// air under the sheave head at the shed door is a requirement no lift on earth
// meets, and the first cut of this solver duly ran the last tower to 1,025 m
// trying to satisfy it. `req(d) = max(floor, clr * smoothstep(0, fade, d))`
// where d is the arc distance to the nearer terminal.
//
// `N` is a mutable node list, `{ x, y, z, g, cap }` — g is the ground under the
// node and `cap` the highest z that node is allowed to reach (a realistic tower
// or a realistic deck). Nodes are raised in preference order: towers before
// terminals, so a terminal only grows when every tower it hangs from is already
// at its cap. Returns what bound, so the caller can say so out loud instead of
// silently clamping — which is exactly what `funitelLine` used to do.
export function solveCableClearance(N, { gz, sagK, offsets,
                                         clr = 6.0, fade = 45, floor = 1.5,
                                         maxIter = 900 } = {}) {
  const spanLens = () => {
    const L = [];
    for (let i = 0; i < N.length - 1; i++)
      L.push(Math.hypot(N[i + 1].x - N[i].x, N[i + 1].y - N[i].y) || 1);
    return L;
  };
  const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const capped = new Set();
  let it = 0, worst = 0;
  for (; it < maxIter; it++) {
    const SL = spanLens();
    const cm = [0];
    for (const l of SL) cm.push(cm[cm.length - 1] + l);
    const tot = cm[cm.length - 1];
    worst = 0;
    let wi = -1, wt = 0;
    for (let i = 0; i < N.length - 1; i++) {
      const a = N[i], b = N[i + 1];
      const dx = b.x - a.x, dy = b.y - a.y, Ls = SL[i], sag = sagK * Ls;
      const M = Math.max(8, Math.ceil(Ls / 3));      // 3 m along every span
      for (let k = 0; k <= M; k++) {
        const t = k / M, s = cm[i] + Ls * t;
        const req = Math.max(floor, clr * smoothstep(0, fade, Math.min(s, tot - s)));
        const z = a.z + (b.z - a.z) * t - 4 * sag * t * (1 - t);
        for (const off of offsets) {
          const nx = -dy / Ls * off, ny = dx / Ls * off;
          const need = gz(a.x + dx * t + nx, a.y + dy * t + ny) + req - z;
          if (need > worst) { worst = need; wi = i; wt = t; }
        }
      }
    }
    if (worst < 0.02) break;
    // raise the nearer end first, and a TOWER before a TERMINAL
    const ends = wt < 0.5 ? [N[wi], N[wi + 1]] : [N[wi + 1], N[wi]];
    const order = [...ends.filter((n) => !n.term), ...ends.filter((n) => n.term)];
    let moved = false;
    for (const nd of order) {
      const room = nd.cap - nd.z;
      if (room <= 1e-3) { capped.add(nd); continue; }
      nd.z += Math.min(room, worst * 0.7);
      moved = true;
      break;
    }
    if (!moved) break;                                // everything is at its cap
  }
  return { iterations: it, residual: worst, capped: [...capped] };
}

/** worst rope-to-ground clearance on a solved node list, and where it is. */
export function measureCableClearance(N, { gz, sagK, offsets, step = 1.0 } = {}) {
  let worst = Infinity, at = null;
  const spans = [];
  for (let i = 0; i < N.length - 1; i++) {
    const a = N[i], b = N[i + 1];
    const dx = b.x - a.x, dy = b.y - a.y;
    const Ls = Math.hypot(dx, dy) || 1, sag = sagK * Ls;
    const M = Math.max(8, Math.ceil(Ls / step));
    let sw = Infinity, sat = null;
    for (let k = 0; k <= M; k++) {
      const t = k / M;
      const z = a.z + (b.z - a.z) * t - 4 * sag * t * (1 - t);
      for (const off of offsets) {
        const nx = -dy / Ls * off, ny = dx / Ls * off;
        const x = a.x + dx * t + nx, y = a.y + dy * t + ny;
        const c = z - gz(x, y);
        if (c < sw) { sw = c; sat = [+x.toFixed(1), +y.toFixed(1), +t.toFixed(3)]; }
      }
    }
    spans.push({ i, len: +Ls.toFixed(1), sag: +sag.toFixed(2), worst: +sw.toFixed(2), at: sat });
    if (sw < worst) { worst = sw; at = sat; }
  }
  return { worst: +worst.toFixed(2), at, spans };
}

// ------------------------------------------------------------------ cable
// Parabolic sag between consecutive sheave heads, two strands at +/- armW.
// THE HAUL ROPE IS A LINE. A 55 mm rope hanging 15-25 m in the air was drawn as
// a 4-sided tube in 7 segments per span: across five lifts and 72 spans that is
// 8.1 k triangles for something that is at most one pixel wide from anywhere a
// player can stand. 3 sides and 5 segments keep the catenary sag over a ~40 m
// span and cost 4.3 k. Fourth dressing reclaim (REPORT §14.7).
export function cable(B, nodes, armW, { r = 0.055, sagK = 0.010, seg = 5 } = {}) {
  for (const side of [-1, 1]) {
    for (let i = 0; i < nodes.length - 1; i++) {
      const a = nodes[i], b = nodes[i + 1];
      const dx = b[0] - a[0], dy = b[1] - a[1];
      const L = Math.hypot(dx, dy) || 1;
      const nx = -dy / L * side * armW, ny = dx / L * side * armW;
      const sag = sagK * L;
      let prev = null;
      for (let k = 0; k <= seg; k++) {
        const t = k / seg;
        const p = [a[0] + dx * t + nx, a[1] + dy * t + ny, lerp(a[2], b[2], t) - 4 * sag * t * (1 - t)];
        if (prev) tube(B, prev, p, r, PAL.black, 3);
        prev = p;
      }
    }
  }
}

// sample the cable line (side +/-1) at arc length s
export function makeCablePath(nodes, armW, sagK = 0.010) {
  const cum = [0];
  for (let i = 1; i < nodes.length; i++)
    cum.push(cum[i - 1] + Math.hypot(nodes[i][0] - nodes[i - 1][0], nodes[i][1] - nodes[i - 1][1]));
  const L = cum[cum.length - 1];
  return {
    L,
    at(s, side) {
      s = ((s % L) + L) % L;
      let i = 1;
      while (i < cum.length - 1 && cum[i] < s) i++;
      const a = nodes[i - 1], b = nodes[i];
      const span = (cum[i] - cum[i - 1]) || 1;
      const t = (s - cum[i - 1]) / span;
      const dx = b[0] - a[0], dy = b[1] - a[1];
      const d = Math.hypot(dx, dy) || 1;
      const sag = sagK * span;
      return {
        x: a[0] + dx * t - dy / d * side * armW,
        y: a[1] + dy * t + dx / d * side * armW,
        z: lerp(a[2], b[2], t) - 4 * sag * t * (1 - t),
        yaw: Math.atan2(dy, dx),
      };
    },
  };
}

// ------------------------------------------------------------------ chair
// Six-place: hanger, spring, bar, bench with six pads, backrest, safety bar
// (view-31 is shot from underneath one; view-33 is the same chair snow-loaded).
// THE CHAIR IS A SILHOUETTE, NOT A SEAT. A chair hangs 15-25 m in the air on a
// line the player rides by teleport (PLAYABLE.md: "It is a teleport, not a
// ride"), so the nearest anyone ever gets to one is the ~15 m of air under the
// haul rope. At that range the parts that read are the hanger, the arms, the
// bench slab, the seat-back and the bar — the outline. The parts that do not
// are the individual 6 cm seat pads and the extra facets on a 35 mm tube.
//
// This merge carries 320 chairs across five lines; at the base run's 137 tri
// average that was 44.1 k triangles of furniture nobody can sit in. Dropping
// the per-seat pads and taking the tubes from 4-5 sides to 3-4 halves it, and
// COMPOSING rule 17 says exactly where that budget goes instead: KT-22's rock.
// `lite: false` restores the full chair for a close-up render.
export function chairGeo(seed, seats = 6, { lite = true } = {}) {
  const B = buf();
  const W = seats * 0.56;
  const nT = lite ? 3 : 5, nA = lite ? 3 : 4;
  tube(B, [0, 0, 0], [0, 0, -1.30], 0.075, PAL.steelLo, lite ? 4 : 5);   // hanger
  tube(B, [0, 0, -1.30], [0, 0.10, -2.20], 0.065, PAL.steelLo, lite ? 4 : 5);
  tube(B, [-W / 2, 0.10, -2.20], [W / 2, 0.10, -2.20], 0.055, PAL.steelLo, nA);
  for (const s of [-1, 1]) tube(B, [s * W * 0.42, 0.10, -2.20], [s * W * 0.42, 0.30, -2.78], 0.05, PAL.steelLo, nT);
  // bench
  box(B, { x: 0, y: 0.26, z: -2.86, sx: W, sy: 0.56, sz: 0.10, col: PAL.dark });
  box(B, { x: 0, y: 0.0, z: -2.86, sx: W, sy: 0.10, sz: 0.86, col: PAL.dark });     // back
  if (!lite) {
    for (let i = 0; i < seats; i++) {
      const x = -W / 2 + (i + 0.5) * (W / seats);
      box(B, { x, y: 0.27, z: -2.76, sx: W / seats - 0.06, sy: 0.50, sz: 0.06, col: scalec(PAL.dark, 1.5) });
    }
  }
  // safety bar, down — kept in both LODs: it is half the chair's silhouette
  tube(B, [-W / 2 + 0.1, 0.62, -2.60], [W / 2 - 0.1, 0.62, -2.60], 0.035, PAL.steelLo, nA);
  for (const s of [-1, 1]) tube(B, [s * (W / 2 - 0.1), 0.62, -2.60], [s * (W / 2 - 0.1), 0.06, -2.30], 0.032, PAL.steelLo, nT);
  return B;
}
