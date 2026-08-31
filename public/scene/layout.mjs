// PALISADES FRONT SIDE — Red Dog + Exhibition + Olympic Lady + KT-22 — the
// layout register for the MERGED world.
//
// WORLD FRAME: ENU metres. +X east, +Y north, +Z up. Origin = centre of
// red-dog-palisades/aerial.jpg's frame (39.19197, -120.23108). z = 0 at
// 1890.0 m ASL. `world.mjs` declares up:'z'.
//
// THIS IS RED DOG'S FRAME, UNCHANGED, AND IT IS THE WORLD'S. The merge adds
// no second origin and no re-registration: the KT-22 bundle's own vectors and
// rasters are in Web-Mercator like everything else, so they are read straight
// through this transform by bbox arithmetic. KT-22's top station lands at
// (-959.4, -983.6) — 1,374 m SSW of the origin — and its base at (-481.8,
// +359.0), 601 m WSW, on the same valley floor as the Red Dog base terminal.
//
// Everything here is either (a) baked straight out of the input bundle
// (runs-data.mjs <- red-dog-runs.geojson, OSM), or (b) explicitly marked
// `inferred` and justified in REPORT.md. Base-area massing is read off
// aerial-2.jpg (1.5625 m/px, bbox shared with dem-wide.tif) and views 9/13/29.
//
// SCALING NOTE (this is the Palisades pilot): a second pod is added by baking
// its geojson + DEM into runs-data/dem-data and appending to RUNS / LIFTS here.
// Nothing downstream knows the names "Red Dog" or "Snow King".

import { OSM_FEATURES, byName } from './runs-data.mjs';
import { SECTORS_DATA } from './sector-data.mjs';
import { KT_LINES, KT_SHAPE } from './kt-runs-data.mjs';
import { POU_GULLY, POU_E1, POU_E2, POU_E3, POU_BAND, POU_ANCHORS } from './pou-data.mjs';
// A DERIVED LINE CAN BE DROPPED BY ITS OWN BAKE. work/bake_kt_runs.mjs clips a
// line's terminal ingress onto the protected front side, and a line that clips to
// nothing is not shipped as a stub — the Waterfall Gully is the one this catches
// (work/KT-GUARD-DECISION.md §2). So `KL` returns an empty line rather than
// throwing, and the RUNS array below drops any `ktRuns` entry left with no
// geometry. Everything that lists lines by id (`detailBox`, the sign pass) already
// resolves through `runById`, which simply will not find it.
const KL = (id) => (KT_LINES[id] && KT_LINES[id].pts) || [];

export const ORIGIN_LAT = 39.19197, ORIGIN_LON = -120.23108, Z_DATUM = 1890.0;

// ------------------------------------------------------- promoted sectors
// A SECTOR is a piece of the dem-wide surround that has been promoted from
// scenery to playable terrain (work/bake_sector.py; REPORT §13). It brings its
// own OSM ways, its own 2.0 m/px canopy crop out of aerial-2.jpg, and a
// collidable corridor-grade grid over the band within `reach` m of its
// centrelines. Everything downstream reads SECTORS, not the word "Exhibition".
// `box` is the bounding box of the sector's own centrelines; `grown` adds
// reach + 2 cells, so the promoted band is strictly inside the grid that builds
// it. If the band ever crossed the grid edge, neither the sector grid nor the
// coarse surround grid would own those cells and you would see through the
// floor — that is exactly what the first cut of this did at x = -830.
export const SECTORS = Object.values(SECTORS_DATA).map((S) => {
  const m = S.reach + 2 * S.step;
  return {
    id: S.id, name: S.name, box: S.box, reach: S.reach, step: S.step,
    grown: { x0: S.box.x0 - m, x1: S.box.x1 + m, y0: S.box.y0 - m, y1: S.box.y1 + m },
    lines: S.features.map((f) => f.pts),
  };
});
const sec = (sid, name) => {
  const f = SECTORS_DATA[sid].features.find((q) => q.name === name);
  if (!f) throw new Error(`sector ${sid} has no feature "${name}"`);
  return f;
};
const EXF = (name) => sec('exhibition', name);
const OLF = (name) => sec('olympiclady', name);
const KTF = (name) => sec('kt22', name);
const KWF = (name) => sec('ktwest', name);
// ---- UPPER MOUNTAIN INCREMENT 1 ----
const MRF = (name) => sec('mountainrun', name);
const URF = (name) => sec('upperrunout', name);
const FNF = (name) => sec('funitel', name);
const GCF = (name) => sec('goldcoast', name);

// PLAY0 — the merged world's OWN playable extent, frozen.
// The 2.0 m ground raster, the 5.0 m shade raster and the 8.0 m sector-distance
// field are all laid out from PLAY, and PLAY grew by 2.6 km west with increment
// 1. If their ORIGINS moved with it, every bilinear sample under the four
// verified sectors would land on a different phase of the lattice and the whole
// front side would shift by a few centimetres for no reason at all. So the
// rasters GROW westward in whole cells from this frozen anchor instead of being
// re-laid — see ground.mjs RX0, terrain.mjs SH_X0 and SD_X0 below.
const FRONT_SECTORS = ['exhibition', 'olympiclady', 'kt22', 'ktwest'];

// ---------------------------------------------------------------- anchors
// lat/lon from annotations.md, converted with the same projection as bake.py.
export const A = {
  rdxBase:    [-128.4,  396.6,   7.0],   // Red Dog Express base   1897 m
  rdxTop:     [ 322.5, -401.8, 403.8],   // Red Dog Express top    2294 m
  snowKing:   [ 344.4, -433.7, 414.5],   // Snow King high point   2304.5 m
  feeBase:    [  50.4,  459.8,   0.7],   // Far East Express base  1891 m
  feeTop:     [ -48.6, -206.1, 293.1],   // Far East Express top   2183 m
  valleyLow:  [ 544.1,  608.2,  -4.9],   // frame low point        1885 m
  // ---- the merge's own anchors, all OSM nodes / 3DEP extrema ----
  ktBase:     [-481.8,  359.0,  10.3],   // KT22 Express base      1900.3 m
  ktTop:      [-959.4, -983.6, 545.5],   // KT22 Express top       2435.5 m
  ktSummit:   [-913.4, -996.4, 570.8],   // KT-22 DEM high point   2460.8 m — the
                                         // roof of the whole world, +25.2 m over
                                         // the unload flat in 47 m of plan
  gsBowlTop:  [-981.3, -942.0, 541.0],   // GS Bowl OSM top node   2431.0 m,
                                         // 45 m NNW of the station, at the
                                         // patrol shack (verified in the aerial)
  eaglesNest: [-894.2, -997.2, 552.0],   // McConkey's OSM low node 2442 m
  olyTop:     [-685.1,-1027.2, 519.0],   // Olympic Lady top       2409 m
  olyBase:    [-400.9, -352.9, 180.0],   // Olympic Lady base      2070 m
  exhBase:    [-372.7,  395.4,  12.1],   // Exhibition base        1902.1 m
  exhTop:     [-591.7, -297.6, 258.2],   // Exhibition top         2148.2 m
  // ---- UPPER MOUNTAIN INCREMENT 1 — "the loop" ----
  // Every one of these is an OSM node or an OSM building centroid carried
  // through the same transform (work/bake_sector.py, work/bake_upper_props.py).
  funBase:    [-389.1,  428.8,   9.2],   // Gold Coast Funitel base terminal node
                                         //   1899.2 m — INSIDE the merged
                                         //   world's own tight frame, 20.3 m
                                         //   from Mountain Run's last vertex
                                         //   and 23.7 m from Easy Street's
  funTop:     [-2931.7, -315.6, 535.4],  // Funitel TOP terminal node  2425.4 m,
                                         //   1.6 m from the Gold Coast Lodge
                                         //   ring's own ENE end (view-9)
  goldCoast:  [-2993.6, -325.3, 517.5],  // Gold Coast Lodge block centroid
  gcxBase:    [-2879.9, -442.8, 522.4],  // Gold Coast Express base    2412.4 m
  gcxTop:     [-3796.6, -310.2, 694.2],  // Gold Coast Express top     2584.2 m
  highCamp:   [-2579.3,  347.8, 584.0],  // High Camp complex centroid 2474.8 m
                                         //   — 224 m NNE of Mountain Run's top
                                         //   node and a SEPARATE place from
                                         //   Gold Coast (REPORT §17.4)
  mrTop:      [-2646.5,  134.1, 553.2],  // Mountain Run top node      2443.2 m
  mrBot:      [ -474.4,  383.0,   7.6],  // Mountain Run last vertex   1897.6 m
};

// -------------------------------------------------------------- inferred
// Upper Dog Leg â€” no OSM way. Routed by work/route.py: start on the Snow King
// ridge shoulder just W of the top terminal (the trail map puts Upper Dog Leg
// there, and views 16-17 are shot on it), then a DEM fall-line walk down into
// the Dog Leg drainage, landing exactly on the top node of OSM's Lower Dog Leg.
// 322 m plan / 76 m vertical / 13.3 deg mean â€” the wind-scoured roll-in of
// view-16, steepening into the OSM gully below.
export const UPPER_DOG_LEG = [
  [198, -437, 373.8], [186.3, -429.5, 369.6], [175, -421.2, 364.6],
  [164.5, -412.1, 358.7], [154.7, -402.3, 352.7], [145.3, -392, 346.7],
  [136.3, -381.3, 340.8], [128.2, -370.1, 335.2], [121.7, -358, 330.5],
  [117, -345.2, 327.1], [113.8, -331.8, 324.9], [111, -318.2, 323.1],
  [107.6, -304.7, 321.5], [103.1, -291.7, 320.1], [96.6, -279.7, 318.6],
  [88.1, -269.3, 316.6], [77.6, -260.9, 313.7], [65.7, -254.6, 309.9],
  [52.8, -250.2, 306], [39.3, -247.2, 303], [25.6, -245.2, 301.1],
  [12, -244.1, 299.8], [-1.3, -243.7, 298.7], [-14.2, -243.5, 297.7],
];

// upper Champs Elysees â€” no OSM way. Routed by work/route.py as a graded
// TRAVERSE (target 22% descent) from the Snow King ridge WSW under Red Dog
// Ridge to the top node of OSM's Lower Champs Elysees. 685 m plan / 113 m
// vertical / 9.4 deg â€” a traverse, not a pitch, exactly as annotations.md says.
export const UPPER_CHAMPS = [
  [110, -474, 357.7], [93.8, -481.9, 357.5], [77.7, -489.8, 357.4],
  [61.4, -497.5, 357.2], [45.1, -505.2, 357.1], [28.7, -512.6, 356.9],
  [12.3, -520, 356.8], [-4.2, -527.1, 356.6], [-20.8, -534.2, 356.5],
  [-37.4, -541, 356.2], [-54.1, -547.7, 355.5], [-70.9, -554.3, 353.9],
  [-87.7, -560.7, 351.2], [-104.6, -566.9, 347.7], [-121.5, -573, 343.7],
  [-138.5, -578.9, 338.5], [-155.6, -584.6, 332], [-172.7, -590.2, 324.4],
  [-189.9, -595.6, 316.5], [-207.1, -600.8, 308.4], [-224.4, -605.8, 300.1],
  [-241.7, -610.6, 292.2], [-259.1, -615.3, 284.9], [-276.6, -619.8, 278.1],
  [-294, -624, 271.7], [-311.6, -628.1, 265.5], [-329.1, -632, 259.8],
  [-346.6, -635.7, 254.8], [-363, -639, 250.8], [-376.9, -641.7, 247.6],
  [-389, -644, 244.7],
];

// Base run-out spine â€” the flat you ski across to the base terminal (view-25,
// view-30). Read off aerial-2.jpg's snow apron between the trees and the lots.
export const BASE_RUNOUT = [
  [-338, 396, 12], [-300, 408, 10], [-250, 414, 8.6], [-200, 416, 7.8],
  [-160, 412, 7.3], [-128, 404, 7.0], [-90, 400, 6.6], [-40, 404, 5.6],
  [10, 410, 4.4], [70, 412, 3.4], [130, 400, 6.0], [180, 372, 12.0],
  [205, 344, 20.0],
];

// The WEST arm of the base flat. The base area is a Y, not a line: Red Dog Face
// arrives in the middle, the Red Dog base terminal is east, and the EXHIBITION
// base terminal (-372.7, +395.4) is west — which is where Easy Street, Julia's
// Gold, Home Run, Mountain Run and Sunnyside all come out. Carried as its own
// run-out rather than as a westward tail on BASE_RUNOUT, so the pod's own
// descents still finish where they always did. Read off the same aerial-2 snow
// apron between the trees and the lots.
// THE MERGE'S OWN GROUND. The base run's west arm stopped at (-440, 384),
// 45 m short of the KT-22 base terminal. It now runs the whole way past it to
// (-545, 378), which is where Mountain Run (bottom node -474.4, +383.0) and
// Sunnyside (-493.0, +420.6) come out of KT-22. Every Z is a 3DEP read through
// the merged DEM stack, lightly smoothed the way a groomed run-out is
// (work/base_flat.py) — the base run's four vertices were hand-written.
// 211 m plan, 4.6 m of fall.
export const BASE_WEST = [
  [-338, 396, 12.3], [-372, 398, 11.6], [-405, 392, 10.8], [-440, 384, 9.8],
  [-468, 377, 8.9], [-495, 372, 8.5], [-520, 372, 8.3], [-545, 378, 7.7],
];

// The KT-22 base terminal's own apron, joining the west arm. 63 m, dead flat
// (0.3 m of fall) — this is the load area you ski into off Mountain Run.
export const BASE_KT = [
  [-500, 340, 9.3], [-492, 355, 9.6], [-482, 368, 9.5], [-472, 379, 9.1],
  [-458, 384, 9.0],
];

// ------------------------------------------- MOUNTAIN RUN, top to bottom
// UPPER MOUNTAIN INCREMENT 1. One OSM way (248606026 v6, 2026-06-06, 59 nodes),
// 3,445 m plan / 545.6 m vertical / 9.0 deg mean, High Camp's shoulder at
// 2443.2 m to the village at 1897.6 m — and the merged world already carried
// its last 900 m, promoted by the EXHIBITION sector and clipped at x = -900.
//
// THE SEAM IS INSIDE THE RUN, WHICH IS THE POINT. Rather than re-promote the
// whole way (which would have re-baked a verified sector), the increment
// promotes only the part WEST of x = -900 and joins it to the part the world
// already had. Both halves are `clip_west`/`clip_east` of THE SAME OSM way at
// THE SAME x, so they share an identical interpolated vertex, and both take
// their Z from the same 3DEP stack at that vertex. Measured at bake time:
// join dxy 0.000 m, dz 0.000 m (work/bake_sector.py). The corridor width is the
// same 56 m either side — aerial-2 measures 55.5 m over the lower half and this
// increment's own bundle measures 55.7 m over the whole run on 0.342 m/px
// imagery, which is corroboration, not a coincidence.
const MRW = MRF('Mountain Run').pts, MRE = EXF('Mountain Run').pts;
export const MOUNTAIN_RUN = [...MRW, ...MRE.slice(1)];

// ------------------------------------------------------------------- runs
// style drives the ground treatment AND the tree density field:
//   groomed  corridor flattened cross-slope, corduroy, no trees
//   moguls   groomed base + an analytic bump field on the steep section
//   glade    NOT flattened; trees thinned to skiable spacing (Red Dog Glades,
//            Secret Garden â€” the pod's signature; widths.py finds only 1/13 of
//            Red Dog Glades' vertices in open ground, i.e. it is under canopy)
//   cat      narrow bench cut across the fall line (Snow King Road)
//   traverse gentle graded lane
//   runout   the base flat
//
// width = full corridor width in metres. Measured with work/widths.py by
// walking the aerial's open/canopy mask along each centreline normal
// (aerial.jpg, 0.4883 m/px, summer, cut corridors clearly visible):
//   Red Dog Face   median 72.5 m (p25 33, p75 87)   10/15 vertices in open
//   Lower Dog Leg  median 52.5 m                     2/15 in open (gully)
//   Secret Garden  38 m      Snow King Road 29 m     Lower Champs 22 m
//   Red Dog Glades 28 m open, under canopy -> glade
const R = (o) => ({ inferred: false, sign: true, ...o });

export const RUNS = [
  R({ id: 'upper-dog-leg', name: 'UPPER DOG LEG', diff: 'black', style: 'groomed',
      width: 56, pts: UPPER_DOG_LEG, inferred: true,
      note: 'trail map + DEM fall line; no OSM geometry' }),
  R({ id: 'lower-dog-leg', name: 'LOWER DOG LEG', diff: 'black', style: 'moguls',
      width: 52, bump: [0.16, 0.78], pts: byName['Lower Dog Leg'].pts }),
  R({ id: 'upper-champs', name: 'CHAMPS ELYSEES', diff: 'black', style: 'traverse',
      width: 30, pts: UPPER_CHAMPS, inferred: true,
      note: 'trail map + DEM graded traverse; no OSM geometry' }),
  R({ id: 'lower-champs', name: 'LOWER CHAMPS ELYSEES', diff: 'black', style: 'traverse',
      width: 26, pts: byName['Lower Champs Elysees'].pts, sign: false }),
  R({ id: 'red-dog-face', name: 'RED DOG FACE', diff: 'black', style: 'moguls',
      width: 86, bump: [0.34, 0.72], pts: byName['Red Dog Face'].pts, race: true }),
  R({ id: 'red-dog-glades', name: 'RED DOG GLADES', diff: 'black', style: 'glade',
      width: 62, pts: byName['Red Dog Glades'].pts }),
  R({ id: 'secret-garden', name: 'SECRET GARDEN', diff: 'black', style: 'glade',
      width: 46, pts: byName['Secret Garden'].pts }),
  R({ id: 'snow-king-road', name: 'SNOW KING ROAD', diff: 'blue', style: 'cat',
      width: 17, pts: byName['Snow King Road'].pts }),
  R({ id: 'red-dog-ridge', context: true, name: 'RED DOG RIDGE', diff: 'black', style: 'traverse',
      width: 24, pts: byName['Red Dog Ridge'].pts, sign: false }),
  R({ id: 'base-runout', name: 'BASE', diff: 'green', style: 'runout',
      width: 96, pts: BASE_RUNOUT, sign: false }),
  R({ id: 'base-west', name: 'BASE WEST', diff: 'green', style: 'runout',
      width: 70, pts: BASE_WEST, sign: false,
      note: 'the west arm of the base flat: Exhibition base terminal -> KT-22 base ' +
            'terminal. THE MERGE SEAM ON THE VALLEY FLOOR — extended 105 m west of ' +
            'the base run and re-Zed off 3DEP (work/base_flat.py)' }),
  R({ id: 'base-kt', name: 'KT-22 BASE', diff: 'green', style: 'runout',
      width: 56, pts: BASE_KT, sign: false,
      note: 'the KT-22 base terminal apron, joining BASE WEST' }),
  // pod context: the neighbouring named runs that fall inside the terrain frame
  R({ id: 'far-east', context: true, name: 'FAR EAST', diff: 'blue', style: 'groomed',
      width: 44, pts: byName['Far East'].pts, sign: false }),
  R({ id: 'heidis', context: true, name: "HEIDI'S", diff: 'black', style: 'groomed',
      width: 40, pts: byName["Heidi's"].pts, sign: false }),

  // ------------------------------------------- EXHIBITION SECTOR (promoted)
  // All ten are OSM ways re-queried 2026-08-28 (work/bake_sector.py), carried
  // through the same transform, Z per vertex from 3DEP. Widths are MEASURED by
  // walking each vertex normal on aerial-2.jpg's open/canopy mask (1.5625 m/px
  // — coarser than the pod's 0.488 m/px aerial.jpg, which does not reach here;
  // that is the corridor-grade trade). Where aerial.jpg DOES cover a run, its
  // finer measurement wins: Julia's Gold keeps the 82 m of §4.
  //
  // EASY STREET is the run Greg was skiing. It leaves the Exhibition top
  // station, switchbacks SOUTH to (-467,-616) — 85 m from and 20 m below the
  // bottom of Snow King Road, which is how you get onto it from the Red Dog top
  // terminal — then loops WEST to x = -726 before running the whole way down to
  // the Exhibition base. Its western loop is 256 m beyond the old CORE edge.
  R({ id: 'easy-street', name: 'EASY STREET', diff: 'blue', style: 'traverse',
      width: 34, pts: EXF('Easy Street').pts, sector: 'exhibition',
      note: 'aerial-2 median 34.5 m, 55/65 vertices measurable, 58 in open ground' }),
  R({ id: 'julias-gold', name: "JULIA'S GOLD", diff: 'blue', style: 'groomed',
      width: 82, pts: EXF("Julia's Gold").pts, sector: 'exhibition',
      note: 'width from aerial.jpg (0.488 m/px, S4 — the finer aerial wins where it ' +
            'covers a run); aerial-2 whole-line median is 56.2 m' }),
  R({ id: 'schimmelpfennig', name: 'SCHIMMELPFENNIG BOWL', diff: 'black', style: 'glade',
      width: 44, pts: EXF('Schimmelpfennig Bowl').pts, sector: 'exhibition',
      note: 'only 2/11 vertices in open, walk terminates at 3 m -> under canopy, glade like ' +
            'Red Dog Glades; width not measurable, carried at the pod glade convention' }),
  R({ id: 'womens-downhill', name: "WOMEN'S DOWNHILL", diff: 'black', style: 'groomed',
      width: 38, pts: EXF("Women's Downhill").pts, sector: 'exhibition',
      note: 'aerial-2 median 37.5 m, 24/26 vertices measurable, 20 in open' }),
  R({ id: 'strawberry-fields', name: 'STRAWBERRY FIELDS', diff: 'black', style: 'groomed',
      width: 48, pts: EXF('Strawberry Fields').pts, sector: 'exhibition',
      note: 'aerial-2 median 48.0 m, 12/13 vertices measurable, 9 in open' }),
  R({ id: 'tamaras', name: "TAMARA'S", diff: 'black', style: 'glade',
      width: 40, pts: EXF("Tamara's").pts, sector: 'exhibition',
      note: 'only 7/16 vertices in open, walk terminates at 3 m -> under canopy, glade; ends on the ' +
            'top node of Lower Champs Elysees' }),
  R({ id: 'home-run', name: 'HOME RUN', diff: 'blue', style: 'traverse',
      width: 21, pts: EXF('Home Run').pts, sector: 'exhibition',
      note: 'aerial-2 median 21.0 m, 21/25 vertices measurable, 23 in open; clipped at x=-900 ' +
            '(the rest belongs to the KT-22 sector)' }),
  R({ id: 'mountain-run', name: 'MOUNTAIN RUN', diff: 'blue', style: 'groomed',
      width: 56, pts: MOUNTAIN_RUN, sector: 'mountainrun', sign: true,
      note: 'THE FULL 3,445 m CRUISER, High Camp shoulder (2443.2 m) to the village ' +
            '(1897.6 m). OSM way 248606026 v6 2026-06-06. Its last 900 m were already ' +
            'in this world (EXHIBITION sector, clipped at x=-900); increment 1 adds ' +
            'the 2,874 m west of that as the MOUNTAIN RUN sector. The two halves are ' +
            'the same way clipped at the same x and join at 0.000 m / 0.000 m. Width ' +
            '56 m: aerial-2 median 55.5 over the lower half, palisades-upper median ' +
            '55.7 over the whole run (p10 33.7, p90 76.0, 78 % of rays saturated — a ' +
            'FLOOR, because this is open bowl, not a cut corridor)' }),
  R({ id: 'sunnyside', name: 'SUNNYSIDE', diff: 'blue', style: 'groomed',
      width: 40, pts: EXF('Sunnyside').pts, sector: 'exhibition', sign: false,
      note: 'aerial-2 median 39.8 m, 16/19 vertices measurable, 16 in open; clipped at x=-900' }),

  // ---------------------------------------------- KT-22 SECTOR (promoted)
  // Six OSM ways re-queried live 2026-08-28 (work/bake_sector.py), carried
  // through the SAME transform, Z per vertex from the merged 3DEP stack —
  // for these six that is eagles-nest-kt22/dem-tight at 1.5625 m/px, 0.60 m
  // better in the mean than the dem-wide surround they used to sit on.
  //
  // WIDTHS ON KT ARE A DIFFERENT PROBLEM FROM WIDTHS ON RED DOG. Red Dog's
  // runs are corridors CUT through a fir stand, so walking the aerial's
  // canopy edge measures them. KT-22's front side is ungroomed freeride
  // terrain above the stand line: there is no cut to find, and the walk
  // reports whatever the first alpine scrub bush is. Two instruments are
  // therefore run (bake_sector.measure_width) and both are recorded per way:
  //   `width`     the cut walk — stop at the first canopy pixel
  //   `widthBand` the stand walk — stop where canopy fraction over 20 m > 0.55
  // Where they agree the number is a measurement. Where both terminate at the
  // first sample the finding is "this line is under canopy / on rock", which
  // is exactly the finding that made Red Dog Glades a glade, and the run
  // carries the pod's glade convention with `wsrc: 'convention'`.
  R({ id: 'gs-bowl', name: 'GS BOWL', diff: 'black', style: 'bowl',
      width: 68, bump: [0.10, 0.92], pts: KTF('GS Bowl').pts, sector: 'kt22',
      wsrc: 'measured',
      note: 'MEASURED 67.5 m on aerial-close (0.293 m/px, the finest imagery in the ' +
            'world), 12/13 vertices measurable, 11 in open. The one KT line the ' +
            'aerial can measure properly. Its top node is 45 m NNW of the KT-22 top ' +
            'station, at the patrol shack, and it falls NE — the CORNICE side, ' +
            'skier\'s RIGHT at the unload' }),
  R({ id: 'mcconkeys', name: "McCONKEY'S", diff: 'black', style: 'freeride',
      width: 26, pts: KTF("McConkey's").pts, sector: 'kt22', wsrc: 'convention',
      note: "the Eagle's Nest drop. OSM way 1536492630, v1 CREATED 2026-07-08 — new " +
            'this season, and it corroborates the corrected LEFT/E-SE placement of ' +
            'the spires. 103 m at 39.5 deg mean. Cut walk 5.2 m (4/5 vertices) and ' +
            'stand walk 3.0 m: both terminate, because this is a rock face in ' +
            'shadow, not a corridor. 26 m is CHOSEN — a chute width consistent with ' +
            'view-13 (a skier on the ~65 deg spire face) and view-5 (the notch)' }),
  R({ id: 'the-fingers', name: 'THE FINGERS', diff: 'black', style: 'freeride',
      width: 34, pts: KTF('Fingers').pts, sector: 'kt22', wsrc: 'convention',
      note: 'the rock reef under the upper-mid lift line, N-facing (views 4, 11, 12). ' +
            'OSM way 248622079 is a 2-NODE STUB, 149 m — the reef itself carries ~9 ' +
            'named chute lines and OSM has none of them. Both walks terminate (the ' +
            'reef reads as shadow); 34 m is CHOSEN' }),
  R({ id: 'the-nose', name: 'THE NOSE', diff: 'black', style: 'freeride',
      width: 30, pts: KTF('Nose').pts, sector: 'kt22', wsrc: 'floor',
      note: 'cut walk 10.5 m over 20/21 vertices — a measured FLOOR on a ridge line ' +
            'threaded between rock; stand walk terminates. 30 m is chosen above it' }),
  R({ id: 'moseleys', name: "MOSELEY'S", diff: 'black', style: 'glade',
      width: 46, pts: KTF("Moseley's (aka West Face)").pts, sector: 'kt22',
      wsrc: 'convention',
      note: 'aka WEST FACE. 602 m, 2406 -> 2063 m. Cut walk 6.0 m with only 8/19 ' +
            'vertices in open, stand walk 3.0 m -> under canopy for its lower half, ' +
            'glade like Red Dog Glades; carried at the pod glade convention' }),
  R({ id: 'west-face-alts', name: 'WEST FACE ALTERNATES', diff: 'black', style: 'glade',
      width: 40, pts: KTF('West Face Alternates').pts, sector: 'kt22',
      wsrc: 'convention', sign: false,
      note: 'shares its top node with MOSELEY\'S exactly. 9/25 vertices in open, both ' +
            'walks terminate -> glade, pod convention' }),

  // ----------------------------------------- KT-22 WEST SECTOR (promoted)
  // The Saddle and the West Face behind the front side. Corridor-grade at
  // 7.0 m — this is the connector, not the ride line (COMPOSING rule 17).
  R({ id: 'the-saddle', name: 'THE SADDLE', diff: 'blue', style: 'traverse',
      width: 42, pts: KWF('The Saddle').pts, sector: 'ktwest', wsrc: 'measured',
      note: 'MEASURED 42.0 m, 27/39 vertices, 33 in open (stand walk agrees at 45.0). ' +
            'Its top node is 16.8 m from the KT-22 top terminal — the traverse OUT ' +
            'of the summit. Clipped at x = -1500' }),
  R({ id: 'saddle-face', name: 'SADDLE FACE', diff: 'black', style: 'freeride',
      width: 34, pts: KWF('Saddle Face').pts, sector: 'ktwest', wsrc: 'measured',
      note: 'MEASURED 34.5 m, 9/9 vertices (stand walk 37.5). Clipped at x = -1500' }),
  R({ id: 'seventyfive-chute', name: '75 CHUTE', diff: 'black', style: 'freeride',
      width: 24, pts: KWF('75 Chute').pts, sector: 'ktwest', wsrc: 'measured',
      note: 'MEASURED 24.0 m on aerial-exact, 22/22 vertices measurable (stand walk ' +
            '28.5) — a genuinely narrow chute, and the measurement says so' }),
  R({ id: 'rock-garden', name: 'ROCK GARDEN', diff: 'black', style: 'glade',
      width: 36, pts: KWF('Rock Garden').pts, sector: 'ktwest', wsrc: 'floor',
      note: 'cut walk 7.5 m over 26/28 vertices, stand walk terminates -> treed and ' +
            'rocky; 36 m chosen above the measured floor' }),
  R({ id: 'dead-tree', name: 'DEAD TREE', diff: 'black', style: 'glade',
      width: 30, pts: KWF('Dead Tree').pts, sector: 'ktwest', wsrc: 'convention',
      sign: false,
      note: 'both walks terminate, 9/23 vertices in open -> glade, pod convention' }),

  // ============================ KT CLASSIC RUNS — the lines OSM does not carry
  // Every name here is on the official trail map, in the resort's own 174-name
  // run list, or called out on the official drone orbit (KT-RUNS.md §2.1, §4.1,
  // §5). None of them is an OSM way. The GEOMETRY is derived by DEM steepest
  // descent from a sourced entry point (work/bake_kt_runs.mjs) and every one is
  // reported as derived in REPORT §20.
  //
  // `ktRuns: true` IS LOAD-BEARING AND NOT COSMETIC. It keeps these lines out of
  // (a) the epoch-A ground stamp, (b) forest.mjs's `distToRuns`, and therefore
  // out of every rejection loop's draw sequence. Without it, adding one line
  // here moves every tree, snag, granite outcrop and boulder in the Red Dog pod
  // — REPORT §17.3's rule, and §21.2 is the hash that proves it did not happen.
  R({ id: 'alt-75', name: 'ALT 75', diff: 'black', style: 'freeride', ktRuns: true,
      width: 22, pts: KL('alt-75'), sector: 'ktwest', wsrc: 'derived', sign: true,
      note: 'DERIVED. Shares the ROCK GARDEN entrance (254 m out the Saddle — OSM '
          + 'order and the official map order agree) and "merges with the rest of '
          + 'the trail about a third way down" (2 videos). The merge STATION is '
          + 'sourced; the shape between is a DEM fall line steered to it. It lands '
          + 'at 212 m of Chute 75\'s 621 m — 34 % down — 1.2 m off the centreline. '
          + 'A FREE fall line out of that gate does not reach the chute at all: it '
          + 'runs 172 m west of it, which is why the merge is built to the source' }),
  R({ id: 'west-face-2', name: '2nd WEST FACE', diff: 'black', style: 'ktmogul', ktRuns: true,
      width: 44, bump: [0.06, 0.90], pts: KL('west-face-2'), sector: 'kt22',
      wsrc: 'convention', sign: true,
      note: 'OSM way 248622080 verbatim — the ONE Alternate OpenStreetMap maps, and '
          + 'the steepest sustained ground on the west face: p50 44.3 deg, a 56.4 deg '
          + 'band at 422-443 m (KT-RUNS §2.2). SRG: "a series of wide open mogul runs"' }),
  R({ id: 'west-face-3', name: '3rd WEST FACE', diff: 'black', style: 'ktmogul', ktRuns: true,
      width: 40, bump: [0.06, 0.90], pts: KL('west-face-3'), sector: 'kt22',
      wsrc: 'derived', sign: false,
      note: 'DERIVED fall line, entry 78 m down the Nose. The NAME is in the resort\'s '
          + 'own run list; no source numbers it on the ground (KT-RUNS §7.4), so the '
          + 'entry station is this build\'s reading of SRG\'s "directly below the Nose '
          + 'Chutes are the 4 West Face Alternatives"' }),
  R({ id: 'west-face-4', name: '4th WEST FACE', diff: 'black', style: 'ktmogul', ktRuns: true,
      width: 40, bump: [0.06, 0.90], pts: KL('west-face-4'), sector: 'kt22',
      wsrc: 'derived', sign: false, note: 'DERIVED fall line, entry 128 m down the Nose' }),
  R({ id: 'west-face-5', name: '5th WEST FACE', diff: 'black', style: 'ktmogul', ktRuns: true,
      width: 38, bump: [0.06, 0.90], pts: KL('west-face-5'), sector: 'kt22',
      wsrc: 'derived', sign: false, note: 'DERIVED fall line, entry 182 m down the Nose' }),
  R({ id: 'diagonal-chute', name: 'DIAGONAL CHUTE', diff: 'black', style: 'freeride',
      ktRuns: true, width: 20, pts: KL('diagonal-chute'), sector: 'olympiclady',
      wsrc: 'derived', sign: true,
      note: 'DERIVED, and CHOSEN BY THE DEM rather than by me: the bake runs a fan of '
          + 'fall lines across the upper Olympic Lady liftline and keeps the one bare '
          + '3DEP says is most confined. 368 m / 235 m vert / 32.6 deg mean, 14/19 '
          + 'stations confined, median 42 m, min 10 m. VERNACULAR name (squawguide), '
          + 'not on the official map; view-45 is the ground' }),
  R({ id: 'waterfall-gully', name: 'WATERFALL GULLY', diff: 'black', style: 'glade',
      ktRuns: true, width: 26, pts: KL('waterfall-gully'), sector: 'olympiclady',
      wsrc: 'derived', sign: true,
      note: 'DERIVED. Official map + run-list label; "everything funnels here" '
          + '(KT-RUNS §4.1). 198 m / 41 m vert / 11.7 deg — a GENTLE lower funnel, '
          + '10/10 stations confined. view-43 is the ground and shows exactly that: '
          + 'a treed funnel with the liftline in it, not a steep gully' }),

  // ==================================== UPPER MOUNTAIN INCREMENT 1 — the loop
  // OPEN BOWL, NOT A CORRIDOR MOUNTAIN, and the widths say so themselves: the
  // bundle's ray-walk saturated on 54-100 % of its samples because the ray
  // reached 60 m each side without finding canopy at all. Every width below is
  // therefore a FLOOR on a named line drawn across open ground — which is why
  // these runs are `groomed` lanes rather than `glade`s, and why the forest
  // budget over this ground is a fraction of the front side's (forest.mjs).
  // All four are OSM ways out of pois/palisades-upper/upper-runs.geojson (live
  // Overpass 2026-08-29), Z per vertex from the merged 3DEP stack.
  R({ id: 'shooting-star', name: 'SHOOTING STAR', diff: 'green', style: 'groomed',
      width: 42, pts: MRF('Shooting Star').pts, sector: 'mountainrun',
      wsrc: 'convention', sign: false,
      note: 'OSM way 553033616. THE LINK OFF HIGH CAMP: 277 m from the High Camp ' +
            'shoulder (2477 m) to Mountain Run\'s top node, which it shares EXACTLY ' +
            '(0.0 m). No width measurement exists for it in the bundle; 42 m is the ' +
            'green-cruiser convention and is stated as chosen' }),
  R({ id: 'riviera', name: 'RIVIERA', diff: 'green', style: 'groomed',
      width: 57, pts: GCF('Riviera').pts, sector: 'goldcoast', wsrc: 'measured',
      note: 'OSM way 553033624 v2 2026-03-24. THE SKI-OFF FROM THE FUNITEL: the ' +
            'nearest mapped piste to the top terminal (40.0 m), and its vertex 20 ' +
            'lands 9.3 m from Mountain Run. 1,056 m, 2484 -> 2354 m, 7.0 deg. ' +
            'MEASURED 56.7 m median (n=6, 90 % saturated)' }),
  R({ id: 'sunnyside-upper', name: 'SUNNYSIDE', diff: 'blue', style: 'groomed',
      width: 58, pts: URF('Sunnyside').pts, sector: 'upperrunout', sign: false,
      wsrc: 'measured',
      note: 'the UPPER half of OSM way 249144527, clipped at x=-900 where the ' +
            'EXHIBITION sector already owns the rest. Carried as its own run and NOT ' +
            'merged into `sunnyside`, because the two halves were measured with ' +
            'different instruments and disagree: aerial-2 at 1.5625 m/px reads 39.8 m ' +
            'over the lower half, the bundle\'s 0.342 m/px walk reads 58.6 m over the ' +
            'upper (n=32, 73 % saturated). Retrofitting 58 m onto the lower half would ' +
            'have re-carved a verified sector on a measurement made somewhere else' }),
  R({ id: 'juniper-spire', name: 'JUNIPER SPIRE', diff: 'blue', style: 'groomed',
      width: 58, pts: URF('Juniper Spire').pts, sector: 'upperrunout', wsrc: 'measured',
      note: 'OSM way 553033596. 1,140 m, 2362 -> 2153 m, 10.4 deg. MEASURED 58.4 m ' +
            'median (n=25, 63 % saturated) — the least-saturated width in the ' +
            'increment, and the OSM line sits on a cut the aerial can see ' +
            '(swath openness 97.7 % against a 56.7 % band, +40.9 points)' }),

  // ============================================ POULSEN'S GULLY — INCREMENT 21
  // THE NAME IS POULSEN, NOT PAULSON, and that is why two sourcing passes found
  // nothing here: the feature is named for Wayne Poulsen, who founded Squaw
  // Valley (RED-DOG-GUIDED.md §0). The build tokens stay `pou-*`; every sign in
  // the world says POULSEN'S GULLY.
  //
  // `pouRuns: true` IS LOAD-BEARING, exactly as `ktRuns` is. It keeps these four
  // lines out of (a) the epoch-A ground stamp, (b) the protected-corridor guard
  // (a new line neither guards itself nor anything else), and therefore out of
  // every rejection loop's draw sequence in forest.mjs. Without it, adding one
  // line here would move every tree, snag and boulder in the Red Dog pod.
  //
  // WIDTHS. No source states a width for Poulsen's — the ledger has none, OSM
  // does not carry the line at all, and the summer aerial has the drainage in
  // deep tree shadow (ledger §6.4), so the canopy walk work/widths.py uses on
  // every other Red Dog run cannot run here. 24 m is the POD'S OWN GLADE
  // CONVENTION applied to a drainage the ledger calls "claustrophobic"
  // (squawguide, §5) and views 44-46 show as confined. It is a CHOSEN number and
  // REPORT §21 lists it as one.
  R({ id: 'poulsens-gully', name: "POULSEN'S GULLY", diff: 'double', style: 'freeride',
      pouRuns: true, width: 24, pts: POU_GULLY, wsrc: 'convention', sign: false,
      note: "DERIVED between GPS fixes. RED-DOG-GUIDED §2 seven lat/lon anchors "
          + "carried through this world own transform land on the built ground at the "
          + 'elevations the ledger states, worst 0.8 m; the drainage between them is '
          + 'a DEM walk (work/bake_poulsen.mjs). 756 m plan / 291 m vertical against '
          + "the ledger 673/292 and Trailforks 887 m. Double-black per Trailforks "
          + '(the rating is recent: the uploader notes "EDIT 11/19/22: there is now a '
          + 'double diamond rating"). Sign is built by hand at the fork, stacked' }),
  R({ id: 'pou-entrance-1', name: "POULSEN'S 1", diff: 'double', style: 'freeride',
      pouRuns: true, width: 18, pts: POU_E1, wsrc: 'convention', sign: false,
      note: 'PROBABLE — ZERO IMAGERY EXISTS (ledger §6.1). Head chosen by the DEM '
          + 'drainage divide (work/pou_divide.mjs): the bench window that drains into '
          + "Poulsen at all is x -16..+36, 52 m wide, and this is its EAST edge - "
          + 'the first entrance you meet coming right off the Red Dog unload. 269 m, '
          + '97 m drop, 21.7 deg over the first 120 m: the steepest of the three' }),
  R({ id: 'pou-entrance-2', name: "POULSEN'S 2", diff: 'double', style: 'freeride',
      pouRuns: true, width: 18, pts: POU_E2, wsrc: 'convention', sign: false,
      note: 'PROBABLE — ZERO IMAGERY (ledger §6.1). The WEST edge of the same 52 m '
          + "window; anything further west is Red Dog Face drainage. 272 m, 94 m "
          + 'drop, 17.3 deg over the first 120 m. The ledger quote puts it "a few '
          + 'hundred feet" from entrance 1 and the built separation is 44 m (144 ft) '
          + '— a CONFLICT, logged: the window is not wide enough for the quote' }),
  R({ id: 'pou-entrance-3', name: "POULSEN'S 3", diff: 'double', style: 'traverse',
      pouRuns: true, width: 16, pts: POU_E3, wsrc: 'convention', sign: false,
      note: 'THE FILMED LINE (views 34-39, yt:sGAXVcdPBfI, Greg-supplied 4K). The '
          + 'Champs/Dog Leg fork, the traverse bench, the cliff lip. 114 m at 18.6 deg '
          + '— a traverse, which is what the footage shows. It is the head of '
          + "POULSEN GULLY carried by name so the ride harness can start on it" }),
];
// PRUNE any derived line its own bake dropped. `KL` returns [] for a line
// work/bake_kt_runs.mjs clipped away entirely, and a 0-point run would otherwise
// reach prepRun() as a corridor with no segments. Only `ktRuns` lines can be
// pruned — every other run in this file has hand-verified geometry and a missing
// one is a bug, not a build decision, so it is left to fail loudly.
export const KT_DROPPED = RUNS.filter((r) => (r.ktRuns || r.pouRuns) && (r.pts || []).length < 2)
  .map((r) => r.id);
for (const id of KT_DROPPED) RUNS.splice(RUNS.findIndex((r) => r.id === id), 1);

export const runById = Object.fromEntries(RUNS.map((r) => [r.id, r]));

// ------------------------------------------------------------------ lifts
// Tower counts / kinds: liftblog's station-by-station coverage of the 2023
// Doppelmayr-class six-pack (views 6, 7, 12) â€” a hard breakover in the middle
// third with four visibly ANGLED towers (view-7) and two unusually tall towers
// where the line crosses OVER Far East.
export const LIFTS = [
  {
    // OSM way 1088247632 "Red Dog Express", chair_lift, aerialway:occupancy=6.
    // Way id 1.088 billion => created 2023; last edited v3 2025-01-20. This is
    // the NEW six-pack, not the 1970s triple: its base/top nodes ARE the
    // 39.195533,-120.232568 -> 39.188360,-120.227342 pair in annotations.md,
    // it carries occupancy 6, and it CROSSES OVER Far East Express 273 m
    // (30%) up the line — the crossing annotations.md says the new alignment
    // makes and the old one did not. There is no second/stale Red Dog way in
    // the Overpass download or in a live 2026-08-28 re-query.
    id: 'red-dog-express', name: 'RED DOG', osmWay: 1088247632,
    pts: byName['Red Dog Express'].pts,
    towers: 12, seats: 6, chairSpacing: 42, speed: 5.0, core: true, swath: 30,
    // fraction along the line -> tower style
    angled: [0.58, 0.66, 0.74, 0.82],  // the four breakover towers of view-7
    tall: [0.275, 0.325],              // the pair that carries the line OVER Far East
  },
  {
    // OSM way 10479835 "Far East Express", occupancy 6. A 2011-era id, last
    // touched 2021 — a different lift entirely, base 180 m east of Red Dog's
    // and top 370 m west of it. Not confusable with the Red Dog line.
    id: 'far-east-express', name: 'FAR EAST', osmWay: 10479835,
    pts: byName['Far East Express'].pts,
    towers: 9, seats: 6, chairSpacing: 52, speed: 4.6, core: false, swath: 24,
  },
  {
    // OSM way 10479303 "Exhibition", chair_lift, aerialway:occupancy=4,
    // aerialway:capacity=1636 pph, bubble=no, heating=no — a plain fixed-grip
    // QUAD, not a detachable. Re-queried live 2026-08-28: one alignment only,
    // v10 last edited 2021-05-25 on a 2011-era way id (10.4 M). Unlike Red Dog
    // there is no id/version evidence of a realignment, and the mappers who
    // touched KT22 Express (2025-01-12), Red Dog Express (2025-01-20), Base to
    // Base (2025-01-12), Gold Coast Funitel (2026-03-24) and the Aerial Tram
    // (2026-06-06) left this line alone — so the newest OSM data IS this line.
    //
    // Corroboration is the OSM node cluster, not the photograph: Easy Street,
    // Julia's Gold and Schimmelpfennig Bowl all start within 12.1 m of the top
    // terminal node, Women's Downhill ends 21.3 m from it, and Easy Street,
    // Julia's Gold and Home Run end within 41 m of the base terminal node.
    //
    // 1636 pph / 4 seats = 409 chairs/h; at a fixed-grip 2.3 m/s that is 20 m
    // of spacing — both numbers are the OSM capacity tag, not a guess.
    id: 'exhibition', name: 'EXHIBITION', osmWay: 10479303,
    pts: EXF('Exhibition').pts, sector: 'exhibition',
    towers: 10, seats: 4, chairSpacing: 20, speed: 2.3, core: false, swath: 26,
  },
  {
    // OSM way 81605214 "Olympic Lady", chair_lift, aerialway:occupancy=2,
    // aerialway:capacity=1100, bubble=no, heating=no — a fixed-grip DOUBLE,
    // the smallest chair on the front side. v3, last edited 2021-06-08 on a
    // 2011-era way id. Re-queried live 2026-08-28: one alignment only.
    //
    // THE CHAIR BETWEEN THE PODS, and Greg's reason for wanting it: its base
    // (-400.9, -352.9) sits 191 m ESE of the Exhibition top station and its
    // top (-685.1, -1027.2) is on the ridge that carries KT-22's Saddle. It is
    // what makes Red Dog, Exhibition and KT-22 read as ONE front side rather
    // than three pods that happen to share a frame.
    //
    // UNLIKE Red Dog and Exhibition, THE AERIAL SHOWS ITS CUT. Swath openness
    // 89.9 % under a 26 m swath against 78.2 % over a 180 m band (n = 1,351):
    // +11.7 points, the only lift in the world whose line is visible in the
    // summer imagery. So this alignment is corroborated by the photograph,
    // not only by OSM.
    //
    // WHICH RUNS IT SERVES is an OSM node-cluster answer (COMPOSING rule 6),
    // and it is NOT the runs the Exhibition sector's own list implies:
    // Tamara's tops out 54 m from this terminal and Women's Downhill 98 m,
    // while Women's Downhill's BOTTOM node is 21.3 m from the Exhibition top
    // station. The chain the data draws is
    //     Olympic Lady top -> WOMEN'S DOWNHILL -> Exhibition top station
    //     -> EASY STREET / JULIA'S GOLD -> the base.
    // Those three runs stay in the EXHIBITION sector's band (they were
    // promoted there by the base run and their carve is unchanged); this
    // sector promotes the lift line's own corridor.
    //
    // 1100 pph / 2 seats = 550 chairs/h; at a fixed-grip 2.2 m/s that is 14.4 m
    // of spacing. Both numbers come from the OSM capacity tag.
    id: 'olympic-lady', name: 'OLYMPIC LADY', osmWay: 81605214,
    pts: OLF('Olympic Lady').pts, sector: 'olympiclady',
    towers: 11, seats: 2, chairSpacing: 15, speed: 2.2, core: false, swath: 22,
    angled: [0.90],          // the 50.5 -> 31.5 deg breakover below the top
    tall: [0.57, 0.77],      // the two compressions in the 31-42 deg middle
  },
  {
    // OSM way 10478713 "KT22 Express", chair_lift, aerialway:occupancy=4,
    // aerialway:capacity=2100, bubble=no, heating=no. v13, last edited
    // 2025-01-12 — the mappers who rewrote Red Dog as a six-pack retagged this
    // one eight days earlier, so this IS the newest data on the line, and
    // there is exactly one KT-22 alignment in the bbox.
    //
    // 18 real OSM nodes (it bends — this is not a two-point line).
    // base 39.195194,-120.236665 (3DEP 1900.3 m) -> top 39.183134,-120.242200
    // (3DEP 2435.5 m). 1,425 m plan, 535 m vertical, 20.6 deg mean — the
    // biggest single lift in the world by vertical, and 1.4 km of it.
    //
    // DETACHABLE, from the capacity tag and the name. 2100 pph / 4 seats =
    // 525 chairs/h. At a fixed-grip 2.3 m/s that would be 15.8 m of spacing —
    // 180 chairs on a 1.4 km line, which no fixed-grip quad runs. At a
    // detachable 5.0 m/s it is 34.3 m and 83 chairs, which is ordinary. OSM
    // carries no `aerialway:detachable`, so the reasoning is the arithmetic
    // plus the word "Express" in the name, and it is stated rather than hidden.
    //
    // TOWERS: 25. This is the one number in the sector taken on instruction
    // rather than from the data, and the data does not contradict it: the
    // aerial tower probe finds 24-25 tower-sized dark runs along the line on
    // aerial-exact at 0.488 m/px, which at 1,425 m is 55-59 m of spacing.
    // AGAINST it, annotations.md reads view-14's tower plates as "running to
    // 19 at the top", which would be 71 m spacing. Flagged in REPORT §12.
    //
    // The line profile (work, printed at bake time) is not uniform: a 35-45 deg
    // HEADWALL at 48-57 % — that is the Fingers reef — then a dead-flat bench
    // at 59-62 % (0.2-2.0 deg), then a final 29-36 deg pitch at 95-98 % into
    // the summit. The tall towers bracket the headwall, the angled ones sit on
    // the breakovers onto the bench and below the summit.
    id: 'kt22-express', name: 'KT-22', osmWay: 10478713,
    pts: KTF('KT22 Express').pts, sector: 'kt22',
    towers: 25, seats: 4, chairSpacing: 34, speed: 5.0, core: true, swath: 28,
    angled: [0.57, 0.60, 0.77, 0.93],
    tall: [0.48, 0.50, 0.96],
  },
  // ==================================== UPPER MOUNTAIN INCREMENT 1 — the loop
  {
    // OSM way 30423428 "Gold Coast Funitel", aerialway=gondola, v8 2026-03-24.
    //
    // THE ONLY FUNITEL IN THE UNITED STATES, and the one object in this
    // increment that has to be got right structurally rather than
    // approximately: TWO PARALLEL HAUL ROPES PER DIRECTION, four grips per
    // hanger, the cabin bridging the pair (view-12's tower plate 10 from below;
    // view-33 confirms the same crosshead from a second, moving source). It is
    // built by scene/funitel.mjs, not by the chairlift kit — wide squat towers
    // with a box-truss crosshead and FOUR sheave trains, four ropes, and
    // 28-passenger cabins.
    //
    // RECENCY, and the half of the premise that is wrong: the line has NOT
    // moved. v7 -> v8 on 2026-03-24 inserted a single node during a
    // piste-mapping changeset ("Updating ski trails to reflect where most
    // skiers pass based on aerial imagery"); every other node dates from
    // 2021-04-12 or 2012-10-22. The 2023 rebuild was the HAUL ROPE — ~12,000 m
    // of it, the first replacement since the lift opened in 1998.
    //
    // Garaventa 1998. Published 2,767 m slope / 531 m vertical / 4,032 pph at
    // 6 m/s / ~8 min 30 s; OSM + 3DEP measure 2,646 m plan / 2,730 m slope /
    // 526.2 m vertical (-1.3 % / -0.9 %). CABIN SPACING IS DERIVED, NOT CHOSEN:
    // 4,032 pph / 28 pax = 144 cabins/h, at 6 m/s that is one every 150 m.
    //
    // TOWERS: **TEN**, and this is no longer inferred. Increment 1 chose 16 as
    // a plausible number over a lower bound of 10 (view-12's legible tower
    // plate 10) and flagged it. The count is now PRIMARY SOURCE:
    //
    //   Hans Burkhart, General Manager, Squaw Valley Ski Corp., co-presenting
    //   with Ernst Egli of Garaventa AG at the OITAF 8th International Congress,
    //   San Francisco, May 1999, on building this lift:
    //     "TEN TOWERS had to be built with very large and complicated footings."
    //     "TOWER 3 IS 152 FEET HIGH."
    //
    // — which also explains why plate 10 is legible in a photograph of the line:
    // it is the LAST tower, not a tower ten of some larger number. Ten towers
    // over 2,649 m is a 241 m mean span, which for a chairlift would be absurd
    // and for a funitel is the whole point: the same paper defines the system as
    // one "able to traverse long spans between towers", and the 3 m twin ropes
    // are what make that possible. The 156 m spacing increment 1 assumed was a
    // gondola's spacing on a funitel's line.
    //
    // The same paper gives one tower HEIGHT — "Tower 3 is 152 feet high",
    // 46.33 m — and this world does not use it, on purpose. Positions are
    // derived (scene/funitel.mjs `funitelLine`: slope breaks, then heights
    // solved from rope clearance) and the real spacing is not published, so
    // stamping 46.33 m on a derived plate 3 would stand the tallest structure
    // on the mountain in the middle of an even slope. What the derivation DOES
    // do, from elevation data alone, is ask for a 39.0 m tower on the valley
    // wall — within 16 % of the published figure. REPORT §17.14.
    //
    // `tall` is left here for the record and is no longer read for this lift:
    // funitelLine solves every height.
    id: 'gold-coast-funitel', name: 'FUNITEL', osmWay: 30423428,
    pts: FNF('Gold Coast Funitel').ptsFull, sector: 'funitel',
    towers: 10, seats: 28, chairSpacing: 150, speed: 6.0, core: true, swath: 34,
    funitel: true,
    tall: [0.58, 0.66],
  },
  {
    // OSM way 30786685 "Gold Coast Express", v4 2021-06-08, 6-pack detachable.
    // 925 m slope / 171.8 m vertical against a published 935 m (+1.1 %). Its
    // BASE is the third feature of view-9, "at bottom right, lettered GOLD
    // COAST EXPRESS", 155 m SE of the lodge block — and OSM maps both its
    // lifthouses as buildings (187077016 base, 187125023 top), which is what
    // upper-props.mjs carries.
    //
    // Its promoted band stops at x = -3510 (the west edge of dem-tight-w); the
    // LINE is built end to end anyway, so the last 290 m of it and its top
    // station stand on the 7.03 m/px upper dem-wide surround. Stated, not
    // hidden — it is 900 m from anything in the loop.
    id: 'gold-coast-express', name: 'GOLD COAST EXPRESS', osmWay: 30786685,
    pts: GCF('Gold Coast Express').ptsFull, sector: 'goldcoast',
    towers: 9, seats: 6, chairSpacing: 40, speed: 5.0, core: false, swath: 26,
  },
];

// --------------------------------------------------------------- base area
// Off aerial-2.jpg (world grid in work/, see REPORT) + views 9, 13, 24, 29.
// The lots are bare-ground rectangles at 1890-1895 m; the village is a dense
// block of 3-5 storey gabled timber lodges immediately west of them.
export const LOTS = [
  { c: [-235, 675], s: [300, 150], yaw: 4, rows: 7 },
  { c: [30, 690], s: [200, 130], yaw: 2, rows: 6 },
  { c: [190, 620], s: [130, 110], yaw: -6, rows: 5 },
  { c: [-70, 545], s: [110, 60], yaw: 6, rows: 3 },
];
export const BUILDINGS = [
  // [x, y, sx, sy, storeys, yawDeg, kind]
  [-330, 512, 46, 30, 4, 8, 'lodge'], [-290, 470, 34, 26, 3, 20, 'lodge'],
  [-368, 556, 40, 26, 4, -6, 'lodge'], [-256, 520, 38, 28, 5, 12, 'lodge'],
  [-206, 494, 34, 24, 4, -4, 'lodge'], [-300, 566, 30, 22, 3, 30, 'lodge'],
  [-160, 540, 30, 22, 3, 0, 'lodge'], [-232, 578, 28, 20, 3, 16, 'lodge'],
  [-118, 500, 40, 26, 2, 10, 'lodge'], [-386, 486, 30, 22, 3, 24, 'lodge'],
  [-30, 566, 62, 44, 2, 4, 'lodge'],                      // Olympic House
  [-46, 480, 70, 20, 2, 2, 'transit'],                    // transit centre
  [56, 512, 44, 16, 1, 0, 'transit'],
  [-140, 448, 22, 14, 1, -6, 'hut'], [96, 470, 18, 12, 1, 8, 'hut'],
  // ---- the KT-22 base end of the village, added for the merge ----
  // Massing read off aerial.jpg (0.488 m/px, the same frame the rest of this
  // list came from) west of x = -400, which the base run had no reason to
  // cover. Positions are good to a few metres; the SIZES are eyeballed
  // rectangles and are listed as inferred in REPORT §12.
  [-470, 452, 52, 32, 3, 6, 'lodge'],    // the big dark-roofed base building
  [-505, 486, 34, 26, 2, -8, 'lodge'],
  [-540, 452, 26, 20, 2, 12, 'lodge'],
  [-436, 430, 30, 16, 1, 4, 'hut'],      // KT-22 base ops / ticket
];
export const ROADS = [
  [[-480, 762], [-300, 772], [-120, 776], [60, 770], [240, 752], [430, 726], [640, 700]],
  [[-70, 596], [-64, 640], [-58, 700], [-56, 760]],
];

// --------------------------------------------------------- terrain extents
export const CORE = { x0: -470, x1: 430, y0: -730, y1: 500 };     // full-fidelity core
export const TIGHT = { x0: -710, x1: 690, y0: -786, y1: 614 };    // rd dem-tight frame
export const KTIGHT = { x0: -1520, x1: 80, y0: -1113, y1: 487 };  // kt dem-tight frame
export const WIDE = { x0: -1852, x1: 1348, y0: -1875, y1: 1325 }; // dem-wide frame

// UPPER MOUNTAIN INCREMENT 1 — the new elevation frames (dem-upper.mjs).
// UTIGHT_E and UTIGHT_W are the two promoted tiles, lattice (1,0) and (2,0)
// against red-dog's dem-tight. THE EAST EDGE OF UTIGHT_E IS TIGHT'S WEST EDGE,
// exactly: both are Mercator squares of the identical W = 1806.354764 m offset
// by a whole multiple of W, so at 1.3672 m/px they butt with no gap, no overlap
// and no resample. Measured across the shared edge, one cell either side:
// mean |dz| 0.348 m against a 0.334 m CONTROL taken wholly inside one raster —
// i.e. the seam is at the terrain-gradient floor (work/bake_dem_upper.py).
export const UTIGHT_E = { x0: -2110.34, x1: -710.34, y0: -785.72, y1: 614.28 };
export const UTIGHT_W = { x0: -3510.32, x1: -2110.32, y0: -785.72, y1: 614.28 };
// the upper bundle's 3600 m surround, which is the ONLY elevation data west of
// x = -1852 and therefore the only reason the Gold Coast bench can exist here
export const WIDE_W = { x0: -3967.26, x1: -367.26, y0: -2019.30, y1: 1580.70 };
// the union of the two wides — what the end-of-data rim wraps and what the
// backdrop apron has to start outside of
export const WORLD = {
  x0: Math.min(WIDE.x0, WIDE_W.x0), x1: Math.max(WIDE.x1, WIDE_W.x1),
  y0: Math.min(WIDE.y0, WIDE_W.y0), y1: Math.max(WIDE.y1, WIDE_W.y1),
};
export const FAR_R = 15000;                                        // backdrop radius

// THE MASSIF. The KT-22 summit block — Eagle's Nest, the spires, GS Bowl, the
// cornice roll and the Olympic Lady ridge. Inside the sector bands it is built
// at 5.0 m; immediately outside them the next grid down was `terrain-wide` at
// 34 m, which is a five-fold LOD jump on the one landform the whole world can
// see from 2.5 km away. This 14 m box bridges it for 5.3 k triangles. It is a
// grid step, not a promotion: no corridors are carved here that the sectors did
// not already carve.
export const MASSIF = { x0: -1290, x1: -560, y0: -1240, y1: -520, step: 14 };

// KT-22 HERO ZONES — 2.00 m ground, the finest terrain in this world after the
// Red Dog mogul field's 1.13 m, and finer than the Red Dog CORE's 3.40 m.
//
// This is Greg's mandate made a number. `eagles-nest-kt22-B-truth-01` built the
// KT pod at a 2.0 m `terrain-detail` over exactly this ground — the summit, the
// unload flat, the cornice roll into GS Bowl and the Fingers reef — and that
// resolution is what makes the massif read. Carrying the KT sector at the
// Exhibition sector's 5.0 m corridor grade would have quietly halved it. The
// two boxes cost 42.8 k collidable triangles over the 5.0 m they replace, and
// REPORT §14.7 lists exactly what was thinned to pay for them: no Red Dog core
// grid and no KT feature.
//
//   kt-summit : the top station, the unload flat, the Eagle's Nest massif, the
//               DEM high point, the cornice rim, GS Bowl's entrance, McConkey's
//   kt-fingers: the Fingers reef under the upper-mid lift line
//   gold-coast-park: INCREMENT 3. The terrain the park pad is laid on.
//     The park stands only 0.62 m proud of the analytic ground, and the corridor
//     it runs down is on TWO different grids: `terrain-goldcoast` at 6.00 m as
//     far as its own clipX = -3510, and `terrain-wide-w` at 38 m for the top
//     190 m of the corridor above that (PARK.md escalation 8 — the Gold Coast
//     Express top terminal is west of every tight tile in the bundle). A 38 m
//     lattice interpolating over rolling ground sits up to 2.14 m ABOVE the
//     analytic surface it sampled, so the mountain came up through the jump
//     line: `work/park_probe.mjs` measured the terrain, not the park, as the
//     highest collider on 21.8 % of the pad.
//     A detail box is the mechanism that already exists for this — built first,
//     owned by nobody, with every coarser grid yielding to it by one of its own
//     cells — so the fix is one row rather than a re-clip of the sector. 5.00 m
//     over 976 x 216 m; the box is 2.4 km from the nearest front-side ground and
//     `inDetail()` is false everywhere east of it, so nothing on the front side
//     changes grid.
//   THE KT CLASSIC-RUNS BOXES (this increment) are CORRIDOR boxes, not solid
//     ones, and that is COMPOSING rule 17 spent as a number. Chute 75's own
//     bounding box is 277 x 547 m; solid at 2.0 m that is 75,760 triangles for
//     one line, against a whole-increment collidable headroom of 91,579. So each
//     box carries a `hw` and builds only the band within `hw` m of the lines it
//     names — the ride line gets 2.0 m ground and the shoulder 40 m away keeps
//     the 5-10 m sector grid it already had.
//
//     A corridor box CANNOT use the plain box yield test. `inDetail` is what
//     makes every coarser grid stand back, and if it answers "yes" over the
//     whole box while the detail mesh only fills a band inside it, the floor
//     opens everywhere between the band and the box edge. So a box with `hw`
//     answers `owns()` — inside the box AND within hw of a line — and the
//     coarse grids yield to THAT, inset by one of their own cells so the two
//     still overlap by a ring exactly as §14.4 requires. Boxes without `hw`
//     (the three above) answer the plain box test and are bit-identical.
const _segsOf = (lines) => {
  const S = [];
  for (const P of lines) {
    for (let i = 0; i < P.length - 1; i++) {
      const ax = P[i][0], ay = P[i][1];
      const dx = P[i + 1][0] - ax, dy = P[i + 1][1] - ay;
      if (dx * dx + dy * dy < 1e-9) continue;
      S.push({ ax, ay, dx, dy, L2: dx * dx + dy * dy,
               x0: Math.min(ax, ax + dx), x1: Math.max(ax, ax + dx),
               y0: Math.min(ay, ay + dy), y1: Math.max(ay, ay + dy) });
    }
  }
  return S;
};
/** metres to the nearest of `segs`, early-rejected against `cut`. */
function segDist(segs, x, y, cut) {
  let best = cut;
  for (const s of segs) {
    if (x < s.x0 - best || x > s.x1 + best || y < s.y0 - best || y > s.y1 + best) continue;
    const px = x - s.ax, py = y - s.ay;
    let t = (px * s.dx + py * s.dy) / s.L2; t = t < 0 ? 0 : t > 1 ? 1 : t;
    const d = Math.hypot(px - s.dx * t, py - s.dy * t);
    if (d < best) best = d;
  }
  return best;
}
// tolerant: a `ktRuns` line dropped by its own bake is simply not in RUNS.
const _runPts = (id) => (RUNS.find((r) => r.id === id) || { pts: [] }).pts;
function detailBox(o) {
  const D = { ...o };
  if (o.lines) {
    const segs = _segsOf(o.lines.map(_runPts));
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (const s of segs) {
      x0 = Math.min(x0, s.x0); x1 = Math.max(x1, s.x1);
      y0 = Math.min(y0, s.y0); y1 = Math.max(y1, s.y1);
    }
    const m = o.hw + o.step * 2 + 4;
    D.x0 = x0 - m; D.x1 = x1 + m; D.y0 = y0 - m; D.y1 = y1 + m;
    D.owns = (x, y, pad = 0) => x > D.x0 + pad && x < D.x1 - pad
      && y > D.y0 + pad && y < D.y1 - pad
      && segDist(segs, x, y, o.hw - pad) < o.hw - pad;
    D.segs = segs;
  } else {
    D.owns = (x, y, pad = 0) => x > D.x0 + pad && x < D.x1 - pad
      && y > D.y0 + pad && y < D.y1 - pad;
  }
  return D;
}
export const KT_DETAIL = [
  detailBox({ id: 'kt-summit', x0: -1052, x1: -792, y0: -1092, y1: -852, step: 2.0 }),
  detailBox({ id: 'kt-fingers', x0: -878, x1: -700, y0: -420, y1: -204, step: 2.0 }),
  detailBox({ id: 'gold-coast-park', x0: -3826, x1: -2850, y0: -484, y1: -268, step: 5.0 }),

  // ---- KT CLASSIC RUNS. The flagship ride lines, at 2.0-3.4 m ground.
  // Chute 75's floor measures a MINIMUM 14 m across on bare 3DEP (the ledger's
  // own instrument, reproduced in work/bake_kt_runs.mjs). On the 10.0 m
  // `terrain-ktwest` grid it was riding on, that floor is 1.4 cells wide — the
  // chute could not be resolved at all, which is the whole reason this pass is
  // a reshape and not a re-placement: the GEOMETRY was already right to 0.6 m
  // at every traverse gate, and the RESOLUTION was not there to show it.
  //
  // NESTED: A FINE CORE AND A COARSE WALL SHELL. Built as single 2.0 m boxes
  // 30-34 m out from the centreline, the five KT boxes cost 91,302 collidable
  // triangles and left 9,043 of headroom for every rock, cornice and gate the
  // increment still owed. But 2.0 m ground 28 m from the centreline is being
  // spent on the OUTSIDE of a chute wall — a face you look at and never ride.
  // So each of the two flagship lines is two boxes: a fine core over the floor
  // and the ride line, and a 4.0 m shell over the wall faces around it. Same
  // reach, same silhouette, 25,001 fewer collidable triangles, and every one of
  // them came off ground nobody skis. COMPOSING rule 17, applied to a grid step
  // instead of to a prop.
  //
  // ORDER IS LOAD-BEARING: a shell yields to every box listed BEFORE it, inset
  // by one of the SHELL's own cells, so the two overlap by a ring exactly like
  // every other resolution change in this file (§14.4).
  detailBox({ id: 'kt-chute75', step: 2.0, hw: 16,
              lines: ['seventyfive-chute', 'alt-75'] }),
  detailBox({ id: 'kt-moseleys', step: 2.0, hw: 20, lines: ['moseleys'] }),
  detailBox({ id: 'kt-westalts', step: 2.8, hw: 16,
              lines: ['west-face-2', 'west-face-3', 'west-face-4', 'west-face-5'] }),
  detailBox({ id: 'kt-saddle', step: 3.4, hw: 14, lines: ['the-saddle'] }),
  detailBox({ id: 'kt-olypocket', step: 3.0, hw: 18,
              lines: ['tamaras', 'diagonal-chute', 'waterfall-gully'] }),
  // the wall shells
  detailBox({ id: 'kt-chute75-wall', step: 4.0, hw: 32,
              lines: ['seventyfive-chute', 'alt-75'] }),
  detailBox({ id: 'kt-moseleys-wall', step: 4.0, hw: 34, lines: ['moseleys'] }),
  detailBox({ id: 'kt-westalts-wall', step: 4.5, hw: 27,
              lines: ['west-face-2', 'west-face-3', 'west-face-4', 'west-face-5'] }),
  detailBox({ id: 'kt-olypocket-wall', step: 4.5, hw: 30,
              lines: ['tamaras', 'diagonal-chute', 'waterfall-gully'] }),
];

// PLAY is the union of CORE and every promoted sector's box. It is what the
// ground stamp raster and the baked shade raster have to span; CORE stays the
// full-fidelity zone (3.40 m terrain, 1.70 m corridors, 1.13 m moguls) and a
// sector rides its own coarser `step`.
const playOver = (ids) => SECTORS.reduce((a, S) => (ids && !ids.includes(S.id) ? a : ({
  x0: Math.min(a.x0, S.grown.x0), x1: Math.max(a.x1, S.grown.x1),
  y0: Math.min(a.y0, S.grown.y0), y1: Math.max(a.y1, S.grown.y1),
})), { ...CORE });
export const PLAY = playOver(null);
/** the merged world's OWN playable extent, BEFORE increment 1 — the frozen
 *  anchor every raster lattice in this world is still laid out from. */
export const PLAY0 = playOver(FRONT_SECTORS);
/** snap `v` down from the frozen anchor `a` in whole `res` steps, so a raster
 *  that has to reach further west keeps the exact phase it always had. */
export const rasterOrigin = (a, v, res) => a - Math.ceil(Math.max(0, a - v) / res) * res;

// RIM — the soft end-of-data ring OUTSIDE the 3200 m dem-wide frame. Collidable,
// so leaving the wide frame is a long coast-out, never a fall through the floor;
// it holds the dem-wide edge for its first 100 m and then rises gently to close
// the world where there is genuinely no elevation data left.
//
// **THE STEP IS 36 m, AND IT IS NOT A LOOK CHOICE — IT IS THE ONE NUMBER THAT
// MAKES THIS MESH A COLLIDER AT ALL.** Increment 22, defect class 1, and it is
// the cleanest example of the class in the world: at `step: 110` this ring was
// drawn, was listed in `colliders[]`, was counted in the collidable-triangle
// budget — and contributed EXACTLY ZERO triangles to the player's collision
// grid. `bench/public/js/play/collision.js` bins collision into 6 m cells and
// silently drops any triangle whose XZ bounding box covers more than
// `maxCellsPerTri = 64` of them. A 110 m grid quad covers 19 x 19 = 361. So
// every one of its 4,421 triangles was rejected as oversize, the ring was a
// picture, and walking off the edge of `terrain-wide` was a fall with no floor
// under it for the rest of the world — a visual cover over an infinite hole,
// which is exactly the thing this mesh's own comment says it exists to prevent.
// Nothing warned: `skippedOversize` is a stat nobody was reading, and the
// budget line counted the triangles because they exist in the geometry.
//
// 36 m gives a quad a 7 x 7 = 49-cell footprint, which is inside 64 with three
// cells of margin against the `Math.round` the grid builder does to its own
// step. The pad comes in from 1,100 m to 600 m to pay for it: 24.4 km2 of ring
// at 36 m would be 37 k triangles and the world has 17.5 k of collidable budget
// left, while 9.9 km2 is 15.3 k. THAT IS A REAL TRADE AND IT IS STATED RATHER
// THAN HIDDEN: the run-out past the data goes from 1,100 m to 500 m and the
// flat part of it from 700 m to 100 m, so the world closes sooner and closes
// steeper (260 m over the last 400 m, the same 33 deg ramp it always had).
// What it buys is that the ramp is now ground you stand on instead of a
// photograph of ground with nothing behind it.
//
// `far` is kept SEPARATE from `pad` on purpose: `buildFar`'s inner ring has to
// sit on the rim's outer lip, so it tracks `pad`, but the constant is named so
// that the next person to move one of them can see that the other one moves.
export const RIM = { pad: 500, step: 36, holdM: 100, riseM: 260 };

// ------------------------------------------------- sector distance field
// One 8 m distance-to-nearest-sector-centreline raster over PLAY, built once.
// terrain.mjs uses it to decide which grid owns a cell (with a one-cell overlap
// so a resolution change never opens a crack) and forest.mjs uses it to decide
// where the promoted forest is placed. Bilinear, so the boundary is smooth.
// ORIGIN FROZEN AT PLAY0 (see above): increment 1 grows this field 2.6 km west
// in whole 8 m cells rather than re-laying it, so `sectorOwner` returns exactly
// the same answer for every cell of the four verified sectors that it did
// before. Without the freeze, moving the origin by a non-multiple of 8 m would
// have re-diced ownership along every existing sector boundary.
const SD_RES = 8.0, SD_PAD = 140;
const SD_X0 = rasterOrigin(PLAY0.x0 - SD_PAD, PLAY.x0 - SD_PAD, SD_RES);
const SD_Y0 = rasterOrigin(PLAY0.y0 - SD_PAD, PLAY.y0 - SD_PAD, SD_RES);
const SD_NX = Math.ceil((PLAY.x1 + SD_PAD - SD_X0) / SD_RES) + 1;
const SD_NY = Math.ceil((PLAY.y1 + SD_PAD - SD_Y0) / SD_RES) + 1;
const SD = new Float32Array(SD_NX * SD_NY).fill(1e9);
const SD_ID = new Uint8Array(SD_NX * SD_NY).fill(255);   // which sector owns the cell

(function bakeSectorDist() {
  for (let si = 0; si < SECTORS.length; si++) {
    const S = SECTORS[si];
    for (const line of S.lines) {
      for (let i = 0; i < line.length - 1; i++) {
        const ax = line[i][0], ay = line[i][1];
        const dx = line[i + 1][0] - ax, dy = line[i + 1][1] - ay;
        const L2 = dx * dx + dy * dy || 1e-9;
        const m = S.reach + SD_RES * 2;
        const i0 = Math.max(0, Math.floor((Math.min(ax, ax + dx) - m - SD_X0) / SD_RES));
        const i1 = Math.min(SD_NX - 1, Math.ceil((Math.max(ax, ax + dx) + m - SD_X0) / SD_RES));
        const j0 = Math.max(0, Math.floor((Math.min(ay, ay + dy) - m - SD_Y0) / SD_RES));
        const j1 = Math.min(SD_NY - 1, Math.ceil((Math.max(ay, ay + dy) + m - SD_Y0) / SD_RES));
        for (let j = j0; j <= j1; j++) {
          const y = SD_Y0 + j * SD_RES;
          for (let i2 = i0; i2 <= i1; i2++) {
            const x = SD_X0 + i2 * SD_RES;
            let t = ((x - ax) * dx + (y - ay) * dy) / L2;
            t = t < 0 ? 0 : t > 1 ? 1 : t;
            const d = Math.hypot(x - ax - dx * t, y - ay - dy * t);
            const k = j * SD_NX + i2;
            if (d < SD[k]) { SD[k] = d; SD_ID[k] = si; }
          }
        }
      }
    }
  }
})();

/** metres to the nearest promoted-sector centreline (1e9 outside the field). */
export function sectorDist(x, y) {
  let fx = (x - SD_X0) / SD_RES, fy = (y - SD_Y0) / SD_RES;
  if (fx < 0 || fy < 0 || fx > SD_NX - 1.002 || fy > SD_NY - 1.002) return 1e9;
  const i = fx | 0, j = fy | 0, tx = fx - i, ty = fy - j, k = j * SD_NX + i;
  const a = SD[k] + (SD[k + 1] - SD[k]) * tx;
  const b = SD[k + SD_NX] + (SD[k + SD_NX + 1] - SD[k + SD_NX]) * tx;
  return a + (b - a) * ty;
}

/** which sector's band this point falls in, or null. Nearest-cell, not bilinear:
 *  an id cannot be interpolated. */
export function sectorOwner(x, y) {
  const fx = Math.round((x - SD_X0) / SD_RES), fy = Math.round((y - SD_Y0) / SD_RES);
  if (fx < 0 || fy < 0 || fx > SD_NX - 1 || fy > SD_NY - 1) return null;
  const si = SD_ID[fy * SD_NX + fx];
  return si === 255 ? null : SECTORS[si];
}

/** inside a promoted sector's band, shrunk by `shrink` m (for overlap rings).
 *  Each sector carries its own `reach`, so several can coexist with different
 *  band widths — the distance field records which one owns each cell. */
export function inSector(x, y, shrink = 0) {
  const S = sectorOwner(x, y);
  return !!S && sectorDist(x, y) < S.reach - shrink;
}

/** inside CORE, inset by `pad` m. */
export const inCoreBox = (x, y, pad = 0) =>
  x > CORE.x0 + pad && x < CORE.x1 - pad && y > CORE.y0 + pad && y < CORE.y1 - pad;
