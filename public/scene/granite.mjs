// THE GRANITE THE FUNITEL FLIES OVER.
//
// Greg: "photos of the whole funitel line as it goes up including the rocks etc".
// views 15 and 34 are the evidence — view-15 is five cabins strung down past an
// ORANGE GRANITE OUTCROP, view-34 is the mid-line section with cabins passing on
// the down-line against the rock. It is the one thing you look at for the eight
// and a half minutes of the ride and increment 1 built none of it.
//
// The DEM already has the landform: `work/_line.mjs` profiles the line and finds
// 35-40 deg mean over 8 m from t = 0.55 to t = 0.70 — the wall between the valley
// and the Gold Coast bench, the steepest ground on the line and the steepest in
// dem-tight-e. What it does NOT have is anything that reads as ROCK: the
// promoted `funitel` sector is a 34 m swath at 5.5 m and everything either side
// of it is the 34 m/px upper dem-wide surround, on which a granite bluff is
// three vertices. So the rock is built as geometry over the ground the DEM
// already establishes, exactly the way KT-22's identity layer is.
//
// TWO THINGS MAKE IT READ AS SIERRA GRANITE RATHER THAN GREY LUMPS:
//
//  1. SHEETS, NOT SPIRES. KT-22 is near-black volcanic and gets tiered towers
//     (kt-rocks.mjs). Palisades granite exfoliates: it comes off in broad, flat,
//     slightly tilted slabs stacked on each other with the joints running
//     through. `slabGeo` stacks 3-6 wide low prisms with a shared tilt, so the
//     silhouette is a stepped ramp and the joints are horizontal.
//  2. THE MATERIAL, which is the sand-harbor `rocks.js` pattern — the house
//     style for granite in this lab — with the lake terms taken out and an
//     exfoliation-joint term put in. Blotch, grain and sparkle in world space so
//     a boulder you stand on has grain; biotite flecks for the black speckle;
//     iron staining in the low blotches, which is view-15's "orange".
//
// FRAME NOTE, and it matters. The pattern is keyed off OBJECT space, not
// `modelMatrix * transformed`. Every mesh this module makes is added at identity
// inside the world's own ENU (z-up) scene, so object space IS world ENU — but
// the bench player tips the whole scene into a y-up wrapper group, which would
// silently rotate a modelMatrix-keyed pattern by 90 deg between the orbit page
// and live play. Object space is the same in both.

import { buf, appendBuf, prism, makeRng, rr, ri, lin, mixc, scalec, jitc,
         clamp, smooth, snowLace } from './lib/core.mjs';
import { PAL } from './kit.mjs';

const G_BASE = lin(0x6f6a60);       // shaded granite
const G_LIT = lin(0x9d9482);        // sunlit, sand-bleached
const G_TAN = lin(0x8a7a60);
const G_DARK = lin(0x4d4a44);

// --------------------------------------------------------------- the material
// One shared material for every granite mesh in the world — sand-harbor's
// `graniteMaterial` minus the waterline and the submerged tint, plus the
// horizontal exfoliation joint that is the Sierra's signature.
export function graniteMaterial(THREE) {
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  mat.customProgramCacheKey = () => 'pal-granite-1';
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = 'varying vec3 vGOP;\n' + shader.vertexShader.replace(
      '#include <project_vertex>',
      `vGOP = transformed;
       #include <project_vertex>`,
    );
    shader.fragmentShader = `
      varying vec3 vGOP;
      float pghash(vec3 p){ p = fract(p * 0.3183099 + vec3(0.71,0.113,0.419)); p *= 17.0;
        return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
      float pgn(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(mix(pghash(i), pghash(i + vec3(1,0,0)), f.x),
                       mix(pghash(i + vec3(0,1,0)), pghash(i + vec3(1,1,0)), f.x), f.y),
                   mix(mix(pghash(i + vec3(0,0,1)), pghash(i + vec3(1,0,1)), f.x),
                       mix(pghash(i + vec3(0,1,1)), pghash(i + vec3(1,1,1)), f.x), f.y), f.z); }
    ` + shader.fragmentShader.replace(
      '#include <color_fragment>',
      `#include <color_fragment>
       {
         // snow is painted into the vertex colours by snowLace; leave it alone
         float lum = dot( diffuseColor.rgb, vec3( 0.2126, 0.7152, 0.0722 ) );
         float rocky = 1.0 - smoothstep( 0.34, 0.62, lum );
         float gd = length( vViewPosition );
         // fine grain is pointless past ~110 m and only buys aliasing
         float near = 1.0 - smoothstep( 30.0, 110.0, gd );
         float blotch = pgn( vGOP * 0.42 );
         float grain  = pgn( vGOP * 3.9 );
         float sparkle = pgn( vGOP * 17.0 );
         // EXFOLIATION. Sierra granite sheds in near-horizontal sheets; the
         // joint is a dark line every ~2 m of height that wraps the mass.
         float joint = pgn( vec3( vGOP.x * 0.045, vGOP.y * 0.045, vGOP.z * 0.62 ) );
         float g = ( blotch  - 0.5 ) * 0.24
                 + ( joint   - 0.5 ) * 0.30
                 + ( grain   - 0.5 ) * 0.36 * ( 0.35 + 0.65 * near )
                 + ( sparkle - 0.5 ) * 0.30 * near;
         diffuseColor.rgb *= 1.0 + g * rocky;
         // biotite flecks — the black speckle that says granite up close
         diffuseColor.rgb *= 1.0 - smoothstep( 0.79, 0.96, sparkle ) * 0.32 * near * rocky;
         // IRON STAINING in the low blotches: view-15's "orange granite outcrop"
         diffuseColor.rgb = mix( diffuseColor.rgb,
             diffuseColor.rgb * vec3( 1.30, 1.02, 0.74 ),
             smoothstep( 0.56, 0.90, blotch ) * 0.58 * rocky );
         // and the cool grey of the shaded flanks
         diffuseColor.rgb = mix( diffuseColor.rgb,
             diffuseColor.rgb * vec3( 0.88, 0.94, 1.08 ),
             smoothstep( 0.40, 0.06, blotch ) * 0.36 * rocky );
         // sun-bleached crowns, keyed on the joint field so it follows the sheets
         diffuseColor.rgb *= 1.0 + 0.10 * smoothstep( 0.62, 0.95, joint ) * rocky;
       }`,
    );
  };
  return mat;
}

// ------------------------------------------------------------------- one mass
// Stacked sheets. `tilt` is shared across the stack so the whole mass leans the
// way the bedding does, which is what makes it read as one rock rather than a
// pile of separate ones.
//
// SNOW IS THE TRAP HERE, and the first cut fell straight into it. `snowLace`
// whitens up-facing faces, and a stack of wide flat sheets is ALMOST ENTIRELY
// up-facing faces — so at the KT field's own 0.55 amount every bluff came back
// as a white lump indistinguishable from the snow it stands in, which is the
// exact opposite of "make it READ as rock". view-68 is the check: a broad
// TAN-BUFF dome with snow only in its benches and gullies. 0.18, and the
// masses are wider and lower so there is a flank to see.
export function slabGeo(B, rng, x, y, z, { r = 7, h = 5, tiers = 4, snow = 0.18 } = {}) {
  const B2 = buf();
  const tx = rr(rng, -0.22, 0.22), ty = rr(rng, -0.22, 0.22);
  const yaw0 = rr(rng, 0, 6.283);
  let cz = z, cr = r;
  for (let t = 0; t < tiers; t++) {
    const th = (h / tiers) * rr(rng, 0.7, 1.5);
    // sheets are WIDE and LOW and each one is a little smaller than the last
    const band = t % 2
      ? mixc(G_BASE, G_TAN, rr(rng, 0.15, 0.55))
      : mixc(G_BASE, G_DARK, rr(rng, 0.10, 0.45));
    prism(B2, rng, {
      x: cx(cz), y: cy(cz), z: cz, r: cr, h: th, sides: ri(rng, 6, 8),
      taper: rr(rng, 0.72, 0.95), jit: 0.30, yaw: yaw0 + t * 0.4,
      tiltX: tx * th * 2.2, tiltY: ty * th * 2.2,
      col: jitc(band, rng, 0.16),
      colTop: jitc(mixc(G_LIT, G_TAN, rr(rng, 0, 0.4)), rng, 0.14),
    });
    cz += th * rr(rng, 0.72, 0.92);
    cr *= rr(rng, 0.66, 0.86);
  }
  snowLace(B2, { snow: PAL.snow, lo: 0.46, hi: 0.90, amount: snow, patchy: 0.35,
                 seed: (x * 17 + y * 5) | 0 });
  appendBuf(B, B2);
  function cx(zz) { return x + tx * (zz - z); }
  function cy(zz) { return y + ty * (zz - z); }
}

// ----------------------------------------------------- the mid-line bluff band
/**
 * Granite along the Funitel corridor, placed off the DEM's own steepness.
 *
 * @param pts     the lift's plan polyline, world ENU
 * @param gz      groundZ(x, y)
 * @param slopeAt slopeAt(x, y, h) in degrees
 * @param canopyAt canopyAt(x, y) 0..1, -1 where unknown
 * @param rockAt  bare-rock fraction 0..1 from the summer aerials
 * @param masksAt piste masks — nothing is built on a groomed corridor
 */
export function buildFunitelGranite(pts, { gz, slopeAt, canopyAt, rockAt, masksAt,
                                           hero = 44, field = 210 } = {}) {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) {
    cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  }
  const L = cum[cum.length - 1];
  const at = (s) => {
    s = clamp(s, 0, L);
    let i = 1;
    while (i < cum.length - 1 && cum[i] < s) i++;
    const t = (s - cum[i - 1]) / ((cum[i] - cum[i - 1]) || 1);
    const dx = pts[i][0] - pts[i - 1][0], dy = pts[i][1] - pts[i - 1][1];
    const d = Math.hypot(dx, dy) || 1;
    return { x: pts[i - 1][0] + dx * t, y: pts[i - 1][1] + dy * t, nx: -dy / d, ny: dx / d };
  };

  // How much rock does a point deserve? Slope is the spine of it, because the
  // bluffs ARE the steep ground; the aerial's own bare-rock read and a missing
  // canopy add to it.
  const score = (x, y) => {
    const m = masksAt(x, y);
    if (m.groom > 0.22 || m.pave > 0.08 || m.pack > 0.2 || m.cat > 0.25) return 0;
    const sl = slopeAt(x, y, 7);
    let can = canopyAt(x, y);
    if (can < 0) can = 0.25;
    const bare = 1 - clamp(can, 0, 1);
    const rk = clamp(rockAt(x, y), 0, 1);
    return clamp(smooth(24, 40, sl) * (0.30 + 0.70 * bare) + rk * 0.85, 0, 1);
  };

  const B = buf();          // the hero band — collidable
  const F = buf();          // the scatter — not
  const rng = makeRng('funitel-granite');
  const hits = [];
  let nHero = 0, nField = 0;

  // ---- HERO: the bluffs the line actually crosses, t 0.42 -> 0.80, within
  // 110 m of the corridor. These are the masses a cabin passes at 20-40 m and
  // the ones view-34 is looking at, so they are big and they are collidable —
  // if you get out of the lift line on foot you can stand on them.
  // FEWER AND BIGGER than the first cut's 44. view-68 is ONE broad dome under
  // the line, not a scree of forty; a bluff you can see from a cabin 40 m up has
  // to be 20-40 m across, and forty of those would be a boulder field.
  for (let i = 0; i < 90000 && nHero < hero; i++) {
    const s = rr(rng, 0.40 * L, 0.82 * L);
    const off = (rng() < 0.5 ? -1 : 1) * rr(rng, 16, 120);
    const p = at(s);
    const x = p.x + p.nx * off, y = p.y + p.ny * off;
    const sc = score(x, y);
    if (sc < 0.34 || rng() > sc) continue;
    if (hits.some((q) => Math.hypot(q[0] - x, q[1] - y) < 34)) continue;
    const r = rr(rng, 12, 24) * (0.75 + sc * 0.5);
    const h = rr(rng, 4.5, 9.5) * (0.7 + sc * 0.7);
    slabGeo(B, rng, x, y, gz(x, y) - h * 0.5, {
      r, h, tiers: ri(rng, 2, 4), snow: 0.12 + 0.14 * rng(),
    });
    hits.push([x, y]);
    nHero++;
  }

  // ---- FIELD: smaller stuff over the whole line, so the bluff band is the
  // climax of a rocky corridor rather than an island of boulders in clean snow.
  for (let i = 0; i < 160000 && nField < field; i++) {
    const s = rr(rng, 0.14 * L, 0.94 * L);
    const off = (rng() < 0.5 ? -1 : 1) * rr(rng, 12, 190);
    const p = at(s);
    const x = p.x + p.nx * off, y = p.y + p.ny * off;
    const sc = score(x, y);
    if (sc < 0.20 || rng() > sc * 0.85) continue;
    const r = rr(rng, 2.2, 6.4) * (0.7 + sc * 0.6);
    const h = rr(rng, 1.2, 3.4) * (0.7 + sc * 0.7);
    slabGeo(F, rng, x, y, gz(x, y) - h * 0.55, {
      r, h, tiers: ri(rng, 2, 3), snow: 0.22 + 0.20 * rng(),
    });
    nField++;
  }

  return { hero: B, field: F, nHero, nField, L };
}
