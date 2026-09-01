// guide.js — the guided run. A tutorial that is a RUN, not a tooltip tour.
//
// Everything here is behind one flag (`?guide=1`, or `__PLAY.guide === true`
// for the standalone build). main.js dynamic-imports this module only when the
// flag is on, so a default bench boot never fetches it, never builds a DOM node
// and never adds a draw call. That is the whole of the "bench default is
// unchanged" guarantee — there is no `if (guide)` sprinkled through the player.
//
// Three ideas:
//
//   1. THE ROUTE IS DERIVED, NOT DRAWN. Every sign, arrow, dye strip and slalom
//      gate is a position ON A RUN POLYLINE the world already ships
//      (`world.runs`, PLAYABLE.md's read-only sibling of `lifts`). Re-trace a
//      run in poi-lab and the course moves with it. Nothing here is a
//      transcribed coordinate except the venue card's text.
//
//   2. GUIDANCE IS DIEGETIC AND NEVER BLOCKING. A trail sign, chevrons floating
//      over the snow, a dye stripe, one line of prompt. Every stage completes on
//      geometry (you got there) or on a timeout (you did not, and the guide gets
//      out of your way). The only thing that ever takes a keypress is the boot
//      card, and any key dismisses it.
//
//   3. THE SLALOM IS THE PUMP LESSON. Gates alternate to either side of the
//      fall line at a spacing chosen so the rhythm the gates force IS the carve
//      rhythm ski.js pays for (spec 0002 §1). Race score is gates + corridor +
//      the pump's own payouts, so the fast line and the correct line are the
//      same line.
//
// main.js wires it:
//   const guide = await import('./guide.js');
//   guide.init({ THREE, scene, ctrl, hud, collision, camera, ... });
//   guide.update(dt, live)      // once per frame, from playerSystems()

import { boardStore, ago } from './tricks.js';

// ============================================================ configuration
// The Red Dog course. Declared once and registered under every poi id it is
// known by: the bench calls this world `palisades-front`, and the standalone
// build renames the poi to `red-dog-palisades` on its way out
// (tools/export-red-dog/build.mjs). Keying on one of those alone would leave
// the guided run silently inert in exactly the build that ships it — and
// `matchWorld` below is the third belt: a world whose lifts and runs ARE this
// course gets it whatever anybody has decided to call the poi.
const RED_DOG = {
  venue: {
    title: 'RED DOG CHAIR',
    sub: 'Palisades Tahoe · Olympic Valley, CA',
    credit: 'terrain USGS 3DEP · trails © OpenStreetMap contributors (ODbL)',
  },
  // The descent, as run ids in order. Snow King Road IS the Champs road: it
  // leaves the Red Dog unload, flattens, swings hard right at the Far East top,
  // and feeds Champs Élysées, which feeds Red Dog Face.
  descent: ['snow-king-road', 'lower-champs', 'red-dog-face'],
  // the branch that leaves the descent at the Far East top — the fork the
  // player is being guided PAST
  forkRun: 'lower-dog-leg',
  // the lift home, and the line down off its unload
  lift: 'red-dog-express',
  chairline: ['upper-dog-leg'],
  // Poulsen's: the traverse in, and the run out
  poulsen: 'pou-entrance-3',
  outrun: 'lower-dog-leg',
  // the side takeoff (2.4 m) as opposed to the main band (5.8 m). Read live off
  // poulsen.mjs when the scene exposes it; these are the bake's own numbers as
  // the fallback. ENU, the world's own frame.
  sideLip: [-3.65, -105.41, 250.24],
  mainLip: [-33.64, -106.03, 255.74],
};

// One object. Everything a person would want to tune about the guided run is in
// here; nothing below reads a literal that is not derived from it or from the
// world's own polylines.
export const GUIDE_CONFIG = {
  // ---- which worlds the guided run knows. A world that matches none of them
  // still gets the boot cards and the lift QoL; it just has no course.
  worlds: {
    'palisades-front': RED_DOG,       // the bench's own run id for this world
    'red-dog-palisades': RED_DOG,     // what the standalone build renames it to
  },

  // ---- teach-W
  teachDistM: 45,          // m of route travelled that counts as "you have it"

  // ---- carve stage
  curveMinDeg: 22,         // total heading change that makes a bend a CURVE
  curveWindowM: 70,        // ...measured over this much route
  curveMergeM: 55,         // curves closer than this are one curve
  curvePromptM: 34,        // how far before the apex the A/D prompt lights up
  dyeWidthM: 7,            // the dye stripe laid down the middle of the trail
  arrowSpacingM: 26,       // chevron spacing along a guided leg
  arrowHeightM: 5.2,
  // A chevron lying FLAT in the ground plane is edge-on to a camera at eye
  // height and effectively invisible — which is what the first build shipped.
  // Standing it up 55 deg gives it a face to read while it still points where
  // it is pointing.
  arrowTiltDeg: 55,
  // ...and it has to get out of your way. You ski THROUGH these, so the one you
  // are about to pass fills the screen unless it shrinks away first.
  arrowNearM: 13,          // start shrinking inside this
  arrowGoneM: 4,           // gone by this
  dyeRibsAcross: 4,        // ground samples across the dye's width, not just 2

  // ---- the slalom
  gateSpacingM: 38,        // along-route spacing. At 14–18 m/s this is a 2.2 s
                           // turn rhythm, which is the pump's own period.
  gateOffsetM: 8.5,        // how far off the centre line each gate sits (alternating)
  gateHalfWidthM: 6.0,     // half the gap between the two poles
  gateSkipM: 30,           // pass this far beyond a gate without crossing it = missed
  corridorM: 16,           // half-width of the scoring corridor
  scoreGate: 100,
  scoreStreak: 10,         // + per consecutive gate, capped
  scoreStreakMax: 10,
  scoreCorridorPerS: 6,
  scorePump: 40,           // a paid pump transition (eta >= 1.2) while racing
  raceLeadInM: 45,         // gates start this far past the fork
  raceBoardKey: 'poi-lab.play.guide-race',

  // ---- Poulsen's
  sideApproachM: 55,       // the guided arc onto the side takeoff
  cliffWarnM: 22,          // how close to the main band earns the warn-off
  airAfterLipM: 40,        // airborne within this of the side lip = you sent it

  // ---- trick school
  trickPromptT: 50,        // s of sim before a trick prompt gives up and moves on

  // ---- pacing
  titleHoldMs: 2400,
  controlsHoldMs: 7000,
  toastT: 4.2,             // s a prompt line holds after its trigger leaves
  stageTimeoutS: 240,      // no stage may hold the machine longer than this
  fadeR: 190,              // m — guidance beyond this is invisible
  debug: false,
};

// ==================================================================== utils
const TAU = Math.PI * 2;
const D2R = Math.PI / 180, R2D = 180 / Math.PI;
const wrapPi = (a) => a - TAU * Math.round(a / TAU);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const clamp01 = (v) => clamp(v, 0, 1);
// three.js forward is -Z and the controller reads yaw as (-sin, -cos), so the
// yaw that points along a horizontal direction (dx, dz) is:
const yawOf = (dx, dz) => Math.atan2(-dx, -dz);
const fmtT = (s) => {
  if (!Number.isFinite(s)) return '—';
  const m = Math.floor(s / 60), r = s - m * 60;
  return m > 0 ? `${m}:${r.toFixed(2).padStart(5, '0')}` : r.toFixed(2) + 's';
};
const num = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

// ================================================================ the state
const S = {
  ok: false, on: false, errors: [],
  THREE: null, scene: null, camera: null, ctrl: null, hud: null,
  collision: null, groundAt: null, enter: null, unitScale: 1, convLit: (p) => p,
  trickState: () => null, skiState: () => null, lifts: null,
  poi: '', run: '', W: null,           // W = the per-world config block
  t: 0,                                // seconds of SIM since init
  root: null, dom: null,
  runs: new Map(),
  route: null, fork: null, race: null,
  stage: null, stageI: -1, stageT: 0, log: [],
  paidPumps: 0, landedTricks: 0,
  done: false,
};

const err = (e) => { S.errors.push(String((e && e.message) || e)); if (GUIDE_CONFIG.debug) console.warn('[guide]', e); };

// ======================================================== route mathematics
// A PATH is a resampled, ground-settled polyline in the three frame with a
// cumulative arc length, plus the queries every stage needs: where am I on it,
// which way does it point, how far off it am I.
function makePath(ptsThree, { step = 6 } = {}) {
  const P = [];
  const push = (x, z) => {
    const y = S.groundAt(x, z);
    P.push({ x, y: y === null ? 0 : y, z, s: 0, ok: y !== null });
  };
  for (let i = 1; i < ptsThree.length; i++) {
    const a = ptsThree[i - 1], b = ptsThree[i];
    const d = Math.hypot(b[0] - a[0], b[2] - a[2]);
    const n = Math.max(1, Math.round(d / step));
    for (let k = 0; k < n; k++) {
      const u = k / n;
      push(a[0] + (b[0] - a[0]) * u, a[2] + (b[2] - a[2]) * u);
    }
  }
  const last = ptsThree[ptsThree.length - 1];
  push(last[0], last[2]);
  let s = 0;
  for (let i = 1; i < P.length; i++) {
    s += Math.hypot(P[i].x - P[i - 1].x, P[i].z - P[i - 1].z);
    P[i].s = s;
  }
  const L = s;

  const at = (q) => {
    const t = clamp(q, 0, L);
    let lo = 0, hi = P.length - 1;
    while (lo < hi - 1) { const m = (lo + hi) >> 1; if (P[m].s <= t) lo = m; else hi = m; }
    const a = P[lo], b = P[hi], seg = Math.max(1e-6, b.s - a.s), u = (t - a.s) / seg;
    return {
      x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u, z: a.z + (b.z - a.z) * u,
      s: t, i: lo,
    };
  };
  // tangent, smoothed over `win` metres so a single jittery vertex is not a turn
  const dir = (q, win = 14) => {
    const a = at(q - win / 2), b = at(q + win / 2);
    const dx = b.x - a.x, dz = b.z - a.z;
    const m = Math.hypot(dx, dz) || 1;
    return { x: dx / m, z: dz / m, yaw: yawOf(dx / m, dz / m) };
  };
  // nearest point, searched from a hint so a 400-point path costs nothing
  const nearest = (x, z, hintS = null) => {
    let bs = 0, bd = Infinity;
    const i0 = hintS === null ? 0 : Math.max(0, at(hintS - 120).i);
    const i1 = hintS === null ? P.length - 1 : Math.min(P.length - 1, at(hintS + 120).i + 1);
    for (let i = i0; i <= i1; i++) {
      const d = (P[i].x - x) ** 2 + (P[i].z - z) ** 2;
      if (d < bd) { bd = d; bs = P[i].s; }
    }
    return { s: bs, d: Math.sqrt(bd) };
  };
  // signed lateral offset: + is the skier's RIGHT of the line
  const lateral = (x, z, q) => {
    const p = at(q), d = dir(q);
    // right = (forward rotated -90 in XZ) = (-dz, dx) ... in three's XZ plane
    // with forward -Z and right +X, the right vector of (dx,dz) is (-dz, dx)
    return (x - p.x) * (-d.z) + (z - p.z) * (d.x);
  };
  return { P, L, at, dir, nearest, lateral };
}

// Where does the path bend? Total heading change over a sliding window, peaks
// picked and merged. Sign follows the controller: yaw increases to the LEFT.
function findCurves(path, cfg) {
  const out = [];
  const step = 8;
  for (let s = cfg.curveWindowM; s < path.L - cfg.curveWindowM; s += step) {
    const a = path.dir(s - cfg.curveWindowM / 2).yaw;
    const b = path.dir(s + cfg.curveWindowM / 2).yaw;
    const d = wrapPi(b - a);
    out.push({ s, d });
  }
  const peaks = [];
  for (let i = 1; i < out.length - 1; i++) {
    const c = out[i];
    if (Math.abs(c.d) * R2D < cfg.curveMinDeg) continue;
    if (Math.abs(c.d) < Math.abs(out[i - 1].d) || Math.abs(c.d) < Math.abs(out[i + 1].d)) continue;
    peaks.push(c);
  }
  const merged = [];
  for (const p of peaks) {
    const prev = merged[merged.length - 1];
    if (prev && p.s - prev.s < cfg.curveMergeM && Math.sign(p.d) === Math.sign(prev.d)) {
      if (Math.abs(p.d) > Math.abs(prev.d)) { prev.s = p.s; prev.d = p.d; }
      continue;
    }
    merged.push({ s: p.s, d: p.d });
  }
  return merged.map((c) => ({
    s: c.s, deg: Math.round(Math.abs(c.d) * R2D),
    side: c.d > 0 ? 'left' : 'right',
    key: c.d > 0 ? 'A' : 'D',
  }));
}

// ==================================================================== visuals
// One group, one material family, and every stage's props are built on enter
// and disposed on exit — so the guide's whole footprint is the stage you are in.
function kit() {
  const T = S.THREE;
  const mats = {
    blue: new T.MeshBasicMaterial({ color: 0x3d8bff, transparent: true, opacity: 0.85, depthWrite: false, side: T.DoubleSide }),
    dye: new T.MeshBasicMaterial({ color: 0x2f6fe0, transparent: true, opacity: 0.30, depthWrite: false, side: T.DoubleSide }),
    dyeWarn: new T.MeshBasicMaterial({ color: 0xff4d00, transparent: true, opacity: 0.30, depthWrite: false, side: T.DoubleSide }),
    poleR: new T.MeshLambertMaterial({ color: 0xd8232a, emissive: 0x4a0b0d }),
    poleB: new T.MeshLambertMaterial({ color: 0x1450c8, emissive: 0x0a1a44 }),
    bannerR: new T.MeshBasicMaterial({ color: 0xd8232a, transparent: true, opacity: 0.9, side: T.DoubleSide }),
    bannerB: new T.MeshBasicMaterial({ color: 0x1450c8, transparent: true, opacity: 0.9, side: T.DoubleSide }),
    post: new T.MeshLambertMaterial({ color: 0x2a2723, emissive: 0x121110 }),
  };
  return mats;
}

// a trail-sign face, painted rather than typeset — the resort board dialect
function signTexture(T, { name, sub, diff, arrow }) {
  const W = 512, H = 320;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.fillStyle = '#f4f1ea'; g.fillRect(0, 0, W, H);
  g.fillStyle = '#171614'; g.fillRect(0, 0, W, 56);
  g.fillStyle = '#f4f1ea';
  g.font = '600 26px ui-monospace, Menlo, monospace';
  g.textBaseline = 'middle';
  g.fillText(String(sub || 'TRAIL').toUpperCase(), 22, 29);
  // difficulty pip
  const pip = { blue: '#1450c8', black: '#171614', double: '#171614', green: '#2f8f3f' }[diff] || '#1450c8';
  g.fillStyle = pip;
  if (diff === 'black' || diff === 'double') {
    g.beginPath(); g.moveTo(W - 46, 14); g.lineTo(W - 18, 29); g.lineTo(W - 46, 44); g.closePath(); g.fill();
    if (diff === 'double') { g.beginPath(); g.moveTo(W - 82, 14); g.lineTo(W - 54, 29); g.lineTo(W - 82, 44); g.closePath(); g.fill(); }
  } else { g.beginPath(); g.arc(W - 32, 29, 15, 0, TAU); g.fill(); }
  g.fillStyle = '#171614';
  g.font = '700 54px ui-monospace, Menlo, monospace';
  const words = String(name || '').toUpperCase().split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    const t = line ? line + ' ' + w : w;
    if (g.measureText(t).width > W - 44 && line) { lines.push(line); line = w; } else line = t;
  }
  if (line) lines.push(line);
  let y = 108;
  for (const l of lines.slice(0, 3)) { g.fillText(l, 22, y); y += 58; }
  if (arrow) {
    g.strokeStyle = '#1450c8'; g.lineWidth = 12; g.lineCap = 'round';
    const cy = H - 52, x0 = 32, x1 = W - 32;
    const rt = arrow === 'right';
    g.beginPath();
    g.moveTo(rt ? x0 : x1, cy); g.lineTo(rt ? x1 : x0, cy); g.stroke();
    g.beginPath();
    g.moveTo(rt ? x1 - 34 : x0 + 34, cy - 26); g.lineTo(rt ? x1 : x0, cy); g.lineTo(rt ? x1 - 34 : x0 + 34, cy + 26); g.stroke();
  }
  const tex = new T.CanvasTexture(c);
  tex.colorSpace = T.SRGBColorSpace || tex.colorSpace;
  tex.anisotropy = 4;
  return tex;
}

function bannerTexture(T, text, sub) {
  const W = 1024, H = 192;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.fillStyle = '#171614'; g.fillRect(0, 0, W, H);
  g.fillStyle = '#ff4d00'; g.fillRect(0, 0, W, 10); g.fillRect(0, H - 10, W, 10);
  g.fillStyle = '#f4f1ea';
  g.font = '800 92px ui-monospace, Menlo, monospace';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(String(text).toUpperCase(), W / 2, H / 2 - (sub ? 14 : 0));
  if (sub) {
    g.font = '600 30px ui-monospace, Menlo, monospace';
    g.fillStyle = '#c9c3b6';
    g.fillText(String(sub).toUpperCase(), W / 2, H / 2 + 52);
  }
  const tex = new T.CanvasTexture(c);
  tex.colorSpace = T.SRGBColorSpace || tex.colorSpace;
  return tex;
}

// A PROP SET is everything one stage put in the world. Stages never dispose
// each other's; `clearProps` is the only teardown and it is total.
function newProps() { return { objs: [], mats: [], geos: [], texs: [], arrows: null }; }
function addProp(P, o) { S.root.add(o); P.objs.push(o); return o; }
function clearProps(P) {
  if (!P) return;
  for (const o of P.objs) { if (o.parent) o.parent.remove(o); }
  for (const g of P.geos) { try { g.dispose(); } catch { /* */ } }
  for (const m of P.mats) { try { m.dispose(); } catch { /* */ } }
  for (const t of P.texs) { try { t.dispose(); } catch { /* */ } }
  P.objs.length = 0; P.geos.length = 0; P.mats.length = 0; P.texs.length = 0;
  P.arrows = null;
}

// ---- chevrons. One InstancedMesh for the whole leg: a guided leg is one draw
// call, whatever its length.
function buildArrows(P, path, s0, s1, { spacing = null, lift = null } = {}) {
  const T = S.THREE, C = GUIDE_CONFIG;
  const sp = spacing || C.arrowSpacingM;
  const pts = [];
  for (let s = s0; s <= s1 + 1e-6; s += sp) {
    const p = path.at(s), d = path.dir(s);
    if (!Number.isFinite(p.y)) continue;
    pts.push({ p, d });
  }
  if (!pts.length) return null;
  // the chevron, in the XZ plane, pointing at -Z (three's forward)
  const shape = new T.Shape();
  shape.moveTo(0, -1.9); shape.lineTo(1.5, 0.5); shape.lineTo(0.62, 0.5);
  shape.lineTo(0, -0.55); shape.lineTo(-0.62, 0.5); shape.lineTo(-1.5, 0.5);
  shape.closePath();
  const geo = new T.ShapeGeometry(shape);
  geo.rotateX(-Math.PI / 2);
  const mat = new T.MeshBasicMaterial({
    color: 0x3d8bff, transparent: true, opacity: 0.9, depthWrite: false, side: T.DoubleSide,
  });
  const mesh = new T.InstancedMesh(geo, mat, pts.length);
  mesh.frustumCulled = false;
  mesh.renderOrder = 4;
  const m = new T.Matrix4(), q = new T.Quaternion(), sc = new T.Vector3(1.5, 1, 1.5);
  const v = new T.Vector3(), e = new T.Euler();
  // 'YXZ' applies the local X tilt first and the yaw second, so the chevron is
  // stood up and THEN aimed — the other order would swing the tilt round the
  // world axis and lean every arrow a different way
  const tilt = GUIDE_CONFIG.arrowTiltDeg * D2R;
  const base = [];
  pts.forEach((it, i) => {
    const h = lift == null ? GUIDE_CONFIG.arrowHeightM : lift;
    base.push({ x: it.p.x, y: it.p.y + h, z: it.p.z, yaw: it.d.yaw });
    e.set(tilt, it.d.yaw, 0, 'YXZ'); q.setFromEuler(e);
    v.set(it.p.x, it.p.y + h, it.p.z);
    m.compose(v, q, sc);
    mesh.setMatrixAt(i, m);
  });
  mesh.instanceMatrix.needsUpdate = true;
  P.geos.push(geo); P.mats.push(mat);
  addProp(P, mesh);
  P.arrows = { mesh, base, m, q, sc, v, e, v2: new T.Vector3() };
  return P.arrows;
}

// ---- the dye stripe. A ground-conforming ribbon: every vertex is settled onto
// the collider, so it paints the snow instead of hovering over the moguls.
function buildDye(P, path, s0, s1, { width = null, color = 'dye', step = 5 } = {}) {
  const T = S.THREE;
  const w = (width == null ? GUIDE_CONFIG.dyeWidthM : width) / 2;
  // COLUMNS ACROSS THE WIDTH, not just the two edges. A ribbon settled only at
  // its edges spans whatever the ground does between them, and on a cat track
  // cut into a slope that is a slab hanging in the air over the downhill side.
  const cols = Math.max(2, GUIDE_CONFIG.dyeRibsAcross | 0);
  const pos = [], idx = [];
  let n = 0;
  for (let s = s0; s <= s1 + 1e-6; s += step) {
    const p = path.at(s), d = path.dir(s);
    const rx = -d.z, rz = d.x;
    for (let c = 0; c < cols; c++) {
      const off = (c / (cols - 1)) * 2 - 1;            // −1 .. +1
      const x = p.x + rx * w * off, z = p.z + rz * w * off;
      const gy = S.groundAt(x, z);
      pos.push(x, (gy === null ? p.y : gy) + 0.07, z);
    }
    n++;
  }
  if (n < 2) return null;
  for (let i = 0; i < n - 1; i++) {
    const a = i * cols, b = (i + 1) * cols;
    for (let c = 0; c < cols - 1; c++) {
      idx.push(a + c, a + c + 1, b + c, a + c + 1, b + c + 1, b + c);
    }
  }
  const geo = new T.BufferGeometry();
  geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  const mat = new T.MeshBasicMaterial({
    color: color === 'warn' ? 0xff4d00 : 0x2f6fe0,
    transparent: true, opacity: 0.30, depthWrite: false, side: T.DoubleSide,
  });
  const mesh = new T.Mesh(geo, mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = 2;
  P.geos.push(geo); P.mats.push(mat);
  return addProp(P, mesh);
}

// ---- a trail sign on a post, planted beside the line and facing back up it
function buildSign(P, at, yawFacing, spec) {
  const T = S.THREE;
  const g = new T.Group();
  const postGeo = new T.CylinderGeometry(0.09, 0.11, 2.9, 6);
  const post = new T.Mesh(postGeo, new T.MeshLambertMaterial({ color: 0x2a2723, emissive: 0x121110 }));
  post.position.y = 1.45;
  const tex = signTexture(T, spec);
  const panelGeo = new T.PlaneGeometry(2.6, 1.62);
  const panel = new T.Mesh(panelGeo, new T.MeshBasicMaterial({ map: tex, transparent: true, side: T.DoubleSide }));
  panel.position.y = 3.5;
  g.add(post, panel);
  g.position.set(at.x, at.y, at.z);
  g.rotation.y = yawFacing;
  P.geos.push(postGeo, panelGeo);
  P.mats.push(post.material, panel.material);
  P.texs.push(tex);
  return addProp(P, g);
}

// ---- the finish banner: two posts and a painted cloth across the run
function buildBanner(P, at, yawFacing, text, sub, width = 16) {
  const T = S.THREE;
  const g = new T.Group();
  const postGeo = new T.CylinderGeometry(0.13, 0.16, 5.2, 6);
  const mat = new T.MeshLambertMaterial({ color: 0x2a2723, emissive: 0x121110 });
  for (const sgn of [-1, 1]) {
    const p = new T.Mesh(postGeo, mat);
    p.position.set(sgn * width / 2, 2.6, 0);
    g.add(p);
  }
  const tex = bannerTexture(T, text, sub);
  const clothGeo = new T.PlaneGeometry(width, width * 0.1875);
  const cloth = new T.Mesh(clothGeo, new T.MeshBasicMaterial({ map: tex, transparent: true, side: T.DoubleSide }));
  cloth.position.y = 4.7;
  g.add(cloth);
  g.position.set(at.x, at.y, at.z);
  g.rotation.y = yawFacing;
  P.geos.push(postGeo, clothGeo); P.mats.push(mat, cloth.material); P.texs.push(tex);
  return addProp(P, g);
}

// ---- the slalom gates. Two instanced pole meshes and two instanced banners:
// thirty gates cost four draw calls.
function buildGates(P, gates) {
  const T = S.THREE;
  const poleGeo = new T.CylinderGeometry(0.055, 0.055, 1.9, 5);
  poleGeo.translate(0, 0.95, 0);
  const bGeo = new T.PlaneGeometry(1, 0.42);
  const made = [];
  for (const col of ['R', 'B']) {
    const list = gates.filter((g) => g.color === col);
    if (!list.length) { made.push(null); continue; }
    const pm = new T.MeshLambertMaterial({
      color: col === 'R' ? 0xd8232a : 0x1450c8,
      emissive: col === 'R' ? 0x4a0b0d : 0x0a1a44,
    });
    const bm = new T.MeshBasicMaterial({
      color: col === 'R' ? 0xd8232a : 0x1450c8,
      transparent: true, opacity: 0.92, side: T.DoubleSide, depthWrite: false,
    });
    const poles = new T.InstancedMesh(poleGeo, pm, list.length * 2);
    const bans = new T.InstancedMesh(bGeo, bm, list.length);
    poles.frustumCulled = false; bans.frustumCulled = false;
    const m = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), v = new T.Vector3();
    const one = new T.Vector3(1, 1, 1);
    list.forEach((g, i) => {
      e.set(0, g.yaw, 0); q.setFromEuler(e);
      for (const k of [0, 1]) {
        const sgn = k ? 1 : -1;
        const x = g.x + g.rx * g.half * sgn, z = g.z + g.rz * g.half * sgn;
        const gy = S.groundAt(x, z);
        v.set(x, (gy === null ? g.y : gy), z);
        m.compose(v, q, one);
        poles.setMatrixAt(i * 2 + k, m);
      }
      v.set(g.x, g.y + 1.55, g.z);
      m.compose(v, q, new T.Vector3(g.half * 2, 1, 1));
      bans.setMatrixAt(i, m);
    });
    poles.instanceMatrix.needsUpdate = true;
    bans.instanceMatrix.needsUpdate = true;
    P.mats.push(pm, bm);
    addProp(P, poles); addProp(P, bans);
    made.push({ poles, bans });
  }
  P.geos.push(poleGeo, bGeo);
  return made;
}

// ====================================================================== HUD
// The guide's own DOM and its own <style>, injected on init and only on init.
// It never touches hud.js: the lift prompt, the pump arc and the combo strip
// are somebody else's instruments and a tutorial that fought them would be a
// regression, not a feature.
const CSS = `
.gd,.gd *{box-sizing:border-box}
/* 44 sits above the instrument HUD (20) and the pause panel (40) and below the
   locker (50) and the boot card (60) — the guide is an overlay on the world,
   never on somebody's open modal. The boot cards get their own layer. */
.gd{position:fixed;inset:0;pointer-events:none;z-index:44;font:500 13px/1.4 ui-monospace,Menlo,Consolas,monospace;color:#f4f1ea}
body.gd-intro-up .phud,body.gd-intro-up .ppause{display:none!important}
.gd__cards{position:absolute;inset:0;z-index:70;display:flex;align-items:center;justify-content:center;background:rgba(12,11,10,.42);
  opacity:0;transition:opacity .45s ease;pointer-events:auto}
.gd__cards.is-in{opacity:1}
.gd__cards.is-out{opacity:0}
.gd__card{background:rgba(23,22,20,.93);border:1px solid rgba(244,241,234,.16);padding:30px 38px;min-width:min(460px,86vw);
  text-align:center;box-shadow:0 24px 80px rgba(0,0,0,.5)}
.gd__h1{margin:0;font:800 30px/1.1 ui-monospace,Menlo,monospace;letter-spacing:.06em}
.gd__sub{margin:12px 0 0;font-size:13px;color:#c9c3b6;letter-spacing:.04em}
.gd__credit{margin:18px 0 0;font-size:10px;color:#8b857a;letter-spacing:.03em}
.gd__h2{margin:0 0 16px;font:700 15px/1 ui-monospace,Menlo,monospace;letter-spacing:.22em;color:#ff4d00}
.gd__keys{display:grid;grid-template-columns:auto 1fr;gap:8px 18px;text-align:left;margin:0 auto;width:max-content}
.gd__cap{font-weight:700;letter-spacing:.08em}
.gd__what{color:#c9c3b6}
.gd__go{margin:20px 0 0;font-size:11px;color:#8b857a;letter-spacing:.12em}
.gd__toast{position:absolute;left:50%;bottom:16%;transform:translateX(-50%);display:flex;align-items:center;gap:10px;
  background:rgba(23,22,20,.86);border:1px solid rgba(244,241,234,.18);padding:9px 14px;white-space:nowrap;
  opacity:0;transition:opacity .25s ease}
.gd__toast.is-on{opacity:1}
.gd__toast b{display:inline-block;min-width:26px;padding:2px 7px;background:#f4f1ea;color:#171614;font-weight:800;text-align:center}
.gd__toast.is-warn{border-color:#ff4d00}
.gd__toast.is-warn b{background:#ff4d00;color:#171614}
.gd__race{position:absolute;left:50%;top:14px;transform:translateX(-50%);display:none;gap:22px;
  background:rgba(23,22,20,.86);border:1px solid rgba(244,241,234,.18);padding:8px 18px}
.gd__race.is-on{display:flex}
.gd__cell{display:flex;flex-direction:column;align-items:center;gap:2px}
.gd__k{font-size:9px;letter-spacing:.16em;color:#8b857a}
.gd__v{font:700 18px/1 ui-monospace,Menlo,monospace;font-variant-numeric:tabular-nums}
.gd__v.is-hot{color:#ff4d00}
.gd__fin{position:absolute;left:50%;top:38%;transform:translate(-50%,-50%);text-align:center;
  background:rgba(23,22,20,.94);border:1px solid #ff4d00;padding:22px 34px;opacity:0;transition:opacity .3s ease}
.gd__fin.is-on{opacity:1}
.gd__fin h3{margin:0 0 4px;font:800 13px/1 ui-monospace,Menlo,monospace;letter-spacing:.2em;color:#ff4d00}
.gd__fin .big{font:800 40px/1.05 ui-monospace,Menlo,monospace;font-variant-numeric:tabular-nums}
.gd__fin .row{margin-top:8px;font-size:12px;color:#c9c3b6;letter-spacing:.04em}
.gd__stage{position:absolute;left:12px;bottom:12px;font-size:10px;color:#8b857a;letter-spacing:.1em}
`;

function buildDom() {
  const mk = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
  const style = document.createElement('style');
  style.id = 'gd-style';
  style.textContent = CSS;
  document.head.appendChild(style);

  const root = mk('div', 'gd');

  // ---- boot cards
  const cards = mk('div', 'gd__cards');
  const title = mk('section', 'gd__card');
  const controls = mk('section', 'gd__card');
  controls.hidden = true;
  cards.append(title, controls);

  // ---- the one prompt line
  const toast = mk('div', 'gd__toast');
  const tKey = mk('b', null, 'W');
  const tTxt = mk('span', null, '');
  toast.append(tKey, tTxt);

  // ---- race instruments
  const race = mk('div', 'gd__race');
  const cells = {};
  for (const [k, label] of [['time', 'TIME'], ['score', 'RACE SCORE'], ['gates', 'GATES']]) {
    const c = mk('div', 'gd__cell');
    c.append(mk('span', 'gd__k', label), mk('span', 'gd__v', '—'));
    cells[k] = c.lastChild;
    race.append(c);
  }

  const fin = mk('div', 'gd__fin');
  const finH = mk('h3', null, 'FINISH');
  const finBig = mk('div', 'big', '—');
  const finRow = mk('div', 'row', '');
  const finRow2 = mk('div', 'row', '');
  fin.append(finH, finBig, finRow, finRow2);

  const stageChip = mk('div', 'gd__stage', '');
  stageChip.hidden = !GUIDE_CONFIG.debug;

  root.append(cards, toast, race, fin, stageChip);
  document.body.appendChild(root);

  return {
    root, style, cards, title, controls, toast, tKey, tTxt, race, cells,
    fin, finH, finBig, finRow, finRow2, stageChip, mk,
  };
}

// ---- the prompt line. One at a time, holds `toastT` sim-seconds past its last
// re-assertion, then fades. Re-asserting is idempotent, so a stage can shout the
// same line every frame it is relevant without it ever flickering.
let promptT = 0, promptKey = '', promptTxt = '', promptWarn = false;
const promptLog = [];
function prompt(key, text, { warn = false, hold = null } = {}) {
  const d = S.dom;
  if (!d) return;
  if (key !== promptKey || text !== promptTxt || warn !== promptWarn) {
    promptKey = key; promptTxt = text; promptWarn = warn;
    // every distinct line the guide has actually said, in order. A prompt that
    // is only up for two seconds at 15 m/s is invisible to any sampler slower
    // than the run; this is how it is checked.
    promptLog.push({ t: +S.t.toFixed(1), stage: S.stage ? S.stage.id : null, key, text, warn });
    if (promptLog.length > 80) promptLog.shift();
    d.tKey.textContent = key || '·';
    d.tKey.style.display = key ? '' : 'none';
    d.tTxt.textContent = text || '';
    d.toast.classList.toggle('is-warn', !!warn);
  }
  promptT = hold == null ? GUIDE_CONFIG.toastT : hold;
  d.toast.classList.add('is-on');
}
function promptTick(dt) {
  if (promptT <= 0) return;
  promptT -= dt;
  if (promptT <= 0 && S.dom) { S.dom.toast.classList.remove('is-on'); promptKey = promptTxt = ''; }
}

// ============================================================ the boot cards
function bootCards() {
  const d = S.dom, C = GUIDE_CONFIG;
  const V = (S.W && S.W.venue) || { title: (S.poi || 'world').toUpperCase(), sub: '', credit: '' };
  d.title.append(
    d.mk('h1', 'gd__h1', V.title),
    d.mk('p', 'gd__sub', V.sub || ''),
    V.credit ? d.mk('p', 'gd__credit', V.credit) : d.mk('span'),
  );
  const keys = d.mk('div', 'gd__keys');
  for (const [cap, what] of [
    ['W A S D', 'move · A D carve'],
    ['MOUSE', 'look'],
    ['SPACE', 'jump'],
    ['← →', 'tricks in the air'],
    ['F', 'ride the chair'],
    ['R', 'reset'],
    ['C', 'camera'],
  ]) keys.append(d.mk('div', 'gd__cap', cap), d.mk('div', 'gd__what', what));
  d.controls.append(d.mk('h2', 'gd__h2', 'CONTROLS'), keys, d.mk('p', 'gd__go', 'press any key to drop in'));

  document.body.classList.add('gd-intro-up');
  requestAnimationFrame(() => d.cards.classList.add('is-in'));

  // what was actually painted, kept so a headless run can assert on the boot
  // flow without racing the 2.4 s timer that advances it
  S.cards = {
    title: V.title, sub: V.sub || '', credit: V.credit || '',
    controls: d.controls.innerText.replace(/\n+/g, ' | '),
    log: [{ card: 'title', at: Date.now() }],
  };

  let stage = 0, timer = setTimeout(advance, C.titleHoldMs);
  function advance() {
    clearTimeout(timer);
    if (stage === 0) {
      S.cards.log.push({ card: 'controls', at: Date.now() });
      stage = 1;
      d.title.hidden = true; d.controls.hidden = false;
      timer = setTimeout(advance, C.controlsHoldMs);
      return;
    }
    if (stage >= 2) return;
    stage = 2;
    S.cards.log.push({ card: 'playing', at: Date.now() });
    d.cards.classList.remove('is-in');
    d.cards.classList.add('is-out');
    setTimeout(() => { d.cards.remove(); }, 400);
    try { if (S.enter) S.enter(); } catch (e) { err(e); }
    document.body.classList.remove('gd-intro-up');
    detach();
  }
  const onKey = (e) => {
    if (e.key === 'F5' || e.key === 'F12' || e.metaKey || e.ctrlKey || e.altKey) return;
    e.preventDefault(); advance();
  };
  const onTap = (e) => { e.preventDefault(); e.stopPropagation(); advance(); };
  function detach() {
    removeEventListener('keydown', onKey, true);
    d.cards.removeEventListener('pointerdown', onTap);
  }
  addEventListener('keydown', onKey, true);
  d.cards.addEventListener('pointerdown', onTap);
  return { skip: () => { while (stage < 2) advance(); }, stage: () => stage };
}

// =================================================================== stages
// A stage owns its props, its prompt and its exit condition. `done()` is
// geometry; `bypassed()` is "the player is past this, stop talking"; the machine
// also force-advances on stageTimeoutS so nothing can wedge the run.
function makeStages() {
  const C = GUIDE_CONFIG, R = S.route;
  const st = [];

  // ---------------------------------------------------------------- 1 · W
  st.push({
    id: 'teach-w',
    enter(P) {
      buildArrows(P, R.descent, R.descentStart, Math.min(R.descentStart + 130, R.descent.L), { spacing: 22 });
    },
    tick() {
      const me = here(R.descent, R.sHint);
      if (me.s - R.descentStart < 6 && S.ctrl.speed() < 3) prompt('W', 'skate — get it rolling');
      else prompt('W', 'hold W down the flats');
    },
    done() {
      const me = here(R.descent, R.sHint);
      return me.s - R.descentStart > C.teachDistM || S.ctrl.speed() > 9;
    },
  });

  // ------------------------------------------------------------ 2 · carve
  const carve = R.curvesBeforeFork;
  st.push({
    id: 'carve',
    enter(P) {
      const s0 = R.descentStart + C.teachDistM * 0.5;
      const s1 = R.forkS;
      buildDye(P, R.descent, s0, s1, { width: C.dyeWidthM });
      buildArrows(P, R.descent, s0, s1);
      if (carve.length) {
        const c = carve[0];
        const at = R.descent.at(Math.max(s0, c.s - 40));
        const d = R.descent.dir(at.s);
        // planted on the OUTSIDE of the bend, facing back up the trail
        const side = c.side === 'left' ? 1 : -1;
        const sx = at.x + (-d.z) * 5.5 * side, sz = at.z + (d.x) * 5.5 * side;
        const gy = S.groundAt(sx, sz);
        buildSign(P, { x: sx, y: gy === null ? at.y : gy, z: sz },
          d.yaw + Math.PI,
          { name: 'CHAMPS ELYSEES', sub: 'RED DOG', diff: 'black', arrow: c.side === 'left' ? 'left' : 'right' });
      }
    },
    tick() {
      const me = here(R.descent, R.sHint);
      const c = carve.find((q) => q.s > me.s - 12);
      if (!c) { prompt('', 'stay on the dye'); return; }
      const d = c.s - me.s;
      if (d < C.curvePromptM) {
        prompt(c.key, c.key === 'A' ? 'carve left' : 'carve right');
      } else if (d < C.curvePromptM * 2.2) {
        prompt('', (c.side === 'left' ? 'left' : 'right') + ' bend ahead · ' + Math.round(d) + ' m');
      }
    },
    // hand over well BEFORE the fork: a sign you meet at the junction is a sign
    // you read after you have already chosen
    done() { return here(R.descent, R.sHint).s > R.forkS - 70; },
  });

  // ------------------------------------------------------------- 3 · fork
  st.push({
    id: 'fork',
    enter(P) {
      const at = R.descent.at(R.forkS);
      const d = R.descent.dir(R.forkS);
      const sx = at.x + (-d.z) * 7, sz = at.z + (d.x) * 7;
      const gy = S.groundAt(sx, sz);
      buildSign(P, { x: sx, y: gy === null ? at.y : gy, z: sz }, d.yaw + Math.PI,
        { name: 'CHAMPS ELYSEES', sub: R.forkName ? 'NOT ' + R.forkName : 'STAY LEFT', diff: 'black' });
      buildArrows(P, R.descent, R.forkS - 70, Math.min(R.forkS + 90, R.descent.L), { spacing: 18 });
      buildDye(P, R.descent, R.forkS - 70, Math.min(R.forkS + 90, R.descent.L), { width: C.dyeWidthM });
    },
    tick() { prompt('', 'fork — follow the arrows down Champs'); },
    done() { return here(R.descent, R.sHint).s > R.forkS + 55; },
  });

  // ----------------------------------------------------------- 4 · slalom
  st.push({
    id: 'slalom',
    enter(P) {
      buildGates(P, R.gates);
      buildDye(P, R.descent, R.raceS0 - 12, R.raceS1, { width: C.corridorM * 2, color: 'dye', step: 7 });
      buildBanner(P, R.descent.at(R.raceS1), R.descent.dir(R.raceS1).yaw, 'FINISH', S.W && S.W.venue ? S.W.venue.title : '');
      const at = R.descent.at(R.raceS0 - 14);
      const d = R.descent.dir(at.s);
      const sx = at.x + (-d.z) * 8, sz = at.z + (d.x) * 8;
      const gy = S.groundAt(sx, sz);
      buildSign(P, { x: sx, y: gy === null ? at.y : gy, z: sz }, d.yaw + Math.PI,
        { name: 'SLALOM START', sub: 'RACE COURSE', diff: 'blue' });
      raceReset();
      S.dom.race.classList.add('is-on');
    },
    tick(dt) {
      raceTick(dt);
      if (!S.race.started) prompt('', 'through the gates — carve, do not skid');
      else if (S.race.lastMiss > 0) prompt('', 'gate missed — get back in the dye', { warn: true });
    },
    exit() { S.dom.race.classList.remove('is-on'); },
    done() { return S.race.finished; },
  });

  // -------------------------------------------------------- 5 · ride home
  st.push({
    id: 'lift',
    enter(P) {
      if (!R.liftBase) return;
      const from = R.descent.at(R.descent.L);
      const path = makePath([[from.x, from.y, from.z], [R.liftBase.x, R.liftBase.y, R.liftBase.z]], { step: 8 });
      P.legPath = path;
      buildArrows(P, path, 6, Math.max(6, path.L - 8), { spacing: 24 });
    },
    tick() {
      if (!R.liftBase) return;
      const p = S.ctrl.position;
      const d = Math.hypot(p.x - R.liftBase.x, p.z - R.liftBase.z);
      if (d < (S.liftRadius || 9) + 2) prompt('F', 'ride ' + (R.liftName || 'the chair'));
      else prompt('', 'skate to ' + (R.liftName || 'the chair') + ' · ' + Math.round(d) + ' m');
    },
    done() { return S.liftRidesAtEnter != null && S.rides() > S.liftRidesAtEnter; },
    onEnterRecordRides: true,
  });

  // ------------------------------------------------------- 6 · chairline
  st.push({
    id: 'chairline',
    enter(P) {
      if (!R.chairline) return;
      buildArrows(P, R.chairline, 0, R.chairline.L, { spacing: 30 });
      buildDye(P, R.chairline, 0, R.chairline.L, { width: C.dyeWidthM, step: 7 });
    },
    tick() { prompt('', 'freeski the chairline into Dog Leg'); },
    done() {
      if (!R.chairline) return true;
      const me = here(R.chairline, null);
      return me.s > R.chairline.L - 40 || nearXZ(S.ctrl.position, R.pouFork, 45);
    },
  });

  // -------------------------------------------------------- 7 · poulsen's
  st.push({
    id: 'poulsen',
    enter(P) {
      if (!R.pouApproach) return;
      buildArrows(P, R.pouApproach, 0, R.pouApproach.L, { spacing: 20 });
      buildDye(P, R.pouApproach, 0, R.pouApproach.L, { width: 6, step: 4 });
      const at = R.pouApproach.at(4);
      const d = R.pouApproach.dir(4);
      const sx = at.x + (-d.z) * 6, sz = at.z + (d.x) * 6;
      const gy = S.groundAt(sx, sz);
      buildSign(P, { x: sx, y: gy === null ? at.y : gy, z: sz }, d.yaw + Math.PI,
        { name: "POULSEN'S SIDE HIT", sub: '2.4 m TAKEOFF', diff: 'double' });
      if (R.mainLip) {
        // the 5.8 m band is marked in warn colour, and marked as a thing to
        // stay off rather than a thing to aim at
        const w = makePath([
          [R.mainLip.x - 16, R.mainLip.y, R.mainLip.z - 2],
          [R.mainLip.x + 8, R.mainLip.y, R.mainLip.z + 2],
        ], { step: 4 });
        buildDye(P, w, 0, w.L, { width: 5, color: 'warn', step: 3 });
      }
    },
    tick() {
      const p = S.ctrl.position;
      if (R.mainLip && nearXZ(p, R.mainLip, GUIDE_CONFIG.cliffWarnM)) {
        prompt('', 'that is the 5.8 m band — go right, take the side hit', { warn: true });
        return;
      }
      if (R.sideLip) {
        const d = Math.hypot(p.x - R.sideLip.x, p.z - R.sideLip.z);
        if (d < 26) prompt('SPACE', 'send the side takeoff');
        else prompt('', "Poulsen's — side takeoff · " + Math.round(d) + ' m');
      }
    },
    done() {
      if (!R.sideLip) return true;
      const p = S.ctrl.position;
      const d = Math.hypot(p.x - R.sideLip.x, p.z - R.sideLip.z);
      if (d < GUIDE_CONFIG.airAfterLipM && !S.ctrl.grounded) { S.sent = true; return true; }
      // ...or they simply skied past it: below the band and moving on
      return p.y < R.sideLip.y - 26;
    },
  });

  // ------------------------------------------------------ 8 · trick school
  const TRICKS = [
    { id: 'spin', key: '← →', text: 'in the air — hold one arrow to spin', fams: ['spin'] },
    { id: 'flip', key: '↑ ↓', text: 'now the other axis — flip', fams: ['flip', 'underflip'] },
    { id: 'diag', key: '←+↑', text: 'both together — cork, bio, rodeo', fams: ['cork', 'bio', 'misty', 'rodeo'] },
  ];
  st.push({
    id: 'tricks',
    enter() { S.trickStep = 0; S.trickT = 0; S.trickGot = []; },
    tick(dt) {
      const step = TRICKS[S.trickStep];
      if (!step) return;
      S.trickT += dt;
      const t = S.trickState();
      if (t && t.landed > S.landedTricks) {
        S.landedTricks = t.landed;
        const fam = t.last && t.last.family;
        if (fam && step.fams.includes(fam)) {
          S.trickGot.push(fam);
          S.trickStep++; S.trickT = 0;
          prompt('', 'clean · ' + (t.last.name || fam), { hold: 2.5 });
          return;
        }
      }
      if (S.trickT > GUIDE_CONFIG.trickPromptT) { S.trickStep++; S.trickT = 0; return; }
      prompt(step.key, step.text);
    },
    done() { return S.trickStep >= TRICKS.length; },
  });

  // --------------------------------------------------------- 9 · the outrun
  st.push({
    id: 'outrun',
    enter(P) {
      if (!R.outrun) return;
      buildArrows(P, R.outrun, R.outrunS0, R.outrun.L, { spacing: 30 });
      buildDye(P, R.outrun, R.outrunS0, R.outrun.L, { width: C.dyeWidthM, step: 8 });
    },
    tick() { prompt('', 'lower Dog Leg — ride it out'); },
    done() {
      if (!R.outrun) return true;
      return here(R.outrun, null).s > R.outrun.L - 45;
    },
  });

  // ---------------------------------------------------------- 10 · finished
  st.push({
    id: 'complete',
    enter() {
      const d = S.dom;
      d.finH.textContent = 'TUTORIAL COMPLETE';
      d.finBig.textContent = S.race.time ? fmtT(S.race.time) : 'nice';
      d.finRow.textContent = S.race.score ? 'race score ' + num(S.race.score) + ' · ' + S.race.cleared + '/' + (S.route.gates || []).length + ' gates' : '';
      d.finRow2.textContent = 'the mountain is yours';
      d.fin.classList.add('is-on');
      setTimeout(() => d.fin.classList.remove('is-on'), 6000);
      S.done = true;
    },
    tick() { },
    // the machine rests here. There is nothing after "you can ski this
    // mountain", and a terminal stage is also what stops the timeout from
    // quietly nulling the finish card out from under the player.
    terminal: true,
    done() { return false; },
  });

  return st;
}

const nearXZ = (p, q, r) => !!q && Math.hypot(p.x - q.x, p.z - q.z) < r;

// where the player is on a path, with a moving hint so the search is local
function here(path, hint) {
  const p = S.ctrl.position;
  const n = path.nearest(p.x, p.z, hint);
  return n;
}

// ================================================================= the race
function raceReset() {
  S.race = {
    on: true, started: false, finished: false,
    t: 0, time: null, score: 0, cleared: 0, missed: 0, streak: 0,
    next: 0, lastMiss: 0, best: null, rank: -1, pumps: 0,
  };
}

function raceTick(dt) {
  const R = S.route, C = GUIDE_CONFIG, r = S.race;
  if (!r || r.finished) return;
  const p = S.ctrl.position;
  const gates = R.gates;

  // ---- gate judging. A gate is a plane; you are through it the frame the dot
  // product with its forward flips sign, and the verdict is how far off centre
  // you were when it did.
  while (r.next < gates.length) {
    const g = gates[r.next];
    const d = (p.x - g.x) * g.fx + (p.z - g.z) * g.fz;
    if (g.prev === undefined) { g.prev = d; break; }
    const crossed = g.prev < 0 && d >= 0;
    g.prev = d;
    if (crossed) {
      const lat = Math.abs((p.x - g.x) * g.rx + (p.z - g.z) * g.rz);
      if (lat <= g.half) {
        if (!r.started) { r.started = true; r.t = 0; }
        r.cleared++; r.streak++;
        r.score += C.scoreGate + Math.min(C.scoreStreakMax, r.streak) * C.scoreStreak;
      } else {
        r.missed++; r.streak = 0; r.lastMiss = 2.5;
      }
      r.next++;
      continue;
    }
    // skipped entirely — they are past it and never crossed near it
    const me = here(R.descent, R.sHint);
    if (me.s > g.s + C.gateSkipM) { r.missed++; r.streak = 0; r.lastMiss = 2.5; r.next++; continue; }
    break;
  }
  if (r.lastMiss > 0) r.lastMiss -= dt;

  if (!r.started) {
    // the clock starts at the first gate line, not at the stage
    if (gates.length && here(R.descent, R.sHint).s > gates[0].s) { r.started = true; r.t = 0; }
    return;
  }
  r.t += dt;

  // ---- corridor: the trickle that makes "on the line" worth points
  const me = here(R.descent, R.sHint);
  if (me.d < C.corridorM) r.score += C.scoreCorridorPerS * dt;

  // ---- the pump link. §1 pays for the rhythm the gates force, so the race
  // pays for it too: this is the whole reason the gate spacing is what it is.
  const ss = S.skiState();
  if (ss && ss.paid !== S.paidPumps) {
    const wasPaid = S.paidPumps;
    S.paidPumps = ss.paid;
    if (wasPaid >= 0 && ss.last && ss.last.eta >= 1.2) { r.score += C.scorePump; r.pumps++; }
  }

  // ---- the finish line
  if (me.s >= R.raceS1 - 2) finishRace();
  updateRaceHud();
}

function updateRaceHud() {
  const d = S.dom, r = S.race;
  if (!d || !r) return;
  d.cells.time.textContent = r.started ? fmtT(r.t) : '—';
  d.cells.score.textContent = num(r.score);
  d.cells.gates.textContent = r.cleared + '/' + (S.route.gates || []).length;
  d.cells.score.classList.toggle('is-hot', r.streak >= 4);
}

function finishRace() {
  const r = S.race;
  if (r.finished) return;
  r.finished = true;
  r.time = +r.t.toFixed(2);
  r.score = Math.round(r.score);
  const rec = {
    score: r.score, time: r.time, gates: r.cleared, missed: r.missed,
    pumps: r.pumps, poi: S.poi, run: S.run, course: (S.W && S.W.venue && S.W.venue.title) || S.poi,
    ski: S.skiId ? S.skiId() : '', t: Date.now(),
  };
  try {
    const out = S.board.save(rec);
    r.rank = out.rank;
    r.best = out.rows[0] || null;
  } catch (e) { err(e); }
  const d = S.dom;
  d.finH.textContent = r.rank === 0 ? 'COURSE RECORD' : 'FINISH';
  d.finBig.textContent = fmtT(r.time);
  d.finRow.textContent = 'race score ' + num(r.score) + ' · ' + r.cleared + '/' + S.route.gates.length + ' gates'
    + (r.missed ? ' · ' + r.missed + ' missed' : '');
  d.finRow2.textContent = r.best && r.rank !== 0
    ? 'best ' + fmtT(r.best.time) + ' · ' + num(r.best.score) + ' · ' + ago(r.best.t)
    : 'saved to the board';
  d.fin.classList.add('is-on');
  setTimeout(() => d.fin.classList.remove('is-on'), 6500);
  updateRaceHud();
}

// ============================================================ world matching
// The poi id first, then the world's own contents. A course is defined by the
// runs and the lift it is drawn on, so a world that HAS those runs and that lift
// is that course whatever the poi has been renamed to — which is the case that
// matters, because the standalone build renames it.
function matchWorld() {
  const named = GUIDE_CONFIG.worlds[S.poi];
  if (named) { S.worldMatch = 'poi:' + S.poi; return named; }
  const liftIds = new Set((S.lifts || []).map((l) => String(l.id || l.name || '').toLowerCase()));
  for (const [key, W] of Object.entries(GUIDE_CONFIG.worlds)) {
    if (!W || !Array.isArray(W.descent)) continue;
    const hasRuns = W.descent.every((id) => S.runs.has(id)) && S.runs.has(W.outrun);
    const hasLift = liftIds.has(String(W.lift).toLowerCase());
    if (hasRuns && hasLift) { S.worldMatch = 'contents:' + key; return W; }
  }
  S.worldMatch = 'none';
  return null;
}

// ============================================================ route builder
function buildRoute() {
  const C = GUIDE_CONFIG, W = S.W;
  if (!W) return null;
  // main.js has already tipped `world.runs` into the three frame (into fresh
  // arrays — the scene's own polylines are never written to), so these come out
  // ready to use. Only the config's own literals still need converting.
  const pick = (id) => {
    const r = S.runs.get(id);
    return r && Array.isArray(r.pts) && r.pts.length ? r.pts : null;
  };
  const joinRuns = (ids) => {
    const out = [];
    for (const id of ids) {
      const p = pick(id);
      if (!p) continue;
      for (const q of p) {
        const last = out[out.length - 1];
        if (last && Math.hypot(last[0] - q[0], last[2] - q[2]) < 1.5) continue;
        out.push(q);
      }
    }
    return out;
  };

  const dPts = joinRuns(W.descent);
  if (dPts.length < 4) return null;
  const descent = makePath(dPts, { step: 6 });

  // ---- where the player actually starts on the descent
  const p0 = S.ctrl.position;
  const descentStart = descent.nearest(p0.x, p0.z).s;

  // ---- the fork: where the branch run leaves the descent
  let forkS = descent.L * 0.4, forkName = null;
  const branch = pick(W.forkRun);
  if (branch && branch.length) {
    const head = branch[0];
    const n = descent.nearest(head[0], head[2]);
    if (n.d < 60) { forkS = n.s; forkName = (S.runs.get(W.forkRun) || {}).name || null; }
  }

  const curves = findCurves(descent, C);
  const curvesBeforeFork = curves.filter((c) => c.s > descentStart + C.teachDistM * 0.6 && c.s < forkS - 5);

  // ---- the race. From just past the fork to the very bottom of the descent.
  const raceS0 = Math.min(descent.L - 60, forkS + C.raceLeadInM);
  const raceS1 = Math.max(raceS0 + 80, descent.L - 6);
  const gates = [];
  let side = 1;
  for (let s = raceS0, i = 0; s <= raceS1 - 20; s += C.gateSpacingM, i++) {
    const at = descent.at(s), d = descent.dir(s);
    const rx = -d.z, rz = d.x;
    const off = C.gateOffsetM * side;
    const x = at.x + rx * off, z = at.z + rz * off;
    const gy = S.groundAt(x, z);
    gates.push({
      s, x, y: gy === null ? at.y : gy, z,
      fx: d.x, fz: d.z, rx, rz, yaw: d.yaw,
      half: C.gateHalfWidthM, color: side > 0 ? 'R' : 'B', side,
    });
    side = -side;
  }

  // ---- the lift home
  let liftBase = null, liftName = null;
  const L = (S.lifts || []).find((q) => (q.id || '').toLowerCase() === W.lift || (q.name || '').toLowerCase().includes(W.lift.replace(/-/g, ' ')));
  if (L) {
    const gy = S.groundAt(L.base.x, L.base.z);
    liftBase = { x: L.base.x, y: gy === null ? L.base.y : gy, z: L.base.z };
    liftName = L.name;
  }

  // ---- the chairline down off the unload
  const cPts = joinRuns(W.chairline);
  const chairline = cPts.length >= 4 ? makePath(cPts, { step: 7 }) : null;

  // ---- Poulsen's. The traverse in, then a derived arc onto the SIDE lip.
  const pou = pick(W.poulsen);
  const pouFork = pou && pou.length ? { x: pou[0][0], y: pou[0][1], z: pou[0][2] } : null;
  const three = (enu) => (enu ? S.convLit(enu) : null);
  const sideArr = three(W.sideLip), mainArr = three(W.mainLip);
  const settle = (a) => {
    if (!a) return null;
    const gy = S.groundAt(a[0], a[2]);
    return { x: a[0], y: gy === null ? a[1] : gy, z: a[2] };
  };
  const sideLip = settle(sideArr), mainLip = settle(mainArr);
  let pouApproach = null;
  if (pou && pou.length && sideLip) {
    // the traverse, then bend off it onto the side takeoff: the last third of
    // the entrance is replaced by a lead-in aimed at the side lip, so the line
    // the arrows draw is a line you can actually carve rather than a corner
    const keep = pou.slice(0, Math.max(2, pou.length - 2));
    const lead = [];
    const from = keep[keep.length - 1];
    const n = 6;
    for (let i = 1; i <= n; i++) {
      const u = i / n;
      // ease across to the side lip and finish pointed down the fall line
      const x = from[0] + (sideLip.x - from[0]) * u;
      const z = from[2] + (sideLip.z - from[2]) * u;
      lead.push([x, 0, z]);
    }
    // ...and 22 m of run-out past the lip so the arrows do not stop at the edge
    const d = Math.hypot(sideLip.x - from[0], sideLip.z - from[2]) || 1;
    lead.push([sideLip.x + (sideLip.x - from[0]) / d * 22, 0, sideLip.z + (sideLip.z - from[2]) / d * 22]);
    pouApproach = makePath(keep.concat(lead), { step: 5 });
  }

  // ---- the outrun
  const oPts = pick(W.outrun);
  const outrun = oPts && oPts.length >= 3 ? makePath(oPts, { step: 8 }) : null;
  let outrunS0 = 0;
  if (outrun && sideLip) outrunS0 = outrun.nearest(sideLip.x, sideLip.z).s;

  return {
    descent, descentStart, forkS, forkName, curves, curvesBeforeFork,
    raceS0, raceS1, gates, liftBase, liftName, chairline,
    pouFork, pouApproach, sideLip, mainLip, outrun, outrunS0,
    sHint: descentStart,
  };
}

// ==================================================================== public
export async function init(ctx) {
  try {
    if (S.ok) return api;
    S.THREE = ctx.THREE; S.scene = ctx.scene; S.camera = ctx.camera;
    S.ctrl = ctx.ctrl; S.hud = ctx.hud; S.collision = ctx.collision;
    S.groundAt = ctx.groundAt; S.enter = ctx.enter;
    S.unitScale = ctx.unitScale || 1;
    S.poi = ctx.poi || ''; S.run = ctx.run || '';
    S.trickState = ctx.trickState || (() => null);
    S.skiState = ctx.skiState || (() => null);
    S.skiId = ctx.skiId || (() => '');
    // live tuning: anything on window.__GUIDE_CONFIG wins over the defaults.
    // It is how the course is tuned without a rebuild, and how a headless run
    // holds the boot cards still long enough to photograph them.
    try { if (window.__GUIDE_CONFIG) Object.assign(GUIDE_CONFIG, window.__GUIDE_CONFIG); } catch { /* */ }
    S.lifts = ctx.lifts || [];
    S.liftRadius = ctx.liftRadius || 9;
    S.rides = ctx.rides || (() => 0);
    if (ctx.debug) GUIDE_CONFIG.debug = true;

    // world frame -> three frame, exactly the conversion main.js does for the
    // spawn and the lifts. Only GUIDE_CONFIG's own literals go through it:
    // `ctx.runs` arrives already converted, in fresh arrays.
    S.convLit = ctx.upAxis === 'z' ? (a) => [a[0], a[2], -a[1]] : (a) => [a[0], a[1], a[2]];

    for (const r of (ctx.runs || [])) if (r && r.id && Array.isArray(r.pts)) S.runs.set(r.id, r);
    S.W = matchWorld();

    S.board = boardStore(GUIDE_CONFIG.raceBoardKey);
    S.root = new S.THREE.Group();
    S.root.name = 'guide';
    S.scene.add(S.root);
    S.mats = kit();
    S.dom = buildDom();
    raceReset();
    S.race.on = false;

    // The side takeoff, read live off the scene when it exposes one. This is
    // AWAITED rather than fired and forgotten: the route is derived from these
    // two points and the stages close over the route, so a route rebuilt after
    // the stages were made would leave every stage reading a dead copy. The
    // module is already in the browser's registry (world.mjs imported it by the
    // same URL), so the await is a microtask, not a fetch.
    //
    // poulsen.mjs's POU_SIDE_LIP / POU_LIP are `export let` set by buildPoulsen,
    // which has already run. The config literals are the same bake's numbers and
    // stand in for any world that does not carry the module.
    if (ctx.sceneBase && S.W) {
      try {
        const m = await import(/* @vite-ignore */ new URL('poulsen.mjs', ctx.sceneBase).href);
        if (Array.isArray(m.POU_SIDE_LIP)) S.W.sideLip = m.POU_SIDE_LIP.slice(0, 3);
        if (Array.isArray(m.POU_LIP)) S.W.mainLip = m.POU_LIP.slice(0, 3);
        S.lipSource = 'scene';
      } catch { S.lipSource = 'config'; }
    }

    // ---- THE HOST OWNS THE BOOT FLOW (specs/0003).
    //
    // TWO BOOT FLOWS IS THE BUG. bootCards() opens with its own title card and
    // its own seven-row CONTROLS card (2.4 s + 7.0 s of holds), and the player
    // already has that screen: intro.js, whose controls card is the FIVE ROWS the
    // ESC panel echoes and which carries the ODbL line D6 requires. Shipping both
    // means reading two control lists back to back, the second listing keys
    // (MOUSE, SPACE, F) the first deliberately does not.
    //
    // It is not merely ugly. `body.intro-up > *:not(canvas):not(.intro):not(.pboot)`
    // hides the whole `.gd` overlay while intro.js is up, so the guide cards do
    // not appear UNTIL intro.js hands the screen over — and then they take it
    // straight back for another 9.4 s, with `body.gd-intro-up .phud { display:
    // none }` holding the instrument HUD off the screen the whole time.
    //
    // intro.js loads under exactly the condition guide.js does (`guide`), so
    // "the host owns the cards" is true in every build that runs this module —
    // which is why this is unconditional rather than a flag. Nothing is lost:
    // bootCards()'s only side effects are the two cards, the `gd-intro-up` class
    // it sets and clears itself, and a call to ctx.enter() when it finishes, and
    // intro.js already calls the very same window.__player.enter(). The stage
    // machine is untouched — init() builds the route and calls advanceTo(0)
    // below either way, and update() no-ops until `live`.
    //
    // AND THE EMPTY CARD LAYER HAS TO GO WITH IT, which is the half that is easy
    // to miss: buildDom() creates `.gd__cards` unconditionally and bootCards()
    // only ever FILLS it, so declining to call bootCards() leaves a childless
    // `position:fixed; inset:0; z-index:70; pointer-events:auto` div behind — an
    // invisible full-screen click trap over the canvas. Removed, not hidden: an
    // element that exists only to be ignored is the same bug one refactor later.
    //
    // bootCards() itself stays in the module, unreferenced, because it is the
    // record of what the guide's own flow was.
    if (S.dom && S.dom.cards) S.dom.cards.remove();
    S.intro = { skip: () => {}, stage: () => 2 };
    S.route = buildRoute();
    S.stages = S.route ? makeStages() : [];
    S.ok = true;
    if (S.stages.length) {
      advanceTo(0);
      // SETTLE THE CHEVRONS BEFORE THE FIRST FRAME. buildArrows() lays the
      // teach-W chevrons down the first 130 m at full scale, and the thing that
      // makes them behave — fadeArrows(), which shrinks the one you are about to
      // ski through to nothing and fades the strip out past fadeR — is called
      // from update(dt, live) and nowhere else. The desktop boots PAUSED so the
      // first click is a real user gesture (pointer lock needs that), update()
      // no-ops while paused, and the spawn stands 6 m from the first chevron —
      // so the title card painted over two unfaded arrows filling the left and
      // right thirds of the screen. dt = 1 drives the opacity lerp straight to
      // its target instead of easing, so the strip is in its steady state on
      // frame one. NOT a call to update(): that would tick the stage machine and
      // light a prompt before the player has dropped in. Arrows only.
      try { if (props && props.arrows) fadeArrows(props.arrows, 1); } catch (e) { err(e); }
    }
    return api;
  } catch (e) { err(e); return api; }
}

let props = null;
function advanceTo(i) {
  try {
    if (S.stage && S.stage.exit) { try { S.stage.exit(); } catch (e) { err(e); } }
    clearProps(props);
    props = null;
    S.stageI = i;
    S.stage = S.stages[i] || null;
    S.stageT = 0;
    if (!S.stage) return;
    props = newProps();
    if (S.stage.onEnterRecordRides) S.liftRidesAtEnter = S.rides();
    if (S.stage.enter) S.stage.enter(props);
    S.log.push({ id: S.stage.id, t: +S.t.toFixed(2) });
    if (S.dom && S.dom.stageChip) S.dom.stageChip.textContent = 'stage · ' + S.stage.id;
  } catch (e) { err(e); }
}

export function update(dt, live) {
  if (!S.ok) return;
  try {
    if (!live) return;
    dt = Math.min(0.05, Math.max(0.0005, dt || 0.016));
    S.t += dt;
    promptTick(dt);
    // the hint that keeps the nearest-point search local, advanced every frame
    if (S.route) {
      const n = S.route.descent.nearest(S.ctrl.position.x, S.ctrl.position.z, S.route.sHint);
      // only follow the hint forward — a lift ride teleports 900 m and the hint
      // must not chase it
      if (Math.abs(n.s - S.route.sHint) < 160) S.route.sHint = n.s;
    }
    // arrow bob + distance fade, so guidance never occludes the run
    if (props && props.arrows) fadeArrows(props.arrows, dt);
    if (!S.stage) return;
    S.stageT += dt;
    if (S.stage.tick) S.stage.tick(dt);
    let done = false;
    try { done = !!S.stage.done(); } catch (e) { err(e); done = false; }
    if (!S.stage.terminal && (done || S.stageT > GUIDE_CONFIG.stageTimeoutS)) {
      advanceTo(S.stageI + 1);
    }
  } catch (e) { err(e); }
}

function fadeArrows(A, dt) {
  const cam = S.camera.position;
  const t = S.t;
  const { mesh, base, m, q, sc, v, e, v2 } = A;
  const C = GUIDE_CONFIG;
  const tilt = C.arrowTiltDeg * Math.PI / 180;
  const span = Math.max(0.001, C.arrowNearM - C.arrowGoneM);
  let near = Infinity;
  for (let i = 0; i < base.length; i++) {
    const b = base[i];
    const d = Math.hypot(b.x - cam.x, b.z - cam.z);
    if (d < near) near = d;
    const bob = Math.sin(t * 2.2 + i * 0.7) * 0.22;
    // shrink the one you are riding through to nothing — a shared material has
    // no per-instance alpha, and scale is the channel that does
    const k = clamp01((d - C.arrowGoneM) / span);
    e.set(tilt, b.yaw, 0, 'YXZ'); q.setFromEuler(e);
    v.set(b.x, b.y + bob, b.z);
    m.compose(v, q, v2.set(sc.x * k, sc.y * k, sc.z * k));
    mesh.setMatrixAt(i, m);
  }
  mesh.instanceMatrix.needsUpdate = true;
  const want = near > GUIDE_CONFIG.fadeR ? 0 : 0.9;
  mesh.material.opacity += (want - mesh.material.opacity) * Math.min(1, dt * 3);
  mesh.visible = mesh.material.opacity > 0.02;
}

export function state() {
  const R = S.route;
  return {
    ok: S.ok, errors: S.errors.slice(), t: +S.t.toFixed(2),
    lipSource: S.lipSource || null, worldMatch: S.worldMatch || null,
    stage: S.stage ? S.stage.id : null, stageI: S.stageI, stageT: +S.stageT.toFixed(2),
    stages: S.stages.map((q) => q.id),
    log: S.log.slice(),
    done: S.done,
    intro: S.intro ? S.intro.stage() : null,
    cards: S.cards || null,
    prompt: promptT > 0 ? { key: promptKey, text: promptTxt, warn: promptWarn } : null,
    prompts: promptLog.slice(),
    trick: { step: S.trickStep || 0, got: (S.trickGot || []).slice() },
    sent: !!S.sent,
    race: S.race ? {
      started: S.race.started, finished: S.race.finished,
      t: +S.race.t.toFixed(2), time: S.race.time, score: Math.round(S.race.score),
      cleared: S.race.cleared, missed: S.race.missed, streak: S.race.streak,
      pumps: S.race.pumps, rank: S.race.rank, next: S.race.next,
    } : null,
    route: R ? {
      descentL: +R.descent.L.toFixed(1), descentStart: +R.descentStart.toFixed(1),
      forkS: +R.forkS.toFixed(1), forkName: R.forkName,
      curves: R.curves, curvesBeforeFork: R.curvesBeforeFork,
      gates: R.gates.length, raceS0: +R.raceS0.toFixed(1), raceS1: +R.raceS1.toFixed(1),
      sHint: +R.sHint.toFixed(1),
      liftBase: R.liftBase, liftName: R.liftName,
      chairlineL: R.chairline ? +R.chairline.L.toFixed(1) : null,
      sideLip: R.sideLip, mainLip: R.mainLip,
      pouApproachL: R.pouApproach ? +R.pouApproach.L.toFixed(1) : null,
      outrunL: R.outrun ? +R.outrun.L.toFixed(1) : null,
      outrunS0: +(R.outrunS0 || 0).toFixed(1),
    } : null,
    board: (S.board ? S.board.read() : []).slice(0, 10),
  };
}

// ---- test / tuning handles. `at(id)` puts you at the head of a stage: it is
// how the headless harness plays the tutorial without skiing 2.3 km first, and
// how a person tuning the course jumps to the bit they are tuning.
function stageStart(id) {
  const R = S.route;
  if (!R) return null;
  const at = (path, s, back = 0) => {
    const p = path.at(clamp(s - back, 0, path.L));
    const d = path.dir(p.s);
    return { x: p.x, y: p.y, z: p.z, yaw: d.yaw };
  };
  switch (id) {
    case 'teach-w': return at(R.descent, R.descentStart);
    case 'carve': return at(R.descent, (R.curvesBeforeFork[0] ? R.curvesBeforeFork[0].s : R.descentStart + 80) - 70);
    case 'fork': return at(R.descent, R.forkS - 40);
    case 'slalom': return at(R.descent, R.raceS0 - 30);
    case 'lift': return R.liftBase ? { ...R.liftBase, yaw: 0 } : null;
    case 'chairline': return R.chairline ? at(R.chairline, 2) : null;
    case 'poulsen': return R.pouApproach ? at(R.pouApproach, 2) : null;
    case 'tricks': return R.outrun ? at(R.outrun, R.outrunS0 + 20) : null;
    case 'outrun': return R.outrun ? at(R.outrun, R.outrunS0) : null;
    default: return null;
  }
}

// The one thing the guide knows that nothing else does: where it wants you to
// be next. Exposed because a headless harness has to ski the course to test it,
// and because it is the same question a person tuning the course asks.
function aim() {
  const R = S.route;
  if (!R || !S.stage) return null;
  const p = S.ctrl.position;
  const to = (x, z, kind) => ({
    kind, x, z,
    yaw: yawOf(x - p.x, z - p.z),
    d: Math.hypot(x - p.x, z - p.z),
  });
  // pure pursuit: a point on the line, a lookahead that grows with speed, taken
  // from where the player ACTUALLY is rather than from the stage's hint — the
  // hint only ever moves forward, and a body 20 m off the line has to be aimed
  // back onto it, not 30 m further down it
  const ahead = (path, hint, extra = 0) => {
    const n = path.nearest(p.x, p.z, hint);
    const look = clamp(14 + S.ctrl.speed() * 1.1 + extra, 16, 44);
    const q = path.at(Math.min(path.L, n.s + look));
    return { ...to(q.x, q.z, 'path'), off: +n.d.toFixed(1), s: +n.s.toFixed(1) };
  };
  switch (S.stage.id) {
    case 'teach-w': case 'carve': case 'fork':
      return ahead(R.descent, R.sHint);
    case 'slalom': {
      const g = R.gates[S.race.next];
      if (g) return to(g.x, g.z, 'gate');
      return ahead(R.descent, R.sHint);
    }
    case 'lift':
      return R.liftBase ? to(R.liftBase.x, R.liftBase.z, 'lift') : null;
    case 'chairline':
      return R.chairline ? ahead(R.chairline, null) : null;
    case 'poulsen':
      return R.sideLip ? to(R.sideLip.x, R.sideLip.z, 'side-lip') : null;
    case 'tricks': case 'outrun':
      return R.outrun ? ahead(R.outrun, null) : null;
    default: return null;
  }
}

export const api = {
  state,
  aim,
  config: () => GUIDE_CONFIG,
  stageStart,
  // jump the machine to a stage (props rebuilt), optionally moving the body there
  goto(id, { move = false } = {}) {
    const i = S.stages.findIndex((q) => q.id === id);
    if (i < 0) return null;
    if (move) {
      const p = stageStart(id);
      if (p) S.ctrl.teleport(new S.THREE.Vector3(p.x, p.y, p.z), p.yaw);
    }
    advanceTo(i);
    return S.stage ? S.stage.id : null;
  },
  skipIntro() { if (S.intro) S.intro.skip(); return true; },
  // the race, for tests and for a retry
  resetRace() { raceReset(); return S.race; },
  clearBoard() { try { S.board.clear(); } catch { /* */ } return true; },
  // the derived course, as numbers — the thing to read when tuning
  course: () => (S.route ? {
    gates: S.route.gates.map((g) => ({ s: +g.s.toFixed(1), x: +g.x.toFixed(1), z: +g.z.toFixed(1), side: g.side, color: g.color, half: g.half })),
    curves: S.route.curves,
  } : null),
  root: () => S.root,
};

export default init;
