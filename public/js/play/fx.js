// Visual effects for the first-person player: snow spray + graphics polish.
//
// Self-contained — touches no other module. main.js wires it with:
//   import './fx.js'         (module attaches window.__playFX at load)
//   window.__playFX.init({ THREE, scene, camera, renderer, ctrl, hud })
//   window.__playFX.update(dt)          // once per frame, after ctrl.applyToCamera
//
// Everything feature-detects and no-ops when a piece is missing, so the same
// module rides along on contract worlds, glb worlds and page-takeover worlds
// (sand-harbor) without assumptions. All snow work only happens on skis; the
// speed lines ride any gear that goes fast (and read the glider's airspeed
// rather than its ground speed), and the glider also gets a ground-skim spray.
//
// The imports are read-only state snapshots — airspeed, the ground-effect
// fraction, the edge/stop/stivot machine and the pump payout are all physics
// facts this layer has no way to re-derive.
//
// Budget: one THREE.Points pool (4096 particles, CPU-integrated — ~0.1 ms),
// one 2D canvas overlay for the speed lines (~16 fill() calls, zero draw calls
// on the mountain's renderer), one CanvasTexture, one DOM vignette.
// No post pass, no shadow maps, no per-particle raycasts.

import { gliderState } from './glider.js';
import { skiState, takeSkiBurst } from './ski.js';

const POOL = 4096;          // particle pool size
const SPRAY_CONE = 35 * Math.PI / 180;   // half-angle of the spray() throw cone
const SPRAY_FRAME = 400;    // hard per-frame ceiling on spray(), so one hockey
                            // stop cannot eat the whole shared pool in a frame

const R = {
  ok: false,                // init succeeded
  THREE: null, scene: null, camera: null, renderer: null, ctrl: null, hud: null,
  u: 1,                     // scene unit scale (1 unit = 1/u metres)
  // particle pool
  pts: null, pGeo: null, pMat: null,
  px: null, py: null, pz: null, vx: null, vy: null, vz: null,
  life: null, ttl: null, sz: null, a0: null,
  aPos: null, aSize: null, aAlpha: null,
  cursor: 0, alive: 0,
  accWake: 0, accRoost: 0, accSpray: 0,   // fractional emission accumulators
  dt: 0.016,                // last frame's dt, so spray() can turn a rate into a count
  sprayLeft: SPRAY_FRAME,   // what is left of this frame's spray budget
  // frame-to-frame state
  prevGrounded: false, prevVy: 0,
  errors: 0,
};

const clamp = (v, a, b) => (v < a ? a : (v > b ? b : v));
const rand = (a, b) => a + Math.random() * (b - a);
const smooth = (v, a, b) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

// ------------------------------------------------------------------ sprite
function makeSprite(THREE) {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 2, 32, 32, 31);
  grad.addColorStop(0.0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.30, 'rgba(255,255,255,0.9)');
  grad.addColorStop(0.55, 'rgba(250,252,255,0.35)');
  grad.addColorStop(1.0, 'rgba(250,252,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  // a few darker flecks so spray reads as chunks against white snow, not fog
  g.globalCompositeOperation = 'source-atop';
  g.fillStyle = 'rgba(150,165,190,0.28)';
  for (let i = 0; i < 7; i++) {
    g.beginPath();
    g.arc(10 + Math.random() * 44, 10 + Math.random() * 44, 2.5 + Math.random() * 4, 0, 7);
    g.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  if (THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ------------------------------------------------------------ graphics polish
function polish(THREE, scene, camera, renderer, hud) {
  // renderer: filmic tone mapping + sRGB out — only when the world has not
  // already chosen its own mapping (page worlds may have; ours sets None).
  try {
    if (renderer && THREE.ACESFilmicToneMapping !== undefined &&
        renderer.toneMapping === THREE.NoToneMapping) {
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.12;
      if ('outputColorSpace' in renderer && THREE.SRGBColorSpace &&
          renderer.outputColorSpace !== THREE.SRGBColorSpace) {
        renderer.outputColorSpace = THREE.SRGBColorSpace;
      }
      // materials compiled before the switch need a recompile to pick it up
      scene.traverse((o) => {
        const m = o.material;
        if (!m) return;
        const arr = Array.isArray(m) ? m : [m];
        for (const mat of arr) mat.needsUpdate = true;
      });
    }
  } catch { R.errors++; }

  // fog for depth — only when the scene brought none
  try {
    if (scene && !scene.fog && THREE.Fog) {
      const far = (camera && camera.far) || 4000;
      let col = new THREE.Color(0xdde9f4);
      if (scene.background && scene.background.isColor) {
        col = scene.background.clone().lerp(new THREE.Color(0xffffff), 0.22);
      }
      scene.fog = new THREE.Fog(col, far * 0.30, far * 0.94);
    }
  } catch { R.errors++; }

  // lights: warm key + cool/warm hemi fill, only if the world has none of that
  try {
    if (scene) {
      let hasDir = false, hasFill = false;
      scene.traverse((o) => {
        if (o.isDirectionalLight) hasDir = true;
        if (o.isHemisphereLight || o.isAmbientLight) hasFill = true;
      });
      if (!hasFill && THREE.HemisphereLight) {
        const h = new THREE.HemisphereLight(0xcfe2ff, 0x9c8f78, 0.85);
        h.name = 'fx:hemi';
        scene.add(h);
      }
      if (!hasDir && THREE.DirectionalLight) {
        const d = new THREE.DirectionalLight(0xfff1dc, 1.55);
        d.name = 'fx:key';
        d.position.set(160, 300, 110);
        scene.add(d);
      }
    }
  } catch { R.errors++; }

  // vignette: DOM overlay — zero GPU cost, sits under the HUD (phud is z 20)
  try {
    if (!document.querySelector('.pfx-vignette')) {
      const v = document.createElement('div');
      v.className = 'pfx-vignette';
      v.style.cssText =
        'position:fixed;inset:0;pointer-events:none;z-index:15;' +
        'background:radial-gradient(ellipse at 50% 46%,rgba(0,0,0,0) 58%,rgba(6,10,20,0.30) 100%);';
      const anchor = hud && hud.root && hud.root.parentNode === document.body ? hud.root : null;
      if (anchor) document.body.insertBefore(v, anchor);
      else document.body.appendChild(v);
    }
  } catch { R.errors++; }
}

// ------------------------------------------------------------- particle pool
function buildPool(THREE, scene) {
  R.px = new Float32Array(POOL); R.py = new Float32Array(POOL); R.pz = new Float32Array(POOL);
  R.vx = new Float32Array(POOL); R.vy = new Float32Array(POOL); R.vz = new Float32Array(POOL);
  R.life = new Float32Array(POOL); R.ttl = new Float32Array(POOL); R.sz = new Float32Array(POOL);
  R.a0 = new Float32Array(POOL);
  R.aPos = new Float32Array(POOL * 3);
  R.aSize = new Float32Array(POOL);
  R.aAlpha = new Float32Array(POOL);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(R.aPos, 3));
  geo.setAttribute('aSize', new THREE.BufferAttribute(R.aSize, 1));
  geo.setAttribute('aAlpha', new THREE.BufferAttribute(R.aAlpha, 1));
  if (THREE.DynamicDrawUsage !== undefined) {
    geo.attributes.position.setUsage(THREE.DynamicDrawUsage);
    geo.attributes.aSize.setUsage(THREE.DynamicDrawUsage);
    geo.attributes.aAlpha.setUsage(THREE.DynamicDrawUsage);
  }

  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uMap: { value: makeSprite(THREE) },
      uColor: { value: new THREE.Color(0.96, 0.98, 1.0) },
      uScale: { value: 600 },
    },
    vertexShader: `
      attribute float aSize; attribute float aAlpha;
      uniform float uScale;
      varying float vA;
      void main() {
        vA = aAlpha;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        float d = max(0.15, -mv.z);
        gl_PointSize = clamp(aSize * uScale / d, 0.0, 160.0);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform sampler2D uMap; uniform vec3 uColor;
      varying float vA;
      void main() {
        float a = texture2D(uMap, gl_PointCoord).a * vA;
        if (a < 0.012) discard;
        gl_FragColor = vec4(uColor, a);
      }`,
    transparent: true,
    depthWrite: false,
    depthTest: true,
  });

  const pts = new THREE.Points(geo, mat);
  pts.name = 'fx:snow';
  pts.frustumCulled = false;
  pts.renderOrder = 90;
  scene.add(pts);
  R.pts = pts; R.pGeo = geo; R.pMat = mat;
}

function emit(x, y, z, vx, vy, vz, life, size, alpha) {
  const i = R.cursor;
  R.cursor = (i + 1) % POOL;
  R.px[i] = x; R.py[i] = y; R.pz[i] = z;
  R.vx[i] = vx; R.vy[i] = vy; R.vz[i] = vz;
  R.life[i] = life; R.ttl[i] = life;
  R.sz[i] = size;
  R.a0[i] = alpha;
}

// The public spawn hook (spec §2.4). `origin` is a world-space point, `dir` is
// the MEAN throw velocity in scene units per second — its direction sets where
// the snow goes, its magnitude sets how hard and therefore how big the chunks
// are. `rate` is particles per second: this is called once per frame, so the
// fractional remainder is carried in R.accSpray exactly the way the wake and
// roost emitters carry theirs. `size` is the base particle radius in METRES,
// scaled to scene units here. Safe before init(), and it never throws.
export function spray(origin, dir, rate, size) {
  try {
    if (!R.ok || !origin || !dir || !(rate > 0)) return;
    const u = R.u;
    const dx = dir.x || 0, dy = dir.y || 0, dz = dir.z || 0;
    const dm = Math.hypot(dx, dy, dz);
    if (!(dm > 1e-5)) return;
    R.accSpray += rate * R.dt;
    let n = R.accSpray | 0;
    R.accSpray -= n;
    if (n > R.sprayLeft) { n = R.sprayLeft; R.accSpray = 0; }
    if (n <= 0) return;
    R.sprayLeft -= n;
    // an orthonormal frame with the throw direction as its axis, so the cone is
    // sampled the same way whatever direction the caller handed in
    const ax = dx / dm, ay = dy / dm, az = dz / dm;
    const hx = Math.abs(ay) < 0.9 ? 0 : 1, hy = Math.abs(ay) < 0.9 ? 1 : 0;
    let t1x = hy * az, t1y = -hx * az, t1z = hx * ay - hy * ax;
    const t1m = Math.hypot(t1x, t1y, t1z) || 1;
    t1x /= t1m; t1y /= t1m; t1z /= t1m;
    const t2x = ay * t1z - az * t1y, t2y = az * t1x - ax * t1z, t2z = ax * t1y - ay * t1x;
    const cosC = Math.cos(SPRAY_CONE);
    const szK = (size || 0.12) * u * (0.7 + 0.5 * clamp(dm / (6 * u), 0, 1.6));
    while (n--) {
      // uniform over the spherical cap, not over the angle — an angle-uniform
      // cone piles everything on the axis and reads as a jet, not a plume
      const ct = 1 - Math.random() * (1 - cosC);
      const st = Math.sqrt(Math.max(0, 1 - ct * ct));
      const ph = Math.random() * Math.PI * 2;
      const cp = Math.cos(ph) * st, sp = Math.sin(ph) * st;
      const spd = dm * rand(0.6, 1.3);
      emit(
        origin.x + rand(-0.09, 0.09) * u, origin.y + rand(-0.04, 0.09) * u, origin.z + rand(-0.09, 0.09) * u,
        (ax * ct + t1x * cp + t2x * sp) * spd,
        (ay * ct + t1y * cp + t2y * sp) * spd,
        (az * ct + t1z * cp + t2z * sp) * spd,
        rand(0.5, 0.9), szK * rand(0.7, 1.3), rand(0.45, 0.95),
      );
    }
  } catch { R.errors++; }
}

// ============================================================ speed lines
// ANIME SPEED LINES (集中線 — "concentrated lines"). What was here before was a
// world-space THREE.LineSegments of 52 streaks arranged in a camera-space
// annulus: it switched on at 15 m/s, faded its ONE shared opacity up to a
// ceiling, and then sat there. Every streak was immortal, every streak was the
// same length and the same weight, and the ring they lived on was pinned to the
// centre of the frame no matter which way you were actually travelling. It read
// as a decal on the lens rather than as speed.
//
// This replaces it with a 2D canvas overlay, for the same reason the speedo is
// one: the effect is screen-space by definition, so paying WebGL for it buys
// nothing. It costs the mountain ZERO draw calls and the renderer knows nothing
// about it. The whole field is drawn in ~16 fill() calls a frame (below).
//
// WHAT MAKES IT LOOK ALIVE, in the order the eye notices:
//   1. NOTHING IS PERMANENT. Every line has a lifetime of 70-300 ms and then it
//      is gone; the field is continuously respawned at a rate that holds the
//      population near its target. That constant churn is the flicker that
//      separates an anime action frame from a lens overlay, and it is why the
//      pool is spawn/die rather than a fixed ring of streaks.
//   2. THE FOCUS LEADS. The lines converge on where you are GOING, not on the
//      middle of the screen — the velocity vector is projected into screen space
//      and the convergence point rides toward it (SL.FOCUS_LEAD), smoothed so it
//      swings rather than snaps. Look left while bombing a fall line and the
//      whole field rakes to the right, which is the read the frame should give.
//   3. LENGTH ANSWERS ACCELERATION. Lines stretch while you are gaining speed
//      (SL.ACCEL_STRETCH) and relax while you are scrubbing it. Steady 30 m/s
//      and a 30 m/s that is still climbing do not look the same.
//   4. AIR IS NOT GROUND. Off the snow the field goes CLEANER: fewer lines
//      (SL.AIR_CLEAN), longer and longer-lived (SL.AIR_LONG). On the ground it
//      is dense and busy. You can feel a landing in the field alone.
//   5. IT PUNCTUATES. Landing a drop, lighting the rocket and stomping a trick
//      each throw a burst — a spike in count, length and brightness that decays
//      over SL.BURST_TAU.
//
// THE STYLE IS INK, NOT BLUR. Each line is a tapered quad (a spike, near-zero
// at the inner end, SL.WIDTH at the outer) with butt ends and no gradient and no
// shadow — the crisp cut a brush or a screentone knife leaves. Rather more than
// half are white and the rest (SL.INK_FRAC) are a deep cool slate, because this
// is a MOUNTAIN: white lines on white snow are not subtle, they are invisible,
// and the ink ones are what carry the bottom of the frame the way black lines
// carry white paper. There is no motion blur anywhere in here.
//
// IT COSTS ALMOST NOTHING. Geometry is precomputed into one flat Float32Array
// per frame and the lines are then bucketed by alpha (8 levels x 2 inks), so the
// whole field goes down in at most 16 fill() calls with the fillStyle strings
// built once at module load. Per-line trig is done at SPAWN and cached, so the
// per-frame inner loop is pure arithmetic. Measured, not asserted: the last 240
// frames of step+draw are in a ring, and __speedlines.cost() reads out its p95.
//
// AND IT OBEYS THE SAME SILENCES EVERYTHING ELSE DOES: H (clean frame), pause,
// the locker, the gear menu, the boot cards and dev fly mode all take it off the
// screen — and because it is a <canvas> that draws no text it can never put a
// string in front of the build gate's banned-string lists.

const SL = {
  // ---- WHEN THEY EXIST. Aligned to the speedometer's tiers, which is the
  // escalation the player has already been taught by the corner of the screen.
  ON_AT: 8,            // m/s — below this there is nothing at all
  MAX_AT: 40,          // m/s — 'rocket'. Everything above 40 looks like 40, the
                       // same ceiling rule the gauge uses: unhinged needs a top.
  // The tiers in between are not thresholds, they are where the single linear
  // intensity t = (speed - ON_AT) / (MAX_AT - ON_AT) happens to land:
  //   15 m/s -> t 0.22  subtle streaks
  //   28 m/s -> t 0.63  committed anime lines
  //   40 m/s -> t 1.00  screen-edge rush
  ON_AT_AIR: 6,        // the glider hangs off airspeed and feels wind sooner
  ON_AT_BOOST: 6,      // under thrust the lines are the only cue you are moving

  // ---- HOW MANY
  MAX_LINES: 165,      // live lines at t = 1
  DENSITY_POW: 1.15,   // > 1 keeps the low tiers genuinely sparse

  // ---- HOW LONG THEY LAST (seconds). This is the flicker.
  LIFE_MIN: 0.07,
  LIFE_MAX: 0.30,

  // ---- GEOMETRY, in fractions of the screen's half-extent
  INNER_AT_ON: 0.66,   // inner ends start this far out at ON_AT (centre stays clear)
  INNER_AT_MAX: 0.22,  // ...and this far out at MAX_AT (they close in on you)
  LEN_MIN: 0.14,       // line length at ON_AT
  LEN_MAX: 0.72,       // ...at MAX_AT
  REACH: 1.34,         // how far past the corners radius 1.0 sits
  WIDTH: 5.0,          // outer-end width in CSS px at t = 1
  WIDTH_REF: 760,      // ...measured on a screen this small; phones scale down
  TAPER: 0.10,         // inner-end width as a fraction of the outer end
  DRIFT: 0.55,         // outward crawl over a life, as a multiple of own length

  // ---- BRIGHTNESS
  ALPHA_MIN: 0.16,     // a line's mean alpha at ON_AT
  ALPHA_MAX: 0.72,     // ...at MAX_AT
  INK_FRAC: 0.45,      // share drawn in slate rather than white, at t = 1
  INK_FLOOR: 0.35,     // ...as a fraction of INK_FRAC at ON_AT.
  // THE INK IS NOT A GARNISH, IT IS HALF THE EFFECT, and the first cut got that
  // wrong. This is a mountain: the bottom two thirds of almost every frame is
  // WHITE SNOW, and white lines on white snow are not subtle, they are absent —
  // the first pass looked right against the sky and disappeared below the
  // horizon. Manga solves this by drawing the lines in ink on white paper, so
  // roughly half of them here are a deep cool slate. Against the sky the white
  // ones carry the field; against the snow the ink ones do; wherever the frame
  // is mixed both are visible and the field reads as drawn rather than lit.

  // ---- ALIVENESS
  ACCEL_STRETCH: 0.55, // extra length at +8 m/s^2; negative accel shortens
  FOCUS_LEAD: 0.34,    // convergence point rides this far toward travel (of half-min)
  FOCUS_TAU: 0.18,     // seconds — focus smoothing, so it swings not snaps
  AIR_CLEAN: 0.62,     // line-count multiplier off the ground
  AIR_LONG: 1.35,      // ...and length multiplier
  AIR_LIFE: 1.50,      // ...and lifetime multiplier

  // ---- PUNCTUATION
  BURST_LAND: 0.90,    // landing, scaled by impact speed
  BURST_BOOST: 1.00,   // rocket ignition
  BURST_TRICK: 0.80,   // a landed trick
  BURST_TAU: 0.30,     // seconds — burst decay
  BURST_LINES: 90,     // extra lines at burst = 1

  // ---- THE 40 M/S RUSH: edges only, never the middle of the frame
  RUSH_FROM: 34,
  RUSH_ALPHA: 0.15,
};

const SL_CAP = 240;            // pool ceiling (MAX_LINES + BURST_LINES + slack)
const SL_BUCKETS = 8;          // alpha quantisation levels per ink
const SL_ALPHA_CEIL = 0.80;
const SL_DPR_CAP = 1.5;        // a full-screen overlay does not need 3x on a phone
const SL_SPAWN_FRAME = 48;     // hard per-frame spawn ceiling, for post-stall frames

// The 16 fill styles, built ONCE. Nothing in the loop concatenates a string.
const SL_FILL = [];
for (let b = 0; b < SL_BUCKETS; b++) {
  const a = (b + 1) / SL_BUCKETS * SL_ALPHA_CEIL;
  SL_FILL.push(`rgba(255,255,255,${a.toFixed(3)})`);
}
for (let b = 0; b < SL_BUCKETS; b++) {
  const a = (b + 1) / SL_BUCKETS * SL_ALPHA_CEIL;
  SL_FILL.push(`rgba(46,60,84,${a.toFixed(3)})`);   // ink, not a grey — see INK_FRAC
}

const S = {
  cv: null, cx: null, w: 0, h: 0, dpr: 0, shown: false,
  // pool (struct-of-arrays; no per-line objects, so no GC churn at 650 spawns/s)
  ca: new Float32Array(SL_CAP), sa: new Float32Array(SL_CAP),   // cos/sin of the ray
  r0: new Float32Array(SL_CAP), ln: new Float32Array(SL_CAP),
  wd: new Float32Array(SL_CAP), a0: new Float32Array(SL_CAP),
  lf: new Float32Array(SL_CAP), tt: new Float32Array(SL_CAP),
  ik: new Uint8Array(SL_CAP),
  cursor: 0, live: 0, acc: 0,
  // per-frame draw geometry: 4 points x 2 coords, plus a bucket id (255 = skip)
  gx: new Float32Array(SL_CAP * 8), gb: new Uint8Array(SL_CAP),
  // signals
  focusX: 0, focusY: 0, prevS: NaN, accel: 0,
  burst: 0, prevBoost: false, prevLanded: -1, trickPoll: 0,
  t: 0, rush: 0,
  // cached rush gradient — rebuilt only when the focus or the strength moves
  grad: null, gk: -1, gxq: 1e9, gyq: 1e9,
  // cost ring, so the budget claim is measured rather than asserted
  cost: new Float32Array(240), ci: 0, cn: 0,
};

function slBuild() {
  const cv = document.createElement('canvas');
  cv.className = 'pfx-lines';
  cv.setAttribute('aria-hidden', 'true');
  // Inline, because play.css opens with `body.play canvas { position: fixed;
  // left: 0; top: 0 }` at (0,1,2) — a bare class loses that cascade, and the
  // same specificity trap means the `hidden` ATTRIBUTE would lose to it too.
  // So visibility is an inline `display`, which nothing can outrank.
  cv.style.cssText =
    'position:fixed;left:0;top:0;width:100%;height:100%;' +
    'pointer-events:none;z-index:16;background:none;display:none;';
  // z 16 sits above the vignette (15) and below the instrument HUD (20): the
  // lines are weather on the world, not an overlay on somebody's panel.
  const anchor = R.hud && R.hud.root && R.hud.root.parentNode === document.body ? R.hud.root : null;
  if (anchor) document.body.insertBefore(cv, anchor);
  else document.body.appendChild(cv);
  S.cv = cv;
  S.cx = cv.getContext('2d', { alpha: true });
  slSize();
  addEventListener('resize', slSize, { passive: true });
}

function slSize() {
  if (!S.cv) return;
  const d = Math.min(window.devicePixelRatio || 1, SL_DPR_CAP);
  const w = window.innerWidth || 1280, h = window.innerHeight || 720;
  if (w === S.w && h === S.h && d === S.dpr) return;
  S.w = w; S.h = h; S.dpr = d;
  S.cv.width = Math.max(1, Math.round(w * d));
  S.cv.height = Math.max(1, Math.round(h * d));
  S.cx.setTransform(d, 0, 0, d, 0, 0);   // set on resize, never per frame
  S.grad = null; S.gk = -1;
}

// Every reason the field must not be on the screen, in one place — the shape
// speedo.js and idle.js already established. H is in here because clean-frame's
// structural rule is `> *:not(canvas)` and this element IS a canvas, so the
// stylesheet deliberately walks past it; the suppression has to be real.
function slSuppressed(paused) {
  const b = document.body.classList;
  if (b.contains('clean-frame')) return true;   // H — the frame is being filmed
  if (b.contains('intro-up')) return true;
  if (b.contains('gd-intro-up')) return true;
  if (b.contains('is-dev')) return true;        // dev fly mode is not play
  if (paused) return true;
  const P = window.__player;
  if (P) {
    try { if (P.inventoryOpen()) return true; } catch { /* no locker */ }
    try { if (P.gearMenuOpen()) return true; } catch { /* no gear menu */ }
  }
  return false;
}

function slHide() {
  if (S.shown) {
    S.shown = false;
    S.cv.style.display = 'none';
    // drop the field rather than freezing it: coming back from the pause panel
    // to a stale 200-line frame would flash a photograph of the moment you left
    S.live = 0; S.acc = 0; S.burst = 0;
    S.accel = 0; S.prevS = NaN;      // see slStep: no acceleration across a gap
    for (let i = 0; i < SL_CAP; i++) S.lf[i] = 0;
    S.cx.clearRect(0, 0, S.w, S.h);
  }
}

// The convergence point. `vx/vy/vz` is world velocity; the camera's own basis
// turns it into a screen direction, so the field answers where you are LOOKING
// as well as where you are going.
function slFocus(dt) {
  const cam = R.camera;
  let tx = 0, ty = 0;
  const c = R.ctrl;
  if (cam && c && c.velocity) {
    const m = cam.matrixWorld.elements;
    const vx = c.velocity.x, vy = c.velocity.y, vz = c.velocity.z;
    const vm = Math.hypot(vx, vy, vz);
    if (vm > 1e-4) {
      const nx = vx / vm, ny = vy / vm, nz = vz / vm;
      // camera basis: cols 0/1/2 are right/up/back, so forward is -col2
      const cr = m[0] * nx + m[1] * ny + m[2] * nz;
      const cu = m[4] * nx + m[5] * ny + m[6] * nz;
      const cf = -(m[8] * nx + m[9] * ny + m[10] * nz);
      const lead = SL.FOCUS_LEAD * Math.min(S.w, S.h) * 0.5;
      if (cf > 0.15) {
        // a real perspective projection of the travel direction, then clamped
        const f = (S.h * 0.5) / Math.tan((cam.fov || 72) * Math.PI / 360);
        tx = (cr / cf) * f; ty = -(cu / cf) * f;
        const d = Math.hypot(tx, ty);
        if (d > lead) { tx = tx / d * lead; ty = ty / d * lead; }
      } else {
        // travelling sideways or backwards relative to the look: the vanishing
        // point is off-screen, so peg the focus at the edge it went out of
        const d = Math.hypot(cr, cu) || 1;
        tx = (cr / d) * lead; ty = (-cu / d) * lead;
      }
    }
  }
  const k = 1 - Math.exp(-dt / SL.FOCUS_TAU);
  S.focusX += (tx - S.focusX) * k;
  S.focusY += (ty - S.focusY) * k;
}

function slSpawn(inner, len, wide, alpha, life, inkP) {
  // rolling first-fit; the pool is sized so this practically never walks far
  let i = S.cursor, tries = SL_CAP;
  while (tries-- > 0 && S.lf[i] > 0) i = (i + 1) % SL_CAP;
  if (S.lf[i] > 0) return false;
  S.cursor = (i + 1) % SL_CAP;
  const a = Math.random() * Math.PI * 2;
  S.ca[i] = Math.cos(a); S.sa[i] = Math.sin(a);     // trig paid ONCE, at spawn
  S.r0[i] = inner * rand(0.92, 1.30);
  S.ln[i] = len * rand(0.45, 1.35);
  S.wd[i] = wide * rand(0.55, 1.55);
  S.a0[i] = alpha * rand(0.55, 1.25);
  const L = life * rand(0.72, 1.28);
  S.lf[i] = L; S.tt[i] = L;
  S.ik[i] = Math.random() < inkP ? 1 : 0;
  return true;
}

// One step: age the field, spawn what the speed asks for, and lay the frame's
// geometry down into S.gx/S.gb. Draws nothing — slDraw does that.
function slStep(dt, sMs, inAir) {
  // ---- intensity, and the acceleration that stretches the lines
  const boosting = S.boosting;
  const onAt = boosting ? SL.ON_AT_BOOST : (inAir && R.ctrl && R.ctrl.mode === 'glider') ? SL.ON_AT_AIR : SL.ON_AT;
  const t = clamp((sMs - onAt) / (SL.MAX_AT - onAt), 0, 1);
  S.t = t;
  // NaN is the "just came back from a suppressed frame" sentinel: the speed
  // delta across a pause is not an acceleration and must not stretch anything.
  const raw = Number.isFinite(S.prevS) ? (sMs - S.prevS) / dt : 0;
  S.prevS = sMs;
  S.accel += (raw - S.accel) * (1 - Math.exp(-dt / 0.15));

  S.burst *= Math.exp(-dt / SL.BURST_TAU);
  if (S.burst < 0.004) S.burst = 0;
  // a burst is a punctuation mark on speed, not a substitute for it — landing a
  // two-foot drop at walking pace must not paint an action frame
  const burst = S.burst * clamp(sMs / SL.ON_AT, 0, 1);

  if (t <= 0 && burst === 0 && S.live === 0) { S.rush = 0; return false; }

  // ---- what the field should look like right now
  const dens = Math.pow(t, SL.DENSITY_POW);
  let want = SL.MAX_LINES * dens + SL.BURST_LINES * burst;
  if (inAir) want *= SL.AIR_CLEAN;
  // never ask for a full pool: slSpawn's first-fit scan is O(pool) only when
  // there is nothing free, and leaving headroom keeps it O(1) in practice
  if (want > SL_CAP * 0.85) want = SL_CAP * 0.85;

  const inner = (SL.INNER_AT_ON + (SL.INNER_AT_MAX - SL.INNER_AT_ON) * t) * (1 - 0.25 * burst);
  let len = SL.LEN_MIN + (SL.LEN_MAX - SL.LEN_MIN) * Math.pow(t, 0.85);
  len *= 1 + SL.ACCEL_STRETCH * clamp(S.accel / 8, -0.4, 1.6);
  len *= 1 + 0.45 * burst;
  if (inAir) len *= SL.AIR_LONG;
  const wide = SL.WIDTH * (0.55 + 0.45 * t) * clamp(Math.min(S.w, S.h) / SL.WIDTH_REF, 0.7, 1.4);
  const alpha = SL.ALPHA_MIN + (SL.ALPHA_MAX - SL.ALPHA_MIN) * Math.pow(t, 0.8) + 0.20 * burst;
  const life = ((SL.LIFE_MIN + SL.LIFE_MAX) * 0.5) * (inAir ? SL.AIR_LIFE : 1);
  const inkP = SL.INK_FRAC * (SL.INK_FLOOR + (1 - SL.INK_FLOOR) * t);

  // ---- spawn. Rate is population / mean lifetime, so the count settles on
  // `want` without anyone tracking it: lines leave on their own clock.
  if (want > 0.5) {
    S.acc += (want / life) * dt;
    let n = S.acc | 0;
    S.acc -= n;
    if (n > SL_SPAWN_FRAME) n = SL_SPAWN_FRAME;
    while (n-- > 0) {
      if (!slSpawn(inner, len, wide, alpha, life, inkP)) break;
    }
  }

  // ---- age + lay down geometry
  slFocus(dt);
  const fx = S.w * 0.5 + S.focusX, fy = S.h * 0.5 + S.focusY;
  const HX = S.w * 0.5 * SL.REACH, HY = S.h * 0.5 * SL.REACH;
  const step = SL_ALPHA_CEIL / SL_BUCKETS;
  let live = 0;
  for (let i = 0; i < SL_CAP; i++) {
    let L = S.lf[i];
    if (L <= 0) { S.gb[i] = 255; continue; }
    L -= dt; S.lf[i] = L;
    if (L <= 0) { S.gb[i] = 255; continue; }
    live++;
    const ttl = S.tt[i];
    const frac = L / ttl;                       // 1 -> 0
    const age = ttl - L;
    // a hard pop in and a soft fall out: the field crackles rather than pulses
    const env = Math.min(1, age * 14) * Math.pow(frac, 0.6);
    const a = S.a0[i] * env;
    if (a < step * 0.5) { S.gb[i] = 255; continue; }
    let b = (a / step) | 0;
    if (b >= SL_BUCKETS) b = SL_BUCKETS - 1;
    S.gb[i] = b + (S.ik[i] ? SL_BUCKETS : 0);

    const ln = S.ln[i];
    const rIn = S.r0[i] + ln * SL.DRIFT * (1 - frac);   // crawls outward as it dies
    const rOut = rIn + ln;
    const ca = S.ca[i], sa = S.sa[i];
    const ax = fx + ca * rIn * HX, ay = fy + sa * rIn * HY;
    const bx = fx + ca * rOut * HX, by = fy + sa * rOut * HY;
    let dx = bx - ax, dy = by - ay;
    const dm = Math.hypot(dx, dy) || 1;
    // the perpendicular, in PIXELS — an ellipse-space normal would put a visible
    // width difference between the horizontal and the vertical lines
    const nx = -dy / dm, ny = dx / dm;
    const wo = S.wd[i] * 0.5, wi = wo * SL.TAPER;
    const o = i * 8;
    S.gx[o]     = ax + nx * wi; S.gx[o + 1] = ay + ny * wi;
    S.gx[o + 2] = bx + nx * wo; S.gx[o + 3] = by + ny * wo;
    S.gx[o + 4] = bx - nx * wo; S.gx[o + 5] = by - ny * wo;
    S.gx[o + 6] = ax - nx * wi; S.gx[o + 7] = ay - ny * wi;
  }
  S.live = live;
  S.rush = smooth(sMs, SL.RUSH_FROM, SL.MAX_AT + 2);
  return live > 0 || S.rush > 0.02;
}

function slDraw() {
  const g = S.cx;
  g.clearRect(0, 0, S.w, S.h);

  // the 40 m/s rush: one cached radial gradient hugging the edges, and never
  // anything in the middle of the frame — at 53 m/s in trees you need the trees
  if (S.rush > 0.02) {
    const fx = S.w * 0.5 + S.focusX, fy = S.h * 0.5 + S.focusY;
    const qk = Math.round(S.rush * 20), qx = Math.round(fx / 12), qy = Math.round(fy / 12);
    if (!S.grad || qk !== S.gk || qx !== S.gxq || qy !== S.gyq) {
      S.gk = qk; S.gxq = qx; S.gyq = qy;
      const rad = Math.hypot(S.w, S.h) * 0.62;
      const gr = g.createRadialGradient(fx, fy, rad * 0.42, fx, fy, rad);
      const a = SL.RUSH_ALPHA * S.rush;
      gr.addColorStop(0, 'rgba(255,255,255,0)');
      gr.addColorStop(0.72, `rgba(246,251,255,${(a * 0.45).toFixed(3)})`);
      gr.addColorStop(1, `rgba(255,255,255,${a.toFixed(3)})`);
      S.grad = gr;
    }
    g.fillStyle = S.grad;
    g.fillRect(0, 0, S.w, S.h);
  }

  // the field itself: one path and one fill per (alpha bucket x ink), so 120+
  // tapered spikes cost at most 16 fill() calls and zero string work
  const gx = S.gx, gb = S.gb;
  for (let b = 0; b < SL_BUCKETS * 2; b++) {
    let opened = false;
    for (let i = 0; i < SL_CAP; i++) {
      if (gb[i] !== b) continue;
      if (!opened) { g.beginPath(); opened = true; }
      const o = i * 8;
      g.moveTo(gx[o], gx[o + 1]);
      g.lineTo(gx[o + 2], gx[o + 3]);
      g.lineTo(gx[o + 4], gx[o + 5]);
      g.lineTo(gx[o + 6], gx[o + 7]);
      g.closePath();
    }
    if (opened) { g.fillStyle = SL_FILL[b]; g.fill(); }
  }
}

// The whole overlay, once a frame. `sMs` is metres per second — the caller has
// already chosen between ground speed and the wing's airspeed.
function slUpdate(dt, sMs, inAir, paused) {
  if (!S.cv) return;
  if (slSuppressed(paused)) { slHide(); return; }
  const t0 = performance.now();
  const any = slStep(dt, sMs, inAir);
  if (!any) { slHide(); return; }
  if (!S.shown) { S.shown = true; S.cv.style.display = 'block'; }
  slDraw();
  const ms = performance.now() - t0;
  S.cost[S.ci] = ms;
  S.ci = (S.ci + 1) % S.cost.length;
  if (S.cn < S.cost.length) S.cn++;
}

// the public punctuation hook — landings, ignitions and stomped tricks
function slBurst(amount) {
  const a = clamp(amount, 0, 1.4);
  if (a > S.burst) S.burst = a;
}

function costPct(p) {
  if (!S.cn) return 0;
  const a = Array.prototype.slice.call(S.cost.subarray(0, S.cn)).sort((x, y) => x - y);
  return +a[Math.min(a.length - 1, Math.floor(a.length * p))].toFixed(4);
}

// ---------------------------------------------------------------- emitters
function emitSki(dt) {
  const c = R.ctrl, u = R.u;
  if (!c || c.mode !== 'skis') return;
  const p = c.position, v = c.velocity;
  const s = c.speed();
  const yaw = c.yaw;
  const fx = -Math.sin(yaw), fz = -Math.cos(yaw);        // along the skis
  const rx = Math.cos(yaw), rz = -Math.sin(yaw);         // across the skis
  const vr = v.x * rx + v.z * rz;                        // lateral (edge load)
  // The stop/stivot machine is the authority on what the skis are doing. SHIFT
  // is tuck now and S only brakes when it opposes travel, so reading the keys
  // here would light the plume in all the wrong places (spec §2.1, §2.4).
  const st = skiState();
  const stop = st.stop | 0;                              // 0 none, 1 plow, 2 hockey
  const edge = clamp(st.edge || 0, 0, 1);
  const shortStiv = !!st.stivoting && st.stivot < 0.45;
  const braking = stop !== 0;
  // §2.4 rate multipliers. Hockey and pizza outrank a stivot, a stivot outranks
  // a release, and a plain carve is the 1.0 the roost below is already tuned to.
  const mul = stop === 2 ? 4.0 : stop === 1 ? 1.6 : shortStiv ? 2.2 : st.releasing ? 1.4 : 1.0;

  // ---- landing burst (works from any mode transition while on skis)
  if (c.grounded && !R.prevGrounded) {
    const impact = Math.max(0, -R.prevVy);
    if (impact > 2.5 * u) {
      const n = Math.min(380, Math.round(26 * impact / u));
      const up = clamp(impact / (10 * u), 0.6, 1.8);
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const rr = rand(0.5, 3.4) * u * clamp(impact / (12 * u), 0.4, 1.7);
        emit(
          p.x + Math.cos(a) * rand(0.1, 0.7) * u, p.y + rand(0.02, 0.3) * u, p.z + Math.sin(a) * rand(0.1, 0.7) * u,
          Math.cos(a) * rr + v.x * 0.5, rand(1.0, 4.2) * u * up, Math.sin(a) * rr + v.z * 0.5,
          rand(0.9, 1.6), rand(0.10, 0.32) * u, rand(0.6, 0.95),
        );
      }
    }
  }

  if (!c.grounded) return;

  // tails of the skis, a touch behind the boots
  const tx = p.x - fx * 0.55 * u, tz = p.z - fz * 0.55 * u;

  // ---- continuous wake at speed (light)
  if (s > 2.5 * u) {
    R.accWake += (70 + 220 * clamp(s / (28 * u), 0, 1)) * dt;
    let n = R.accWake | 0; R.accWake -= n;
    while (n--) {
      const side = Math.random() < 0.5 ? -1 : 1;
      emit(
        tx + rx * side * 0.22 * u + rand(-0.08, 0.08) * u, p.y + rand(0.0, 0.12) * u, tz + rz * side * 0.22 * u + rand(-0.08, 0.08) * u,
        -fx * s * rand(0.05, 0.22) + rand(-0.4, 0.4) * u, rand(0.3, 1.4) * u, -fz * s * rand(0.05, 0.22) + rand(-0.4, 0.4) * u,
        rand(0.35, 0.8), rand(0.05, 0.12) * u, rand(0.3, 0.55),
      );
    }
  }

  // ---- carve roost: rate ~ speed x lateral grip, thrown to the outside of the
  // turn. Two populations: HEAVY roost that inherits most of the player's
  // velocity (it rides alongside and climbs into the first-person frame — this
  // is the spray you actually SEE), and trailing roost left hanging behind.
  const load = Math.abs(vr);
  if (!braking && load > 0.8 * u && s > 4 * u) {
    const rate = mul * 2400 * clamp(s / (28 * u), 0, 1) * clamp(load / (6 * u), 0, 1);
    R.accRoost += rate * dt;
    let n = R.accRoost | 0; R.accRoost -= n;
    const sgn = vr > 0 ? 1 : -1;              // outside of the turn
    const ox = rx * sgn, oz = rz * sgn;       // outward
    const loadK = 0.75 + 0.4 * clamp(load / (5 * u), 0, 1.4);
    while (n--) {
      const kick = (1.0 + 0.7 * load / u) * u * rand(0.5, 1.3);
      if (Math.random() < 0.55) {
        // rider spray: born beside the boots, keeps pace, climbs into view
        const inh = rand(0.55, 0.9);
        emit(
          p.x + ox * rand(0.15, 0.7) * u + fx * rand(-0.2, 0.6) * u,
          p.y + rand(0.05, 0.4) * u,
          p.z + oz * rand(0.15, 0.7) * u + fz * rand(-0.2, 0.6) * u,
          v.x * inh + ox * kick * 0.7,
          rand(2.0, 4.8) * u * loadK,
          v.z * inh + oz * kick * 0.7,
          rand(0.6, 1.1), rand(0.12, 0.30) * u, rand(0.55, 0.95),
        );
      } else {
        // trailing roost: hangs in the air where the carve happened
        emit(
          tx + ox * rand(0.1, 0.5) * u, p.y + rand(0.02, 0.25) * u, tz + oz * rand(0.1, 0.5) * u,
          v.x * rand(0.1, 0.3) + ox * kick,
          rand(1.4, 3.6) * u * loadK,
          v.z * rand(0.1, 0.3) + oz * kick,
          rand(0.8, 1.4), rand(0.10, 0.28) * u, rand(0.5, 0.9),
        );
      }
    }
  }

  // ---- stop / stivot plumes, all of them through the public spray() hook. The
  // rate is |vr| x edge x the §2.4 multiplier; the edge term is floored because
  // a flat-ski slide still moves a lot of snow, it just does not bite, and a
  // plume that vanishes at zero edge angle reads as a bug rather than a nuance.
  // `vrs` is what the skis are scrubbing sideways; a pizza scrubs almost nothing
  // sideways and throws its snow straight off the tips instead, so the term the
  // rate rides is the larger of the two.
  const vrs = Math.abs(vr);
  const sgn = vr > 0 ? 1 : -1;                           // outside of the slip
  const scrub = Math.max(vrs, stop === 1 ? s * 0.35 : 0);
  const plume = 900 * clamp(scrub / (6 * u), 0.15, 1.4) * (0.35 + 0.65 * edge);
  // the ground normal leans DOWNhill, so its negated horizontal is the uphill
  // bearing the hockey wall throws into
  let ux = 0, uz = 0;
  try {
    const gn = c.groundNormal && c.groundNormal();
    if (gn) { const h = Math.hypot(gn.x, gn.z); if (h > 1e-3) { ux = -gn.x / h; uz = -gn.z / h; } }
  } catch { R.errors++; }

  if (stop === 2 && s > 1.0 * u) {
    // hockey stop: one wall, thrown across the skis to the outside of the slip
    // and canted uphill, which is where a real one puts it
    const thr = (2.6 + 0.55 * vrs / u) * u;
    spray(
      { x: p.x + rx * sgn * 0.24 * u, y: p.y + 0.10 * u, z: p.z + rz * sgn * 0.24 * u },
      { x: (rx * sgn * 0.80 + ux * 0.60) * thr, y: 0.95 * thr, z: (rz * sgn * 0.80 + uz * 0.60) * thr },
      plume * 4.0, 0.19,
    );
  } else if (stop === 1 && s > 1.0 * u) {
    // pizza: two narrow plumes, one off each tip, half the budget each
    const thr = (1.6 + 0.30 * s / u) * u;
    for (let side = -1; side <= 1; side += 2) {
      spray(
        { x: p.x + fx * 0.50 * u + rx * side * 0.26 * u, y: p.y + 0.06 * u, z: p.z + fz * 0.50 * u + rz * side * 0.26 * u },
        { x: (fx * 0.75 + rx * side * 0.55) * thr, y: 0.45 * thr, z: (fz * 0.75 + rz * side * 0.55) * thr },
        plume * 0.8, 0.13,
      );
    }
  } else if (shortStiv && s > 2 * u) {
    // short stivot: a wide fan off the tails, gone again in under half a second
    const thr = (2.0 + 0.50 * vrs / u) * u;
    spray(
      { x: tx + rx * sgn * 0.20 * u, y: p.y + 0.08 * u, z: tz + rz * sgn * 0.20 * u },
      { x: (rx * sgn * 0.90 - fx * 0.35) * thr, y: 0.70 * thr, z: (rz * sgn * 0.90 - fz * 0.35) * thr },
      plume * 2.2, 0.16,
    );
  }

  // ---- release burst: one shot, sized by the speed the transition actually
  // handed back (§1.10). takeSkiBurst() is a drain, so read it exactly once a
  // frame whatever else is going on; rate = n/dt spends the count in this frame.
  const burst = takeSkiBurst();
  if (burst > 0.02 * u) {
    const n = Math.min(200, Math.round(120 * burst / u));
    const thr = (2.2 + 0.9 * burst / u) * u;
    spray(
      { x: p.x + rx * sgn * 0.20 * u, y: p.y + 0.18 * u, z: p.z + rz * sgn * 0.20 * u },
      { x: (rx * sgn * 0.70 - fx * 0.30) * thr, y: 1.05 * thr, z: (rz * sgn * 0.70 - fz * 0.30) * thr },
      n / R.dt, 0.22,
    );
  }
}

// Glider: the only thing on the ground to kick up is what you skim over, so the
// emitter is entirely about the last two metres. Ground effect and a spray off
// the surface arrive together, which is exactly the read the player wants —
// "you are close enough that the ground is holding you up".
function emitGlide(dt) {
  const c = R.ctrl, u = R.u;
  if (!c || c.mode !== 'glider' || c.grounded) return;
  const g = gliderState();
  if (!(g.skim > 0.05)) return;
  const p = c.position, v = c.velocity;
  const s = c.speed();
  R.accWake += 900 * g.skim * clamp(s / (22 * u), 0, 1) * dt;
  let n = R.accWake | 0; R.accWake -= n;
  const fx = v.x / (s || 1), fz = v.z / (s || 1);
  while (n--) {
    const side = Math.random() < 0.5 ? -1 : 1;
    emit(
      p.x - fx * rand(0.2, 1.4) * u + (-fz) * side * rand(0, 0.9) * u,
      p.y - g.agl + rand(0.02, 0.25) * u,
      p.z - fz * rand(0.2, 1.4) * u + fx * side * rand(0, 0.9) * u,
      -fx * s * rand(0.1, 0.35) + (-fz) * side * rand(0.4, 2.0) * u,
      rand(0.8, 3.0) * u * (0.5 + g.skim),
      -fz * s * rand(0.1, 0.35) + fx * side * rand(0.4, 2.0) * u,
      rand(0.4, 0.9), rand(0.06, 0.18) * u, rand(0.3, 0.7),
    );
  }
}

// ------------------------------------------------------------------- public
export function init(ctx) {
  try {
    if (R.ok || !ctx) return;
    R.THREE = ctx.THREE; R.scene = ctx.scene; R.camera = ctx.camera;
    R.renderer = ctx.renderer; R.ctrl = ctx.ctrl; R.hud = ctx.hud;
    if (!R.THREE || !R.scene) return;
    R.u = (R.ctrl && R.ctrl.T && R.ctrl.T.eyeHeight) ? R.ctrl.T.eyeHeight / 1.70 : 1;
    polish(R.THREE, R.scene, R.camera, R.renderer, R.hud);
    buildPool(R.THREE, R.scene);
    slBuild();
    R.ok = true;
  } catch { R.errors++; }
}

export function update(dt) {
  if (!R.ok) return;
  try {
    dt = clamp(dt || 0.016, 0.0005, 0.05);
    R.dt = dt;
    R.sprayLeft = SPRAY_FRAME;          // spray() budget, refilled once a frame
    const c = R.ctrl, u = R.u;
    const paused = !!(R.hud && R.hud.isPaused && R.hud.isPaused());

    // The landing edge, read BEFORE the emitters move R.prevGrounded on: the
    // snow burst and the speed-line burst are the same event and must not be
    // able to disagree about which frame it happened on.
    const landed = !!(c && c.grounded && !R.prevGrounded);
    const landVy = Math.max(0, -R.prevVy) / u;

    // emit (not while paused; each emitter gates on its own gear)
    if (c && !paused) { emitSki(dt); emitGlide(dt); }

    // remember for edge detection (sample fall speed before landing zeroes it)
    if (c) {
      R.prevGrounded = c.grounded;
      R.prevVy = c.velocity ? c.velocity.y : 0;
    }

    // integrate the pool
    const g = 7.5 * u, dragK = Math.exp(-1.6 * dt);
    let alive = 0;
    for (let i = 0; i < POOL; i++) {
      let L = R.life[i];
      if (L <= 0) { R.aSize[i] = 0; R.aAlpha[i] = 0; continue; }
      L -= dt; R.life[i] = L;
      if (L <= 0) { R.aSize[i] = 0; R.aAlpha[i] = 0; continue; }
      alive++;
      R.vy[i] -= g * dt;
      R.vx[i] *= dragK; R.vy[i] *= dragK; R.vz[i] *= dragK;
      R.px[i] += R.vx[i] * dt; R.py[i] += R.vy[i] * dt; R.pz[i] += R.vz[i] * dt;
      const o = i * 3;
      R.aPos[o] = R.px[i]; R.aPos[o + 1] = R.py[i]; R.aPos[o + 2] = R.pz[i];
      const t = L / R.ttl[i];                              // 1 -> 0
      const fadeIn = Math.min(1, (R.ttl[i] - L) * 9);      // quick pop
      R.aSize[i] = R.sz[i] * (1 + 1.3 * (1 - t));          // puff expands as it flies
      R.aAlpha[i] = R.a0[i] * fadeIn * Math.pow(t, 1.15);  // fade out
    }
    R.alive = alive;
    R.pGeo.attributes.position.needsUpdate = true;
    R.pGeo.attributes.aSize.needsUpdate = true;
    R.pGeo.attributes.aAlpha.needsUpdate = true;

    // point-size scale from the real framebuffer height + fov
    if (R.renderer && R.camera) {
      const h = R.renderer.domElement ? R.renderer.domElement.height : 800;
      R.pMat.uniforms.uScale.value = h / (2 * Math.tan((R.camera.fov || 72) * Math.PI / 360));
    }

    // ---- speed lines. The wind reads off AIRSPEED on the glider — diving into
    // a headwind of your own making is the whole point, and horizontal speed
    // alone misses a vertical dive. While the rocket is lit the wing is stood
    // down and its airspeed readout is a frozen lie, so the field goes back to
    // the body's own speed — and starts earlier, because at boost speeds the
    // lines are the only cue that you are moving.
    const b = window.__playBoost;
    const boosting = !!(b && b.burning && b.burning());
    const inAir = !!(c && !c.grounded);
    S.boosting = boosting;
    let sMs = 0;
    if (c) {
      sMs = (c.mode === 'glider' && inAir && !boosting) ? (gliderState().airspeed || 0) / u : c.speed() / u;
    }

    // ---- the three punctuation events. Each is an EDGE, never a level, so a
    // held state cannot pin the field open.
    if (!paused) {
      if (landed) S.trickPoll = 4;
      if (landed && landVy > 2.0) slBurst(SL.BURST_LAND * clamp(landVy / 9, 0.35, 1.25));
      if (boosting && !S.prevBoost) slBurst(SL.BURST_BOOST);
      // trickState() builds an object and a board slice, so it is NOT read every
      // frame — a trick can only score on touchdown, so the counter is polled for
      // the few frames around a landing and ignored the rest of the time.
      if (S.trickPoll > 0) {
        S.trickPoll--;
        try {
          const ts = window.__player && window.__player.trickState();
          if (ts) {
            if (S.prevLanded >= 0 && ts.landed > S.prevLanded) slBurst(SL.BURST_TRICK);
            S.prevLanded = ts.landed;
          }
        } catch { /* a world with no trick machine */ }
      }
    }
    S.prevBoost = boosting;

    slUpdate(dt, sMs, inAir, paused);
  } catch { R.errors++; }
}

export function stats() {
  return { ok: R.ok, alive: R.alive, errors: R.errors, unit: R.u };
}

// The test handle, in the shape speedo.js and clean.js already use: a canvas
// cannot be interrogated any other way, and the gate has to be able to tell "the
// field is dormant at 6 m/s" apart from "the field is broken".
window.__speedlines = {
  el: () => S.cv,
  visible: () => !!S.shown,
  lines: () => S.live,
  intensity: () => +S.t.toFixed(3),
  // the FIELD's tiers, not the gauge's — a name a screenshot can be filed under.
  // They sit on the same speeds the speedo escalates at (15 / 20-28 / 28+ / 40).
  tier: () => (S.t <= 0 ? 'off' : S.t < 0.25 ? 'subtle' : S.t < 0.62 ? 'streaks' : S.t < 0.9 ? 'anime' : 'rush'),
  burst: () => +S.burst.toFixed(3),
  accel: () => +S.accel.toFixed(2),
  focus: () => ({ x: Math.round(S.focusX), y: Math.round(S.focusY) }),
  rush: () => +S.rush.toFixed(3),
  suppressed: () => slSuppressed(!!(R.hud && R.hud.isPaused && R.hud.isPaused())),
  fire: (a) => { slBurst(a === undefined ? 1 : a); return S.burst; },
  tuning: SL,
  // measured, not asserted: the ring holds the last 240 frames of step+draw
  cost: () => ({ n: S.cn, p50: costPct(0.50), p95: costPct(0.95), max: costPct(0.999) }),
  costReset: () => { S.ci = 0; S.cn = 0; return true; },
};

window.__playFX = { init, update, stats, spray };
export default init;
