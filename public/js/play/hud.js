// TE-styled instrument overlay for the player: readout, legend, crosshair,
// pause panel. Deliberately small — the world is the thing.

import { gliderState } from './glider.js';
import { skiState } from './ski.js';

const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
};

export function createHud({ poi, run, adapter, onResume, onRespawn }) {
  const root = el('div', 'phud');

  // ---- readout
  const read = el('div', 'phud__read pchip');
  const title = el('div', 'phud__title');
  title.append(el('span', 'dot'), el('b', null, 'RED DOG'));
  read.append(title);
  const rows = {};
  for (const [k, label] of [['pos', 'x / y / z'], ['spd', 'speed'], ['state', 'state'], ['gear', 'gear'], ['cam', 'cam']]) {
    const r = el('div', 'r');
    r.append(el('span', 'k', label), el('span', 'v', '—'));
    rows[k] = r.lastChild;
    read.append(r);
  }
  // D43 — the readout is BUILT and never appended. It is a debug instrument.

  // ---- fps
  const fps = el('div', 'phud__fps pchip');
  fps.append(el('span', 'k', 'fps '), el('span', 'v', '—'));
  const fpsVal = fps.lastChild;
  // D43 — and so is the fps counter. tick() still updates both, into the void.

  // ---- dev readout (F8). Where the fly camera is, in the terms a world
  // builder needs: pose, lens, fly speed, and the spawn params that reproduce
  // this exact view. dev.js drives it; see harness/TUNING.md.
  const devRead = el('div', 'phud__dev pchip');
  devRead.hidden = true;
  const devTitle = el('div', 'phud__title');
  devTitle.append(el('span', 'dot'), el('b', null, 'DEV FLY'));
  devRead.append(devTitle);
  const devRows = {};
  for (const [k, label] of [['pos', 'x / y / z'], ['ang', 'yaw / pitch'], ['fov', 'fov'], ['spd', 'speed'], ['cmp', 'compare']]) {
    const r = el('div', 'r');
    r.append(el('span', 'k', label), el('span', 'v', '—'));
    devRows[k] = r.lastChild;
    devRead.append(r);
  }
  const devParams = el('div', 'phud__dev-url');
  devParams.textContent = '?spawn=';
  devRead.append(devParams);
  const devBtns = el('div', 'phud__dev-btns');
  const devCopyP = el('button', 'pdev-btn pdev-btn--sm', 'copy params');
  const devCopyU = el('button', 'pdev-btn pdev-btn--sm', 'copy url');
  devCopyP.type = devCopyU.type = 'button';
  devBtns.append(devCopyP, devCopyU);
  devRead.append(devBtns);
  root.append(devRead);
  let devFull = '';
  const copy = (text, what) => {
    const done = () => { toast.textContent = 'copied · ' + what; toast.hidden = false; toastT = 1.2; };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, () => {});
    else done();
  };
  devCopyP.addEventListener('click', (e) => { e.stopPropagation(); copy(devParams.textContent, 'spawn params'); });
  devCopyU.addEventListener('click', (e) => { e.stopPropagation(); copy(devFull, 'play url'); });

  // ---- legend
  const legend = el('div', 'phud__legend');
  const mk = (cap, what) => {
    const k = el('span', 'pkey');
    k.append(el('b', null, cap), document.createTextNode(what));
    legend.append(k);
    return k;
  };
  // D44 (poi-lab tools/export-red-dog) — a chip that is BUILT and never put on
  // the strip. Same children as mk()'s, so tick() can go on writing to
  // `.lastChild.nodeValue` and toggling classes exactly as it does for a visible
  // chip; it is just never appended, so nothing advertises the feature.
  const dark = (cap, what) => {
    const k = el('span', 'pkey is-hidden');
    k.append(el('b', null, cap), document.createTextNode(what));
    return k;
  };
  const keyEls = {
    move: mk('WASD', 'move'),
    sprint: dark('SHIFT', 'sprint'),
    jump: mk('SPACE', 'jump'),
    gear: dark('E', 'gear'),
    inv: dark('I', 'locker'),
    boost: mk('G', 'boost'),
    lift: dark('F', 'lift'),
    spin: mk('← →', 'spin'),
    cam: mk('C', 'camera'),
    reset: mk('R', 'reset'),
    // D34/D37 — the 'B refs' and 'F8 dev' chips are gone from the legend. The
    // dev element still exists (nothing else would satisfy the toggle below);
    // it is simply never appended to the strip.
    refs: dark('B', 'refs'),
    dev: dark('F8', 'dev'),
    pause: mk('ESC', 'pause'),
  };
  keyEls.lift.classList.add('is-hidden');       // shown only if the world has lifts
  keyEls.boost.classList.add('is-hidden');      // shown only in the rocket gear
  root.append(legend);
  // (the old CSS ski rails lived here — superseded by the real 3D skis in main.js)

  // ---- lift prompt: the one contextual line on the screen. Sits just under
  // the crosshair so it reads as "the thing in front of you", not an instrument.
  const promptEl = el('div', 'phud__prompt pchip');
  promptEl.hidden = true;
  const promptKey = el('b', null, 'F');
  const promptTxt = el('span', null, '');
  promptEl.append(promptKey, promptTxt);
  root.append(promptEl);
  let hasLifts = false;

  // ---- rocket fuel (G, boost.js). One slim bar, and it only exists when it has
  // something to say: you are wearing the rocket, and it is burning or refilling
  // after a burn. A permanently full gauge is furniture, and a gauge for a tank
  // the gear you are wearing cannot spend is a lie.
  const fuel = el('div', 'phud__fuel');
  fuel.hidden = true;
  const fuelLbl = el('span', 'phud__fuel-lbl', 'boost');
  const fuelBar = el('span', 'phud__fuel-bar');
  const fuelFill = el('i');
  fuelBar.append(fuelFill);
  fuel.append(fuelLbl, fuelBar);
  root.append(fuel);
  let burning = false;
  let inRocket = false;         // the rocket is the equipped gear (setFuel tells us)

  // ---- gear toast (E)
  const toast = el('div', 'phud__toast pchip');
  toast.hidden = true;
  root.append(toast);
  let toastT = 0;

  // ---- trick toast: the big one. "360!" + degrees, or the wipeout stamp.
  const trick = el('div', 'phud__trick');
  trick.hidden = true;
  const trickBig = el('div', 'phud__trick-big');
  const trickSub = el('div', 'phud__trick-sub');
  trick.append(trickBig, trickSub);
  root.append(trick);
  let trickT = 0;

  // ---- pump arc (§1.10). A thin arc sitting just under the crosshair: the
  // carve bank filling, then emptying into the release. Same rule as setFuel —
  // it only exists when it has something to say. A gauge that is permanently
  // empty is furniture, and the pump is empty for most of a run (every
  // transition zeroes the bank), so an always-on arc would read as broken.
  const pump = el('div', 'phud__pump');
  pump.hidden = true;
  const pumpArc = el('i', 'phud__pump-arc');
  pump.append(pumpArc);
  root.append(pump);
  // ski.js zeroes the bank AT the transition and then pays out over 0.35 s, so
  // by the time the release is visible there is no `q` left to draw. The drain
  // is therefore ours to animate — otherwise the arc snaps to nothing at the one
  // instant the player is actually looking at it for feedback.
  let pumpVal = 0, pumpLast = 0;

  // ---- combo strip (§3.7). Live, bottom-centre, only during a combo: the
  // unbanked total and the multiplier. Deliberately NOT the panel-chip
  // language the banked readout uses — an unbanked score is a thing you can
  // still lose, and it should not look like something you own.
  const combo = el('div', 'phud__combo');
  combo.hidden = true;
  const comboScore = el('span', 'phud__combo-score', '0');
  const comboX = el('span', 'phud__combo-x', '×');
  const comboMult = el('span', 'phud__combo-mult', '1');
  const comboN = el('span', 'phud__combo-n', '');
  combo.append(comboScore, comboX, comboMult, comboN);
  root.append(combo);

  // ---- end-of-combo banner (§3.7). 2.4 s, on the same decay clock as the
  // trick stamp and the gear toast. This is the receipt: what the line was
  // worth, what it was multiplied by, and every trick that went into it.
  const cend = el('div', 'phud__cend');
  cend.hidden = true;
  const cendCap = el('div', 'phud__cend-cap', 'combo');
  const cendTot = el('div', 'phud__cend-tot');
  const cendScore = el('span', 'phud__cend-score', '0');
  const cendMult = el('span', 'phud__cend-mult', '×1');
  cendTot.append(cendScore, cendMult);
  const cendList = el('div', 'phud__cend-list', '');
  const cendSub = el('div', 'phud__cend-sub', '');
  cend.append(cendCap, cendTot, cendList, cendSub);
  root.append(cend);
  let cendT = 0;

  // ---- leaderboard breadcrumb (§4.3). One dim dot, and only once there is
  // something behind it. The board is not in the pause panel on purpose; this
  // dot is the whole of its discoverability, so its title carries the shortcut.
  const bdot = el('div', 'phud__bdot');
  bdot.hidden = true;
  bdot.title = 'L L';
  root.append(bdot);

  // ---- gear menu (hold E). Same panel language as pause; keyboard-first so it
  // works pointer-locked: W/S or ↑↓ move, ENTER equips, 1/2/3 equip directly,
  // E or ESC closes. main.js routes key input here while it is open.
  const gmenu = el('div', 'pgearmenu');
  gmenu.hidden = true;
  const gpanel = el('section', 'panel pgearmenu__panel');
  const ghd = el('div', 'panel__hd');
  ghd.append(el('span', 'lbl lbl--accent', 'gear'), el('span', 'spacer'), el('span', 'lbl', 'e / esc close'));
  const gbd = el('div', 'panel__bd pgearmenu__bd');
  gpanel.append(ghd, gbd);
  gmenu.append(gpanel);
  root.append(gmenu);
  let gRows = [], gSel = 0, gOnPick = null;

  function gearRender() {
    gRows.forEach((r, i) => r.el.classList.toggle('is-sel', i === gSel));
  }
  function gearClose() { gmenu.hidden = true; gOnPick = null; }
  function gearPick(i) {
    const r = gRows[i];
    if (!r || r.disabled) return;
    const cb = gOnPick;
    gearClose();
    if (cb) cb(r.gear);
  }

  const hudApiGear = {
    // { current, def, gears: ['boots','skis','bike',...], onPick(gear) }
    openGear({ current, def, gears, onPick }) {
      gbd.textContent = '';
      gRows = (gears || ['boots', 'skis']).map((gear, i) => {
        const row = el('div', 'pgearmenu__row');
        row.append(
          el('span', 'cap', String(i + 1)),
          el('span', 'name', gear),
          el('span', 'tag', gear === current ? 'equipped' : (gear === def ? 'default' : '')),
        );
        row.addEventListener('click', (e) => { e.stopPropagation(); gearPick(gRows.findIndex((r) => r.el === row)); });
        gbd.append(row);
        return { el: row, gear, disabled: false };
      });
      gSel = Math.max(0, gRows.findIndex((r) => r.gear === current));
      gOnPick = onPick;
      gmenu.hidden = false;
      gearRender();
    },
    closeGear: gearClose,
    gearOpen() { return !gmenu.hidden; },
    // returns true when the key was consumed by the menu
    gearKey(code) {
      if (gmenu.hidden) return false;
      if (code === 'KeyW' || code === 'ArrowUp') { gSel = (gSel + gRows.length - 1) % gRows.length; gearRender(); return true; }
      if (code === 'KeyS' || code === 'ArrowDown') { gSel = (gSel + 1) % gRows.length; gearRender(); return true; }
      if (code === 'Enter' || code === 'Space') { gearPick(gSel); return true; }
      if (code === 'Escape' || code === 'KeyE') { gearClose(); return true; }
      const num = /^(?:Digit|Numpad)([1-9])$/.exec(code);
      if (num) { gearPick(Number(num[1]) - 1); return true; }
      return true;   // anything else is swallowed while the menu is up
    },
  };

  // D34 — the reference-bundle viewer (B, [ ]) is CUT from the public build.
  // It fetched /api/poi/<poi> from the bench, which does not exist on a static
  // host: a 404 on every boot and then a "no reference bundle" caption. Every
  // other hidden feature keeps working; this one could not.

  // ---- crosshair
  const cross = el('div', 'phud__cross');
  root.append(cross);

  // ---- pause
  const pause = el('div', 'ppause');
  pause.hidden = true;
  const panel = el('section', 'panel ppause__panel');
  const hd = el('div', 'panel__hd');
  hd.append(el('span', 'lbl lbl--accent', 'paused'), el('span', 'spacer'), el('span', 'lbl', 'red dog chair'));
  const bd = el('div', 'panel__bd ppause__bd');
  const keys = el('div', 'ppause__keys');
  // 'lift' rows only exist for worlds that declare lifts[] — setLiftKey() below
  let liftCap = null, liftWhat = null;
  for (const [cap, what, only] of [
    // THE PAUSE PANEL LISTS FIVE KEYS AND NOTHING ELSE, and it is the same five
    // the intro controls card shows. Greg's line: "nothing else compared to
    // before."
    //
    // ESC leads, and it is listed as SETTINGS rather than 'release cursor' or
    // 'pause': this panel IS the settings screen — it is the only screen the
    // game has — so the row names the destination, not the mechanism. It is
    // also the one row that is true of the panel you are reading it on.
    //
    // What is deliberately NOT here and why:
    //   SPACE / S / A D / W           still work, and a skier finds them in
    //                                 about four seconds without being told
    //   SHIFT                         does nothing on skis in this build at all
    //                                 (play-ski.patch.mjs)
    //   F  ride the chairlift         the contextual prompt under the crosshair
    //                                 at the terminal is what says this, at the
    //                                 moment it is true — which is better than
    //                                 a line in a panel nobody reopens
    //   E / I / G / B / [ ] / F8      hidden features stay undocumented (D34)
    ['ESC', 'settings'],
    ['W A S D', 'move'],
    ['← →', 'tricks in the air'],
    ['C', 'camera'],
    ['R', 'reset'],
  ]) {
    const c = el('div', 'cap', cap), w = el('div', 'what', what);
    if (only === 'lift') { c.classList.add('is-hidden'); w.classList.add('is-hidden'); liftCap = c; liftWhat = w; }
    keys.append(c, w);
  }
  const resume = el('button', 'btn btn--accent ppause__big', 'click to resume');
  resume.type = 'button';
  // The RESPAWN button is gone: the panel already says "R  reset", and a button
  // that duplicates a listed key is one more thing on a screen that is supposed
  // to have four things on it. The button object still exists because onRespawn
  // is part of this function's contract with main.js; it is just not appended.
  const resp = el('button', 'btn btn--ghost', 'respawn');
  resp.type = 'button';
  const rowA = el('div', 'ppause__row'); rowA.append(resume);
  const rowB = el('div', 'ppause__row');
  // D6 — ODbL attribution travels with the deployed artifact, not only with the
  // repo. One line on the intro card, one here.
  const credit = el('div', 'ppause__credit', 'terrain USGS 3DEP · trails © OpenStreetMap contributors (ODbL)');
  bd.append(keys, rowA, rowB, credit);
  panel.append(hd, bd);
  pause.append(panel);
  root.append(pause);

  // ---- personal leaderboard (§4.3). Same panel language as pause and the gear
  // menu, and deliberately absent from the pause panel's key list — double-tap
  // L is the whole secret. main.js owns the keyboard for it; this is the panel.
  const board = el('div', 'pboard');
  board.hidden = true;
  const bpanel = el('section', 'panel pboard__panel');
  const bhd = el('div', 'panel__hd');
  bhd.append(el('span', 'lbl lbl--accent', 'personal best'), el('span', 'spacer'), el('span', 'lbl', 'l l · esc close'));
  const bbd = el('div', 'panel__bd pboard__bd');
  bpanel.append(bhd, bbd);
  board.append(bpanel);
  root.append(board);

  const num = (n) => Math.round(Number(n) || 0).toLocaleString('en-US');
  const boardCols = ['rk', 'sc', 'mu', 'bt', 'sk', 'tr', 'wh'];
  function boardRow(cls, cells) {
    const r = el('div', 'pboard__row' + (cls ? ' ' + cls : ''));
    cells.forEach((c, i) => r.append(el('span', boardCols[i], c)));
    return r;
  }
  function boardRender(list) {
    bbd.textContent = '';
    bbd.append(boardRow('pboard__row--hd', ['#', 'score', 'mult', 'best trick', 'ski', 'trail', 'when']));
    if (!list.length) { bbd.append(el('div', 'pboard__empty', 'no runs banked yet · land a combo')); return; }
    for (const r of list) {
      bbd.append(boardRow(r && r.you ? 'is-you' : '', [
        String(r.rank != null ? r.rank : '—'),
        num(r.score),
        '×' + (r.mult != null ? r.mult : 1),
        r.best || '—',
        r.ski || '—',
        r.trail || '—',            // a run with no trail is a run on the open hill
        r.when || '—',
      ]));
    }
  }
  function boardClose() { board.hidden = true; }
  board.style.pointerEvents = 'auto';
  board.addEventListener('click', (e) => { e.stopPropagation(); boardClose(); });

  pause.style.pointerEvents = 'auto';
  resume.addEventListener('click', (e) => { e.stopPropagation(); onResume && onResume(); });
  resp.addEventListener('click', (e) => { e.stopPropagation(); onRespawn && onRespawn(); });
  pause.addEventListener('click', () => onResume && onResume());

  document.body.appendChild(root);

  let fpsAcc = 0, fpsN = 0, fpsLast = performance.now();
  const fmt = (v) => (v >= 0 ? ' ' : '') + v.toFixed(1);

  // Instruments go dark behind the pause panel — one thing to read at a time —
  // and the player's own readout steps aside for the dev readout, which sits in
  // the same corner. Both switches land here so neither can undo the other.
  let devOn = false;
  function paintInstruments() {
    const paused = !pause.hidden;
    for (const n of [fps, legend, toast, trick, promptEl, fuel, pump, combo, cend, bdot]) n.classList.toggle('is-hidden', paused);
    for (const n of [cross, read]) n.classList.toggle('is-hidden', paused || devOn);
    devRead.classList.toggle('is-hidden', paused);
    devRead.hidden = !devOn;
  }

  return {
    root, pause,
    setPaused(on) {
      pause.hidden = !on;
      if (on) { gearClose(); boardClose(); }     // one modal at a time
      paintInstruments();
    },
    isPaused() { return !pause.hidden; },
    // ---- dev readout, driven by dev.js
    setDev(on) {
      devOn = !!on;
      keyEls.dev.classList.toggle('is-on', devOn);
      paintInstruments();
    },
    devTick(f) {
      for (const k of Object.keys(devRows)) if (f[k] != null) devRows[k].textContent = f[k];
      if (f.params != null) devParams.textContent = f.params;
      if (f.url != null) devFull = f.url;
    },
    // ---- chairlifts (lift.js). setLiftKey decides whether F is even mentioned;
    // setPrompt({ key, text }) / setPrompt(null) is the contextual offer.
    setLiftKey(on) {
      hasLifts = !!on;
      keyEls.lift.classList.toggle('is-hidden', !hasLifts);
      // the pause panel no longer carries an F row, so these two are null; the
      // legend chip and the contextual prompt still do the work.
      if (liftCap) liftCap.classList.toggle('is-hidden', !hasLifts);
      if (liftWhat) liftWhat.classList.toggle('is-hidden', !hasLifts);
    },
    setPrompt(p) {
      if (!p) { promptEl.hidden = true; keyEls.lift.classList.remove('is-on'); return; }
      promptKey.textContent = p.key || 'F';
      promptTxt.textContent = ' ' + (p.text || '');
      promptEl.hidden = false;
      keyEls.lift.classList.add('is-on');
    },
    promptText() { return promptEl.hidden ? null : promptTxt.textContent.trim(); },
    // ---- rocket fuel (boost.js), called every frame. frac 0..1. `worn` is
    // whether the rocket is the equipped gear: it is the only gear that can
    // spend the tank, so it is the only gear that gets a gauge.
    setFuel(frac, isBurning, isDry, worn = true) {
      const f = Math.max(0, Math.min(1, Number(frac) || 0));
      burning = !!isBurning && !!worn;
      inRocket = !!worn;
      fuel.hidden = !worn || (f > 0.999 && !burning);
      if (fuel.hidden) { keyEls.boost.classList.remove('is-on'); return; }
      fuelFill.style.width = (f * 100).toFixed(1) + '%';
      fuel.classList.toggle('is-burn', burning);
      // dry = ran the tank out; the bar stays dim until there is enough to relight
      fuel.classList.toggle('is-dry', !!isDry);
      keyEls.boost.classList.toggle('is-on', burning);
    },
    fuelShown() { return !fuel.hidden; },
    flashGear(mode) {
      toast.textContent = 'gear · ' + mode;
      toast.hidden = false;
      toastT = 1.4;
    },
    ...hudApiGear,
    flash(text) {
      toast.textContent = text;
      toast.hidden = false;
      toastT = 1.4;
    },
    // { name: '360'|'720'|'1080'|'wipeout', deg, why? } — the big centre-screen
    // stamp. `why` is the gear's own verdict: 'landing' when the gear judged the
    // arrival (the wing, the rocket), 'crossed' when the skis went sideways.
    trick(t) {
      const wipe = t.name === 'wipeout';
      trickBig.textContent = wipe ? 'WIPEOUT' : t.name + '!';
      trickSub.textContent = wipe
        ? (t.why === 'landing' ? 'came in too hot' : (t.deg ? t.deg + '° · unfinished' : 'skis crossed'))
        : t.deg + '°';
      trick.classList.toggle('is-wipe', wipe);
      trick.hidden = false;
      trick.classList.remove('is-pop');
      void trick.offsetWidth;               // restart the pop animation
      trick.classList.add('is-pop');
      trickT = 1.8;
    },
    // ---- pump arc (§1.10). { on, q, max, eta, releasing }, every frame.
    // `eta` is last transition's efficiency, so the colour is a verdict on the
    // turn you just finished, not a prediction of the one you are in — which is
    // the only thing that can actually be shown, and the thing worth learning.
    pump(p) {
      const on = !!(p && p.on);
      const now = performance.now();
      const dt = pumpLast ? Math.min(0.1, (now - pumpLast) / 1000) : 0.016;
      pumpLast = now;
      if (!on) { pumpVal = 0; pump.hidden = true; return; }
      const max = Math.max(1e-3, Number(p.max) || 4);
      const raw = Math.max(0, Math.min(1, (Number(p.q) || 0) / max));
      const rel = !!p.releasing;
      // charge tracks the bank exactly; the release drains what was there over
      // pumpReleaseT (0.35 s), because ski.js has already spent it by then
      if (rel) pumpVal = Math.max(raw, pumpVal - dt / 0.35);
      else pumpVal = raw;
      if (pumpVal < 0.004 && !rel) { pump.hidden = true; return; }
      pumpArc.style.setProperty('--pf', (pumpVal * 100).toFixed(1) + 'deg');
      const eta = Number(p.eta);
      const hot = !(eta < 1.2), cold = eta < 0.8;      // NaN before the first transition reads neutral-high
      pump.classList.toggle('is-hot', hot && Number.isFinite(eta));
      pump.classList.toggle('is-cold', cold);
      pump.classList.toggle('is-rel', rel);
      pump.hidden = false;
    },
    pumpShown() { return !pump.hidden; },
    // ---- live combo strip (§3.7). { on, score, mult, count }.
    combo(c) {
      if (!c || !c.on) { combo.hidden = true; return; }
      comboScore.textContent = num(c.score);
      comboMult.textContent = String(c.mult != null ? c.mult : 1);
      const n = Number(c.count) || 0;
      comboN.textContent = n > 0 ? n + (n === 1 ? ' trick' : ' tricks') : '';
      comboN.classList.toggle('is-hidden', n <= 0);
      combo.hidden = false;
    },
    comboShown() { return !combo.hidden; },
    // ---- end-of-combo banner (§3.7). { score, mult, tricks, best, deg, pb }.
    comboEnd(c) {
      if (!c) return;
      const pb = !!c.pb;
      cendCap.textContent = pb ? 'personal best' : (c.best || 'combo');
      cendScore.textContent = num(c.score);
      cendMult.textContent = '×' + (c.mult != null ? c.mult : 1);
      const list = Array.isArray(c.tricks) ? c.tricks.filter(Boolean) : [];
      cendList.textContent = list.join(' · ');
      cendList.classList.toggle('is-hidden', !list.length);
      const deg = Math.round(Number(c.deg) || 0);
      cendSub.textContent = deg ? num(deg) + '°' + (pb && c.best ? ' · ' + c.best : '') : (pb && c.best ? c.best : '');
      cendSub.classList.toggle('is-hidden', !cendSub.textContent);
      cend.classList.toggle('is-pb', pb);
      cend.hidden = false;
      cend.classList.remove('is-pop');
      void cend.offsetWidth;                 // restart the pop, same as the trick stamp
      cend.classList.add('is-pop');
      cendT = 2.4;
    },
    // ---- the secret board (§4.3). An array opens it, null closes it.
    board(list) {
      if (!list) { boardClose(); return; }
      boardRender(Array.isArray(list) ? list : []);
      board.hidden = false;
    },
    boardOpen() { return !board.hidden; },
    closeBoard: boardClose,
    // the breadcrumb: nothing on screen for a new player, a dot for a returning
    // one. Its title is the shortcut, so hovering it is the whole tutorial.
    setBoardDot(on) { bdot.hidden = !on; },
    tick(ctrl, dt, camMode) {
      const p = ctrl.position;
      const gear = ctrl.mode;
      const ski = gear === 'skis', bike = gear === 'bike', glide = gear === 'glider';
      const rocket = gear === 'rocket';
      const riding = gear !== 'boots';
      const sp = ctrl.speed();
      rows.pos.textContent = `${fmt(p.x)} ${fmt(p.y)} ${fmt(p.z)}`;
      rows.spd.textContent = sp.toFixed(2) + ' m/s';
      rows.gear.textContent = gear;
      rows.gear.classList.toggle('is-hot', riding);
      rows.cam.textContent = camMode === 'tp' ? 'chase' : 'first person';
      if (burning) rows.state.textContent = 'BOOST';   // the rocket owns the frame
      else if (glide && !ctrl.grounded) {
        // the wing has five things worth knowing and no room for a panel: which
        // one is currently deciding your fate is the one that gets shown
        const g = gliderState();
        const vy = ctrl.velocity ? ctrl.velocity.y : 0;
        rows.state.textContent =
          g.stall > 0.35 ? 'STALL'
            : g.flare ? 'flare'
              : g.updraft > 0.8 ? 'lift +' + g.updraft.toFixed(1)
                : vy > 0.5 ? 'climb'
                  : vy < -6 ? 'dive'
                    : 'glide · ' + g.airspeed.toFixed(0);
      }
      // coasting the rocket is its own state: no wing, no steering, just the
      // sink rate you are going to have to burn off before you arrive
      else if (rocket && !ctrl.grounded) {
        const vy = ctrl.velocity ? ctrl.velocity.y : 0;
        rows.state.textContent = 'coast · ' + (vy < 0 ? '−' : '+') + Math.abs(vy).toFixed(0);
      }
      else if (!ctrl.grounded) {
        const spin = Math.abs(ctrl.airSpinDeg || 0);
        rows.state.textContent = spin > 45 ? 'air · ' + Math.round(spin) + '°' : 'air';
      }
      else if (ctrl.wipeT > 0) rows.state.textContent = 'wipeout';
      else if (ski) {
        // chatter outranks everything a ski can be doing: it is the ski telling
        // you it has run out of ski, and it is why you would ever pick a longer one
        // ...and everything under it is a detected state rather than a key:
        // S only brakes when it opposes travel (§2.1), and SHIFT is not a ski
        // key at all, so reading the keys would lie on both counts.
        const s = skiState();
        rows.state.textContent = s.chatter > 0.35 ? 'CHATTER'
          : s.stop === 2 ? 'HOCKEY'
            : s.stop === 1 ? 'plow'
              : s.stivoting ? 'stivot'
                : s.releasing ? 'PUMP'
                  : (sp > 3 ? 'carve' : 'skate');
      }
      else if (bike) rows.state.textContent = ctrl.keys.sprint ? 'brake' : (ctrl.keys.jumpHeld ? 'preload' : (ctrl.keys.back ? 'pump' : (sp > 3 ? 'ride' : 'pedal')));
      else rows.state.textContent = ctrl.keys.sprint && sp > 5 ? 'sprint' : 'ground';
      keyEls.move.classList.toggle('is-on', ctrl.keys.forward || ctrl.keys.back || ctrl.keys.left || ctrl.keys.right);
      keyEls.sprint.classList.toggle('is-on', !!ctrl.keys.sprint);
      // SHIFT is the brake on the bike and the sprint on foot — and on SKIS it
      // is nothing at all, so the chip leaves the legend entirely rather than
      // sitting there claiming a job it no longer has.
      keyEls.sprint.classList.toggle('is-hidden', ski);
      keyEls.sprint.lastChild.nodeValue = bike ? 'brake' : 'sprint';
      keyEls.jump.classList.toggle('is-on', !ctrl.grounded);
      keyEls.gear.classList.toggle('is-on', riding);
      // G is the rocket's key and nobody else's, so it is only in the legend
      // when the rocket is on your back
      keyEls.boost.classList.toggle('is-hidden', !(rocket || inRocket));
      keyEls.spin.classList.toggle('is-on', !!(ctrl.keys.spinLeft || ctrl.keys.spinRight));
      keyEls.cam.classList.toggle('is-on', camMode === 'tp');

      if (toastT > 0) { toastT -= dt; if (toastT <= 0) toast.hidden = true; }
      if (trickT > 0) { trickT -= dt; if (trickT <= 0) trick.hidden = true; }
      if (cendT > 0) { cendT -= dt; if (cendT <= 0) cend.hidden = true; }
      fpsAcc += dt; fpsN++;
      const now = performance.now();
      if (now - fpsLast > 400) {
        fpsVal.textContent = fpsAcc > 0 ? String(Math.round(fpsN / fpsAcc)) : '—';
        fpsAcc = 0; fpsN = 0; fpsLast = now;
      }
    },
  };
}
