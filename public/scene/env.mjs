// Sky, light and cloud, and — since specs/0005 L2 — the ATMOSPHERE AND LIGHT
// shader look. No ShaderMaterial anywhere — the dome is a vertex-coloured
// BackSide sphere, which sidesteps the tone-mapping / colour-space include trap
// entirely.

import { buf, tri, quad, prism, makeRng, rr, ri, lin, mixc, scalec, clamp, smooth, toGeo,
         registerLookLayer, f32, dial, dialVec, dialSoft, halfInv,
         dialColor, dialColorArray } from './lib/core.mjs';
import { SUN_AZ, SUN_EL, SUN_DIR } from './terrain.mjs';

// Warm low sun + a strongly blue sky dome. Because the terrain's vertex colour
// is albedo (see terrain.mjs), THIS is what makes a sunlit slope read warm
// white and a north-facing one read blue — the whole point of the palette.
export const SUN = {
  dir: SUN_DIR,
  color: 0xfff0d8,
  intensity: 2.15,
  ambSky: 0x8fb6e8,
  ambGround: 0xdfe9f4,
  ambIntensity: 1.48,
};

// deep winter blue overhead falling to a pale horizon
const SKY_TOP = lin(0x3d7ec9);
const SKY_MID = lin(0x8dbbe8);
const SKY_HORIZON = lin(0xdfeaf7);
const SKY_LOW = lin(0xc9d9ea);

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

export function buildSky(THREE) {
  const R = 13000;
  const g = new THREE.SphereGeometry(R, 40, 24);
  const pos = g.attributes.position;
  const col = new Float32Array(pos.count * 3);
  const sd = SUN_DIR;
  for (let i = 0; i < pos.count; i++) {
    // the sphere is built Y-up; the mesh is rotated to Z-up below, so the
    // gradient must be driven by the POST-rotation axis (this is the bug that
    // put a horizontal gradient in the sibling run).
    const x = pos.getX(i), y = pos.getY(i), zz = pos.getZ(i);
    const up = -zz / R;                       // after rotateX(-PI/2), +Z world = -Z local
    let c;
    if (up > 0.30) c = mixc(SKY_MID, SKY_TOP, smooth(0.30, 0.95, up));
    else if (up > 0.0) c = mixc(SKY_HORIZON, SKY_MID, smooth(0.0, 0.30, up));
    else c = mixc(SKY_LOW, SKY_HORIZON, smooth(-0.25, 0.0, up));
    // a little warmth around the sun bearing
    const wx = x / R, wy = y / R;
    const dot = wx * sd[0] + (-zz / R) * sd[2] + wy * sd[1];
    c = mixc(c, lin(0xffe9c8), clamp(dot, 0, 1) ** 6 * 0.35);
    col[i * 3] = c[0]; col[i * 3 + 1] = c[1]; col[i * 3 + 2] = c[2];
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({
    vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false,
  }));
  m.rotation.x = -Math.PI / 2;
  m.name = 'sky';
  m.renderOrder = -10;
  m.frustumCulled = false;
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
