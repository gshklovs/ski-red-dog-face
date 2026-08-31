// Dev mode — the world-builder's view. F8 detaches a noclip fly camera from the
// player body, drag a reference photo onto the window to compare against it, and
// once the virtual view lines up with the photo, M files a tuning request the
// orchestrator can hand to a builder agent (see harness/TUNING.md).
//
// Physics and gear are frozen while this is on; F8 puts you back exactly where
// the player was standing.
//
// Keys (dev mode only — everything else is swallowed so the world holds still):
//   WASD / arrows  fly, relative to where you are looking
//   SPACE / CTRL   up / down          SHIFT  5x
//   wheel          base speed         [ ]    fov -/+ 2°
//   V              cycle compare · side | overlay | wipe | off
//   M              match this view    ESC    close the dialog
//
// Mouse look is drag-on-canvas (the cursor stays free for the compare UI); if
// something else already holds the pointer lock, raw movement is used instead.

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
};

const MODES = ['side', 'overlay', 'wipe', 'off'];
const MODE_OPACITY = { side: 1, overlay: 0.5, wipe: 1, off: 1 };
const LOOK_SENS = 0.0022;             // same as the player's mouselook

// re-encode anything droppable as a JPEG we can post and the server can store
function toJpeg(img, maxEdge = 2048, q = 0.9) {
  const w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
  const k = Math.min(1, maxEdge / Math.max(w, h || 1));
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w * k));
  c.height = Math.max(1, Math.round(h * k));
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', q);
}
const stripDataUrl = (s) => String(s || '').replace(/^data:[^,]*,/, '');

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = () => reject(new Error('could not read ' + file.name));
    fr.readAsDataURL(file);
  });
}

/**
 * @param THREE       the shared three module
 * @param camera      the live camera (we write straight into it)
 * @param canvas      renderer.domElement
 * @param cfg         window.__PLAY (poi, run, qs)
 * @param hud         createHud()'s handle — we use flash() and the dev readout
 * @param unitScale   scene units per metre, so fly speed means something
 * @param renderNow   render one frame right now (for the snapshot)
 */
export function createDev({ THREE, camera, canvas, cfg, hud, unitScale = 1, renderNow }) {
  const u = unitScale || 1;
  let on = false;
  let simTime = 0;

  // ---- fly state
  const pos = new THREE.Vector3();
  let yaw = 0, pitch = 0, fov = 72;
  let base = 12 * u;                              // m/s before the SHIFT multiplier
  const keys = { fwd: 0, back: 0, left: 0, right: 0, up: 0, down: 0, fast: 0 };
  const clearKeys = () => { for (const k of Object.keys(keys)) keys[k] = 0; };

  // ---- compare state
  let refUrl = null;          // what we display (the file as dropped)
  let refJpeg = null;         // what we post (jpeg data url)
  let refName = '';
  let mode = 'side';
  let opacity = MODE_OPACITY.side;
  let wipeX = 50;             // %

  // ---- pointer state
  let lookDrag = false, wipeDrag = false, lastX = 0, lastY = 0;

  // ---- request state
  let shot = null;            // pending snapshot data url
  let lastRequest = null;

  // ================================================================== DOM
  // compare layer sits under the HUD chips (z 20) but over the canvas
  const layer = el('div', 'pdev-compare');
  layer.hidden = true;
  const refBox = el('div', 'pdev-compare__ref');
  const refImg = el('img', 'pdev-compare__img');
  refImg.alt = '';
  refBox.append(refImg);
  const handle = el('div', 'pdev-compare__handle');
  handle.hidden = true;
  const seam = el('div', 'pdev-compare__seam');
  seam.hidden = true;
  layer.append(refBox, seam, handle);
  document.body.appendChild(layer);

  // toolbar
  const bar = el('div', 'pdev-bar');
  bar.hidden = true;
  const barTitle = el('div', 'pdev-bar__title');
  const barRef = el('span', 'pdev-bar__ref', 'drop a photo to compare');
  barTitle.append(el('span', 'dot'), el('b', null, 'DEV'), barRef);
  const barRow = el('div', 'pdev-bar__row');
  const modeBtns = {};
  for (const m of MODES) {
    const b = el('button', 'pdev-btn', m);
    b.type = 'button';
    b.addEventListener('click', (e) => { e.stopPropagation(); setCompare(m); });
    modeBtns[m] = b;
    barRow.append(b);
  }
  const opRow = el('div', 'pdev-bar__row');
  opRow.append(el('span', 'pdev-lbl', 'opacity'));
  const opSlider = el('input', 'pdev-slider');
  opSlider.type = 'range'; opSlider.min = '0'; opSlider.max = '100'; opSlider.value = '100';
  opSlider.addEventListener('input', (e) => { e.stopPropagation(); opacity = Number(opSlider.value) / 100; paint(); });
  const opVal = el('span', 'pdev-lbl pdev-lbl--v', '100%');
  opRow.append(opSlider, opVal);
  const matchBtn = el('button', 'pdev-btn pdev-btn--accent', 'match this view · M');
  matchBtn.type = 'button';
  matchBtn.addEventListener('click', (e) => { e.stopPropagation(); match(); });
  bar.append(barTitle, barRow, opRow, matchBtn);
  document.body.appendChild(bar);

  // confirm dialog
  const modal = el('div', 'pdev-modal');
  modal.hidden = true;
  const mpanel = el('section', 'panel pdev-modal__panel');
  const mhd = el('div', 'panel__hd');
  mhd.append(el('span', 'lbl lbl--accent', 'match this view'), el('span', 'spacer'), el('span', 'lbl', cfg.run || ''));
  const mbd = el('div', 'panel__bd pdev-modal__bd');
  const shots = el('div', 'pdev-modal__shots');
  const mkShot = (cap) => {
    const w = el('figure', 'pdev-shot');
    const i = el('img', 'pdev-shot__img');
    i.alt = '';
    w.append(i, el('figcaption', 'pdev-shot__cap', cap));
    shots.append(w);
    return i;
  };
  const shotRef = mkShot('reference');
  const shotVirt = mkShot('virtual · current view');
  const ask = el('div', 'pdev-modal__ask', 'Alter this view to match this image?');
  const noteWrap = el('label', 'pdev-modal__note');
  noteWrap.append(el('span', 'pdev-lbl', 'note for the builder'));
  const noteEl = el('textarea', 'pdev-note');
  noteEl.rows = 4;
  noteEl.placeholder = 'extra instructions for the builder (optional)';
  noteWrap.append(noteEl);
  const mrow = el('div', 'pdev-modal__row');
  const okBtn = el('button', 'btn btn--accent', 'confirm');
  okBtn.type = 'button';
  const noBtn = el('button', 'btn btn--ghost', 'cancel');
  noBtn.type = 'button';
  const mstat = el('span', 'lbl pdev-modal__stat', '');
  mrow.append(okBtn, noBtn, mstat);
  mbd.append(shots, ask, noteWrap, mrow);
  mpanel.append(mhd, mbd);
  modal.append(mpanel);
  document.body.appendChild(modal);

  okBtn.addEventListener('click', (e) => { e.stopPropagation(); confirmMatch(); });
  noBtn.addEventListener('click', (e) => { e.stopPropagation(); closeModal(); });

  // ================================================================ compare
  function setCompare(m) {
    mode = MODES.includes(m) ? m : 'side';
    opacity = MODE_OPACITY[mode];
    opSlider.value = String(Math.round(opacity * 100));
    paint();
    return mode;
  }
  function cycleCompare() {
    return setCompare(MODES[(MODES.indexOf(mode) + 1) % MODES.length]);
  }

  function paint() {
    for (const m of MODES) modeBtns[m].classList.toggle('is-on', m === mode);
    opVal.textContent = Math.round(opacity * 100) + '%';
    barRef.textContent = refName || 'drop a photo to compare';
    matchBtn.disabled = !refJpeg;
    const show = on && !!refUrl && mode !== 'off';
    layer.hidden = !show;
    if (!show) return;
    refBox.className = 'pdev-compare__ref pdev-compare__ref--' + mode;
    refBox.style.opacity = String(opacity);
    if (mode === 'wipe') {
      refBox.style.clipPath = `inset(0 ${(100 - wipeX).toFixed(2)}% 0 0)`;
      handle.hidden = false; seam.hidden = false;
      handle.style.left = wipeX + '%';
      seam.style.left = wipeX + '%';
    } else {
      refBox.style.clipPath = '';
      handle.hidden = true; seam.hidden = true;
    }
  }

  async function loadRefUrl(url, name = 'dropped image') {
    const img = new Image();
    await new Promise((res, rej) => {
      img.onload = res;
      img.onerror = () => rej(new Error('not an image the browser can decode'));
      img.src = url;
    });
    refUrl = url;
    refJpeg = toJpeg(img);
    refName = name;
    refImg.src = url;
    if (mode === 'off') setCompare('side'); else paint();
    hud.flash('ref · ' + name);
    return { name, width: img.naturalWidth, height: img.naturalHeight };
  }

  async function loadRefFile(file) {
    if (!file || !/^image\//.test(file.type || '')) throw new Error('not an image file');
    return loadRefUrl(await readFileAsDataUrl(file), file.name || 'dropped image');
  }

  // drag & drop, dev mode only
  addEventListener('dragover', (e) => { if (on) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; } });
  addEventListener('drop', (e) => {
    if (!on) return;
    e.preventDefault();
    const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (!f) return;
    loadRefFile(f).catch((err) => hud.flash('ref failed · ' + (err.message || err)));
  });

  // ================================================================== match
  function snapshot() {
    try { if (renderNow) renderNow(); } catch (e) { console.warn('[dev] render for snapshot failed', e); }
    try { return canvas.toDataURL('image/jpeg', 0.9); }
    catch (e) { console.error('[dev] toDataURL failed', e); return null; }
  }

  function match() {
    if (!refJpeg) { hud.flash('drop a reference photo first'); return false; }
    if (!modal.hidden) return false;
    shot = snapshot();
    if (!shot) { hud.flash('snapshot failed'); return false; }
    clearKeys();
    shotRef.src = refJpeg;
    shotVirt.src = shot;
    mstat.textContent = '';
    okBtn.disabled = false;
    modal.hidden = false;
    setTimeout(() => { try { noteEl.focus(); } catch {} }, 0);
    return true;
  }

  function closeModal() {
    modal.hidden = true;
    shot = null;
    noteEl.value = '';
  }

  async function confirmMatch() {
    if (modal.hidden || !shot) return null;
    okBtn.disabled = true;
    mstat.textContent = 'filing…';
    const body = {
      poi: cfg.poi, run: cfg.run,
      ref: stripDataUrl(refJpeg),
      virtual: stripDataUrl(shot),
      view: { position: [pos.x, pos.y, pos.z], yaw, pitch, fov },
      note: noteEl.value.trim(),
    };
    try {
      const r = await fetch('/api/tuning/request', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      const j = await r.json();
      if (!r.ok || j.error) throw new Error(j.error || ('HTTP ' + r.status));
      lastRequest = j;
      closeModal();
      hud.flash('tuning request · ' + j.id);
      return j;
    } catch (e) {
      okBtn.disabled = false;
      mstat.textContent = 'failed · ' + (e.message || e);
      console.error('[dev] tuning request failed', e);
      return null;
    }
  }

  // ==================================================================== fly
  function enter() {
    camera.updateMatrixWorld();
    pos.setFromMatrixPosition(camera.matrixWorld);
    const d = camera.getWorldDirection(new THREE.Vector3());
    yaw = Math.atan2(-d.x, -d.z);
    pitch = Math.asin(clamp(d.y, -1, 1));
    fov = camera.fov;
    clearKeys();
    lookDrag = wipeDrag = false;
    on = true;
    document.body.classList.add('is-dev');
    bar.hidden = false;
    hud.setDev(true);
    paint();
    // hand the cursor back — the compare UI wants it
    if (document.pointerLockElement) { try { document.exitPointerLock(); } catch {} }
    hud.flash('dev mode · F8 to fly back');
  }

  function leave() {
    on = false;
    clearKeys();
    lookDrag = wipeDrag = false;
    document.body.classList.remove('is-dev');
    bar.hidden = true;
    layer.hidden = true;
    closeModal();
    hud.setDev(false);
    hud.flash('play mode');
  }

  function setActive(v) {
    const want = !!v;
    if (want === on) return on;
    if (want) enter(); else leave();
    return on;
  }

  function update(dt) {
    if (!on) return;
    simTime += dt;
    const sp = base * (keys.fast ? 5 : 1);
    const cy = Math.cos(yaw), sy = Math.sin(yaw);
    const cp = Math.cos(pitch), sp2 = Math.sin(pitch);
    // three.js forward for (pitch, yaw) in YXZ order
    const fx = -sy * cp, fy = sp2, fz = -cy * cp;
    const rx = cy, rz = -sy;
    const f = keys.fwd - keys.back, r = keys.right - keys.left, v = keys.up - keys.down;
    let dx = fx * f + rx * r, dy = fy * f + v, dz = fz * f + rz * r;
    const len = Math.hypot(dx, dy, dz);
    if (len > 1e-6) {
      const k = (sp * dt) / len;
      pos.x += dx * k; pos.y += dy * k; pos.z += dz * k;
    }
  }

  function applyTo(cam) {
    cam.position.copy(pos);
    cam.rotation.order = 'YXZ';
    cam.rotation.set(pitch, yaw, 0);
    if (Math.abs(cam.fov - fov) > 0.01) { cam.fov = fov; cam.updateProjectionMatrix(); }
    cam.updateMatrixWorld();
  }

  function look(dx, dy) {
    yaw -= dx * LOOK_SENS;
    pitch = clamp(pitch - dy * LOOK_SENS, -1.5533, 1.5533);
  }

  function setSpeed(v) { base = clamp(v, 0.1 * u, 600 * u); return base; }

  // ================================================================== input
  const MOVE = {
    KeyW: 'fwd', ArrowUp: 'fwd', KeyS: 'back', ArrowDown: 'back',
    KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right',
    Space: 'up', ControlLeft: 'down', ControlRight: 'down',
    ShiftLeft: 'fast', ShiftRight: 'fast',
  };

  // returns true when dev consumed the key (main.js swallows everything while
  // dev is on either way — this only decides preventDefault)
  function key(code, down) {
    if (!on) return false;
    if (!modal.hidden) {
      if (code === 'Escape' && !down) { closeModal(); return true; }
      return code === 'Escape';
    }
    const m = MOVE[code];
    if (m) { keys[m] = down ? 1 : 0; return true; }
    if (!down) return false;
    if (code === 'KeyV') { hud.flash('compare · ' + cycleCompare()); return true; }
    if (code === 'KeyM') { match(); return true; }
    if (code === 'BracketLeft') { fov = clamp(fov - 2, 10, 130); return true; }
    if (code === 'BracketRight') { fov = clamp(fov + 2, 10, 130); return true; }
    if (code === 'Escape') { if (!layer.hidden) { setCompare('off'); return true; } return false; }
    return false;
  }

  // every pointer event in dev mode arrives here (main.js routes them)
  function pointer(e, onCanvas) {
    if (!on) return;
    if (e.type === 'pointerdown') {
      if (e.target === handle) { wipeDrag = true; try { handle.setPointerCapture(e.pointerId); } catch {} return; }
      if (onCanvas) { lookDrag = true; lastX = e.clientX; lastY = e.clientY; }
      return;
    }
    if (e.type === 'pointermove') {
      if (wipeDrag) { wipeX = clamp((e.clientX / Math.max(1, innerWidth)) * 100, 0, 100); paint(); return; }
      if (document.pointerLockElement === canvas) { look(e.movementX || 0, e.movementY || 0); return; }
      if (lookDrag) {
        look(e.clientX - lastX, e.clientY - lastY);
        lastX = e.clientX; lastY = e.clientY;
      }
      return;
    }
    if (e.type === 'pointerup' || e.type === 'pointercancel') { lookDrag = false; wipeDrag = false; return; }
    if (e.type === 'wheel' && onCanvas) {
      setSpeed(base * Math.exp(-(e.deltaY || 0) * 0.0015));
      e.preventDefault();
    }
  }

  // ================================================================ readout
  const f1 = (v) => (v >= 0 ? ' ' : '') + v.toFixed(1);
  const deg = (r) => (r * 180 / Math.PI);
  function spawnParams() {
    return `?spawn=${pos.x.toFixed(1)},${pos.y.toFixed(1)},${pos.z.toFixed(1)}`
      + `&yaw=${deg(yaw).toFixed(1)}`;
  }
  function spawnUrl() {
    return location.origin + '/play?poi=' + encodeURIComponent(cfg.poi)
      + '&run=' + encodeURIComponent(cfg.run)
      + '&spawn=' + [pos.x, pos.y, pos.z].map((n) => n.toFixed(1)).join(',')
      + '&yaw=' + deg(yaw).toFixed(1);
  }

  function tick() {
    if (!on) return;
    hud.devTick({
      pos: `${f1(pos.x)} ${f1(pos.y)} ${f1(pos.z)}`,
      ang: `${deg(yaw).toFixed(1)}° / ${deg(pitch).toFixed(1)}°`,
      fov: fov.toFixed(0) + '°',
      spd: base.toFixed(1) + ' m/s' + (keys.fast ? ' ×5' : ''),
      cmp: refUrl ? mode : 'no ref',
      params: spawnParams(),
      url: spawnUrl(),
    });
  }

  const api = {
    active: () => on,
    toggle: () => setActive(!on),
    setActive,
    update, applyTo, look, key, pointer, tick,
    setCompare, cycleCompare, match, confirmMatch, closeModal,
    loadRefUrl, loadRefFile,
    spawnParams, spawnUrl,
    pose: () => ({ position: [pos.x, pos.y, pos.z], yaw, pitch, fov, speed: base }),
    compareMode: () => mode,
    modalOpen: () => !modal.hidden,
    hasRef: () => !!refJpeg,
    lastRequest: () => lastRequest,
    setNote: (t) => { noteEl.value = String(t == null ? '' : t); return noteEl.value; },
    note: () => noteEl.value,
    setSpeed,
    // hold a key set for `ms` of simulated dev time — frame-rate independent,
    // the same trick __player.simulateKeys uses
    simulate: (codes, ms) => new Promise((resolve) => {
      const before = [pos.x, pos.y, pos.z];
      for (const c of [].concat(codes || [])) key(c, true);
      const t0 = simTime, w0 = performance.now();
      const step = () => {
        if ((simTime - t0) * 1000 >= ms || performance.now() - w0 > 30000) {
          for (const c of [].concat(codes || [])) key(c, false);
          const after = [pos.x, pos.y, pos.z];
          resolve({
            before, after,
            d: Math.hypot(after[0] - before[0], after[1] - before[1], after[2] - before[2]),
            simMs: (simTime - t0) * 1000, wallMs: performance.now() - w0,
          });
          return;
        }
        requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }),
  };

  window.__devDebug = api;
  setCompare('side');
  paint();
  return api;
}
