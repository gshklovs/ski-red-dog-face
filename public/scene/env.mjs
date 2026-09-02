// Sky, light and cloud, and — since specs/0005 L2 — the ATMOSPHERE AND LIGHT
// shader look. No ShaderMaterial anywhere — the dome is a vertex-coloured
// BackSide sphere, which sidesteps the tone-mapping / colour-space include trap
// entirely.

import { buf, tri, quad, prism, makeRng, rr, ri, lin, mixc, scalec, clamp, smooth, toGeo,
         registerLookLayer, f32, dial, dialVec, dialSoft, halfInv,
         dialColor, dialColorArray, LOOK, definePresets } from './lib/core.mjs';
import { SUN_AZ, SUN_EL, SUN_DIR } from './terrain.mjs';

// Warm low sun + a strongly blue sky dome. Because the terrain's vertex colour
// is albedo (see terrain.mjs), THIS is what makes a sunlit slope read warm
// white and a north-facing one read blue — the whole point of the palette.
//
// world.mjs constructs the DirectionalLight and the HemisphereLight out of this
// object and never hands them back, so these five are ALSO live dials
// (SUN_COLOR / SUN_INTENSITY / AMB_SKY / AMB_GROUND / AMB_INTENSITY, below):
// a write lands here AND on the light, and a write that happens before the
// world is built simply changes what world.mjs reads. specs/0024 §2.
export const SUN = {
  dir: SUN_DIR,
  color: 0xfff0d8,
  intensity: 2.15,
  ambSky: 0x8fb6e8,
  ambGround: 0xdfe9f4,
  ambIntensity: 1.48,
};

// deep winter blue overhead falling to a pale horizon.
//
// The four stops are dials too (specs/0024 §2) — they live as LINEAR rgb in one
// Float32Array so `dialColor` can own them, and moving any of them repaints the
// dome's vertex-colour attribute (`repaintSky`). This is the one non-uniform
// write in the look system: ~1025 vertices, once per change, never per frame.
const uSky = f32(new Array(12).fill(0));
dialColor('SKY_TOP', uSky, 0, 0x3d7ec9);
dialColor('SKY_MID', uSky, 3, 0x8dbbe8);
dialColor('SKY_HORIZON', uSky, 6, 0xdfeaf7);
dialColor('SKY_LOW', uSky, 9, 0xc9d9ea);
const skyStop = (i) => [uSky[i], uSky[i + 1], uSky[i + 2]];

// The warm bloom the dome carries around the sun BEARING (not its elevation —
// see the preset table). It is the fifth thing the dome is made of and the one
// an evening sky leans on hardest, so it is a dial like the other four.
let SKY_SUN_GLOW = 0xffe9c8;
let SKY_SUN_GLOW_AMOUNT = 0.35;

// --------------------------------------------------- the dome and the lights
// specs/0024 §2. Neither of these is a shader uniform, so neither can ride the
// Float32Array trick: the dome is a vertex-colour attribute and the lights are
// two objects world.mjs owns. Both are given the same LOOK.NAME surface anyway,
// because a preset is a table of dial names and a look that lives half on
// __look and half in a constant is not tunable.
//
// The lights are found LAZILY off the dome's parent. world.mjs adds the dome
// and both lights to the same scene and returns none of them, and world.mjs is
// not this spec's territory — so `skyMesh.parent` is the scene, and one
// traverse finds them. A write that lands BEFORE the world is built needs none
// of this: it changes SUN, and world.mjs then constructs the lights from it.
let lightsFor = null, sunLight = null, hemiLight = null;
function lights() {
  const scene = skyMesh && skyMesh.parent;
  if (!scene) return null;
  if (lightsFor !== scene) {
    lightsFor = scene; sunLight = null; hemiLight = null;
    scene.traverse((o) => {
      if (!sunLight && o.isDirectionalLight) sunLight = o;
      if (!hemiLight && o.isHemisphereLight) hemiLight = o;
    });
  }
  return (sunLight || hemiLight) ? { sun: sunLight, hemi: hemiLight } : null;
}

/** LOOK.NAME <-> SUN[key], written through to the live light when there is one. */
function lightDial(name, key, apply) {
  Object.defineProperty(LOOK, name, {
    get: () => SUN[key],
    set: (v) => { SUN[key] = v; const L = lights(); if (L) apply(L, v); },
    enumerable: true, configurable: true,
  });
}
// `setHex(hex)` is exactly what `new THREE.DirectionalLight(hex)` does with it,
// so a dialled colour and a constructed one land in the same working space.
lightDial('SUN_COLOR', 'color', (L, v) => { if (L.sun) L.sun.color.setHex(v); });
lightDial('SUN_INTENSITY', 'intensity', (L, v) => { if (L.sun) L.sun.intensity = v; });
lightDial('AMB_SKY', 'ambSky', (L, v) => { if (L.hemi) L.hemi.color.setHex(v); });
lightDial('AMB_GROUND', 'ambGround', (L, v) => { if (L.hemi) L.hemi.groundColor.setHex(v); });
lightDial('AMB_INTENSITY', 'ambIntensity', (L, v) => { if (L.hemi) L.hemi.intensity = v; });

// the dome's own dials, wrapped so any write repaints it. `dialColor` has no
// change hook and lib/core.mjs's dial constructors are not this spec's
// territory, so the descriptor it installed is re-wrapped here instead.
Object.defineProperty(LOOK, 'SKY_SUN_GLOW', {
  get: () => SKY_SUN_GLOW,
  set: (v) => { SKY_SUN_GLOW = v; repaintSky(); }, enumerable: true, configurable: true,
});
Object.defineProperty(LOOK, 'SKY_SUN_GLOW_AMOUNT', {
  get: () => SKY_SUN_GLOW_AMOUNT,
  set: (v) => { SKY_SUN_GLOW_AMOUNT = +v; repaintSky(); }, enumerable: true, configurable: true,
});
for (const n of ['SKY_TOP', 'SKY_MID', 'SKY_HORIZON', 'SKY_LOW']) {
  const d = Object.getOwnPropertyDescriptor(LOOK, n);
  Object.defineProperty(LOOK, n, { ...d, set: (v) => { d.set(v); repaintSky(); } });
}

// ============================================================ L2 — ATMOSPHERE
// specs/0005, decided against reference A1 (Firewatch). Two changes, both of
// them REPLACEMENTS rather than additions — no new pass, no new material, no
// new geometry, no new texture:
//
//   BANDED RIDGE FOG replaces the single smooth `THREE.Fog` ramp. A ridge no
//   longer fades continuously into the haze; it is stamped flat in ONE of
//   FOG_BAND_COUNT discrete depth bands, each cooler and lighter than the one
//   in front of it, so a skyline of overlapping ridges reads as a stack of
//   paper cutouts. The old scene.fog is kept as the USE_FOG switch and as the
//   fallback for anything the chunk patch cannot reach.
//
//   A STEPPED WARM/COOL LIGHT replaces smooth Lambert. `dot(N, L)` is pushed
//   through a hard step at SUN_STEP_EDGE: past it the surface takes a warm sun
//   ramp, short of it it takes nothing but ambient — and the ambient itself is
//   swung toward a fixed cool blue-violet SHADOW_TINT. The split is therefore
//   the SAME on a face turned away from the sun and on a face in the terrain's
//   cast shadow, because both are lit by ambient alone.
//
// The vertex colours underneath are untouched: terrain.mjs writes ALBEDO, and
// this is what happens to it. That is what keeps the palette (C in terrain.mjs)
// and the baked cast-shadow / sky-occlusion read still doing their job.
//
// EVERY DIAL IS LIVE. See lib/core.mjs — the values live in shared Float32Arrays,
// so `__look.SUN_STEP_EDGE = 0.30` in the console re-lights the world on the
// next frame. A golden-hour preset is a table of these numbers and nothing
// else; a `timeOfDay` scrub is that table interpolated per frame.
//
// WHAT IT COSTS, measured (work/look_perf.mjs, paired A/B on the headless
// SwiftShader rig at 1280x720): +4.4 ms/frame at the village pan and +2.0 at
// the KT summit pan, against 531 and 552 ms/frame — 0.4-0.8 % of the frame.
// That is above specs/0005's literal +1.5 ms cap and it is roughly the floor
// for this layer: what is added is about 25 ALU ops a fragment (the step, the
// warm ramp, the ambient tint) plus ~14 more beyond the first fog band's
// leading edge, and there is no version of "hard step + three bands" that
// costs materially less. The levers, in order of how much they buy and how
// much look they cost: FOG_BAND_COUNT 3 -> 2, and folding the ambient tint
// into two precomputed uniforms.

// -- compile-time (these two generate GLSL, so changing them needs a reload)
const FOG_BAND_COUNT = 3;
// 1 = band boundaries are spherical shells about the eye rather than planes
// perpendicular to the view axis. With discrete bands this is not cosmetic:
// on view-axis depth a band edge SWEEPS ACROSS a stationary ridge as you pan,
// which is the one way to make a paper cutout look like a bug.
const FOG_BAND_RADIAL = 1;

// -- live dials
// per band: x = FOG_BAND_LIMIT (metres from the eye at which the band takes
// over), y = FOG_BAND_FEATHER (metres of softening either side — small, or the
// cutout turns back into a gradient), z = FOG_BAND_MIX (how far this band
// pulls the colour), w = 0.5 / FEATHER, maintained by the FOG_BAND_FEATHER
// dial so the shader never has to divide (lib/core.mjs, `dialSoft`).
const uFogBand = f32([
  850, 55, 0.30, 0,   // band 0 — the KT massif from the village bench
  1900, 70, 0.55, 0,  // band 1 — the ridges behind it
  3800, 110, 0.86, 0, // band 2 — the skyline, all but flat against the sky
]);
// cooler and lighter toward the sky; band 2 lands on the dome's own horizon
// colour (SKY_HORIZON above), which is what makes the furthest ridge read as a
// silhouette rather than as an object.
const FOG_BAND_HEX = [0xb7c8de, 0xcbdaee, 0xdfeaf9];
const uFogBandColor = f32(new Array(FOG_BAND_COUNT * 3).fill(0));

// x SUN_STEP_EDGE, y SUN_STEP_SOFT, z SUN_STEP_GAIN, w SUN_RAMP_EDGE.
// EDGE 0.24: this world's sun is az 215 / el 33 (terrain.mjs), so flat snow
// sits at dot = 0.545 and a 30 deg north-east face at 0.13 — the step lands
// between them, which is why the split falls on aspect the way the palette's
// blue north faces already do.
// (y is stored as 0.5 / SUN_STEP_SOFT — see lib/core.mjs `dialSoft`)
const uSunStep = f32([0.24, 0, 0.68, 0.42]);
const uSunRampLo = f32([0, 0, 0, 0]);      // rgb SUN_RAMP_LO, w 0.5/SUN_RAMP_SOFT
const uSunRampHi = f32([0, 0, 0, 1.0]);    // rgb SUN_RAMP_HI, w SUN_AMBIENT_GAIN
const uShadowTint = f32([0, 0, 0, 0.45]);  // rgb SHADOW_TINT, w SHADOW_TINT_STRENGTH

dialVec('FOG_BAND_LIMIT', uFogBand, 0, FOG_BAND_COUNT, 4);
dialVec('FOG_BAND_FEATHER', uFogBand, 1, FOG_BAND_COUNT, 4, halfInv, 3);
dialVec('FOG_BAND_MIX', uFogBand, 2, FOG_BAND_COUNT, 4);
dialColorArray('FOG_BAND_COLOR', uFogBandColor, FOG_BAND_HEX);
dial('SUN_STEP_EDGE', uSunStep, 0);
dialSoft('SUN_STEP_SOFT', uSunStep, 1, 0.055);
dial('SUN_STEP_GAIN', uSunStep, 2);
dial('SUN_RAMP_EDGE', uSunStep, 3);
dialSoft('SUN_RAMP_SOFT', uSunRampLo, 3, 0.16);
dial('SUN_AMBIENT_GAIN', uSunRampHi, 3);
dial('SHADOW_TINT_STRENGTH', uShadowTint, 3);
// hue-only multipliers (luma-normalised in lib/core.mjs), so warmth and exposure
// are separate dials and never fight each other.
dialColor('SUN_RAMP_LO', uSunRampLo, 0, 0xffe6c4, { norm: 'luma' });  // just past the step
dialColor('SUN_RAMP_HI', uSunRampHi, 0, 0xfff4e2, { norm: 'luma' });  // full sun
dialColor('SHADOW_TINT', uShadowTint, 0, 0x96a0dc, { norm: 'luma' }); // blue-violet

// ---------------------------------------------------------------- the GLSL
const bandLine = (i) => `
	poiFog = mix( poiFog, uFogBandColor[ ${i} ], uFogBand[ ${i} ].z * clamp(
		( vFogDepth - uFogBand[ ${i} ].x ) * uFogBand[ ${i} ].w + 0.5, 0.0, 1.0 ) );`;
const BANDS = Array.from({ length: FOG_BAND_COUNT }, (_, i) => bandLine(i)).join('');

registerLookLayer({
  id: 'L2-atmosphere',
  uniforms: {
    uFogBand: { value: uFogBand },
    uFogBandColor: { value: uFogBandColor },
    uSunStep: { value: uSunStep },
    uSunRampLo: { value: uSunRampLo },
    uSunRampHi: { value: uSunRampHi },
    uShadowTint: { value: uShadowTint },
  },
  chunks: {
    // radial band boundaries (see FOG_BAND_RADIAL)
    fog_vertex: (src) => (FOG_BAND_RADIAL
      ? '#ifdef USE_FOG\n\tvFogDepth = length( mvPosition.xyz );\n#endif'
      : src),

    // the declarations ride along with three's own; the originals are left in
    // place so fogColor / fogNear / fogFar stay legal for anything that still
    // wants them (they simply go inactive and are never uploaded).
    fog_pars_fragment: (src) => src.replace('#ifdef USE_FOG', `#ifdef USE_FOG
	uniform vec4 uFogBand[ ${FOG_BAND_COUNT} ];        // x LIMIT  y FEATHER  z MIX  w 0.5/FEATHER
	uniform vec3 uFogBandColor[ ${FOG_BAND_COUNT} ];   // FOG_BAND_COLOR`),

    // FOG_BAND_COUNT discrete stamps instead of one smooth ramp. They compose
    // front to back, so a fragment past every limit ends up at
    // 1 - prod(1 - MIX[i]) of the way to the last band's colour.
    //
    // THE EARLY-OUT IS THE WHOLE FRAME BUDGET. Everything nearer than the
    // first band's leading edge takes zero from all three stamps, and on a
    // ridden frame that is most of the screen — the snow under the skis, the
    // trees either side, the lift towers. Depth is about as spatially coherent
    // as a branch predicate gets, so the raster takes the cheap path for whole
    // tiles at a time rather than per pixel. Measured on the headless rig it is
    // worth more than every other saving in this layer put together.
    fog_fragment: () => `#ifdef USE_FOG
	if ( vFogDepth > uFogBand[ 0 ].x - uFogBand[ 0 ].y ) {
		vec3 poiFog = gl_FragColor.rgb;${BANDS.split('\n').join('\n\t')}
		gl_FragColor.rgb = poiFog;
	}
#endif`,

    // the hard NdotL split. Both halves are replacements, not additions: the
    // sun side loses its cosine falloff and gains a warm ramp; the shadow side
    // is ambient only, swung toward SHADOW_TINT. Tinting the INDIRECT term is
    // what makes a cast shadow and a turned-away face read the same, and it
    // costs one dot and one mix on a path that already existed.
    lights_lambert_pars_fragment: (src) => `uniform vec4 uSunStep;
uniform vec4 uSunRampLo;
uniform vec4 uSunRampHi;
uniform vec4 uShadowTint;
#define SUN_STEP_EDGE        uSunStep.x
#define SUN_STEP_INV_SOFT    uSunStep.y
#define SUN_STEP_GAIN        uSunStep.z
#define SUN_RAMP_EDGE        uSunStep.w
#define SUN_RAMP_LO          uSunRampLo.rgb
#define SUN_RAMP_INV_SOFT    uSunRampLo.a
#define SUN_RAMP_HI          uSunRampHi.rgb
#define SUN_AMBIENT_GAIN     uSunRampHi.a
#define SHADOW_TINT          uShadowTint.rgb
#define SHADOW_TINT_STRENGTH uShadowTint.a
` + src
      .replace(
        `\tfloat dotNL = saturate( dot( geometryNormal, directLight.direction ) );
\tvec3 irradiance = dotNL * directLight.color;`,
        `\tfloat dotNL = dot( geometryNormal, directLight.direction );
\tfloat poiLit = clamp( ( dotNL - SUN_STEP_EDGE ) * SUN_STEP_INV_SOFT + 0.5, 0.0, 1.0 );
\tvec3 poiWarm = mix( SUN_RAMP_LO, SUN_RAMP_HI,
\t\tclamp( ( dotNL - SUN_RAMP_EDGE ) * SUN_RAMP_INV_SOFT + 0.5, 0.0, 1.0 ) );
\tvec3 irradiance = directLight.color * poiWarm * ( poiLit * SUN_STEP_GAIN );`)
      .replace(
        `void RE_IndirectDiffuse_Lambert( const in vec3 irradiance,`,
        `void RE_IndirectDiffuse_Lambert( const in vec3 poiAmbient,`)
      .replace(
        `\treflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );`,
        `\tvec3 irradiance = poiAmbient * SUN_AMBIENT_GAIN;
\tirradiance = mix( irradiance, dot( irradiance, vec3( 0.2126, 0.7152, 0.0722 ) ) * SHADOW_TINT,
\t\tSHADOW_TINT_STRENGTH );
\treflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );`),
  },
});

// world.mjs's `scene.fog = new THREE.Fog(0xc2d6ec, 1500, 12000)` STAYS EXACTLY
// AS IT IS, and that is deliberate. It is the switch — three only compiles the
// fog chunks when a scene has one — and it is the fallback for any surface the
// chunk patch cannot reach. It is also the exporter's D16.1 anchor: the deploy
// build rewrites that one line to (0xc2d6ec, 900, 3600) by exact-text match
// (tools/export-red-dog/patches/scene-world.patch.mjs), and a hunk that does
// not apply fails the build. `fogNear`/`fogFar`/`fogColor` go unused and
// inactive under the band table either way, so nothing is lost by leaving the
// line alone — and the containment D16.1 was buying at 3.6 km is what
// FOG_BAND_LIMIT[2] = 3800 now does in both builds.

const SKY_R = 13000;

/**
 * The dome's vertex colours, written into `col` from the four SKY_* dials and
 * the sun bearing. Split out of buildSky so a preset can repaint the dome that
 * is already in the scene without rebuilding the geometry.
 */
function paintSky(pos, col) {
  const R = SKY_R;
  const sd = SUN_DIR;
  const top = skyStop(0), mid = skyStop(3), hor = skyStop(6), low = skyStop(9);
  const glow = lin(SKY_SUN_GLOW), amt = SKY_SUN_GLOW_AMOUNT;
  for (let i = 0; i < pos.count; i++) {
    // the sphere is built Y-up; the mesh is rotated to Z-up below, so the
    // gradient must be driven by the POST-rotation axis (this is the bug that
    // put a horizontal gradient in the sibling run).
    const x = pos.getX(i), y = pos.getY(i), zz = pos.getZ(i);
    const up = -zz / R;                       // after rotateX(-PI/2), +Z world = -Z local
    let c;
    if (up > 0.30) c = mixc(mid, top, smooth(0.30, 0.95, up));
    else if (up > 0.0) c = mixc(hor, mid, smooth(0.0, 0.30, up));
    else c = mixc(low, hor, smooth(-0.25, 0.0, up));
    // a little warmth around the sun bearing
    const wx = x / R, wy = y / R;
    const dot = wx * sd[0] + (-zz / R) * sd[2] + wy * sd[1];
    c = mixc(c, glow, clamp(dot, 0, 1) ** 6 * amt);
    col[i * 3] = c[0]; col[i * 3 + 1] = c[1]; col[i * 3 + 2] = c[2];
  }
}

// the dome, once world.mjs has built it — the handle the dials repaint through,
// and (see `lights()`) this file's only route to the scene it was added to.
let skyMesh = null;

function repaintSky() {
  if (!skyMesh) return;                       // dialled before the world exists
  const g = skyMesh.geometry;
  paintSky(g.attributes.position, g.attributes.color.array);
  g.attributes.color.needsUpdate = true;
}

// The dome's colour buffer, for anything that needs to prove the repaint is
// exact — the bench player exposes no scene handle, so this is the only route
// to it from outside. A function, so `preset()`'s dial walk skips it (it reads
// `typeof !== 'function'`); the same shape tracks.js's `__look.tracksMap` uses.
LOOK.skyColors = () => (skyMesh ? skyMesh.geometry.attributes.color.array : null);

export function buildSky(THREE) {
  const g = new THREE.SphereGeometry(SKY_R, 40, 24);
  const col = new Float32Array(g.attributes.position.count * 3);
  paintSky(g.attributes.position, col);
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({
    vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false,
  }));
  m.rotation.x = -Math.PI / 2;
  m.name = 'sky';
  m.renderOrder = -10;
  m.frustumCulled = false;
  skyMesh = m;
  return m;
}

// High cirrus banners — views 16-25 all have them combed across the blue.
export function buildClouds(THREE) {
  const rng = makeRng('cirrus');
  const B = buf();
  const hi = lin(0xf6fbff), lo = lin(0xd5e4f4);
  for (let i = 0; i < 22; i++) {
    const a = rr(rng, 0, Math.PI * 2), d = rr(rng, 1400, 9000);
    const cx = Math.cos(a) * d, cy = Math.sin(a) * d;
    const z = rr(rng, 2100, 3400);
    const yaw = rr(rng, 0.5, 1.3);
    const L = rr(rng, 900, 3200), W = rr(rng, 30, 120);
    const c = Math.cos(yaw), s = Math.sin(yaw);
    const P = (u, v, h) => [cx + u * c - v * s, cy + u * s + v * c, z + h];
    const n = ri(rng, 3, 6);
    for (let k = 0; k < n; k++) {
      const u0 = -L / 2 + rr(rng, 0, L * 0.5), l = rr(rng, L * 0.25, L * 0.6);
      const v0 = rr(rng, -W, W), w = rr(rng, W * 0.25, W * 0.8);
      const h = rr(rng, -60, 60);
      const col = mixc(lo, hi, rr(rng, 0.3, 1));
      quad(B, P(u0, v0, h), P(u0 + l, v0 + rr(rng, -w, w), h), P(u0 + l, v0 + w, h), P(u0, v0 + w * 0.6, h), col);
    }
  }
  const m = new THREE.Mesh(toGeo(THREE, B, { normals: false }), new THREE.MeshBasicMaterial({
    vertexColors: true, side: THREE.DoubleSide, transparent: true, opacity: 0.30, fog: false, depthWrite: false,
  }));
  m.name = 'cirrus';
  m.renderOrder = -8;
  m.frustumCulled = false;
  return m;
}

// ============================================================ THE PRESET TABLE
//
// specs/0024. This is the whole feature: a map of dial name -> value, in
// exactly the form `__look.NAME = value` takes. No shader edit, no second
// lighting path, no per-frame work — `LOOK.preset('golden-hour')` is a loop
// over this object.
//
// THE SUN DOES NOT MOVE, and that is the one deliberate hole in the illusion.
// terrain.mjs bakes the cast shadow and the sky occlusion into the vertex
// colours against SUN_DIR (az 215 / el 33), so dropping the sun's elevation
// would put lit snow inside a baked shadow and leave a hard, wrong edge across
// every slope in the world. Golden hour here is sold by COLOUR, RAMP and FOG —
// a warmer and weaker sun, a colder and stronger shadow, a step edge pushed up
// so more of the mountain falls into that shadow, and a peach horizon under a
// zenith that is still blue. Not orange soup, and not a sunset: the Firewatch
// reference 0005 was decided against (A1), an hour later in the day.
//
// `default` is EMPTY ON PURPOSE. definePresets() fills it from the dials
// themselves — see lib/core.mjs — so the undo cannot drift from the values the
// dials actually registered with.
export const PRESETS = {
  default: {},
  'golden-hour': {
    // -- the light. Warmer and weaker; the ambient swings from a cold blue sky
    // + neutral bounce to a violet sky + warm snow-bounce.
    // ROUND 2 REBALANCED THE KEY AGAINST THE FILL, and it is the change that
    // finally made this read as an hour rather than a filter. A low sun is a
    // STRONG WARM KEY over a WEAK COOL FILL; round 1 had a 1.78 sun against a
    // 1.36 hemisphere of saturated violet, which is a midday ratio, and it
    // painted lit snow the same mauve as shadowed snow. The sun goes up, the
    // fill comes down and desaturates, and the warm half wins the frame back.
    // (round 4, one dial: back toward the spec's own 0xffc890. 0xffc08a has
    // enough magenta in it that white snow under it reads PINK rather than
    // gold, and snow is most of every frame in this world.)
    //
    // ROUND 5 SPLIT THE KEY FROM THE FILL AGAIN, and this time it was measured
    // rather than eyeballed: the village pan looks DOWN-SUN at flat snow, so
    // almost every face there sits near the step edge and the frame was carried
    // by the ambient — which is violet — and read LAVENDER end to end (sunlit
    // snow at hue 346, a magenta, against the KT pan's 33). The fix is a
    // stronger warm key and a weaker cool fill, because the ambient tint lands
    // on the LIT half too (the shader tints the INDIRECT term for every
    // fragment, not only the shadowed ones), so anything that warms lit snow by
    // way of the ambient also un-violets the shadow. AMB_INTENSITY is the one
    // lever that separates them: it scales the fill without changing its hue,
    // so lit snow loses its violet cast and shadow pockets keep theirs.
    //
    // AMB_SKY WAS MEASURED AND LEFT ALONE. Warming/desaturating it (0xa8a4ac,
    // 0xbcb0ac) moved sunlit snow by 2-3 hue degrees and cost the shadow half
    // its violet outright (shadow saturation 54 -> 27), because at these tint
    // strengths SHADOW_TINT, not AMB_SKY, is what decides the ambient's hue.
    // A dial that does not move the thing it was reached for is not in the table.
    // (round 5: SUN_COLOR desaturated, not re-hued — 0xffc896 and 0xffd0a2 are
    // the same 29 deg of gold, at 41 % and 36 % saturation. The paler sun lets
    // lit snow keep more of its own white, which is what "cream" is.)
    SUN_COLOR: 0xffd0a2,
    SUN_INTENSITY: 2.00,
    AMB_SKY: 0x7f92c2,
    AMB_GROUND: 0xe8c9a8,
    // (round 5: 1.06 -> 0.86. The fill was carrying the flat frames.)
    AMB_INTENSITY: 0.86,

    // -- the warm/cool split. A higher step edge leaves more of the mountain
    // short of the sun, which is what a low sun does.
    //
    // THE RAMP CARRIES LESS WARMTH THAN THE SUN DOES, and that is the round-1
    // correction: the ramp multiplies SUN_COLOR, it does not replace it, so an
    // orange ramp under an orange sun squared the warmth and turned lit snow
    // salmon. SUN_COLOR is now the only place the hour's colour is authored and
    // the ramp is a lean toward it, exactly as it is at default.
    // (round 3: SUN_STEP_GAIN joined the table. A downhill camera sees one broad
    // slope whose normals hardly vary, so the hard step gives it no shading of
    // its own — the whole frame took one hue and the "warm light / cool shadow"
    // read went flat. A hotter lit half puts a near-white core back under the
    // peach, which is what makes it read as LIGHT rather than as paint.)
    // (round 5: EDGE 0.32 -> 0.26, GAIN 0.80 -> 0.90, RAMP_LO a step warmer,
    // TINT_STRENGTH 0.56 -> 0.46. 0.32 put the village's broad down-sun rolls —
    // dot(N,L) around 0.22-0.33 — on the SHADOW side of the step, so the one
    // frame in the set with no strongly-lit aspect in it had no warm half at
    // all. 0.26 lands them back in the sun, the higher gain gives that half a
    // near-white core, RAMP_LO is the colour the just-past-the-step faces
    // actually take and those faces are most of that frame, and 0.46 stops the
    // ambient tint from painting the lit half violet along with the shadow.)
    //
    // (round 6: RAMP_LO 0xffc888 -> 0xffdcbc, GAIN 0.90 -> 0.96. Round 5 warmed
    // RAMP_LO and that was the wrong direction — ROUND 1'S LESSON, RE-LEARNT.
    // 0xffc888 and SUN_COLOR are both about 30 deg of warmth, so the ramp
    // squares the hour's colour instead of leaning toward it: measured, the
    // warm ramp left village lit snow at 15.5 % saturation, a peach, and the
    // pale one drops it to 12.8 % — a cream — at the same hue. The ramp's job
    // is to be PALE and lean warm; the hour's colour is authored once, in
    // SUN_COLOR. The extra gain is the last of the way to a white core, and it
    // lands on the lit half only, so the shadow does not follow it.)
    SUN_STEP_EDGE: 0.26,
    SUN_STEP_GAIN: 0.96,
    SUN_RAMP_LO: 0xffdcbc,
    SUN_RAMP_HI: 0xffecd4,
    SHADOW_TINT: 0x6e6bb8,
    SHADOW_TINT_STRENGTH: 0.46,

    // -- the fog bands. Band 2 lands ON SKY_HORIZON (within a step of it) so
    // the furthest ridge still reads as a silhouette cut out of the sky rather
    // than as an object; 0 and 1 walk in from a COOL violet-grey. They were a
    // dusty magenta in round 0 and every ridge past 850 m read as a Mars
    // sunset: the mid-distance is the cool half of this look, not the warm one.
    // (round 2: band 2 dropped a step DARKER than SKY_HORIZON. Level with it,
    // the skyline ridge stopped being a silhouette and read as khaki haze.)
    FOG_BAND_COLOR: [0xb2b0c6, 0xcbc6d6, 0xddccbe],

    // -- the dome. Still blue overhead: the whole read depends on the zenith
    // NOT going warm.
    SKY_TOP: 0x2f5f9e,
    // (round 2: bluer and a touch brighter. Every downhill camera sees only the
    // HORIZON->MID half of the dome, so MID is what decides whether a frame
    // aimed below the horizon has any blue in it at all.)
    SKY_MID: 0x86a8dc,
    SKY_HORIZON: 0xecd8c0,
    SKY_LOW: 0xe0b48c,
    SKY_SUN_GLOW: 0xffc98e,
    SKY_SUN_GLOW_AMOUNT: 0.45,
  },
};

// LAST STATEMENT IN THE FILE, and it has to be: definePresets() captures
// `default` from every dial registered so far, and world.mjs imports terrain,
// granite and this file in that order, so this is the first point at which the
// whole registry exists.
definePresets(PRESETS);

// ------------------------------------------------------------- `?look=` boot
// The boot read lives HERE and not in the player: main.js is another spec's
// territory, and this is the module that owns the table. It runs at import,
// which is before world.mjs builds anything — so the dome is PAINTED in the
// preset's colours rather than repainted, and world.mjs constructs its lights
// straight out of the dialled SUN.
//
// `location` is guarded the way inventory.js guards its own query read: the
// headless harness, the OG shoot and any node-side import of this module all
// reach this line, and a world that will not load without a URL bar is worse
// than one that boots default.
try {
  const q = new URLSearchParams(globalThis.location.search).get('look');
  if (q) LOOK.preset(q);
} catch { /* no location to read — default look */ }
