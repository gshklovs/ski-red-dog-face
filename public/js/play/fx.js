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
// glider gets the wind streaks (keyed to airspeed) and a ground-skim spray.
//
// The imports are read-only state snapshots — airspeed, the ground-effect
// fraction, the edge/stop/stivot machine and the pump payout are all physics
// facts this layer has no way to re-derive.
//
// Budget: one THREE.Points pool (4096 particles, CPU-integrated — ~0.1 ms),
// one LineSegments (52 wind streaks), one CanvasTexture, one DOM vignette.
// No post pass, no shadow maps, no per-particle raycasts.

import { gliderState } from './glider.js';
import { skiState, takeSkiBurst } from './ski.js';

const POOL = 4096;          // particle pool size
const STREAKS = 52;         // wind streak lines
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
  // wind streaks
  wind: null, wGeo: null, wMat: null, wx: null, wy: null, wz: null,
  // frame-to-frame state
  prevGrounded: false, prevVy: 0,
  errors: 0,
};

const clamp = (v, a, b) => (v < a ? a : (v > b ? b : v));
const rand = (a, b) => a + Math.random() * (b - a);

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

// -------------------------------------------------------------- wind streaks
function buildStreaks(THREE, scene) {
  // screen-space annulus (angle + radius) at a depth — keeps the centre of the
  // frame clear and the streaks hugging the edges at any distance
  R.wa = new Float32Array(STREAKS);   // angle around screen centre
  R.wr = new Float32Array(STREAKS);   // normalized radius (1 ~ screen edge)
  R.wz = new Float32Array(STREAKS);   // camera-space depth (unit-agnostic, m)
  for (let i = 0; i < STREAKS; i++) {
    R.wa[i] = Math.random() * Math.PI * 2;
    R.wr[i] = rand(0.6, 1.15);
    R.wz[i] = -rand(2.5, 13);
  }
  const pos = new Float32Array(STREAKS * 6);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  if (THREE.DynamicDrawUsage !== undefined) geo.attributes.position.setUsage(THREE.DynamicDrawUsage);
  const mat = new THREE.LineBasicMaterial({
    color: 0xf2f7ff,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthTest: false,
    depthWrite: false,
  });
  const lines = new THREE.LineSegments(geo, mat);
  lines.name = 'fx:wind';
  lines.frustumCulled = false;
  lines.renderOrder = 95;
  lines.visible = false;
  scene.add(lines);
  R.wind = lines; R.wGeo = geo; R.wMat = mat;
}

const _v0 = { x: 0, y: 0, z: 0 };    // scratch for streak endpoints
// `from` is the speed the streaks switch on at. Skiing that is fast (15 m/s);
// hanging off a wing at 16 m/s of airspeed the wind IS the experience, so the
// glider hands in a lower threshold and gets streaks across its whole envelope.
function updateStreaks(dt, speed, from = 15) {
  const { camera, u } = R;
  const on = speed > from * u && camera;
  R.wind.visible = on;
  if (!on) return;
  const k = clamp((speed - from * u) / (12 * u), 0, 1);
  R.wMat.opacity = 0.12 + 0.33 * k;
  const m = camera.matrixWorld.elements;
  const pos = R.wGeo.attributes.position.array;
  const zspd = (speed / u) * 1.15;                 // streaks fly past in cam space
  const lenK = 0.16 * clamp(speed / (26 * u), 0.3, 1);
  for (let i = 0; i < STREAKS; i++) {
    R.wz[i] += zspd * dt;
    if (R.wz[i] > -2.2) R.wz[i] -= 11;
    const z = R.wz[i] * u;
    const az = Math.abs(R.wz[i]);
    // annulus point at this depth (fov ~72: y half-extent ≈ 0.73|z|)
    const x = Math.cos(R.wa[i]) * R.wr[i] * 0.95 * az * u;
    const y = Math.sin(R.wa[i]) * R.wr[i] * 0.60 * az * u;
    const len = lenK * az * u;                     // angular length stays modest
    // camera local -> world (matrixWorld * p), twice per streak
    for (let e = 0; e < 2; e++) {
      const zz = z + (e ? len : 0);
      const o = i * 6 + e * 3;
      pos[o]     = m[0] * x + m[4] * y + m[8]  * zz + m[12];
      pos[o + 1] = m[1] * x + m[5] * y + m[9]  * zz + m[13];
      pos[o + 2] = m[2] * x + m[6] * y + m[10] * zz + m[14];
    }
  }
  R.wGeo.attributes.position.needsUpdate = true;
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
    buildStreaks(R.THREE, R.scene);
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
    const paused = R.hud && R.hud.isPaused && R.hud.isPaused();

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

    // wind reads off AIRSPEED on the glider — diving into a headwind of your own
    // making is the whole point, and horizontal speed alone misses a vertical dive.
    // While the rocket is lit the wing is stood down and its airspeed readout is
    // a frozen lie, so the streaks go back to the body's own speed — and start
    // earlier, because at boost speeds they are the only cue that you are moving.
    const b = window.__playBoost;
    const boosting = !!(b && b.burning && b.burning());
    if (c && c.mode === 'glider' && !c.grounded && !boosting) updateStreaks(dt, gliderState().airspeed, 9);
    else updateStreaks(dt, c ? c.speed() : 0, boosting ? 10 : 15);
  } catch { R.errors++; }
}

export function stats() {
  return { ok: R.ok, alive: R.alive, errors: R.errors, unit: R.u };
}

window.__playFX = { init, update, stats, spray };
export default init;
