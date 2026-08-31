// Trail signs and terminal lettering.
//
// The one place this world uses textures: a 2D canvas is painted at build time
// (no fetch, no external asset) and handed to a CanvasTexture. Run names are
// the cheapest possible way to make a ski world legible — you stand at the top
// of a corridor and the board tells you it is RED DOG FACE.

const DIFF = {
  black: { shape: 'diamond', fill: '#141414' },
  blue: { shape: 'square', fill: '#1d5fb4' },
  green: { shape: 'circle', fill: '#217a3c' },
  // TWO diamonds, and the rating is sourced rather than stylistic: Trailforks
  // lists POULSEN'S GULLY as double-black, and the ledger records the date the
  // rating changed from the uploader's own edit — "EDIT 11/19/22: There is now a
  // double diamond rating!" (RED-DOG-GUIDED.md §5). So pre-2022 footage and maps
  // showing a single diamond are not wrong, they are older, and the world models
  // the current mountain (COMPOSING rule 4: recency wins for man-made things).
  double: { shape: 'double', fill: '#141414' },
};

function canvas(w, h) {
  const c = (typeof document !== 'undefined' && document.createElement)
    ? document.createElement('canvas')
    : (typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(w, h) : null);
  if (!c) return null;
  c.width = w; c.height = h;
  return c;
}

function fit(ctx, text, maxW, start, family) {
  let px = start;
  do {
    ctx.font = `700 ${px}px ${family}`;
    if (ctx.measureText(text).width <= maxW) break;
    px -= 2;
  } while (px > 10);
  return px;
}

// A resort trail board: white face, black border, difficulty badge, run name.
export function trailBoardTexture(THREE, name, diff) {
  const W = 512, H = 168;
  const c = canvas(W, H);
  if (!c) return null;
  const g = c.getContext('2d');
  g.fillStyle = '#f2f2ee'; g.fillRect(0, 0, W, H);
  g.strokeStyle = '#1a1a1a'; g.lineWidth = 9; g.strokeRect(4.5, 4.5, W - 9, H - 9);
  const d = DIFF[diff] || DIFF.black;
  g.fillStyle = d.fill;
  const cx = 76, cy = H / 2, r = 42;
  const diamond = (px, py, rr) => {
    g.beginPath();
    g.moveTo(px, py - rr); g.lineTo(px + rr * 0.82, py);
    g.lineTo(px, py + rr); g.lineTo(px - rr * 0.82, py);
    g.closePath(); g.fill();
  };
  if (d.shape === 'double') {
    // two overlapping diamonds, drawn a little smaller so the pair occupies the
    // same badge area a single diamond does and the name still fits
    const rr = r * 0.80;
    diamond(cx - rr * 0.46, cy, rr);
    diamond(cx + rr * 0.46, cy, rr);
  } else if (d.shape === 'diamond') {
    diamond(cx, cy, r);
  } else {
    g.beginPath();
    if (d.shape === 'square') g.rect(cx - r * 0.78, cy - r * 0.78, r * 1.56, r * 1.56);
    else g.arc(cx, cy, r * 0.8, 0, Math.PI * 2);
    g.closePath(); g.fill();
  }
  const fam = 'Helvetica,Arial,sans-serif';
  const words = name.split(' ');
  // Two-word names wrap too once they are long enough that a single line would
  // shrink to nothing — SCHIMMELPFENNIG BOWL is 20 characters and was landing at
  // ~17 px on a 512 px board. 14 is the threshold that leaves CHAMPS ELYSEES and
  // SECRET GARDEN on one line, exactly as they already shipped.
  const wrap = words.length > 2 || (words.length === 2 && name.length > 14);
  const lines = wrap
    ? [words.slice(0, Math.ceil(words.length / 2)).join(' '), words.slice(Math.ceil(words.length / 2)).join(' ')]
    : [name];
  g.fillStyle = '#141414'; g.textBaseline = 'middle'; g.textAlign = 'left';
  if (lines.length === 1) {
    const px = fit(g, name, W - 170, 62, fam);
    g.font = `700 ${px}px ${fam}`;
    g.fillText(name, 140, H / 2 + 2);
  } else {
    const px = Math.min(fit(g, lines[0], W - 170, 52, fam), fit(g, lines[1], W - 170, 52, fam));
    g.font = `700 ${px}px ${fam}`;
    g.fillText(lines[0], 140, H / 2 - px * 0.60);
    g.fillText(lines[1], 140, H / 2 + px * 0.60);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// Terminal flank: RED DOG on white sheet metal, with the Leitner-Poma mark.
export function terminalTexture(THREE, name) {
  const W = 1024, H = 168;
  const c = canvas(W, H);
  if (!c) return null;
  const g = c.getContext('2d');
  g.fillStyle = '#eef0f2'; g.fillRect(0, 0, W, H);
  g.fillStyle = '#d9dde0'; g.fillRect(0, H - 16, W, 16);
  const fam = 'Helvetica,Arial,sans-serif';
  g.fillStyle = '#1b1d20'; g.textBaseline = 'middle'; g.textAlign = 'left';
  const px = fit(g, name, W * 0.46, 96, fam);
  g.font = `700 ${px}px ${fam}`;
  g.fillText(name, W * 0.16, H / 2);
  // Leitner-Poma: red chevron over black wordmark
  g.fillStyle = '#c8102e';
  g.beginPath(); g.moveTo(W * 0.70, H * 0.52); g.lineTo(W * 0.745, H * 0.28);
  g.lineTo(W * 0.79, H * 0.52); g.lineTo(W * 0.762, H * 0.52);
  g.lineTo(W * 0.745, H * 0.40); g.lineTo(W * 0.728, H * 0.52); g.closePath(); g.fill();
  g.fillStyle = '#1b1d20'; g.font = `700 26px ${fam}`;
  g.fillText('LEITNER', W * 0.70, H * 0.66);
  g.fillStyle = '#c8102e';
  g.fillText('POMA', W * 0.70, H * 0.83);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// A plain WORDMARK panel — light letters on a solid ground, no maker's badge.
//
// The generic `terminalTexture` above carries a Leitner-Poma badge, which is
// right for the Red Dog pod (view-3 reads POMA on the Headwall Express base) and
// WRONG on the Funitel, a 1998 Garaventa. It is also sized off the shed's own
// length: at the funitel's 51 m that produced a 46 m billboard across the front
// of the village, which is what the first render of the rebuilt base terminal
// showed. This is what the Funitel actually carries — FUNITEL in white on the
// green roof-end panel, and nothing else on the building (view-36).
// H IS A POWER OF TWO ON PURPOSE. At 290 this board renders PURE BLACK under
// the render harness's software path (`work/shoot.py` runs bundled chromium with
// `--use-angle=gl --enable-unsafe-swiftshader`) while rendering correctly in real
// Chrome — 1024 x 290 with mipmaps is the classic NPOT failure and it cost an
// hour to corner. 1024 x 256, mipmaps off, LinearFilter: identical in both.
export function wordmarkTexture(THREE, name, fg = '#f2f5f7', bg = '#1f6b45') {
  const W = 1024, H = 256;
  const c = canvas(W, H);
  if (!c) return null;
  const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  const fam = 'Helvetica,Arial,sans-serif';
  g.fillStyle = fg; g.textBaseline = 'middle'; g.textAlign = 'center';
  const px = fit(g, name, W * 0.88, 190, fam);
  g.font = `700 ${px}px ${fam}`;
  g.fillText(name, W / 2, H * 0.53);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.generateMipmaps = false;
  t.minFilter = THREE.LinearFilter;
  t.anisotropy = 4;
  return t;
}

// A board mesh on the +v side, sized in metres.
// `unlit` swaps the Lambert board for a MeshBasicMaterial. The Lambert one came
// back a PURE BLACK rectangle (0,0,0) on the Funitel's roof-end panel while the
// identical call renders the chairlift terminal boards correctly — the texture
// itself probes green (mean 65,129,98) on the mesh's own material, so whatever
// the cause it is in the lit path and not in the sign. A wordmark on a painted
// panel wants no shading anyway: it is paint, and it should read the same colour
// from every angle.
export function boardMesh(THREE, tex, w, h, { doubleSided = true, unlit = false } = {}) {
  const geo = new THREE.PlaneGeometry(w, h);
  const side = doubleSided ? THREE.DoubleSide : THREE.FrontSide;
  const mat = unlit
    ? new THREE.MeshBasicMaterial({ map: tex, side })
    : new THREE.MeshLambertMaterial({
      map: tex, side,
      color: 0x9aa4b0, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.62,
    });
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = false; m.receiveShadow = false;
  return m;
}

// Place a board upright at `pos` with its face pointing along the horizontal
// unit vector (nx, ny). PlaneGeometry faces local +Z, so lookAt does the work —
// no Euler-order guessing, which is what put the terminal lettering edge-on.
export function faceBoard(THREE, mesh, pos, nx, ny) {
  mesh.position.set(pos[0], pos[1], pos[2]);
  mesh.up.set(0, 0, 1);
  mesh.lookAt(pos[0] + nx, pos[1] + ny, pos[2]);
  return mesh;
}
