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
         clamp, smooth, snowLace,
         registerLookLayer, f32, dial, dialSoft, dialColor } from './lib/core.mjs';
import { PAL } from './kit.mjs';

const G_BASE = lin(0x6f6a60);       // shaded granite
const G_LIT = lin(0x9d9482);        // sunlit, sand-bleached
const G_TAN = lin(0x8a7a60);
const G_DARK = lin(0x4d4a44);

// ==================================================== specs/0005 L4 — ROCK
//
// GREY SIERRA GRANITE, AND SNOW THAT SITS WHERE SNOW SITS. Two things, decided
// against the rock lookbook:
//
//   THE GREY. Every rock surface in this world was authored warm — this file's
//   G_TAN plus its iron-staining mix, and kt-rocks.mjs's ROCK_TAN, LICHEN and
//   LICHEN_RUST on top of a brown-grey ROCK. Shot from the chair the Eagle's
//   Nest spires come back the colour of dirt, which is the complaint this layer
//   exists to answer. Palisades rock reads GREY: a cool, near-neutral granite
//   whose interest is tonal, not chromatic.
//
//   THE SNOW, BY SLOPE (ref R7, Carson Peak). Snow collects on low-angle facets
//   and is scoured off steep ones. That is `dot(faceNormal, up)` and nothing
//   else — no noise mask, no raster, no second pass over the geometry — and on
//   flat-shaded, faceted rock it is exactly the read the reference has: white
//   lying on every ledge and plate top, bare stone on every riser and wall.
//
// ------------------------------------------------------- WHY IT IS A SHADER
// The alternative was to rewrite the colour constants above and in kt-rocks.mjs
// and re-bake. Three reasons not to:
//   * `snowLace()` already writes snow into these same vertex colours at build
//     time on a per-TRIANGLE normal, and it is a one-way mix — there is no
//     "how much rock is under this" left to re-grade at 3.4 m of lattice.
//   * a vertex-colour edit is a rebuild per tweak. Greg tunes this layer by
//     name, live, on `__look`, at the pose he is standing in.
//   * the Fingers' vertex colours are load-bearing for work/fin_wind_check.mjs
//     and friends. This layer does not move a vertex or change a byte of the
//     buffers; it is albedo arithmetic in the fragment path of the two ROCK
//     MATERIALS and reaches nothing else in the world.
//
// WHAT IT DOES NOT DO. It does NOT re-enable the bare-rock raster tint. That
// path (terrain.mjs `RASTER_ROCK_TINT`, kt-rocks.mjs `RASTER_OUTCROPS`) stays
// off for deploy parity — the shipped build stubs SECTOR_ROCKS to [] so
// `rockAt()` is 0 there, and Greg prefers that read. specs/0005 L4 says this
// layer SUPERSEDES that tint, and superseding it means the rock look now lives
// where the rock GEOMETRY is instead of where a summer photograph was bare.
//
// ------------------------------------------------------------- WHO GETS IT
// The two rock materials, and only them:
//   `graniteMaterial()` below   -> funitel-granite, funitel-granite-field
//   `rockMaterial()` (kt-rocks) -> kt-eagles-nest (spires, towers, cornice,
//                                  Fingers spine shells + noses),
//                                  kt-rock-field (the flatiron slab bands)
// kt-rocks.mjs imports the three GLSL strings below rather than registering a
// second layer, so there is ONE registration, ONE set of dials and one uniform
// block for both materials. Everything else that is rock-shaped in this world
// (poulsen.mjs's cliff skin and talus, the Red Dog granite-outcrop field) is on
// world.mjs's shared `SOLID` material, which also carries every tree, car and
// building — restyling that would break ground rule 5, so it is out of scope
// and stays as it is.
//
// COST. One float varying, and a fragment block behind a coherent uniform gate.
// With both gains at 0 the block is one compare and the frame is bit-identical
// to a build without the layer, which is the property harness/shader-perf.mjs
// needs to A/B it by writing a dial.

const ROCK_LOOK_ON = 1;
// x ROCK_GRANITE_GAIN, y ROCK_LIFT, z ROCK_MASK_EDGE, w 0.5/ROCK_MASK_FEATHER
const uRock = f32([0.92, 1.35, 0.44, 0]);
// xyz ROCK_COLOR as a HUE-ONLY multiplier (luma-normalised), w unused
const uRockCol = f32([0, 0, 0, 0]);
// x ROCK_SNOW_GAIN, y ROCK_SNOW_SLOPE_EDGE, z 0.5/ROCK_SNOW_FEATHER,
// w ROCK_SNOW_PATCHY
const uRockSnow = f32([0.85, 0.62, 0, 0.55]);
// xyz ROCK_SNOW_COLOR (linear), w unused
const uRockSnowCol = f32([0, 0, 0, 0]);

// how far the rock's colour cast walks to ROCK_COLOR. 0 = the layer's recolour
// is off (and, with ROCK_SNOW_GAIN 0 too, the whole block is skipped).
dial('ROCK_GRANITE_GAIN', uRock, 0);
// a plain multiplier on the recoloured rock's luminance. KT-22's authored rock
// is near-black volcanic and Sierra granite in daylight is not, so the grey has
// to be lifted as well as neutralised. It multiplies, so the tonal structure the
// blotch/bed/grain terms carry survives intact.
dial('ROCK_LIFT', uRock, 1);
// ROCK vs SNOW, on luminance. Every one of these meshes carries snow painted
// into its own vertex colours by snowLace(), and the Fingers' entire spine shell
// IS snow inside the rock mesh — so the layer has to know which fragments are
// stone. Rock in this world tops out near 0.34 linear after its character terms;
// the darkest thing that is snow (the Fingers' shaded nose faces) is 0.56.
dial('ROCK_MASK_EDGE', uRock, 2);
dialSoft('ROCK_MASK_FEATHER', uRock, 3, 0.10);
// the granite itself. Written as sRGB hex, stored LUMA-NORMALISED, so this dial
// is pure cast: changing it cannot change how bright the rock is.
// 0xb0aba3 over 0xa9aeb5: swept at the Eagle's Nest (work/l4_sweep.mjs). A
// neutral-cool grey came back reading as slate under this world's already-cool
// shadow tint; Sierra granite is a HAIR warm of neutral and needs to be
// authored that way to survive the light.
dialColor('ROCK_COLOR', uRockCol, 0, 0xb0aba3, { norm: 'luma' });

// how white the slope-gated snow goes at full coverage
dial('ROCK_SNOW_GAIN', uRockSnow, 0);
// dot(faceNormal, up) at which coverage is half. 0.62 is ~52 deg from
// horizontal: plate tops and ledges (they lie with the dip, ~25 deg) take snow,
// risers, walls and the spires' own flanks do not.
dial('ROCK_SNOW_SLOPE_EDGE', uRockSnow, 1);
// half-width of that edge, in the same dot units. 0.20 puts the ramp between
// ~65 deg (bare) and ~35 deg (covered).
dialSoft('ROCK_SNOW_FEATHER', uRockSnow, 2, 0.20);
// coverage break-up off the material's own low-frequency blotch field, so a
// long ledge is drifted rather than evenly painted. 0 = uniform coverage.
dial('ROCK_SNOW_PATCHY', uRockSnow, 3);
dialColor('ROCK_SNOW_COLOR', uRockSnowCol, 0, 0xeaf1fb);

// ------------------------------------------------------------- the GLSL
// Three fragments, spliced by each rock material into its OWN shader rather
// than into a shared THREE.ShaderChunk. That is the whole reason this layer
// costs nothing outside the rock: <color_fragment> is included by every lit
// material in the world, and patching the chunk would put this block on the
// trees, the lifts, the buildings and 1.88 M triangles of terrain to be gated
// off per fragment. Both rock materials already own an onBeforeCompile.

/** goes before the vertex shader body */
export const ROCK_LOOK_PARS_VERT = 'varying float vRockUp;\n';

/** goes just before `#include <project_vertex>`.
 *
 *  OBJECT SPACE, NOT WORLD. `objectNormal` is in this world's own ENU (z-up)
 *  frame, and the bench player tips the whole scene into a y-up wrapper group —
 *  so a world-space or view-space "up" would read differently in play than on
 *  the standalone page, which is the same trap granite's `vGOP` avoids by being
 *  object-space (see the FRAME NOTE at the top of this file).
 *
 *  IT IS THE FACE NORMAL, EXACTLY. Every buffer these two materials render is
 *  NON-INDEXED and gets `computeVertexNormals()` in `toGeo()`, so all three
 *  vertices of a triangle carry that triangle's own normal and the interpolant
 *  is constant across the face — which is what makes a single float varying a
 *  faithful `dot(n, up)` on flat-shaded rock. */
export const ROCK_LOOK_VERT = 'vRockUp = objectNormal.z;\n';

/** the uniform + varying declarations, prepended to the fragment shader */
export const ROCK_LOOK_PARS_FRAG = `
varying float vRockUp;
uniform vec4 uRock;         // x ROCK_GRANITE_GAIN y ROCK_LIFT z MASK_EDGE w 0.5/MASK_FEATHER
uniform vec4 uRockCol;      // rgb ROCK_COLOR, luma-normalised (hue only)
uniform vec4 uRockSnow;     // x GAIN y SLOPE_EDGE z 0.5/FEATHER w PATCHY
uniform vec4 uRockSnowCol;  // rgb ROCK_SNOW_COLOR
`;

/**
 * The body. Spliced at the END of each material's own character block, so the
 * grey lands on top of that material's blotch/bed/grain/lichen/staining and
 * neutralises them instead of fighting them a line earlier.
 *
 * @param patch  an expression for a 0..1 low-frequency world-space field in
 *               scope at the splice point — both materials call theirs
 *               `blotch`. Passed in rather than assumed so the dependency is
 *               written at both call sites.
 */
export const ROCK_LOOK_FRAG = (patch) => `
         // -------------------------------- specs/0005 L4 — GREY GRANITE + SNOW
         // GATE 0. A uniform branch: it takes the same side for every fragment
         // of every draw, so it costs one coherent compare, and with both gains
         // at 0 this layer is a BIT-EXACT no-op against a build without it.
         // That is what lets harness/shader-perf.mjs price it by writing a dial
         // instead of by rebuilding the page.
         if ( uRock.x + uRockSnow.x > 0.0 ) {
           float rLum = dot( diffuseColor.rgb, vec3( 0.2126, 0.7152, 0.0722 ) );
           float rMask = 1.0 - clamp( ( rLum - uRock.z ) * uRock.w + 0.5, 0.0, 1.0 );
           if ( rMask > 0.0 ) {
             if ( uRock.x > 0.0 ) {
               // HUE ONLY: uRockCol is luma-normalised, so this replaces the
               // colour CAST and keeps the luminance structure every character
               // term above just wrote. ROCK_LIFT then walks the result toward
               // daylight granite.
               diffuseColor.rgb = mix( diffuseColor.rgb,
                 ( rLum * uRock.y ) * uRockCol.rgb, rMask * uRock.x );
             }
             if ( uRockSnow.x > 0.0 ) {
               // SLOPE-GATED SNOW. The house-style hard edge — a clamp against a
               // precomputed reciprocal half-width, not a smoothstep (see
               // lib/core.mjs dialSoft): these edges are meant to be crisp and
               // the fragment path never divides.
               float cov = clamp( ( vRockUp - uRockSnow.y ) * uRockSnow.z + 0.5, 0.0, 1.0 );
               cov *= 1.0 - uRockSnow.w * ${patch};
               diffuseColor.rgb = mix( diffuseColor.rgb, uRockSnowCol.rgb,
                 cov * uRockSnow.x * rMask );
             }
           }
         }`;

if (ROCK_LOOK_ON) {
  registerLookLayer({
    id: 'L4-rock',
    uniforms: {
      uRock: { value: uRock },
      uRockCol: { value: uRockCol },
      uRockSnow: { value: uRockSnow },
      uRockSnowCol: { value: uRockSnowCol },
    },
    // No `chunks`. This layer's GLSL is spliced into the two rock materials
    // below and in kt-rocks.mjs, not into a shared THREE.ShaderChunk — see the
    // note above ROCK_LOOK_PARS_VERT. The registration is still what puts the
    // four uniforms into every ShaderLib entry (which is what makes them
    // present on the two materials' clones) and what puts 'L4-rock' on
    // `__look.layers()` for the perf tool to find.
  });
}

// --------------------------------------------------------------- the material
// One shared material for every granite mesh in the world — sand-harbor's
// `graniteMaterial` minus the waterline and the submerged tint, plus the
// horizontal exfoliation joint that is the Sierra's signature.
export function graniteMaterial(THREE) {
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  mat.customProgramCacheKey = () => 'pal-granite-1';
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = 'varying vec3 vGOP;\n' + ROCK_LOOK_PARS_VERT + shader.vertexShader.replace(
      '#include <project_vertex>',
      `vGOP = transformed;
       ${ROCK_LOOK_VERT}
       #include <project_vertex>`,
    );
    shader.fragmentShader = ROCK_LOOK_PARS_FRAG + `
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
${ROCK_LOOK_FRAG('blotch')}
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
