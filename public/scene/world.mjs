// Red Dog pod, Palisades Tahoe â€” scene assembly.
// PLAYABLE.md contract: buildWorld(THREE) -> { scene, spawn, colliders, up, gear, update }
//
// FRAME: ENU metres, +X east, +Y north, +Z up. Origin = centre of aerial.jpg's
// 1000 m frame (39.19197, -120.23108); z = 0 at 1890.0 m ASL. up:'z' declared.
// gear: 'skis'.

import {
  buf, appendBuf, toGeo, splitForCollision, tri, quad, box, tube, prism, plate, makeRng, rr, ri, pick,
  lin, mixc, scalec, clamp, lerp, smooth, fbm,
} from './lib/core.mjs';
import { RUNS, LIFTS, LOTS, BUILDINGS, ROADS, A, CORE, TIGHT } from './layout.mjs';
import { UPPER_BUILDINGS } from './upper-props.mjs';
import { groundZ, demAt, masksAt, slopeAt, normalAt, RUN_PREP, DEM_Z0 } from './ground.mjs';
import { buildTerrain, SUN_DIR, SUN_AZ, SUN_EL } from './terrain.mjs';
import { placeForest, forestDensity, distToRuns } from './forest.mjs';
import {
  PAL, firGeo, pineGeo, snagGeo, boulderGeo, outcropGeo, skierGeo, carGeo,
  snowcatGeo, lodgeGeo, hutGeo, fenceRun, wand, aNet, gatePanel, finishArch, bannerWall, carGeoLo,
  eagleGeo, flagLine, dangerSign, handline, ringBuilding, deckTables,
} from './kit.mjs';
import { funitelBase, funitelTop, funitelTower, funitelRopes, funitelCabin, funitelLine, ROPE_ARM, ROPE_OFFSETS } from './funitel.mjs';
import { buildVillage } from './village.mjs';
import { buildFunitelGranite, graniteMaterial } from './granite.mjs';
import { canopyAt } from './canopy.mjs';
import { rockAt } from './rock.mjs';
import { buildKtRocks, rockMaterial, toMerged as ktToMerged } from './kt-rocks.mjs';
import { buildPoulsen, poulsenSurfaceZ, POU_LIP, POU_SIDE_LIP } from './poulsen.mjs';
import { POU_BAND, POU_ANCHORS } from './pou-data.mjs';
import { buildPark, PARK_LEN as parkLen, atT as parkAtT, toWorld as parkToWorld,
         parkSurfaceZ, JUMPS as PARK_JUMPS, HIP as PARK_HIP } from './park.mjs';
import { lineFrame, terminal, tower, cable, makeCablePath, chairGeo,
         solveCableClearance, measureCableClearance } from './lift.mjs';
import { trailBoardTexture, terminalTexture, wordmarkTexture, boardMesh, faceBoard } from './signs.mjs';
import { SUN, buildSky, buildClouds } from './env.mjs';

const rad = (d) => d * Math.PI / 180;

// ============================================================ THE RIDE FIX
//
// GREG COULD NOT RIDE EITHER OF INCREMENT 1's LIFTS, and the reason is not the
// one everybody looked for. It was measured, not guessed:
//
//   * `work/walk_lifts.py` — stand 16 m out on each of eight bearings, face the
//     declared load point and hold W. ALL SEVEN LIFTS PASS 8/8: the prompt
//     fires, closest approach 0.01-0.38 m. The declarations are reachable.
//   * `work/probe_liftgate.py` — lift.js's two gates, horizontal 4 m and
//     vertical 6 m, at every base and top. Every one OK; the worst
//     declared-vs-collider drift in the world is 0.13 m.
//   * `work/probe_approach.py` — and here it is. Grid the ground around each
//     station and ask where the HUD actually offers the ride:
//
//         Gold Coast Funitel   offered on   64 m2 of a 5,776 m2 apron (1.1 %)
//                              nearest offer 16.3 m from the building's door
//                              STANDING AT THE DOOR: no offer
//         Gold Coast Express   offered on   80 m2, nearest offer 5.6 m
//                              STANDING AT THE DOOR: no offer
//
// A player does not know where a load point is. He walks to the BUILDING —
// that is what a terminal is FOR — and the world put its 4 m trigger in blank
// snow 16 m off to one side of it, with nothing built there and nothing marking
// it. Red Dog Express got away with it for one reason: it has a five-lane
// fenced maze built at its base, so there is something to walk to.
//
// So the fix is three things, and all three are world-side:
//   1. the load point goes where a person GOES — in front of the doors.
//   2. the trigger radius is scaled to the STATION. PLAYABLE.md makes `radius`
//      a per-lift field; a 51 x 22 m funitel station asking for the same 4 m
//      circle as a 7.4 m chairlift shed is the mismatch that produced 1.1 %.
//   3. a maze and a ski rack are BUILT at every load point, so the place you
//      have to stand is a place you can see.
//
// The five front-side lines keep the exact base/top points REPORT §4.2
// publishes — that is the invariance this increment is not allowed to touch —
// and gain only the radius and the visible queue.
const LOAD = {
  // THE FUNITEL, and the second half of the ride fix — found by
  // `work/arrive_funitel.py`, which is the test that skis the loop's own finish
  // back to the lift instead of starting 16 m out.
  //
  // The first cut put the load 5 m off the PLAZA DOORS at the down-valley end
  // (`along: -50, lat: 0`) because that is where a person walks in. It fires at
  // the door, and it is still wrong: a skier finishing Mountain Run arrives from
  // UP THE LINE on the mountain flank, and a 51 m building is then directly
  // between him and the point. He travelled 115 m of the 166 m and stopped
  // dead 56 m out, against the shed's own wall, on both skis and boots.
  //
  // So the point sits at the corner where the plaza gable meets the SKI flank,
  // 3 m clear of the wall — view-51's rack-and-corral ground — and the trigger
  // is 16 m, a third of the station's length. From there:
  //   * the straight line in from Mountain Run's finish NEVER crosses the shed
  //     (its lateral offset runs 26.7 m -> 14 m and the shed is 11 m half-wide),
  //   * and the plaza doors are 15.4 m away, inside the trigger, so walking up
  //     the mall still offers the ride at the door.
  // One point, both approaches, and neither of them has to know it is there.
  'gold-coast-funitel': { along: -43.5, lat: -14, r: 16 },
  // Gold Coast Express is an 18 x 5.6 m lifthouse, not a 51 m hall, so its
  // POINT was never the problem and does not move: 11 m off the node, exactly
  // where §4.2 puts it. Sliding it 14 m down the line took the nearest offer
  // from 5.6 m to 19.2 m from its own door — measured, and reverted. What it
  // gets is the radius its shed deserves and something to walk to.
  'gold-coast-express': { along: 0, lat: 11, r: 7 },
};
const UNLOAD = {
  'gold-coast-funitel': { back: 26, lat: 12 },
  'gold-coast-express': { back: 20, lat: 8 },
};

/** the LOAD point for a lift, world ENU. `st` is a liftState entry. */
function loadPoint(st) {
  const b = st.fr.at(0);
  const o = LOAD[st.L.id];
  if (!o) {
    // the five front-side lines, verbatim as REPORT §4.2 publishes them
    return [b.x + b.uy * 11, b.y - b.ux * 11];
  }
  // `along` runs down the line from the base node, `lat` to the village side
  return [b.x + b.ux * o.along + b.uy * o.lat,
          b.y + b.uy * o.along - b.ux * o.lat];
}

/** the UNLOAD point for a lift, world ENU. */
function unloadPoint(st) {
  const t = st.fr.at(st.fr.L);
  const o = UNLOAD[st.L.id] || { back: 20, lat: 0 };
  return [t.x - t.ux * o.back + t.uy * o.lat,
          t.y - t.uy * o.back - t.ux * o.lat];
}

/** the prompt radius for a lift — the station's size, not a constant. */
const loadRadius = (st) => (LOAD[st.L.id] ? LOAD[st.L.id].r : 6);

// what the F prompt says at each base terminal
const LIFT_TITLE = {
  'red-dog-express': 'Red Dog Express',
  'far-east-express': 'Far East Express',
  exhibition: 'Exhibition',
  'olympic-lady': 'Olympic Lady',
  'kt22-express': 'KT-22 Express',
  'gold-coast-funitel': 'Gold Coast Funitel',
  'gold-coast-express': 'Gold Coast Express',
};

export async function buildWorld(THREE, opts = {}) {
  const t0 = (globalThis.performance || Date).now();
  const scene = new THREE.Scene();
  const report = { stats: {}, runs: [], notes: [] };
  const colliders = [];
  const gz = groundZ;
  const rng = makeRng('red-dog');

  const SOLID = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  const SMOOTH = new THREE.MeshLambertMaterial({ vertexColors: true });
  const SHEET = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, side: THREE.DoubleSide });
  const BACKDROP = new THREE.MeshBasicMaterial({ vertexColors: true, fog: true });

  // ----------------------------------------------------------- atmosphere
  scene.background = new THREE.Color(0x9dc2e8);
  // D16.1 — the first and least noticeable containment layer. Past the KT
  // massif everything is sky-coloured, so the far west reads as a real horizon
  // instead of somewhere to walk to. No wall, nothing to enforce.
  scene.fog = new THREE.Fog(0xc2d6ec, 900, 3600);
  scene.add(buildSky(THREE));
  scene.add(buildClouds(THREE));

  // ---------------------------------------------------------------- light
  const S = SUN_DIR;
  const sun = new THREE.DirectionalLight(SUN.color, SUN.intensity);
  const FOCUS = new THREE.Vector3(-40, -60, groundZ(-40, -60));
  sun.position.set(FOCUS.x + S[0] * 1400, FOCUS.y + S[1] * 1400, FOCUS.z + S[2] * 1400);
  sun.target.position.copy(FOCUS);
  sun.castShadow = opts.shadows !== false;
  if (sun.castShadow) {
    sun.shadow.mapSize.set(2048, 2048);
    const d = 430;
    sun.shadow.camera.left = -d; sun.shadow.camera.right = d;
    sun.shadow.camera.top = d; sun.shadow.camera.bottom = -d;
    sun.shadow.camera.near = 700; sun.shadow.camera.far = 2400;
    sun.shadow.bias = -0.0006;
    sun.shadow.normalBias = 1.2;
    sun.shadow.radius = 4;
  }
  scene.add(sun, sun.target);
  scene.add(new THREE.HemisphereLight(SUN.ambSky, SUN.ambGround, SUN.ambIntensity));

  // -------------------------------------------------------------- terrain
  const T = buildTerrain(THREE, SMOOTH, BACKDROP);
  scene.add(T.bump, T.piste, T.core, ...T.details, ...T.sectors, T.massif, T.mid, T.wide, T.wideW, T.rim, T.far);
  // The floor, finest first: moguls (1.13 m), corridors (1.70), core (3.40),
  // the four promoted sectors (5.0 / 5.0 / 5.5 / 7.0), the KT-22 massif bridge
  // (14), the dem-tight surround (9), the dem-wide surround (34) and the
  // end-of-data rim (90). Every one of them is a collider, so there is no
  // invisible wall anywhere between the Red Dog mogul field and 1.1 km beyond
  // the edge of the elevation data — 2.5 km of continuous standable ground.
  colliders.push(T.bump, T.piste, ...T.details, T.core, ...T.sectors, T.massif, T.mid, T.wide, T.wideW, T.rim);

  // ----------------------------------------------------------------- lifts
  const Bl = buf();
  // THE CABLES GET THEIR OWN MESH, and it is not a collider. The base run put
  // haul ropes in with the towers and terminals; a 55 mm rope hanging 15-25 m
  // in the air is not something a skier can touch, and across five lifts and
  // 72 spans it was 16 k collidable triangles the player's grid was flattening
  // for nothing. Splitting it is both cheaper and more correct.
  const Bc = buf();
  const liftState = [];
  const funTowers = [];          // the Funitel's tower feet, for cameras.mjs
  const cableClear = [];         // increment 22: the rope-clearance ledger
  // INCREMENT 22 caps. A tower is allowed to grow to 30 m — the world already
  // stands 25 m `tall` towers and a 30 m compression tower on a steep line is
  // ordinary hardware. A terminal shed's deck may grow to 8.0 m from the 4.6 m
  // it starts at, and only ONE lift really needs it: Red Dog's top terminal sits
  // 5 m past a crest that stands 1.7 m ABOVE its own node, so no tower on the
  // line can throw a chord over the crest and still arrive at the shed door,
  // and its deck ends at 7.23 m. KT-22's takes 0.19 m and the other five take
  // nothing. Both Funitel sheds are capped where they are.
  // The Funitel keeps its published 152 ft / 46.33 m ceiling.
  const TOWER_HMAX = 30.0, TERM_DECK_MAX = 8.0, FUN_HMAX = 46.33;
  // the two Funitel stations' own frames, so the load/unload points and the
  // plaza furniture can be placed against the BUILDING rather than against the
  // OSM node — see the `lifts:` block at the bottom of this file
  let funBase = null, funTop = null;
  for (const L of LIFTS) {
    const fr = lineFrame(L.pts, gz);
    // TERMINALS SIT EXACTLY ON THE OSM END NODES. For Red Dog Express those
    // are 39.195533,-120.232568 (base) and 39.188360,-120.227342 (top); the
    // DEM under them reads 1897.0 m and 2293.8 m against the stated 1897 m and
    // 2294 m — residuals +0.0 m and -0.2 m. Nothing is nudged by eye.
    const b0 = fr.at(0), bN = fr.at(fr.L);
    const yaw0 = Math.atan2(b0.uy, b0.ux);
    const yawN = Math.atan2(bN.uy, bN.ux);
    let term0, term1, nodes, armW, sagK, DECK_B, DECK_T, NC, solved;

    if (L.funitel) {
      // ---------------------------------------------------- THE FUNITEL
      // scene/funitel.mjs, from view-12 / view-33 (four ropes, four sheave
      // trains, a bridging hanger) and views 11 / 16 / 31 / 35 (the two sheds).
      //
      // THE SHED IS NOT CENTRED ON THE OSM NODE. A funitel station is 50 m
      // long; the aerialway node is where the rope ENTERS it, i.e. one end.
      // So the shed is set back from the node along the line by len/2 - 6 —
      // away from the line at the base, along it at the top. That rule is
      // checkable and it checks out: at the base it puts the shed's centre at
      // (-370.4, 434.3) against OSM building way 187059280 "Funitel base",
      // whose own mapped centroid is (-365.7, 438.0) — 6.0 m, with the
      // footprint's principal axis at -162.9 deg against the line's own
      // -163.7 deg. The building and the line agree to 0.8 degrees.
      // THE TWO STATIONS ARE NOT ONE FUNCTION ANY MORE, and that is the whole
      // of Greg's "it doesn't look like the funitel building top or bottom from
      // Squaw". The first cut built both ends with `funitelTerminal()` — a dark
      // shed on concrete piers — and gave the base a shorter deck, so the base
      // was the top terminal 2 m lower, floating over the village on legs.
      //
      // Sourcing pass 2 put ten more exteriors in the bundle and they are two
      // completely different buildings:
      //   BASE  `funitelBase()`  — Village-at-Squaw architecture. A long
      //     single-storey granite-and-timber hall AT PLAZA LEVEL under a
      //     shallow GREEN standing-seam roof with a blond timber fascia beam,
      //     two dark portals in the mountain gable between granite piers, and
      //     eight steps up to the doors. Deck height ZERO — views 36 / 41 / 42
      //     / 51 / 52. It is the drive terminal (OITAF 1999: "the drive, or
      //     lower terminal").
      //   TOP   `funitelTop()`   — a machine. Charcoal ribbed metal under a
      //     BARREL VAULT with pale-grey eave trim and combed rafter tails, a
      //     glazed clerestory the length of the flank, on slender steel legs
      //     over an open concrete undercroft that WEDGES from 4.5 m at the
      //     down-valley end to grade uphill — views 66 / 67 / 11 / 35. Its
      //     counterweight sits in an 85 ft shaft sunk in solid granite (OITAF
      //     1999), which is the other half of why this line is a rock line.
      //
      // THE SHED IS STILL NOT CENTRED ON THE OSM NODE and the 6.0 m / 0.8 deg
      // agreement with OSM building way 187059280 that §17.7 publishes is
      // unchanged: the setback rule and the plan dimensions are the same.
      DECK_B = 0; DECK_T = 4.5;
      const back = (p, u, d) => ({ x: p.x + u * d * p.ux, y: p.y + u * d * p.uy });
      const c0 = back(b0, -1, 51 / 2 - 6), cN = back(bN, +1, 46 / 2 - 6);
      term0 = funitelBase(Bl, 21, { x: c0.x, y: c0.y, z: b0.z, yaw: yaw0, len: 51, w: 22 });
      term1 = funitelTop(Bl, 22, { x: cN.x, y: cN.y, z: bN.z, yaw: yawN,
                                   len: 46, w: 24, deckHi: DECK_T, deckLo: 1.1 });
      funBase = { c: c0, yaw: yaw0, len: 51, w: 22, z: b0.z };
      funTop = { c: cN, yaw: yawN, len: 46, w: 24, z: bN.z };
      // TEN TOWERS, not sixteen — Squaw Valley's own GM at OITAF 1999, and ten
      // over 2,649 m is a 265 m mean span, which is what a funitel is FOR.
      // `funitelLine()` puts them on the profile's slope breaks and gives each
      // one a first height from the straight-chord clearance it can see; the
      // whole derivation and what it does and does not prove is documented
      // there. INCREMENT 22 then runs `solveCableClearance` over the result,
      // because funitelLine clears the CHORD and the rope that actually hangs
      // is the chord MINUS a 2.6 m sag on a 330 m span — measured at 1.51 m of
      // clearance on span 6 before this pass, which buries a funitel cabin.
      // The two sheds do NOT move: their rope heights come off published
      // architecture (§17.7 / §18.3), so both end nodes are capped where they
      // are and the solve has to find the answer in the towers.
      const funPick = funitelLine(fr, L.towers);
      NC = [{ x: b0.x, y: b0.y, z: b0.z + term0.ropeZ, g: b0.z,
              term: true, cap: b0.z + term0.ropeZ }];
      for (const T of funPick)
        NC.push({ x: fr.at(T.s).x, y: fr.at(T.s).y, z: fr.at(T.s).z + T.h, g: fr.at(T.s).z,
                  cap: fr.at(T.s).z + FUN_HMAX, s: T.s, t: T.t, n: T.n, h0: T.h });
      NC.push({ x: bN.x, y: bN.y, z: bN.z + term1.ropeZ, g: bN.z,
                term: true, cap: bN.z + term1.ropeZ });
      armW = ROPE_ARM; sagK = 0.008;
      solved = solveCableClearance(NC, { gz, sagK, offsets: ROPE_OFFSETS,
                                         clr: 7.0, fade: 60, floor: 2.0 });
      nodes = [[b0.x, b0.y, b0.z + term0.ropeZ]];
      for (let k = 1; k < NC.length - 1; k++) {
        const nd = NC[k], p = fr.at(nd.s);
        const yaw = Math.atan2(p.uy, p.ux);
        const h = nd.z - nd.g;
        const tw = funitelTower(Bl, 400 + nd.n * 7, { x: p.x, y: p.y, z: p.z, yaw, h, n: nd.n });
        nodes.push(tw.top);
        funTowers.push([+p.x.toFixed(1), +p.y.toFixed(1), +p.z.toFixed(1), +h.toFixed(1), nd.n]);
        report.notes.push(`${L.name} tower ${nd.n}: s=${nd.s.toFixed(0)} m (${(nd.t * 100).toFixed(0)}%) `
          + `h=${h.toFixed(1)} m (clearance-solved, was ${nd.h0.toFixed(1)} chord-only) `
          + `ground=${(p.z + DEM_Z0).toFixed(1)} m`);
      }
      nodes.push([bN.x, bN.y, bN.z + term1.ropeZ]);
      funitelRopes(Bc, nodes, { sagK });
    } else {
      // ------------------------------------------------- THE SIX CHAIRLIFTS
      // INCREMENT 22, defect class 2. Two things changed here and `lift.mjs`'s
      // `solveCableClearance` carries the argument for both:
      //   * the towers are spread over the WHOLE line rather than between
      //     `s = 26` and `s = L - 26`, which used to make the two END spans
      //     ~40 % longer than every interior span while anchoring them on the
      //     two lowest nodes — four of the five ropes that went through the
      //     hill were final spans;
      //   * the local-curvature height is now a STARTING height that the solver
      //     may raise but never lower, so every tower that already cleared
      //     keeps exactly the height it had, `L.tall` / `L.angled` included.
      // Tower feet do not move in z and the ground raster is not touched, so
      // none of this is visible to `groundZ0`, the forest or either gate.
      DECK_B = 5.0; DECK_T = 4.6;
      const tw0 = [];
      NC = [{ x: b0.x, y: b0.y, z: b0.z + DECK_B - 1.5, g: b0.z,
              term: true, cap: b0.z + TERM_DECK_MAX - 1.5 }];
      for (let i = 1; i <= L.towers; i++) {
        const s = fr.L * (i / (L.towers + 1));
        const f = s / fr.L;
        const p = fr.at(s);
        const yaw = Math.atan2(p.uy, p.ux);
        // grade under the tower sets its STARTING height: a convex roll needs a
        // short depression tower, a concave one a tall compression tower.
        const ahead = fr.at(Math.min(fr.L, s + 30)), behind = fr.at(Math.max(0, s - 30));
        const conv = (ahead.z - p.z) / 30 - (p.z - behind.z) / 30;
        let kind = 'std';
        if (L.angled && L.angled.some((a) => Math.abs(f - a) < 0.035)) kind = 'angled';
        if (L.tall && L.tall.some((a) => Math.abs(f - a) < 0.03)) kind = 'tall';
        let h = 11.0 + clamp(-conv * 46, -3.5, 9);
        if (kind === 'tall') h = 25;
        if (kind === 'angled') h = 8.5;
        // the angled towers lean back down-line, so their head is off the foot
        const topU = (kind === 'angled' ? -0.20 : 0) * h;
        tw0.push({ i, s, f, p, yaw, kind, h0: h });
        NC.push({ x: p.x + topU * Math.cos(yaw), y: p.y + topU * Math.sin(yaw),
                  z: p.z + h, g: p.z, cap: p.z + TOWER_HMAX, lean: kind === 'angled' });
      }
      NC.push({ x: bN.x, y: bN.y, z: bN.z + DECK_T - 1.5, g: bN.z,
                term: true, cap: bN.z + TERM_DECK_MAX - 1.5 });
      armW = 3.0; sagK = L.core ? 0.009 : 0.011;
      solved = solveCableClearance(NC, { gz, sagK, offsets: [-armW, armW],
                                         clr: 6.0, fade: 45, floor: 1.5 });
      // the solve may have raised a terminal head; the shed grows with it
      DECK_B = +(NC[0].z - b0.z + 1.5).toFixed(3);
      DECK_T = +(NC[NC.length - 1].z - bN.z + 1.5).toFixed(3);
      term0 = terminal(Bl, 11, { x: b0.x, y: b0.y, z: b0.z, yaw: yaw0, len: 27, w: 7.4, deck: DECK_B });
      term1 = terminal(Bl, 12, { x: bN.x, y: bN.y, z: bN.z, yaw: yawN, len: 25, w: 7.2, deck: DECK_T });
      nodes = [[b0.x, b0.y, b0.z + DECK_B - 1.5]];
      for (let k = 1; k < NC.length - 1; k++) {
        const nd = NC[k], T = tw0[k - 1];
        const h = nd.z - nd.g;
        const tw = tower(Bl, 100 + T.i * 7, { x: T.p.x, y: T.p.y, z: T.p.z, yaw: T.yaw, h, kind: T.kind, n: T.i });
        nodes.push(tw.top);
        report.notes.push(`${L.name} tower ${T.i}: s=${T.s.toFixed(0)} m (${(T.f * 100).toFixed(0)}%) `
          + `${T.kind} h=${h.toFixed(1)}${h - T.h0 > 0.05 ? ` (raised +${(h - T.h0).toFixed(1)} for rope clearance)` : ''} `
          + `ground=${(T.p.z + DEM_Z0).toFixed(1)} m`);
      }
      nodes.push([bN.x, bN.y, bN.z + DECK_T - 1.5]);
      cable(Bc, nodes, armW, { sagK });
    }
    // What the solve actually achieved — measured on `nodes`, the list the
    // ropes were actually BUILT from, not on `NC`, the list the solver worked
    // in. They differ for an `angled` tower: its head leans back down-line by
    // `-0.20 * h`, so raising it also slides the head, and NC still holds the
    // pre-raise (x, y). Measuring the thing that ships is the only measurement
    // worth printing.
    {
      const built = nodes.map((p) => ({ x: p[0], y: p[1], z: p[2] }));
      const M = measureCableClearance(built, { gz, sagK,
        offsets: L.funitel ? ROPE_OFFSETS : [-armW, armW] });
      cableClear.push({ id: L.id, name: L.name, worst: M.worst, at: M.at,
                        spans: M.spans.length, capped: solved.capped.length,
                        residual: +solved.residual.toFixed(2),
                        deckB: DECK_B, deckT: DECK_T });
      report.notes.push(`${L.name}: worst rope-to-ground clearance ${M.worst.toFixed(2)} m `
        + `over ${M.spans.length} spans (${solved.iterations} solve iterations, `
        + `${solved.capped.length} node(s) at cap)`);
    }
    liftState.push({ L, path: makeCablePath(nodes, armW, sagK), term0, term1, fr });
    report.runs.push({ lift: L.name, osmWay: L.osmWay, plan: Math.round(fr.L),
                       base: [Math.round(b0.x), Math.round(b0.y), +(b0.z + DEM_Z0).toFixed(1)],
                       top: [Math.round(bN.x), Math.round(bN.y), +(bN.z + DEM_Z0).toFixed(1)],
                       towers: L.towers });
  }

  // ------------------------------------------------ THE QUEUE AT EVERY LOAD
  // Part three of the ride fix. A load point you cannot SEE is a load point
  // that does not exist, and the reason Red Dog Express was rideable while the
  // two new lifts were not is that Red Dog has a maze built at its base and
  // they had bare snow. So every one of the seven now gets the same furniture:
  // a corral of two rails running in toward the station, open at the back, a
  // ski rack beside it and a pair of the village's own lamp standards (view-51).
  //
  // AND IT IS ITS OWN MESH, AND THAT MESH IS NOT A COLLIDER. The first cut put
  // it in `lift-structures` with everything else and immediately re-broke what
  // it was built to fix: `work/walk_lifts.py` came back with Exhibition at 7/8
  // bearings, bodies stopping 3.6-3.9 m out — held off their own lift by the
  // rail that was supposed to show them where to stand. Signage you can walk
  // through is the whole point. Red Dog's own fenced maze is untouched in the
  // village mesh, so the front side is bit-identical.
  const Bq = buf();
  for (const st of liftState) {
    const p = loadPoint(st);
    const b = st.fr.at(0);
    // face the station: +u is up the line, so the corral runs along u
    const ux = b.ux, uy = b.uy, vx = uy, vy = -ux;
    const at = (a, l) => [p[0] + ux * a + vx * l, p[1] + uy * a + vy * l];
    const HW = 3.6, BACK = 12, FWD = 5;
    for (const sg of [-1, 1]) {
      fenceRun(Bq, [at(-BACK, sg * HW), at(-BACK / 2, sg * HW), at(0, sg * HW), at(FWD, sg * HW)],
               gz, { h: 1.05, col: PAL.red, post: PAL.steelLo });
    }
    // the ski rack, 6 m clear to one side — an A-frame rail with skis in it
    {
      const r0 = at(-4, 8.5), r1 = at(4, 8.5);
      const z0 = gz(r0[0], r0[1]), z1 = gz(r1[0], r1[1]);
      tube(Bq, [r0[0], r0[1], z0 + 1.15], [r1[0], r1[1], z1 + 1.15], 0.05, PAL.steelLo, 4);
      for (const q of [r0, r1]) {
        tube(Bq, [q[0], q[1], gz(q[0], q[1])], [q[0], q[1], gz(q[0], q[1]) + 1.15], 0.05, PAL.steelLo, 4);
      }
    }
    // two lamp standards (view-51: dark posts with a lantern head)
    for (const l of [-7.5, 7.5]) {
      const q = at(-9, l), z0 = gz(q[0], q[1]);
      tube(Bq, [q[0], q[1], z0], [q[0], q[1], z0 + 4.2], 0.09, PAL.timberLo, 5);
      box(Bq, { x: q[0], y: q[1], z: z0 + 4.45, sx: 0.62, sy: 0.62, sz: 0.5, col: PAL.yellow });
    }
  }

  const queueMesh = new THREE.Mesh(toGeo(THREE, Bq), SHEET);
  queueMesh.name = 'lift-queues';
  queueMesh.castShadow = true; queueMesh.receiveShadow = false;
  scene.add(queueMesh);          // deliberately NOT a collider — see above

  // ---------------------------------------------------------- base area
  // THE VILLAGE, REBUILT FROM MAPPED PLANS (village.mjs / village-props.mjs).
  //
  // Increment 1 shipped this as `layout.mjs` BUILDINGS: 24 rectangles eyeballed
  // off aerial.jpg with FLAT parapet roofs, listed as inferred in REPORT §12.
  // Greg's note on the flagship is that arriving off Mountain Run has to read
  // as "the village", and the Village at Palisades is 124 real OSM ways with
  // steep hipped roofs, dormers and a continuous balcony band — none of which
  // 24 flat boxes can produce. The plans are now the real ones and the roofs
  // are the reason you can tell from the top of Mountain Run that there is a
  // village down there. See §17.13.
  //
  // Buildings within 26 m of a lift's own load point are vetoed: the lift loop
  // above already builds a station there, and the F prompt needs its trigger to
  // stand on open plaza rather than inside somebody's lobby.
  const liftKeepOut = liftState.map((st) => loadPoint(st));
  // ...and a building whose plan lands ON a run centreline is dropped too.
  //
  // This is the one place the mapped village and the mapped pistes contradict
  // each other, and it had to be settled with a measurement. `work/skitest.py`'s
  // GS BOWL descent went from 498 stall frames and 102 below-ground frames to
  // **1,354 and 1,393** the moment the village became real, because OSM ways
  // 187059281 (886 m², **0.1 m** from the `base-runout` centreline) and
  // 187059282 (990 m², 0.5 m) stand in the middle of the corridor this world
  // draws. Both are real buildings and both are in the right place; the
  // 96 m-wide `base-runout` polyline is a piste CENTRELINE with a nominal width
  // hung on it, and in reality the run-out threads between those buildings.
  //
  // At this resolution one of the two has to give, and it is not the run — a
  // run a player cannot ski is not a run. `work/_runclash.mjs` measures it:
  // **12 buildings inside 10 m of a centreline, 14 inside 18 m**, out of 124.
  // 18 m keeps a 36 m skiable lane down every run and costs 11 % of the village.
  const RUN_LANE = 18;
  const runClear = (x, y) => distToRuns(x, y);
  const villageVeto = (b) => (
    liftKeepOut.some((p) => Math.hypot(b.c[0] - p[0], b.c[1] - p[1]) < 26)
    || b.ring.some((p) => runClear(p[0], p[1]) < RUN_LANE));
  const V = buildVillage(gz, villageVeto);
  const Bv = V.B;
  report.notes.push(`village: ${V.built}/${V.total} OSM building plans extruded, `
                  + `${V.skipped} vetoed (inside a lift's 26 m load area, or within `
                  + `${RUN_LANE} m of a run centreline)`);
  // slow-zone fencing across the base run-out (views 24, 25, 29)
  fenceRun(Bv, [[-260, 372], [-200, 366], [-140, 362], [-80, 364]], gz, { h: 1.1, col: PAL.orange });
  fenceRun(Bv, [[-60, 386], [0, 388], [60, 390], [110, 386]], gz, { h: 1.1, col: PAL.blue });
  // lift maze at the base terminal
  {
    const bx = A.rdxBase[0], by = A.rdxBase[1] + 16;
    for (let i = 0; i < 5; i++) {
      const x = bx - 9 + i * 4.5;
      fenceRun(Bv, [[x, by - 7], [x, by - 1], [x, by + 5]], gz, { h: 1.05, col: PAL.red, post: PAL.steelLo });
    }
  }
  // increment 22: the village's big lodges are fan-triangulated from their OSM
  // plans, so a 60 x 65 m building contributes 60 x 65 m ROOF TRIANGLES and the
  // bench dropped every one of them. `splitForCollision` caps the span at 36 m.
  const vSplit = splitForCollision(Bv);
  const villageMesh = new THREE.Mesh(toGeo(THREE, Bv), SHEET);
  villageMesh.name = 'base-buildings';
  villageMesh.castShadow = true; villageMesh.receiveShadow = true;
  scene.add(villageMesh); colliders.push(villageMesh);

  // The pedestrian mall's own paving, 10 cm proud of the terrain and NOT a
  // collider: the ground under it already is one, and a second surface a
  // hand's width above the first is a step you can trip on for nothing.
  const plazaMesh = new THREE.Mesh(toGeo(THREE, V.plaza), SHEET);
  plazaMesh.name = 'village-plaza';
  plazaMesh.castShadow = false; plazaMesh.receiveShadow = true;
  scene.add(plazaMesh);

  // -------------------------------------------- THE GOLD COAST BENCH + HIGH CAMP
  // UPPER MOUNTAIN INCREMENT 1. Unlike the base village — whose massing the
  // merge had to read off an aerial and list as inferred — these two are REAL
  // OSM building ways, extruded from their own mapped plans
  // (work/bake_upper_props.py -> upper-props.mjs). view-9 and view-10 supply
  // what they look like; OSM supplies where they are and what shape they are.
  const Bu = buf();
  const upperRng = makeRng('gold-coast');
  const upperSigns = [];
  for (const b of UPPER_BUILDINGS) {
    // the Funitel's two sheds and the Gold Coast Express lifthouses are built
    // by the lift loop above, on their own lines; extruding their footprints
    // too would stand two buildings in one place
    if (b.kind === 'lifthouse' || b.id === 'funitel-base-house') continue;
    const ring = b.id === 'gold-coast-lodge' ? b.ringLodge : b.ring;
    let z0 = 1e9;
    for (const p of ring) z0 = Math.min(z0, gz(p[0], p[1]));
    z0 -= 1.2;
    if (b.id === 'gold-coast-lodge') {
      // view-9 / view-18: "a long three-storey RED-AND-BLACK building with a
      // glazed south face, an outdoor deck full of tables, and GOLD COAST
      // lettered across the deck fascia"
      ringBuilding(Bu, ring, z0, { storeys: 3, glass: 0.70, deck: 6.5,
                                   wall: mixc(PAL.redLo, PAL.timberLo, 0.42),
                                   roof: PAL.dark });
      deckTables(Bu, ring, z0, upperRng, 16);
      upperSigns.push({ ring, z0, text: 'GOLD COAST' });
    } else {
      // view-10: "heavy concrete-and-glass multi-storey blocks with the granite
      // ridge behind" — a summer frame, and the aerial's bare ground agrees
      ringBuilding(Bu, ring, z0, { storeys: 3, glass: 0.74, deck: 0,
                                   wall: mixc(PAL.stucco, PAL.steelLo, 0.62),
                                   roof: PAL.roof, story: 4.0 });
      upperSigns.push({ ring, z0, text: 'HIGH CAMP' });
    }
  }
  // the timber maintenance building and the snowcat parking beside the Gold
  // Coast Express base (view-9, "plus a timber maintenance building and
  // snowcat parking")
  {
    const [gx, gy] = A.gcxBase;
    place(Bu, hutGeo(17, 16, 9, 4.2, PAL.timber), gx + 26, gy - 14, gz(gx + 26, gy - 14) - 0.3, rad(172));
  }
  const uSplit = splitForCollision(Bu);          // High Camp's roofs, same rule
  const upperMesh = new THREE.Mesh(toGeo(THREE, Bu), SHEET);
  upperMesh.name = 'upper-buildings';
  upperMesh.castShadow = true; upperMesh.receiveShadow = true;
  scene.add(upperMesh); colliders.push(upperMesh);

  const liftMesh = new THREE.Mesh(toGeo(THREE, Bl), SHEET);
  liftMesh.name = 'lift-structures';
  liftMesh.castShadow = true; liftMesh.receiveShadow = true;
  scene.add(liftMesh); colliders.push(liftMesh);

  const cableMesh = new THREE.Mesh(toGeo(THREE, Bc), SHEET);
  cableMesh.name = 'lift-cables';
  cableMesh.castShadow = false; cableMesh.receiveShadow = false;
  scene.add(cableMesh);                              // deliberately not a collider

  // terminal lettering â€” RED DOG on both Red Dog Express sheds (views 8/10/11)
  // ... and EXHIBITION on its own sheds, so the promoted sector's landmark
  // names itself the same way the pod's does.
  // GOLD COAST / HIGH CAMP lettering. view-9: "GOLD COAST lettered across the
  // deck fascia". The board is hung on the ring's most south-facing edge, which
  // is the deck side and the side the sun is on.
  for (const S of upperSigns) {
    const tex = terminalTexture(THREE, S.text);
    if (!tex) continue;
    let best = null;
    let cx = 0, cy = 0;
    for (const p of S.ring) { cx += p[0]; cy += p[1]; }
    cx /= S.ring.length; cy /= S.ring.length;
    for (let i = 0; i < S.ring.length; i++) {
      const a = S.ring[i], b = S.ring[(i + 1) % S.ring.length];
      const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
      let nx = dy / L, ny = -dx / L;
      if ((a[0] + dx / 2 - cx) * nx + (a[1] + dy / 2 - cy) * ny < 0) { nx = -nx; ny = -ny; }
      const score = -ny * L;
      if (!best || score > best.score) best = { score, a, b, nx, ny, L };
    }
    if (!best || best.score <= 0) continue;
    const w = Math.min(best.L * 0.62, 22);
    const m = boardMesh(THREE, tex, w, w * 168 / 1024, { doubleSided: false });
    const px = (best.a[0] + best.b[0]) / 2 + best.nx * (S.text === 'GOLD COAST' ? 6.7 : 0.35);
    const py = (best.a[1] + best.b[1]) / 2 + best.ny * (S.text === 'GOLD COAST' ? 6.7 : 0.35);
    faceBoard(THREE, m, [px, py, S.z0 + (S.text === 'GOLD COAST' ? 1.6 : 12.6)], best.nx, best.ny);
    m.name = 'upper-sign-' + S.text.toLowerCase().replace(/ /g, '-');
    scene.add(m);
  }

  // THE FUNITEL IS NOT IN THIS LIST ANY MORE. The generic terminal board is
  // sized `term.len * 0.9`, which is right for a 27 m chairlift shed and put a
  // FORTY-SIX METRE Leitner-Poma billboard across the front of the village on a
  // 51 m funitel station — the first render of the rebuilt base terminal is
  // nothing but that sign. It is also the wrong maker: this is a 1998 Garaventa
  // and view-3's POMA badge belongs to Headwall Express. The Funitel gets the
  // one piece of lettering it actually carries, below.
  for (const st of liftState) {
    if (!['red-dog-express', 'exhibition', 'kt22-express', 'olympic-lady',
          'gold-coast-express'].includes(st.L.id)) continue;
    const termTex = terminalTexture(THREE, st.L.name);
    if (!termTex) continue;
    for (const [term, side] of [[st.term0, 1], [st.term0, -1], [st.term1, 1], [st.term1, -1]]) {
      // stand the board off the shed's OWN half-width, not a fixed 3.76 m: the
      // base sheds are 7.4 m wide, so the fixed offset left the lettering 6 cm
      // proud of the wall and it z-fought into a solid black panel (visible on
      // Red Dog's base terminal in the shipped fp-base-terminal render).
      const p = term.signAt(side * (term.w / 2 + 0.22));
      const m = boardMesh(THREE, termTex, term.len * 0.9, term.len * 0.9 * 168 / 1024, { doubleSided: false });
      const c = Math.cos(term.signYaw), s = Math.sin(term.signYaw);
      faceBoard(THREE, m, p, -s * side, c * side);   // outward normal of that flank
      m.name = 'terminal-sign';
      scene.add(m);
    }
  }

  // FUNITEL, white on green, on the raised roof-end panel over the plaza doors
  // — the only lettering on the base terminal (view-36) and the thing you read
  // walking up the mall.
  {
    const fun = liftState.find((st) => st.L.funitel);
    const pnl = fun && fun.term0.panel;
    if (pnl) {
      const tex = wordmarkTexture(THREE, 'FUNITEL');
      if (tex) {
        const m = boardMesh(THREE, tex, pnl.w, pnl.w * 256 / 1024,
                            { doubleSided: true, unlit: true });
        const c = Math.cos(fun.term0.signYaw), s = Math.sin(fun.term0.signYaw);
        faceBoard(THREE, m, pnl.at, -c, -s);      // faces down-valley, at the mall
        m.name = 'funitel-wordmark';
        scene.add(m);
      }
    }
  }

  // ------------------------------------------------------------ trail signs
  // One board at the top entrance of every run that gets one, facing back up
  // the hill at the skier arriving from the lift/ridge.
  const Bp = buf();
  function place(B, g, x, y, z, yaw, sc = 1) {
    const c = Math.cos(yaw) * sc, s = Math.sin(yaw) * sc;
    for (let i = 0; i < g.pos.length; i += 3) {
      const px = g.pos[i], py = g.pos[i + 1];
      B.pos.push(x + px * c - py * s, y + px * s + py * c, g.pos[i + 2] * sc + z);
    }
    for (let i = 0; i < g.col.length; i++) B.col.push(g.col[i]);
  }
  const Bs = buf();
  const signMeshes = [];
  for (const r of RUNS) {
    if (!r.sign) continue;
    const p0 = r.pts[0], p1 = r.pts[Math.min(2, r.pts.length - 1)];
    const dirx = p1[0] - p0[0], diry = p1[1] - p0[1];
    const dl = Math.hypot(dirx, diry) || 1;
    // stand it off to the skier's left of the entrance
    const ox = -diry / dl * (r.width * 0.5 + 3.5), oy = dirx / dl * (r.width * 0.5 + 3.5);
    const x = p0[0] + ox - dirx / dl * 4, y = p0[1] + oy - diry / dl * 4;
    const z = gz(x, y);
    const H = 2.35, W = 2.05, BH = 0.68;
    for (const s of [-1, 1]) {
      const px = x - diry / dl * s * (W / 2 - 0.15), py = y + dirx / dl * s * (W / 2 - 0.15);
      tube(Bs, [px, py, z], [px, py, z + H], 0.055, PAL.dark, 4);
    }
    const tex = trailBoardTexture(THREE, r.name, r.diff);
    if (tex) {
      const m = boardMesh(THREE, tex, W, BH);
      // face back UP the hill at the skier arriving from the lift / ridge
      faceBoard(THREE, m, [x, y, z + H - BH / 2 - 0.12], -dirx / dl, -diry / dl);
      m.name = 'sign-' + r.id;
      scene.add(m);
      signMeshes.push(m);
    }
    report.runs.push({ run: r.name, style: r.style, width: r.width, inferred: !!r.inferred,
                       top: [Math.round(p0[0]), Math.round(p0[1]), Math.round(p0[2] + DEM_Z0)] });
  }
  // boundary wands down the corridor edges of the two hero runs
  for (const id of ['red-dog-face', 'lower-dog-leg', 'upper-dog-leg']) {
    const r = RUNS.find((q) => q.id === id);
    for (let i = 1; i < r.pts.length - 1; i += 1) {
      const a = r.pts[i], b = r.pts[i + 1];
      const dx = b[0] - a[0], dy = b[1] - a[1], dl = Math.hypot(dx, dy) || 1;
      for (const s of [-1, 1]) {
        const x = a[0] - dy / dl * s * (r.width / 2 - 1.5), y = a[1] + dx / dl * s * (r.width / 2 - 1.5);
        wand(Bs, x, y, gz(x, y), { h: 1.5, col: s > 0 ? PAL.yellow : PAL.orange });
      }
    }
  }
  // ------------------------------------------------------- the race venue
  // Views 26-28: the Stifel Palisades Tahoe Cup GS course on Red Dog Face.
  // Red A-net down both sides of the corridor, blue/red gate panels on the
  // dye line (painted in terrain.mjs), the e-tron finish arch at the foot and
  // a sponsor banner wall along the arena. Everything is placed off the OSM
  // centreline, so the course lies where the real course lies.
  {
    const r = RUNS.find((q) => q.id === 'red-dog-face');
    const pr = RUN_PREP['red-dog-face'];
    const L = pr.len;
    const along = (s) => {
      let i = 1;
      while (i < pr.cum.length - 1 && pr.cum[i] < s) i++;
      const t = (s - pr.cum[i - 1]) / ((pr.cum[i] - pr.cum[i - 1]) || 1);
      const a = r.pts[i - 1], b = r.pts[i];
      const dx = b[0] - a[0], dy = b[1] - a[1], dl = Math.hypot(dx, dy) || 1;
      return { x: lerp(a[0], b[0], t), y: lerp(a[1], b[1], t), ux: dx / dl, uy: dy / dl };
    };
    const HW = 17;    // the fenced GS corridor of view-27, inside the 86 m run
    for (const side of [-1, 1]) {
      const line = [];
      for (let s = 24; s < L - 26; s += 12) {
        const p = along(s);
        line.push([p.x - p.uy * side * HW, p.y + p.ux * side * HW]);
      }
      aNet(Bs, line, gz, { h: 1.9 });
    }
    // gate panels on the dye line
    for (let s = 40; s < L - 60; s += 26) {
      const p = along(s);
      const v = 11 * Math.sin((s / 42) * Math.PI * 2);
      const x = p.x - p.uy * v, y = p.y + p.ux * v;
      gatePanel(Bs, x, y, gz(x, y), Math.atan2(p.uy, p.ux), (s / 26 | 0) % 2 ? PAL.red : PAL.blue);
    }
    // finish arch + arena banner wall at the foot of the face
    {
      const p = along(L - 22);
      const yaw = Math.atan2(p.uy, p.ux) + Math.PI / 2;
      finishArch(Bs, p.x, p.y, gz(p.x, p.y), yaw, { span: 18, h: 6.2 });
      const w = [];
      for (let k = -6; k <= 6; k++) {
        const q = along(L - 6);
        w.push([q.x - q.uy * (k * 6) + q.ux * 12, q.y + q.ux * (k * 6) + q.uy * 12]);
      }
      bannerWall(Bs, w, gz, { h: 1.25 });
      // spectators along the arena
      for (let k = 0; k < 16; k++) {
        const q = along(L - 6 - rr(rng, 0, 26));
        const off = rr(rng, 26, 44) * (rng() < 0.5 ? -1 : 1);
        const x = q.x - q.uy * off, y = q.y + q.ux * off;
        place(Bp, skierGeo(ri(rng, 1, 999), null, { skis: false }), x, y, gz(x, y), rr(rng, 0, 6.28));
      }
    }
  }

  const signPosts = new THREE.Mesh(toGeo(THREE, Bs), SHEET);
  signPosts.name = 'sign-posts';
  signPosts.castShadow = true;
  scene.add(signPosts);

  // ------------------------------------------------------------------ trees
  const F = placeForest();
  const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(),
        _v = new THREE.Vector3(), _s = new THREE.Vector3();
  // `sink` buries the base of an instanced prop a little: the terrain meshes
  // sample groundZ on their own lattice, so between vertices the drawn surface
  // sits a few cm below the analytic height and an exactly-placed trunk shows
  // daylight under it.
  function instance(name, geoBuf, pts, mat, { castShadow = true, zScale = true, sink = 0 } = {}) {
    const g = toGeo(THREE, geoBuf);
    const im = new THREE.InstancedMesh(g, mat, Math.max(1, pts.length));
    im.name = name;
    im.castShadow = castShadow; im.receiveShadow = false;
    pts.forEach((p, i) => {
      _v.set(p[0], p[1], p[2] - sink); _e.set(0, 0, p[3], 'XYZ'); _q.setFromEuler(_e);
      const k = p[4];
      _s.set(k, k, zScale ? k * (0.9 + 0.25 * ((i * 37) % 7) / 7) : k);
      _m4.compose(_v, _q, _s);
      im.setMatrixAt(i, _m4);
    });
    im.instanceMatrix.needsUpdate = true;
    scene.add(im);
    return im;
  }
  // three LODs. Big firs line the corridors (that is where you look at them).
  // The merge's fourth reclaim, and the last one it needs: the MID fir loses a
  // skirt tier, 5 -> 4, for 5 triangles a tree across ~10,000 of them. These
  // are the general pod forest, not the corridor-lining band — `firs-big` is
  // untouched at 7 tiers, which is what the player actually skis past.
  instance('firs-big', firGeo(3, { h: 31, tiers: 7, sides: 7, flock: 0.32 }), F.big, SOLID, { sink: 0.9 });
  instance('firs-mid', firGeo(9, { h: 25, tiers: 4, sides: 5, flock: 0.28 }), F.mid, SOLID, { sink: 0.8 });
  instance('firs-far', firGeo(21, { h: 22, tiers: 4, sides: 4, flock: 0.24, lite: true }), F.small, SOLID, { castShadow: false, sink: 1.2 });
  instance('snags', snagGeo(5, { h: 17 }), F.snags, SOLID, { castShadow: false, sink: 0.6 });
  instance('boulders', boulderGeo(31, 1.1), F.boulders, SOLID, { castShadow: false, sink: 0.5 });

  // granite outcrops merged so they are collidable
  const Br = buf();
  for (const [x, y, z, yaw, sc] of F.rocks) {
    const g = outcropGeo(Math.round(x * 13 + y * 7), 3.0 * sc, 1.5 * sc);
    const c = Math.cos(yaw), s = Math.sin(yaw);
    for (let i = 0; i < g.pos.length; i += 3) {
      const px = g.pos[i], py = g.pos[i + 1];
      Br.pos.push(x + px * c - py * s, y + px * s + py * c, g.pos[i + 2] + z - 0.25 * sc);
    }
    for (let i = 0; i < g.col.length; i++) Br.col.push(g.col[i]);
  }
  const rockMesh = new THREE.Mesh(toGeo(THREE, Br), SOLID);
  rockMesh.name = 'granite-outcrops';
  rockMesh.castShadow = true; rockMesh.receiveShadow = true;
  scene.add(rockMesh); colliders.push(rockMesh);

  // ------------------------------- THE GRANITE THE FUNITEL FLIES OVER
  // Greg: "photos of the whole funitel line as it goes up including the rocks
  // etc". views 15 / 34 / 61 / 62 / 68 / 69 / 70 / 71 are what the ride is
  // actually looking at for eight and a half minutes, and increment 1 built
  // none of it — `work/_line.mjs` profiles the line and the aerial's own
  // bare-rock raster reads 0.000 over nearly all of it, because the promoted
  // funitel sector is a 34 m swath at 5.5 m and everything either side is the
  // 34 m/px upper surround. The DEM has the landform (35-40 deg from t = 0.55
  // to 0.70, the steepest ground in dem-tight-e); it cannot have the rock.
  //
  // Two independent written sources say this line is cut through granite:
  //   * liftblog's own caption on the mid-line: "A HUGE SECTION OF ROCK HAD TO
  //     BE BLASTED AWAY to make room for such a large lift."
  //   * OITAF 1999, on the top station: "an 85 FOOT COUNTERWEIGHT PIT and
  //     concrete shaft IN SOLID GRANITE ROCK."
  //
  // `granite.mjs` places it off the DEM's own steepness, in the sand-harbor
  // rocks.js material idiom — but as SHEETS, not spires: Palisades granite
  // exfoliates, and view-68 is a broad tan-buff dome stepping out of the snow
  // under the line, not a tower. The hero band is collidable; the scatter is
  // not, exactly as the KT field is not.
  const GR = buildFunitelGranite(LIFTS.find((l) => l.funitel).pts, {
    gz, slopeAt, canopyAt, rockAt, masksAt, hero: 24, field: 190,
  });
  const GRANITE = graniteMaterial(THREE);
  // the exfoliated granite SHEETS are broad and near-flat by design, so their
  // top faces were the widest triangles in the world after the roofs — and this
  // band is deliberately collidable, so dropping them let you ski through the
  // dome rather than over it.
  const gSplit = splitForCollision(GR.hero);
  const grHero = new THREE.Mesh(toGeo(THREE, GR.hero), GRANITE);
  grHero.name = 'funitel-granite';
  grHero.castShadow = true; grHero.receiveShadow = true;
  scene.add(grHero); colliders.push(grHero);
  const grField = new THREE.Mesh(toGeo(THREE, GR.field), GRANITE);
  grField.name = 'funitel-granite-field';
  grField.castShadow = false; grField.receiveShadow = true;
  scene.add(grField);
  report.notes.push(`Funitel granite: ${GR.nHero} bluffs (collidable) + ${GR.nField} scatter `
                  + `over ${Math.round(GR.L)} m of line`);

  // ============================================ THE GOLD COAST TERRAIN PARK
  // scene/park.mjs, from pois/palisades-upper/PARK.md and views 73-93. The
  // early-March 2026 configuration: the three-pack of larger jumps, the Gold
  // Coast Hip and the rail garden interleaved through it, on the Gold Coast
  // Express corridor the world already carries.
  //
  // It is built AFTER `place()` exists and it touches nothing else: the park is
  // its own surface laid on the existing snow, so ground.mjs's stamp raster,
  // forest.mjs's placement loops and granite.mjs's bluff stream are all
  // untouched and the front side cannot move. See park.mjs's header.
  const PARK = buildPark(THREE, {
    SOLID, SMOOTH, SHEET, toGeo, wordmarkTexture, boardMesh, faceBoard,
    fenceRun, bannerWall, wand, skierGeo, hutGeo, place,
  });
  for (const m of PARK.meshes) scene.add(m);
  for (const m of PARK.colliders) colliders.push(m);
  report.notes.push(`Gold Coast park: ${PARK.stats.surfaceTris} snow triangles on a `
                  + `${PARK.stats.lattice} lattice, ${PARK.stats.jibTris} jib, `
                  + `${PARK.stats.propTris} dressing; spine ${Math.round(parkLen)} m, `
                  + `min turn radius ${PARK.stats.minTurnRadius.R.toFixed(0)} m`);

  // -------------------------------------------- KT-22's identity layer
  // The Eagle's Nest spires, the cornice into GS Bowl, the Fingers reef and
  // the aerial-driven rock field — ported from eagles-nest-kt22-B-truth-01
  // through the verified 0.000 m re-registration (kt-rocks.mjs). Two meshes:
  // the HERO mass (spires + cornice + fins) is collidable, because Greg's
  // standing brief on this place is that the rock has to be climbable and
  // scramble-able and the cornice is something you stand on the lip of; the
  // scattered FIELD is not, exactly as the Red Dog pod's own boulders are not.
  // 620 outcrops — the donor's own number, not a merge-thinned one. Greg's
  // mandate on this world is that the KT sector keeps FULL B-truth fidelity, so
  // the rock field is not decimated to fit; §14.7 of the REPORT lists what was
  // given up instead, and none of it is terrain, forest or a feature anyone
  // skis past.
  const KT = buildKtRocks({ outcrops: 620 });
  const KTROCK = rockMaterial(THREE);
  const ktHero = new THREE.Mesh(toGeo(THREE, KT.hero), KTROCK);
  ktHero.name = 'kt-eagles-nest';
  ktHero.castShadow = true; ktHero.receiveShadow = true;
  scene.add(ktHero); colliders.push(ktHero);
  const ktField = new THREE.Mesh(toGeo(THREE, KT.field), KTROCK);
  ktField.name = 'kt-rock-field';
  ktField.castShadow = false; ktField.receiveShadow = true;
  scene.add(ktField);
  report.notes.push(`KT identity layer: ${KT.stats.corniceSamples} cornice crest samples, `
    + `${KT.stats.outcrops} outcrop clusters, statue at `
    + `${KT.statue.map((v) => v.toFixed(1)).join(', ')}`);

  // the summit props: the McConkey memorial eagle on the main spire with its
  // prayer-flag string, the patrol shack at the GS Bowl top node, the DANGER
  // CLIFF AREA board at the head of the Fingers, and the scramble handline
  const Bk = buf();
  {
    const S = KT.statue;
    place(Bk, eagleGeo(11), S[0], S[1], S[2], rad(285));           // facing W, view-8
    flagLine(Bk, [S[0], S[1], S[2] + 2.1], [S[0] + 6.5, S[1] + 4.5, S[2] - 3.0], makeRng(5));
    flagLine(Bk, [S[0], S[1], S[2] + 2.1], [S[0] - 5.5, S[1] + 5.5, S[2] - 3.4], makeRng(6));
    // two hikers beside it — view-9's scale figures
    place(Bk, skierGeo(41, PAL.jacket[2], { skis: false }), S[0] + 2.4, S[1] + 2.0, S[2] - 2.4, rad(200));
    place(Bk, skierGeo(42, PAL.jacket[4], { skis: false }), S[0] + 3.6, S[1] + 0.6, S[2] - 2.5, rad(250));
  }
  {
    const s = KT.shack;
    place(Bk, hutGeo(3, 5.2, 3.6, 2.7, PAL.white), s.x, s.y, gz(s.x, s.y) - 0.2, rad(s.yaw));
  }
  {
    // the DANGER CLIFF AREA board at the top of the Fingers (view-12), at the
    // OSM stub's own top node
    const f = RUNS.find((q) => q.id === 'the-fingers').pts[0];
    dangerSign(Bk, f[0] + 8, f[1] + 5, gz(f[0] + 8, f[1] + 5), rad(20));
  }
  {
    // the scramble handline from the unload flat up the spires' W shoulder
    const pts = [];
    for (let i = 0; i <= 9; i++) {
      const p = ktToMerged(lerp(-89.5, -66, i / 9), lerp(-369.6, -375, i / 9));
      pts.push([p[0], p[1]]);
    }
    handline(Bk, pts, gz);
  }
  const ktPropMesh = new THREE.Mesh(toGeo(THREE, Bk), SHEET);
  ktPropMesh.name = 'kt-summit-props';
  ktPropMesh.castShadow = true;
  scene.add(ktPropMesh);

  // ------------------------------------------ POULSEN'S GULLY — INCREMENT 21
  // THE CLIFF IS GEOMETRY, NOT GROUND, and REPORT §21.1 gives the two
  // independent reasons. In one line: Lower Dog Leg's protected corridor closes
  // every raster cell within 56 m of its centreline and the ledger's cliff lip
  // is 56.5 m from it, and a 1.37 m/px bare-earth DEM cannot hold a 5 m cliff
  // anyway — the ledger says so itself in §2 and §6.2. So the band is a built
  // mass laid ON the analytic ground, strictly additive, and it moves nothing.
  //
  // THREE MESHES AND ONLY ONE OF THEM IS COLLIDABLE, which is COMPOSING rule 17
  // spent as a number. `collide` is a coarse proxy over the shelf top and the
  // face — the surface a rider stands on and falls off — and it is what the
  // 22.8 k of collidable headroom buys. `skin` is the same surface at a third of
  // the sampling with the fracture relief, the ledges and the snow lace on it,
  // and it is looked at rather than skied. `props` is the patrol disc, its
  // bamboo and the talus.
  const POU = buildPoulsen({ groundZ: gz, rockAt, slopeAt });
  {
    // A HARNESS GOTCHA WORTH RECORDING, because it cost a build to find and it
    // will catch the next person who ships a collision proxy.
    //
    // The obvious way to hide a proxy is `mesh.visible = false`, and the bench's
    // collider grid builder starts `if (!o.visible || !o.isMesh) return;` — so an
    // invisible mesh IS SILENTLY NOT A COLLIDER, declared in `colliders` or not.
    // The world builds, the budget prints, the cliff is in the render, and the
    // rider slides straight down the natural hillside through it.
    //
    // The other obvious dodges are all trapped too, by the same file's
    // `isBackdrop()`: `transparent` with opacity < 0.98, `side: BackSide`, and
    // `depthWrite: false` are each treated as scenery and dropped.
    //
    // What works is hiding the MATERIAL, not the object. `material.visible =
    // false` makes the renderer skip the draw while `mesh.visible` stays true, so
    // the collider builder still takes it. One mesh, zero draws, 736 triangles of
    // floor under a 9,018-triangle skin nobody has to collide against.
    const pouColl = new THREE.Mesh(toGeo(THREE, POU.collide),
      new THREE.MeshBasicMaterial({ visible: false }));
    pouColl.name = 'poulsen-cliff-collide';
    pouColl.castShadow = false; pouColl.receiveShadow = false;
    scene.add(pouColl); colliders.push(pouColl);

    const pouSkin = new THREE.Mesh(toGeo(THREE, POU.skin), SOLID);
    pouSkin.name = 'poulsen-cliff';
    pouSkin.castShadow = true; pouSkin.receiveShadow = true;
    scene.add(pouSkin);

    const pouProps = new THREE.Mesh(toGeo(THREE, POU.props), SHEET);
    pouProps.name = 'poulsen-props';
    pouProps.castShadow = true;
    scene.add(pouProps);

    report.notes.push(`Poulsen's cliff band: main step ${POU.stats.mainDrop15.toFixed(2)} m at the `
      + `ledger's GPS lip fix, side takeoff ${POU.stats.sideDrop15.toFixed(2)} m at v=+`
      + `${POU_BAND.vSide}; collide ${(POU.collide.pos.length / 9) | 0} tris, `
      + `skin ${(POU.skin.pos.length / 9) | 0}, props ${(POU.props.pos.length / 9) | 0}`);
  }

  // THE FORK SIGN. The ask is for a STACKED trail sign and this is it — but the
  // ledger's own note to the sign generator (§3) says what actually stands at
  // this junction is a Palisades trail-MAP board on twin posts plus separate
  // round difficulty discs (view-62, view-53), not stacked planks, and that
  // building stacked planks here "will be inventing a form this junction does not
  // actually have — a deliberate stylisation, which is fine, but should be a
  // decision rather than an accident."
  //
  // IT IS A DECISION, TAKEN HERE, AND RECORDED. The fork gets the stacked board
  // the brief asks for, and the two EVIDENCED forms stand beside it so the
  // junction still carries the vocabulary the photographs show. Where they
  // disagree the render shows both and Greg can choose.
  {
    const F = POU_ANCHORS.fork;
    const Bp2 = buf();
    // FACE THE BOARDS BACK UP AT THE ARRIVING SKIER, and take the direction from
    // the run rather than from a typed angle. The first cut used `rad(112)` meaning
    // "ESE" and got (cos, sin) = (-0.37, +0.93), which points NNW - 140 degrees
    // wrong, and the render came back showing three boards from behind with their
    // text mirrored. A skier reaches this fork down UPPER DOG LEG, whose last two
    // vertices give the arrival heading directly, so the boards face its reverse.
    const UDL = RUNS.find((q) => q.id === 'upper-dog-leg').pts;
    const a0 = UDL[UDL.length - 2], a1 = UDL[UDL.length - 1];
    const al = Math.hypot(a1[0] - a0[0], a1[1] - a0[1]) || 1;
    const nx = -(a1[0] - a0[0]) / al, ny = -(a1[1] - a0[1]) / al;
    const sx = F[0] - 7.5, sy = F[1] - 5.0, sz = gz(sx, sy);
    // the stacked post: two uprights carrying three boards
    for (const s of [-1, 1]) {
      const px = sx - ny * s * 1.02, py = sy + nx * s * 1.02;
      tube(Bp2, [px, py, gz(px, py)], [px, py, gz(px, py) + 3.05], 0.062, PAL.dark, 5);
    }
    const STACK = [
      ["POULSEN'S GULLY", 'double', 2.62],
      ['LOWER DOG LEG', 'black', 1.86],
      ['CHAMPS ELYSEES', 'black', 1.10],
    ];
    for (const [name, diff, h] of STACK) {
      // the DOUBLE diamond is drawn for real (signs.mjs), and the rating is
      // sourced: Trailforks lists Poulsen's as double-black and the ledger dates
      // the change from the uploader's own edit note of 19 Nov 2022.
      const tex = trailBoardTexture(THREE, name, diff);
      if (!tex) continue;
      const m = boardMesh(THREE, tex, 2.02, 0.66);
      faceBoard(THREE, m, [sx, sy, sz + h], nx, ny);
      m.name = 'sign-pou-stack-' + name.toLowerCase().replace(/[^a-z]+/g, '-');
      scene.add(m);
    }
    // and the two forms the PHOTOGRAPHS show, 4 m to the side: a round yellow
    // EXPERTS ONLY disc on a single post (view-35, the Poulsen entrance itself)
    // with orange bamboo, which is how this resort marks this gully.
    {
      const dx = sx + nx * 1.5 - ny * 4.6, dy = sy + ny * 1.5 + nx * 4.6;
      const dz = gz(dx, dy);
      tube(Bp2, [dx, dy, dz], [dx, dy, dz + 2.1], 0.055, PAL.dark, 5);
      // the disc itself: a thin cylinder standing on edge, faced like a board
      const disc = new THREE.Mesh(new THREE.CircleGeometry(0.30, 20),
        new THREE.MeshLambertMaterial({ color: 0xd8c02a, side: THREE.DoubleSide,
                                        emissive: 0xd8c02a, emissiveIntensity: 0.22 }));
      disc.up.set(0, 0, 1);
      disc.position.set(dx, dy, dz + 1.95);
      disc.lookAt(dx + nx, dy + ny, dz + 1.95);
      disc.name = 'sign-pou-experts-only';
      scene.add(disc);
      for (let i = 0; i < 4; i++) {
        const wx2 = dx - ny * (0.9 + i * 1.5), wy2 = dy + nx * (0.9 + i * 1.5);
        wand(Bp2, wx2, wy2, gz(wx2, wy2), { h: 1.45, col: PAL.orange });
      }
    }
    const pouSign = new THREE.Mesh(toGeo(THREE, Bp2), SHEET);
    pouSign.name = 'poulsen-fork-sign';
    pouSign.castShadow = true;
    scene.add(pouSign);
    report.notes.push(`Poulsen's fork sign at (${sx.toFixed(1)}, ${sy.toFixed(1)}): stacked board `
      + `(STYLISATION, ledger §3) + the evidenced EXPERTS ONLY disc and bamboo (view-35)`);
  }

  // ------------------------------------------------------------------ cars
  const carPts = [], carPtsLo = [];
  for (const L of LOTS) {
    const far = L.c[1] > 545;      // the merge widens this: 200-290 m from
                                   // anything skiable, and now 1.6 km from the
                                   // KT-22 summit — they are 24-tri props
    const sink = far ? carPtsLo : carPts;
    const yaw = rad(L.yaw), c = Math.cos(yaw), s = Math.sin(yaw);
    const rows = L.rows, rowGap = L.s[1] / rows;
    for (let r0 = 0; r0 < rows; r0++) {
      const v = -L.s[1] / 2 + (r0 + 0.5) * rowGap;
      const n = Math.floor(L.s[0] / 2.9);
      for (let i = 0; i < n; i++) {
        // The far lots thin to 14 %. They are 200-290 m from anything skiable
        // and 1.6 km from the KT-22 summit; a 24-tri car at that range is one
        // or two pixels of colour in a lot that still reads as a full lot.
        // This is the merge's second dressing reclaim (see REPORT §14.7) and it
        // buys 10 k triangles for KT-22's rock field.
        if (rng() > (far ? 0.14 : 0.72)) continue;
        const u = -L.s[0] / 2 + (i + 0.5) * 2.9;
        const x = L.c[0] + u * c - v * s, y = L.c[1] + u * s + v * c;
        sink.push([x, y, gz(x, y) + 0.05, yaw + Math.PI / 2 + rr(rng, -0.04, 0.04), 1]);
      }
    }
  }
  const carGeos = [carGeo(1), carGeo(2), carGeo(3), carGeo(4)];
  carGeos.forEach((g, k) => instance('cars-' + k, g, carPts.filter((_, i) => i % 4 === k), SOLID, { castShadow: k < 2, zScale: false }));
  const carGeosLo = [carGeoLo(1), carGeoLo(2), carGeoLo(3), carGeoLo(4)];
  carGeosLo.forEach((g, k) => instance('cars-far-' + k, g, carPtsLo.filter((_, i) => i % 4 === k), SOLID, { castShadow: false, zScale: false }));

  // ------------------------------------------------------ static people/props
  // unloading at the top terminal (views 10, 11)
  const TT = liftState[0].fr.at(liftState[0].fr.L);
  const topGroup = [[16, 10, 2.1], [24, 4, 2.6], [10, -8, 0.4], [30, 16, 3.0], [-8, 14, 1.4]];
  for (const [du, dv, yaw] of topGroup) {
    const x = TT.x + du, y = TT.y + dv;
    place(Bp, skierGeo(ri(rng, 1, 999), null, {}), x, y, gz(x, y), yaw);
  }
  // the view-16 group standing on the roll at the top of Dog Leg
  {
    const r = RUNS.find((q) => q.id === 'upper-dog-leg');
    const p = r.pts[2];
    for (let i = 0; i < 6; i++) {
      const x = p[0] - 8 + i * 3.4 + rr(rng, -1, 1), y = p[1] + rr(rng, -4, 4);
      place(Bp, skierGeo(ri(rng, 1, 999), null, {}), x, y, gz(x, y), rr(rng, 1.6, 3.0));
    }
  }
  // base area life
  for (let i = 0; i < 14; i++) {
    const x = rr(rng, -230, 120), y = rr(rng, 366, 424);
    place(Bp, skierGeo(ri(rng, 1, 999), null, {}), x, y, gz(x, y), rr(rng, 0, 6.28));
  }
  // the Gold Coast bench and the High Camp plaza — view-9 ("skiers are spread
  // over the open bench above and below") and view-10 (the plaza)
  for (let i = 0; i < 12; i++) {
    const x = A.goldCoast[0] + rr(rng, -40, 190), y = A.goldCoast[1] + rr(rng, -90, 60);
    place(Bp, skierGeo(ri(rng, 1, 999), null, {}), x, y, gz(x, y), rr(rng, 0, 6.28));
  }
  for (let i = 0; i < 6; i++) {
    const x = A.highCamp[0] + rr(rng, -60, 60), y = A.highCamp[1] + rr(rng, -70, -40);
    place(Bp, skierGeo(ri(rng, 1, 999), null, { skis: false }), x, y, gz(x, y), rr(rng, 0, 6.28));
  }
  // a snowcat parked on the Snow King Road bench
  {
    const r = RUNS.find((q) => q.id === 'snow-king-road');
    const p = r.pts[Math.floor(r.pts.length * 0.32)];
    place(Bp, snowcatGeo(2), p[0], p[1], gz(p[0], p[1]) + 0.5, rad(200));
  }
  const propMesh = new THREE.Mesh(toGeo(THREE, Bp), SHEET);
  propMesh.name = 'people-props';
  propMesh.castShadow = true;
  scene.add(propMesh);

  // ---------------------------------------------------- moving chairs
  const chairIms = liftState.map((st, k) => {
    const n = Math.max(4, Math.floor(st.path.L * 2 / st.L.chairSpacing));
    // THE FUNITEL CARRIES CABINS, NOT CHAIRS, and the count is derived rather
    // than chosen: 4,032 pph / 28 passengers = 144 cabins an hour, at 6 m/s one
    // every 150 m (layout.mjs `chairSpacing`). Each hangs from a hanger that
    // grips BOTH ropes of its side (view-12), which is why it rides at
    // ROPE_ARM = 6.1 m off the axis rather than a chairlift's 3.0.
    const geo = st.L.funitel ? funitelCabin(50 + k) : chairGeo(k, st.L.seats);
    const im = new THREE.InstancedMesh(toGeo(THREE, geo), SHEET, n);
    im.name = (st.L.funitel ? 'cabins-' : 'chairs-') + st.L.id;
    im.castShadow = true; im.frustumCulled = false;
    im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(im);
    return { im, n, st };
  });
  // riders on some of the chairs
  // Riders on every FOURTH chair rather than every second. A lift that is half
  // full reads exactly like a lift that is a quarter full from the ground, and
  // the 84-tri seated skier is the single most expensive prop per pixel in the
  // world. Third dressing reclaim.
  const riderIms = liftState.map((st, k) => {
    // no exposed riders on the funitel — its 28 passengers are inside a glazed
    // box, and a seated skier modelled on the outside of one would be a lie
    if (st.L.funitel) return { im: null, n: 0, st };
    const n = Math.max(2, Math.floor(st.path.L * 2 / st.L.chairSpacing / 4));
    const im = new THREE.InstancedMesh(toGeo(THREE, skierGeo(70 + k, PAL.jacket[k % 6], { sit: true })), SHEET, n);
    im.name = 'riders-' + st.L.id;
    im.castShadow = false; im.frustumCulled = false;
    im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(im);
    return { im, n, st };
  });
  function placeChairs(t) {
    for (let k = 0; k < chairIms.length; k++) {
      const { im, n, st } = chairIms[k];
      const half = n / 2, L = st.path.L;
      for (let i = 0; i < n; i++) {
        const side = i < half ? 1 : -1;                 // up-line and down-line strands
        const j = i < half ? i : i - half;
        const s = (j * (L / half) + t * st.L.speed * (side > 0 ? 1 : -1)) % L;
        const p = st.path.at(s, side);
        _v.set(p.x, p.y, p.z);
        _e.set(0, 0, p.yaw + (side > 0 ? -Math.PI / 2 : Math.PI / 2), 'XYZ'); _q.setFromEuler(_e);
        _s.set(1, 1, 1); _m4.compose(_v, _q, _s);
        im.setMatrixAt(i, _m4);
      }
      im.instanceMatrix.needsUpdate = true;
      const R = riderIms[k];
      if (!R.im) continue;
      for (let i = 0; i < R.n; i++) {
        const s = ((i * 2) * (L / half) + t * st.L.speed) % L;
        const p = st.path.at(s, 1);
        _v.set(p.x, p.y, p.z - 2.55);
        _e.set(0, 0, p.yaw - Math.PI / 2, 'XYZ'); _q.setFromEuler(_e);
        _s.set(1, 1, 1); _m4.compose(_v, _q, _s);
        R.im.setMatrixAt(i, _m4);
      }
      R.im.instanceMatrix.needsUpdate = true;
    }
  }
  placeChairs(0);

  // ------------------------------------------------------ skiers descending
  // MOUNTAIN RUN and RIVIERA join the three Red Dog corridors: view-19's frame
  // has "skiers ahead" on the cruiser and view-9 has them "spread over the open
  // bench above and below", and an empty 3.4 km groomer is the one thing that
  // would make the upper mountain read as unfinished rather than as open.
  const skiPaths = ['red-dog-face', 'lower-dog-leg', 'red-dog-glades',
                    'mountain-run', 'riviera'].map((id) => {
    const r = RUNS.find((q) => q.id === id);
    const cum = [0];
    for (let i = 1; i < r.pts.length; i++)
      cum.push(cum[i - 1] + Math.hypot(r.pts[i][0] - r.pts[i - 1][0], r.pts[i][1] - r.pts[i - 1][1]));
    return { r, cum, L: cum[cum.length - 1] };
  });
  const skiIm = new THREE.InstancedMesh(toGeo(THREE, skierGeo(88, PAL.jacket[0], {})), SHEET, 15);
  skiIm.name = 'skiers-moving';
  skiIm.castShadow = true; skiIm.frustumCulled = false;
  skiIm.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  scene.add(skiIm);
  function placeSkiers(t) {
    let n = 0;
    for (let k = 0; k < skiPaths.length; k++) {
      const P = skiPaths[k];
      for (let q = 0; q < 3; q++) {
        const s = ((t * (9 + q * 2) + q * P.L / 3 + k * 40) % P.L);
        let i = 1;
        while (i < P.cum.length - 1 && P.cum[i] < s) i++;
        const f = (s - P.cum[i - 1]) / ((P.cum[i] - P.cum[i - 1]) || 1);
        const a = P.r.pts[i - 1], b = P.r.pts[i];
        const carve = Math.sin(t * 1.5 + q * 2 + k) * (P.r.width * 0.22);
        const dx = b[0] - a[0], dy = b[1] - a[1], dl = Math.hypot(dx, dy) || 1;
        const x = lerp(a[0], b[0], f) - dy / dl * carve;
        const y = lerp(a[1], b[1], f) + dx / dl * carve;
        _v.set(x, y, gz(x, y) + 0.05);
        _e.set(0, 0, Math.atan2(dy, dx) - Math.PI / 2 + Math.sin(t * 1.5 + q * 2 + k) * 0.5, 'XYZ');
        _q.setFromEuler(_e);
        _s.set(1, 1, 1); _m4.compose(_v, _q, _s);
        skiIm.setMatrixAt(n++, _m4);
      }
    }
    skiIm.instanceMatrix.needsUpdate = true;
  }
  placeSkiers(0);

  // ----------------------------------------------------------------- spawn
  // GENERATED by poi-lab tools/export-red-dog from tools/export-red-dog/
  // spawn.config.json (specs/0001 D33). DERIVED, not transcribed: the builder
  // walked snow-king-road 16 m past the point nearest the
  // red-dog-express top terminal and aimed at upper-champs[0].
  //
  // You have just unloaded at the top of Red Dog, skied right off the ramp for
  // about a second down the Snow King Road bench, and stopped on the flat
  // facing down Champs Elysees. Measured here: 8.9° of groomed cat track,
  // and the ground's own fall line bears -156° against a -161° aim — so
  // W commits down the run and gravity agrees with you.
  const SPAWN_XY = [306.94, -408.07];
  const spawn = {
    position: [SPAWN_XY[0], SPAWN_XY[1], gz(SPAWN_XY[0], SPAWN_XY[1]) + 0.05],
    lookAt: [110.00, -474.00, 357.70],
    eyeHeight: 0,
  };

  // ----------------------------------------------------------------- stats
  let draws = 0, tris = 0;
  scene.traverse((o) => {
    if (!o.isMesh) return;
    draws++;
    const g = o.geometry;
    if (!g || !g.attributes.position) return;
    const n = (g.index ? g.index.count : g.attributes.position.count) / 3;
    tris += n * (o.isInstancedMesh ? o.count : 1);
  });
  report.stats.drawCalls = draws;
  report.stats.triangles = Math.round(tris);
  report.stats.collidableTriangles = Math.round(colliders.reduce(
    (a, m) => a + (m.geometry ? (m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count) / 3 : 0), 0));
  report.stats.trees = F.big.length + F.mid.length + F.small.length;
  report.stats.cars = carPts.length + carPtsLo.length;
  report.stats.rocks = F.rocks.length + F.boulders.length;
  report.stats.buildMs = Math.round((globalThis.performance || Date).now() - t0);
  // increment 22: worst rope-to-ground clearance per line, measured on the node
  // lists the ropes were built from. `harness/lints/cable-clearance.mjs`
  // re-derives the same numbers from the shipped MESH instead of reading these,
  // so the two are an independent check rather than one number printed twice.
  report.cableClearance = cableClear;
  // increment 22: how many collidable triangles were too wide for the bench's
  // 6 m collision bins, and what capping their span at 36 m cost.
  report.collisionSplit = { village: vSplit, upper: uSplit, granite: gSplit };
  report.notes.push(`collision-safe split (36 m span cap): base-buildings ${vSplit.split} triangles `
    + `subdivided -> ${vSplit.tris} tris, upper-buildings ${uSplit.split} -> ${uSplit.tris}, `
    + `funitel-granite ${gSplit.split} -> ${gSplit.tris}`);
  report.sun = { az: SUN_AZ, el: SUN_EL };

  // KT-22's own landmarks, so cameras.mjs can pose the KT match-views off the
  // same numbers the world built from rather than off transcribed constants.
  const ktLine = liftState.find((st) => st.L.id === 'kt22-express');
  const ktT = ktLine.fr.at(ktLine.fr.L), ktB = ktLine.fr.at(0);
  const landmarks = {
    topTerminal: [TT.x, TT.y, gz(TT.x, TT.y)],
    baseTerminal: [...A.rdxBase.slice(0, 2), gz(A.rdxBase[0], A.rdxBase[1])],
    snowKing: [A.snowKing[0], A.snowKing[1], gz(A.snowKing[0], A.snowKing[1])],
    ktTopTerminal: [ktT.x, ktT.y, gz(ktT.x, ktT.y)],
    ktBaseTerminal: [ktB.x, ktB.y, gz(ktB.x, ktB.y)],
    ktStatue: [...KT.statue],
    ktPeak: [-913.4, -996.4, gz(-913.4, -996.4)],
    // ---- upper mountain increment 1 ----
    funitelBase: [A.funBase[0], A.funBase[1], gz(A.funBase[0], A.funBase[1])],
    funitelTop: [A.funTop[0], A.funTop[1], gz(A.funTop[0], A.funTop[1])],
    funitelTowers: funTowers,
    // the two STATIONS' own frames — centre, axis and plan — so the match-views
    // for views 36 / 41 / 51 / 66 can be posed off the building the world
    // actually built instead of off a transcribed constant. `[cx, cy, groundZ,
    // yaw, len, w]`.
    funitelBaseShed: funBase
      ? [funBase.c.x, funBase.c.y, gz(funBase.c.x, funBase.c.y), funBase.yaw, funBase.len, funBase.w]
      : null,
    funitelTopShed: funTop
      ? [funTop.c.x, funTop.c.y, gz(funTop.c.x, funTop.c.y), funTop.yaw, funTop.len, funTop.w]
      : null,
    // where the world says you stand to ride each lift — the match-views and
    // the QA both want it, and it is the number the ride fix moved
    liftLoads: liftState.map((st) => {
      const p = loadPoint(st);
      return { id: st.L.id, p: [+p[0].toFixed(2), +p[1].toFixed(2)], r: loadRadius(st) };
    }),
    goldCoast: [A.goldCoast[0], A.goldCoast[1], gz(A.goldCoast[0], A.goldCoast[1])],
    gcxBase: [A.gcxBase[0], A.gcxBase[1], gz(A.gcxBase[0], A.gcxBase[1])],
    highCamp: [A.highCamp[0], A.highCamp[1], gz(A.highCamp[0], A.highCamp[1])],
  };
  for (const r of RUNS) {
    landmarks[r.id + '-top'] = [r.pts[0][0], r.pts[0][1], gz(r.pts[0][0], r.pts[0][1])];
    const e = r.pts[r.pts.length - 1];
    landmarks[r.id + '-bot'] = [e[0], e[1], gz(e[0], e[1])];
  }

  return {
    scene, spawn, colliders,
    up: 'z',
    gear: 'skis',
    update: (t) => { placeChairs(t); placeSkiers(t); },
    report, landmarks,
    terrainHeight: gz,
    demAt, slopeAt, masksAt,
    // PLAYABLE.md `lifts` — the rideable-lift contract, all five lines of the
    // merged front side. World-frame ENU metres, same frame as everything else
    // in this module; `up:'z'` above tells the player how to read them.
    //
    // The contract's rule is that NEITHER point is the terminal node: the OSM
    // aerialway end node sits inside the shed this world builds on it, so a
    // load point there is one nobody can walk to and an unload point there
    // drops you on a roof. So, exactly as the Red Dog run declares them:
    //   base = LOAD, 11 m to the SIDE of the base shed, where the maze is
    //   top  = UNLOAD, 20 m back DOWN the line from the top shed, on the flat
    // `z` is a hint — the player re-probes the colliders — but both points are
    // dropped onto groundZ() here so they are over ground that exists.
    //
    //   RED DOG 917 m 6-pack · FAR EAST 673 m 6-pack · EXHIBITION 727 m fixed
    //   quad · OLYMPIC LADY 732 m fixed double · KT-22 1,425 m express quad
    //   = 4,474 m of lift line and 1,842 m of lift-served vertical, and with
    //   the teleport you can ride Red Dog up, ski Snow King Road to Easy
    //   Street, ride Exhibition, ski Women's Downhill, ride Olympic Lady, ski
    //   The Saddle to the KT summit — the whole front side without walking.
    lifts: liftState.map((st) => {
      const b = st.fr.at(0), t = st.fr.at(st.fr.L);
      // `loadPoint` / `unloadPoint` / `loadRadius` are at the top of this file
      // with the measurements that forced them. In one line: the two
      // increment-1 stations put their trigger where a player WALKS — in front
      // of the doors — instead of 16 m out to one side of the building in blank
      // snow, and the trigger is the size of the station rather than 4 m.
      const load = loadPoint(st);
      const unload = unloadPoint(st);
      return {
        id: st.L.id, name: LIFT_TITLE[st.L.id] || st.L.name, osmWay: st.L.osmWay,
        base: [+load[0].toFixed(2), +load[1].toFixed(2), +gz(load[0], load[1]).toFixed(2)],
        top: [+unload[0].toFixed(2), +unload[1].toFixed(2), +gz(unload[0], unload[1]).toFixed(2)],
        radius: loadRadius(st),
        speed: st.L.speed, chairSpacing: st.L.chairSpacing, seats: st.L.seats,
        plan: +st.fr.L.toFixed(1),
        // the terminal NODES themselves, for verification against OSM
        node: { base: [+b.x.toFixed(2), +b.y.toFixed(2), +b.z.toFixed(2)],
                top: [+t.x.toFixed(2), +t.y.toFixed(2), +t.z.toFixed(2)] },
      };
    }),
    runs: RUNS.map((r) => ({ id: r.id, name: r.name, style: r.style, width: r.width,
      inferred: !!r.inferred, sector: r.sector || null, pts: r.pts })),

    // PLAYABLE.md `markers` — the contract field, which did not exist when this
    // world shipped. Its ten front-side markers were baked into the player
    // (`bench/public/js/play/markers.js`, keyed 'palisades-front'); the contract
    // WINS when both exist, so all ten are carried here verbatim — converted
    // back out of the player's own (x, z_enu, -y_enu) storage into this world's
    // ENU — and increment 1's five are added beside them. Moving them into the
    // world is the point: a marker registry that lives in the player cannot be
    // kept honest by the run that owns the ground.
    //
    // `pos` is the place ON THE GROUND. `z` is a hint the player re-probes
    // against the shipped colliders, but every one of these is dropped onto
    // groundZ() here so it is over ground that exists.
    // D37a — filtered by POSITION at the bottom of this literal: eleven of the
    // seventeen are upper-mountain, and after the crop they are signs floating
    // over backdrop. Five is right for a 900 m box.
    markers: [
      { id: 'kt22', name: 'KT-22', kind: 'landmark', tier: 'major',
        pos: [-913.4, -996.4, gz(-913.4, -996.4)], sub: 'SUMMIT',
        tag: '2,460 m · the roof of the front side',
        line: 'The highest point in the frame, and the mountain Squaw was built around. Everything from here is down.' },
      { id: 'eagles-nest', name: "EAGLE'S NEST", kind: 'landmark', tier: 'minor',
        pos: [-894.2, -997.2, gz(-894.2, -997.2)], sub: 'SPIRES',
        tag: "McConkey's drops off the back",
        line: 'The spires on the summit knob. Shane McConkey’s run starts off the far side and does not ease you into it.' },
      { id: 'gs-bowl', name: 'GS BOWL', kind: 'ski-run', tier: 'mid', diff: 'black',
        pos: [-981.3, -942.0, gz(-981.3, -942.0)], sub: 'KT-22',
        tag: '2,431 m · patrol shack at the gate',
        line: 'The wide north-facing bowl off the KT summit. Cornice at the top, 170 m of fall line under it.' },
      { id: 'olympic-lady', name: 'OLYMPIC LADY', kind: 'lift', tier: 'minor',
        pos: [-685.1, -1027.2, gz(-685.1, -1027.2)], sub: 'TOP STATION',
        tag: '732 m · fixed double',
        line: 'The smallest chair on the front side, and the one that ties KT-22 to Exhibition. Unload here for The Saddle.' },
      { id: 'exhibition', name: 'EXHIBITION', kind: 'lift', tier: 'minor',
        pos: [-591.7, -297.6, gz(-591.7, -297.6)], sub: 'TOP STATION',
        tag: '727 m · fixed quad',
        line: 'Six runs start within 12 m of this station — Easy Street, Julia’s Gold, Schimmelpfennig Bowl among them.' },
      { id: 'red-dog-express', name: 'RED DOG EXPRESS', kind: 'lift', tier: 'major',
        pos: [322.5, -401.8, gz(322.5, -401.8)], sub: 'TOP STATION',
        tag: '917 m · six-pack',
        line: 'The 2023 six-pack, unloading on the Snow King knoll. The whole east half of the front side hangs off this point.' },
      { id: 'red-dog-face', name: 'RED DOG FACE', kind: 'ski-run', tier: 'mid', diff: 'double',
        pos: [-276.5, -135.3, gz(-276.5, -135.3)], sub: 'MOGULS',
        tag: '86 m wide · 600 m of bumps',
        line: 'The bump run the resort races on. Every mogul on it was built by somebody braking.' },
      // POULSEN'S GULLY — increment 21. Two markers, and they are given
      // different tiers on purpose: the fork and the cliff band are 120 m apart
      // and PLAYABLE.md's anti-clutter device for exactly that case is to stack
      // them by tier rather than let two signs overlap.
      { id: 'poulsens-gully', name: "POULSEN'S GULLY", kind: 'ski-run', tier: 'major', diff: 'double',
        pos: [POU_ANCHORS.fork[0], POU_ANCHORS.fork[1], gz(POU_ANCHORS.fork[0], POU_ANCHORS.fork[1])],
        sub: 'THE FORK', tag: '698 m · 289 m vertical · three entrances',
        line: 'Named for Wayne Poulsen, who founded the valley. Three ways in off the Red Dog traverse, and the third one has a cliff you cannot see until you are on it.' },
      // POU_LIP is the BUILT crest, not the DEM point — the edge a player
      // actually stands on. It is an `export let` set by `buildPoulsen`, which
      // has already run by the time this object literal is evaluated; the
      // fallback is the bake's own centre in case it ever has not.
      { id: 'poulsens-cliff', name: 'THE CLIFF BAND', kind: 'landmark', tier: 'minor',
        pos: POU_LIP ? [POU_LIP[0], POU_LIP[1], POU_LIP[2]]
                     : [POU_BAND.centre[0], POU_BAND.centre[1], gz(POU_BAND.centre[0], POU_BAND.centre[1])],
        sub: '2,140 m', tag: 'patrol disc on the lip',
        line: 'A 5 m step in bare rock, 105 m below the fork. The roll above it is convex, so the landing is hidden until you have committed.' },
      { id: 'race-venue', name: 'FINISH ARENA', kind: 'venue', tier: 'minor',
        pos: [-309.5, 384.7, gz(-309.5, 384.7)], sub: 'GS COURSE',
        tag: 'Stifel Palisades Tahoe Cup',
        line: 'Finish arch, A-net and a banner wall at the foot of the Face. Come through it fast and the crowd is yours.' },
      { id: 'base-area', name: 'THE VILLAGE', kind: 'venue', tier: 'major',
        pos: [-270.0, 515.0, gz(-270.0, 515.0)], sub: 'BASE AREA',
        tag: '1,890 m · lifts, lodges, lots',
        line: 'The valley floor. Five lift bases meet here, and every run in the world ends somewhere on this flat.' },
      { id: 'kt22-base', name: 'KT-22 EXPRESS', kind: 'lift', tier: 'minor',
        pos: [-481.8, 359.0, gz(-481.8, 359.0)], sub: 'BASE STATION',
        tag: '1,425 m · express quad',
        line: 'The load for KT-22. Ride it and you are on the summit — 535 m of vertical in one lift line.' },
      // ---------------------------------- UPPER MOUNTAIN INCREMENT 1
      // NB: none of these four sits on its own OSM node. A marker's `pos` is
      // the ground a player WALKS TO, and the player settles the sign onto
      // whatever collider it finds under the point — so a marker on the Funitel's
      // terminal node settles 15 m up, on the shed's roof. Measured, then moved:
      // the two lift markers stand on their own declared LOAD and UNLOAD points
      // and the two venue markers on the open snow south of their buildings.
      { id: 'funitel-base', name: 'FUNITEL', kind: 'lift', tier: 'mid',
        pos: [-395.1, 450.0, gz(-395.1, 450.0)],
        sub: 'BASE STATION', tag: '1,899 m · the only funitel in the US',
        line: 'Twin haul ropes, 28-passenger cabins, and 526 m of vertical to Gold Coast in eight and a half minutes.' },
      { id: 'funitel-top', name: 'FUNITEL TOP', kind: 'lift', tier: 'major',
        pos: [-2912.5, -310.1, gz(-2912.5, -310.1)],
        sub: 'GOLD COAST', tag: '2,425 m · 2,730 m of line',
        line: 'The unload, joined to the east end of the Gold Coast lodge. Ski off it onto Riviera and the whole bench is yours.' },
      { id: 'gold-coast', name: 'GOLD COAST', kind: 'venue', tier: 'mid',
        pos: [-2995, -372, gz(-2995, -372)],
        sub: 'MID-MOUNTAIN LODGE', tag: '2,407 m · 17.2° of open bowl',
        line: 'A lodge, a funitel and a six-pack on the flattest big snowfield at Palisades. Pines stand in it rather than around it.' },
      { id: 'high-camp', name: 'HIGH CAMP', kind: 'venue', tier: 'major',
        pos: [A.highCamp[0], 285, gz(A.highCamp[0], 285)],
        sub: 'TRAM TOP', tag: '2,475 m · 224 m above Mountain Run',
        line: 'Concrete and glass on the ridge, 783 m from Gold Coast and a separate place from it. Mountain Run starts just below.' },
      { id: 'mountain-run', name: 'MOUNTAIN RUN', kind: 'ski-run', tier: 'major', diff: 'blue',
        pos: [A.mrTop[0], A.mrTop[1], gz(A.mrTop[0], A.mrTop[1])],
        sub: 'THE CRUISER', tag: '3,445 m · 546 m vertical · 9.0°',
        line: 'Top to bottom without a flat spot worth the name, and it finishes 20 m from the Funitel you rode up.' },
      // ---- increment 3. Two of the three remaining marker slots; the cap is 20
      // and this takes the world to 17. The park is what a visitor standing on
      // the Gold Coast bench would ask about, and the hip is the thing the
      // resort itself names.
      { id: 'gold-coast-park', name: 'GOLD COAST PARK', kind: 'venue', tier: 'major',
        pos: (() => { const [x, y] = parkToWorld(120, 6); return [x, y, parkSurfaceZ(x, y) ?? gz(x, y)]; })(),
        sub: 'TERRAIN PARK', tag: 'three-pack · the hip · the rail garden',
        line: 'A three-pack of larger jumps, the famous Gold Coast Hip and a rail garden threaded through them, all under the six-pack.' },
      { id: 'gold-coast-hip', name: 'THE HIP', kind: 'landmark', tier: 'mid',
        pos: (() => { const [x, y] = parkToWorld(PARK_HIP.tc - 26, PARK_HIP.vc); return [x, y, parkSurfaceZ(x, y) ?? gz(x, y)]; })(),
        sub: 'GOLD COAST HIP', tag: '30 ft × 25 ft × 50 ft (2025 build)',
        line: 'Two days of cat work for one feature. It is a speed brake as much as a jump — it bleeds you off and points you at the rails.' },
    ].filter((m) => m.pos[0] > -620 && m.pos[1] < 740),
  };
}

export default buildWorld;
