// D27 / D28 — touch. Loaded only on a coarse pointer.
//
// PROMOTED to bench source by specs/0003 (was tools/export-red-dog/templates/).
// It is ordinary player source now: edit it HERE, commit, bump the exporter pin.
//
// The whole seam is two calls: it writes booleans into the same mutable object
// the physics reads by reference (`__player.keys`), and it calls the same
// `look()` the mouse calls. **No physics module and no gear module learns that
// touch exists.** That is the entire design, and it is why this file can be
// this small.
//
// Invisible zones, not on-screen sticks: the mountain is the product and a
// phone screen is small.
//
//   left half   drag horizontal   carve            keys.left / keys.right
//   left half   pull down         snowplow / brake keys.back
//   left half   push up           skate / tuck     keys.forward
//   left half   double-tap        reset            R
//   right half  drag              look             ctrl.look(dx*.9, dy*.9, .0022)
//   right half  tap               jump             keys.jump (edge)
//   right half  hold              jumpHeld         level, for the flare/pop path
//   any         swipe left/right in the air        spin
//   any         two-finger tap    camera           C

if (matchMedia('(pointer: coarse)').matches) start();

function start() {
  const P = window.__player;
  if (!P) return;

  const DEAD = 12;            // px before a drag counts as a carve
  const PITCH = 26;           // px of vertical pull before snowplow / skate
  const TAP_MS = 220;         // press shorter than this, and barely moved = tap
  const TAP_PX = 14;
  const DBL_MS = 320;
  const SPIN_MS = 400;
  const LOOK = 0.00022;   // 10x down from 0.0022 — phone drag-look was far too hot (Greg)

  const K = {};               // what we are currently asserting
  const set = (k, v) => { if (K[k] !== v) { K[k] = v; P.keys({ [k]: v }); } };
  const clearMove = () => { set('left', false); set('right', false); set('forward', false); set('back', false); };

  const touches = new Map();  // id -> { side, x0, y0, x, y, t0, moved }
  let lastLeftTap = 0, spinTimer = null;

  const side = (x) => (x < innerWidth / 2 ? 'L' : 'R');

  addEventListener('touchstart', (e) => {
    for (const t of e.changedTouches) {
      touches.set(t.identifier, {
        side: side(t.clientX), x0: t.clientX, y0: t.clientY,
        x: t.clientX, y: t.clientY, t0: performance.now(), moved: 0,
      });
    }
    // hold on the right half is the level jump input (preload / flare)
    if ([...touches.values()].some((v) => v.side === 'R')) set('jumpHeld', true);
    e.preventDefault();
  }, { passive: false });

  addEventListener('touchmove', (e) => {
    for (const t of e.changedTouches) {
      const s = touches.get(t.identifier);
      if (!s) continue;
      const dx = t.clientX - s.x, dy = t.clientY - s.y;
      s.moved += Math.abs(dx) + Math.abs(dy);
      s.x = t.clientX; s.y = t.clientY;

      if (s.side === 'R') {
        // look. Same call, same sensitivity shape, as the mouse.
        P.look(dx * 0.9, dy * 0.9, LOOK);
      } else {
        const ax = s.x - s.x0, ay = s.y - s.y0;
        set('left', ax < -DEAD);
        set('right', ax > DEAD);
        set('back', ay > PITCH);            // pull down = snowplow / brake
        set('forward', ay < -PITCH);        // push up   = skate / tuck
      }

      // a fast horizontal flick while airborne is a trick, either side
      if (!P.grounded() && Math.abs(dx) > 26 && Math.abs(dx) > Math.abs(dy) * 2) spin(dx < 0 ? 'spinLeft' : 'spinRight');
    }
    e.preventDefault();
  }, { passive: false });

  const end = (e) => {
    const now = performance.now();
    for (const t of e.changedTouches) {
      const s = touches.get(t.identifier);
      touches.delete(t.identifier);
      if (!s) continue;
      const quick = now - s.t0 < TAP_MS && Math.hypot(s.x - s.x0, s.y - s.y0) < TAP_PX;
      if (quick && s.side === 'R') {
        // tap right = jump. The controller clears the edge itself.
        P.keys({ jump: true });
        setTimeout(() => P.keys({ jump: false }), 90);
      } else if (quick && s.side === 'L') {
        if (now - lastLeftTap < DBL_MS) { P.respawn(); lastLeftTap = 0; }
        else lastLeftTap = now;
      }
      if (s.side === 'L') clearMove();
    }
    if (![...touches.values()].some((v) => v.side === 'R')) set('jumpHeld', false);
    if (!touches.size) clearMove();
    e.preventDefault();
  };
  addEventListener('touchend', end, { passive: false });
  addEventListener('touchcancel', end, { passive: false });

  // two fingers down at once = camera toggle, the same call C makes
  let twoAt = 0;
  addEventListener('touchstart', (e) => {
    if (e.touches.length === 2) twoAt = performance.now();
  }, { passive: true });
  addEventListener('touchend', (e) => {
    if (twoAt && e.touches.length === 0 && performance.now() - twoAt < 300) { P.toggleCam(); twoAt = 0; }
  }, { passive: true });

  function spin(which) {
    if (spinTimer) return;
    P.keys({ [which]: true });
    spinTimer = setTimeout(() => { P.keys({ [which]: false }); spinTimer = null; }, SPIN_MS);
  }

  // stop the page itself from panning, zooming or bouncing under the canvas
  document.documentElement.style.overscrollBehavior = 'none';
  document.body.style.touchAction = 'none';
  addEventListener('gesturestart', (e) => e.preventDefault());
  addEventListener('dblclick', (e) => e.preventDefault());

  window.__touch = { active: true, zones: 'left carve / right look' };
}
