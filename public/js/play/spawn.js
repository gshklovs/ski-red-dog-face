// Where you wake up.
//
// Priority: explicit ?spawn= > the adapter's own spawn > layout.json views[0] >
// where the scene's default camera was pointed > scene bbox centre. Everything
// is then dropped onto real ground, and the two derived cases hill-climb a
// little to find dry, flat, open footing instead of dumping you in the lake.

const RINGS = [0, 5, 11, 19, 30, 44];
const ANGLES = 16;

export function pickSpawn(THREE, { collision, world, layout, qs, unitScale = 1 }) {
  const top = collision.bounds.maxY + 5;
  const drop = (x, z) => collision.groundAt(x, z, top);

  const out = (position, yaw, source, pitch = 0) => ({ position, yaw, pitch, source });
  // three.js forward for a Y-rotation is (-sin yaw, 0, -cos yaw)
  const yawTo = (from, to) => Math.atan2(from.x - to.x, from.z - to.z);

  // 1 — explicit override, for debugging and for the headless harness
  const sp = qs && qs.get('spawn');
  if (sp) {
    const n = sp.split(',').map(Number);
    if (n.length >= 3 && n.every(isFinite)) {
      const p = new THREE.Vector3(n[0], n[1], n[2]);
      const g = drop(p.x, p.z);
      if (g !== null && !isFinite(n[1])) p.y = g;
      const y = qs.get('yaw');
      return out(p, y ? Number(y) * Math.PI / 180 : 0, 'query');
    }
  }

  // 2 — the scene told us (PLAYABLE.md contract)
  if (world.spawnHint && world.spawnHint.position) {
    const p = toVec(THREE, world.spawnHint.position);
    // the contract asks for feet; accept an eye-height point too
    if (world.spawnHint.eyeHeight) p.y -= world.spawnHint.eyeHeight;
    const g = drop(p.x, p.z);
    // only honour it if there is actually floor there — otherwise it would
    // drop you through the world on the first frame, forever
    if (g !== null) {
      p.y = g;
      const la = world.spawnHint.lookAt ? toVec(THREE, world.spawnHint.lookAt) : null;
      return out(p, la ? yawTo(p, la) : 0, 'world.mjs');
    }
  }

  // 3 — layout.json views[]. The layout frame is locked ENU-metres (+X east,
  // +Y north, +Z up); three.js scenes here are Y-up, so (x,y,z) -> (x, z, -y).
  const view = layout && Array.isArray(layout.views) && layout.views[0];
  if (view && Array.isArray(view.position)) {
    const p = enuToThree(THREE, view.position);
    const g = drop(p.x, p.z);
    if (g !== null && Math.abs(g - p.y) < 200) {
      p.y = g;
      const la = Array.isArray(view.lookAt) ? enuToThree(THREE, view.lookAt) : null;
      return out(p, la ? yawTo(p, la) : 0, 'layout.json views[0]');
    }
  }

  // 4 — where the author's default camera was aimed
  const cam = world.camera;
  let seed = null, source = 'scene bbox';
  if (cam) {
    const o = cam.position, d = cam.getWorldDirection(new THREE.Vector3());
    const hit = collision.raycast(o.x, o.y, o.z, d.x, d.y, d.z, 6000);
    if (hit) {
      seed = new THREE.Vector3(o.x + d.x * hit.dist, o.y + d.y * hit.dist, o.z + d.z * hit.dist);
      source = 'default-camera aim';
    }
  }

  // 5 — fall back to the middle of the collidable world
  if (!seed) {
    const b = collision.bounds;
    const cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2;
    const g = drop(cx, cz);
    seed = new THREE.Vector3(cx, g === null ? 0 : g, cz);
  }

  const spot = bestFooting(collision, seed, unitScale, drop);
  // face back at whatever the camera was aimed at; if we barely moved, face the
  // most prominent thing around instead of staring at our own feet
  const target = seed.distanceTo(spot) > 4 * unitScale ? seed : lookTarget(collision, spot, unitScale, drop);
  return out(spot, yawTo(spot, target), source);
}

function toVec(THREE, v) {
  return v.isVector3 ? v.clone() : new THREE.Vector3(v[0], v[1], v[2]);
}
function enuToThree(THREE, a) {
  return new THREE.Vector3(a[0], a[2], -a[1]);
}

// Walk outward from the seed looking for footing that is a bit higher than the
// seed (i.e. out of the water), locally flat, and not under something.
function bestFooting(collision, seed, u, drop) {
  const y0 = drop(seed.x, seed.z);
  const base = y0 === null ? seed.y : y0;
  let best = null;
  for (const rr of RINGS) {
    const r = rr * u;
    const n = rr === 0 ? 1 : ANGLES;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const x = seed.x + Math.cos(a) * r, z = seed.z + Math.sin(a) * r;
      const y = drop(x, z);
      if (y === null) continue;
      const rise = y - base;
      if (rise < -0.4 * u || rise > 14 * u) continue;

      let rough = 0;
      for (const [ox, oz] of [[1.2, 0], [-1.2, 0], [0, 1.2], [0, -1.2]]) {
        const yn = drop(x + ox * u, z + oz * u);
        if (yn === null) { rough += 4; continue; }
        rough = Math.max(rough, Math.abs(yn - y));
      }
      // headroom: nothing hanging within 2.4 m above the head
      const up = collision.raycast(x, y + 0.4 * u, z, 0, 1, 0, 2.4 * u);
      const covered = up ? 1 : 0;

      // dry and flat and open and close in
      const score = Math.min(rise, 3 * u) * 2.2 - rough * 3.0 - covered * 6 - r * 0.045;
      if (!best || score > best.score) best = { x, y, z, score };
    }
  }
  if (!best) return seed.clone();
  return new (seed.constructor)(best.x, best.y, best.z);
}

// something worth looking at: highest ground within a couple of hundred metres
function lookTarget(collision, from, u, drop) {
  let best = null;
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    for (const rr of [60, 130, 220]) {
      const x = from.x + Math.cos(a) * rr * u, z = from.z + Math.sin(a) * rr * u;
      const y = drop(x, z);
      if (y === null) continue;
      if (!best || y > best.y) best = { x, y, z };
    }
  }
  return best ? new (from.constructor)(best.x, best.y, best.z) : new (from.constructor)(from.x, from.y, from.z - 10);
}
