// THE GOLD COAST FUNITEL — the only funitel in the United States, and the
// signature object of upper-mountain increment 1.
//
// A FUNITEL IS NOT A GONDOLA WITH A WIDE TOWER. `annotations.md` view-12 is the
// proof shot and it is worth quoting, because getting this wrong is the one
// thing that would make the whole increment read as generic:
//
//   "A line tower — plate 10 — from below: one fat cylindrical column carrying a
//    very wide box-truss crosshead with FOUR separate sheave trains, two per
//    direction, because EACH DIRECTION RUNS ON TWO PARALLEL ROPES about 3 m
//    apart. A cabin hangs from a hanger gripping BOTH ropes of its side."
//
// view-33 (`yt:Y31kJAyiZoY` @3:20, a second, moving source) confirms the same
// crosshead from directly beneath. So: four ropes, four sheave trains, a
// bridging hanger, and a squat wide tower rather than a tall narrow one.
//
// Garaventa 1998, 28-passenger cabins, 4,032 pph at 6 m/s, ~8 min 30 s.
// Published 2,767 m slope / 531 m vertical; OSM way 30423428 v8 + 3DEP measure
// 2,730 m / 526.2 m (-1.3 % / -0.9 %). The haul rope was replaced in summer
// 2023 — nearly 12,000 m of ~50 mm rope — and that is a ROPE change, not a line
// change: every node's position dates from 2021-04-12 or 2012-10-22 and the
// 2026-03-24 v8 edit inserted a single node during a piste-mapping pass.
//
// TERMINALS — AND THEY ARE TWO DIFFERENT BUILDINGS. Increment 1 built both ends
// with one function and Greg's note on the flagship ("it doesn't look like the
// funitel building top or bottom from Squaw") is that function. Sourcing pass 2
// put ten more exteriors in the bundle:
//
//   BASE  (views 36 / 41 / 42 / 51 / 52) — `funitelBase()`. A long single-storey
//     GRANITE AND TIMBER hall AT PLAZA LEVEL under a shallow GREEN standing-seam
//     roof, blond timber fascia beam at the eaves, two dark portals in the
//     mountain gable between random-rubble granite piers, eight steps up to the
//     doors, FUNITEL lettered on the raised roof-end panel.
//   TOP   (views 11 / 35 / 66 / 67) — `funitelTop()`. Charcoal ribbed metal under
//     a BARREL VAULT with pale-grey eave trim and combed rafter tails, a glazed
//     clerestory the length of the flank, standing on slender steel legs over an
//     open board-formed concrete undercroft.
//
// Ten towers, not sixteen, and one published height — see `funitelLine()`.
//
// SEASON: winter operations. The summer-2026 tower-4/5 crane works and the
// stripped cabins in the shops are NOT modelled — see REPORT §17.7.

import { buf, tri, quad, box, tube, prism, plate, makeRng, rr, ri, jitc, lin, mixc, scalec, clamp, lerp, smooth } from './lib/core.mjs';
import { PAL } from './kit.mjs';

// The four ropes: two per direction, 3.0 m apart, the pairs 9.2 m apart.
// view-12's "about 3 m" is the only published-ish figure; the pair separation
// is set so a 28-pax cabin (3.2 m wide) hangs clear between the up and down
// strands with the crosshead reach view-12 shows.
export const ROPE_DV = 3.0;          // spacing WITHIN one direction's pair
export const ROPE_ARM = 6.1;         // centre of each direction's pair, from axis
export const ROPE_OFFSETS = [-ROPE_ARM - ROPE_DV / 2, -ROPE_ARM + ROPE_DV / 2,
                             ROPE_ARM - ROPE_DV / 2, ROPE_ARM + ROPE_DV / 2];

const CONCRETE = lin(0x8d8a84);
const SHED = lin(0x2b2c30);          // "a large DARK shed" — views 11, 18, 35, 66
const SHED_LO = lin(0x1d1e21);
const FUNI_GREEN = lin(0x1f6b45);    // the FUNITEL fascia of view-16

// ---- the BASE terminal's own palette, off views 36 / 41 / 51 / 52 ----------
// This building is not a dark shed and never was. Sourcing pass 2 put four
// exteriors of it in the bundle and they agree across seventeen years:
//   view-36  (summer, the whole SE elevation, FUNITEL on the roof end)
//   view-41  (winter, the mountain gable from below, cabin 46 in the portal)
//   view-51  (2024, the plaza with the ski racks and the gantry overhead)
//   view-52  (2024, both portals in one frame)
const G_ROOF = lin(0x4e7d63);        // green standing-seam, the roof AND the ribs
const G_ROOF_LO = lin(0x3b6250);
const GLULAM = lin(0xb98a52);        // the pale exposed timber fascia beam
const GLULAM_LO = lin(0x8d6335);
const RUBBLE = lin(0x9a958a);        // random-rubble granite: grey-buff...
const RUBBLE_B = lin(0x8d7f6a);      // ...with tan...
const RUBBLE_G = lin(0x7f857a);      // ...and green-grey stones
const PANEL_GRN = lin(0x2c4a3c);     // the dark-green wall panel between piers

// ========================================================== THE BASE TERMINAL
//
// THE FIRST CUT OF THIS WORLD BUILT BOTH ENDS OF THE FUNITEL WITH ONE FUNCTION,
// and Greg's note — "it doesn't look like the funitel building top or bottom
// from Squaw" — is that function. The two stations are not the same building
// with different numbers; they are not even the same KIND of building. The top
// is a charcoal metal barrel-vaulted shed on legs, out on a snowfield. The base
// is a piece of Village-at-Squaw architecture: a long single-storey GRANITE AND
// TIMBER hall standing on the plaza at grade, with a green metal roof, and its
// floor is the plaza floor.
//
// What views 36 / 41 / 51 / 52 establish, in the order you meet it walking up:
//
//   * a random-rubble GRANITE PLINTH about 1.5 m high carrying a terrace, and
//     full-height random-rubble granite PIERS at the corners and between every
//     opening. Grey-buff stone with tan and green-grey in it, thick joints.
//   * between the piers, dark-green metal panel and full-height glazing.
//   * a continuous PALE TIMBER FASCIA BEAM at the eaves — one blond glulam-
//     looking member running the length of the building, projecting about
//     1.5 m. It is the strongest horizontal line on the building and the single
//     detail that makes it recognisable at 200 m.
//   * a SHALLOW GREEN STANDING-SEAM ROOF, 15-20 deg, ribs countable, deep
//     overhang, with a raised end panel over the plaza doors carrying FUNITEL
//     in white.
//   * in the mountain gable, TWO DARK PORTALS side by side, one per direction,
//     about 4 m wide and 5.5 m tall, flanked and separated by granite piers,
//     with the cabins hanging in them (view-41 shows cabin 46 in one; view-52,
//     nine years later, shows both — the building has not changed).
//   * about eight steps up from the lawn to the terrace at the plaza end.
//
// DECK HEIGHT IS ZERO. Views 31, 36 and 42 all show the boarding floor level
// with the plaza — you walk in off the pavers. The first cut gave this end a
// 4.4 m deck on concrete piers and the result was a black slab floating over
// the middle of the village.
//
// Local frame: +u is UP THE LINE (the mountain gable), -u the plaza end,
// +v the village/plaza flank.
export function funitelBase(B, seed, { x, y, z, yaw, len = 51, w = 22 } = {}) {
  const rng = makeRng(seed);
  const c = Math.cos(yaw), s = Math.sin(yaw);
  const P = (u, v, h) => [x + u * c - v * s, y + u * s + v * c, z + h];
  const hw = w / 2, hl = len / 2;

  let panel = null;                  // the lettered roof-end panel, filled below
  const EAVE = 6.6;                  // to the underside of the fascia beam
  const RIDGE = 8.8;                 // ridge over the long axis
  const PLINTH = 1.5;
  const OVER = 1.5;                  // eaves overhang
  const stone = () => jitc(mixc(mixc(RUBBLE, RUBBLE_B, rng()), RUBBLE_G, rng() * 0.5), rng, 0.13);

  // ---- the plinth, as courses so it reads as rubble and not as a grey box
  const NC = 4;
  for (let k = 0; k < NC; k++) {
    const z0 = (PLINTH / NC) * k, z1 = (PLINTH / NC) * (k + 1);
    for (let i = 0; i < 26; i++) {
      const u0 = -hl + (i / 26) * len, u1 = -hl + ((i + 1) / 26) * len;
      for (const sg of [-1, 1]) {
        quad(B, P(u0, sg * hw, z0), P(u1, sg * hw, z0), P(u1, sg * hw, z1), P(u0, sg * hw, z1), stone());
      }
    }
    for (let i = 0; i < 11; i++) {
      const v0 = -hw + (i / 11) * w, v1 = -hw + ((i + 1) / 11) * w;
      for (const sg of [-1, 1]) {
        quad(B, P(sg * hl, v0, z0), P(sg * hl, v1, z0), P(sg * hl, v1, z1), P(sg * hl, v0, z1), stone());
      }
    }
  }
  // the terrace slab on top of the plinth
  quad(B, P(-hl, -hw, PLINTH), P(hl, -hw, PLINTH), P(hl, hw, PLINTH), P(-hl, hw, PLINTH),
       lin(0x8b8681));

  // ---- the piers, and the wall between them ------------------------------
  // Seven bays a side. A pier is 2.2 m of rubble carried the full 6.6 m; the
  // bay between two piers is dark-green panel below and glazing above.
  const NB = 7, PW = 2.2;
  for (const sg of [-1, 1]) {
    for (let i = 0; i <= NB; i++) {
      const u = -hl + (i / NB) * len;
      for (let k = 0; k < 5; k++) {
        const z0 = PLINTH + ((EAVE - PLINTH) / 5) * k, z1 = PLINTH + ((EAVE - PLINTH) / 5) * (k + 1);
        quad(B, P(u - PW / 2, sg * hw, z0), P(u + PW / 2, sg * hw, z0),
             P(u + PW / 2, sg * hw, z1), P(u - PW / 2, sg * hw, z1), stone());
        // the pier has depth — the reveal each side of it
        quad(B, P(u + sg * PW / 2, sg * hw, z0), P(u + sg * PW / 2, sg * (hw - 0.55), z0),
             P(u + sg * PW / 2, sg * (hw - 0.55), z1), P(u + sg * PW / 2, sg * hw, z1),
             scalec(stone(), 0.78));
      }
    }
    for (let i = 0; i < NB; i++) {
      const u0 = -hl + (i / NB) * len + PW / 2, u1 = -hl + ((i + 1) / NB) * len - PW / 2;
      const vv = sg * (hw - 0.35);
      quad(B, P(u0, vv, PLINTH), P(u1, vv, PLINTH), P(u1, vv, PLINTH + 1.1), P(u0, vv, PLINTH + 1.1),
           scalec(PANEL_GRN, sg > 0 ? 1.0 : 0.86));
      quad(B, P(u0, vv, PLINTH + 1.1), P(u1, vv, PLINTH + 1.1),
           P(u1, vv, EAVE - 0.35), P(u0, vv, EAVE - 0.35), PAL.glass);
    }
  }

  // ---- THE TWO PORTALS in the mountain gable -----------------------------
  // 4 m wide, 5.5 m tall, one per direction, on the two rope-pair centres, with
  // a granite pier between them and one either side.
  const POW = 4.0, POH = 5.5;
  const gable = (uu, sgn) => {
    // the whole gable, minus the two portal holes, as bands
    for (let k = 0; k < 6; k++) {
      const z0 = PLINTH + ((EAVE - PLINTH) / 6) * k, z1 = PLINTH + ((EAVE - PLINTH) / 6) * (k + 1);
      for (let i = 0; i < 12; i++) {
        const v0 = -hw + (i / 12) * w, v1 = -hw + ((i + 1) / 12) * w;
        const vm = (v0 + v1) / 2;
        const inPortal = sgn > 0 && z1 <= PLINTH + POH
          && (Math.abs(vm - ROPE_ARM) < POW / 2 || Math.abs(vm + ROPE_ARM) < POW / 2);
        if (inPortal) continue;
        quad(B, P(uu, v0, z0), P(uu, v1, z0), P(uu, v1, z1), P(uu, v0, z1), stone());
      }
    }
    if (sgn > 0) {
      // the dark reveal inside each opening
      for (const vc of [-ROPE_ARM, ROPE_ARM]) {
        for (const sv of [-1, 1]) {
          quad(B, P(uu, vc + sv * POW / 2, PLINTH), P(uu - 2.4, vc + sv * POW / 2, PLINTH),
               P(uu - 2.4, vc + sv * POW / 2, PLINTH + POH), P(uu, vc + sv * POW / 2, PLINTH + POH),
               SHED_LO);
        }
        quad(B, P(uu, vc - POW / 2, PLINTH + POH), P(uu, vc + POW / 2, PLINTH + POH),
             P(uu - 2.4, vc + POW / 2, PLINTH + POH), P(uu - 2.4, vc - POW / 2, PLINTH + POH), PAL.black);
        quad(B, P(uu - 2.4, vc - POW / 2, PLINTH), P(uu - 2.4, vc + POW / 2, PLINTH),
             P(uu - 2.4, vc + POW / 2, PLINTH + POH), P(uu - 2.4, vc - POW / 2, PLINTH + POH), PAL.black);
      }
    } else {
      // the plaza gable: glazed entry doors under the overhang
      quad(B, P(uu - 0.06, -6.5, PLINTH), P(uu - 0.06, 6.5, PLINTH),
           P(uu - 0.06, 6.5, PLINTH + 3.4), P(uu - 0.06, -6.5, PLINTH + 3.4), PAL.glass);
    }
  };
  gable(hl, +1);
  gable(-hl, -1);

  // ---- eight steps up from the lawn to the terrace (view-36) -------------
  {
    const N = 8, run = 0.38, rise = PLINTH / N;
    for (let i = 0; i < N; i++) {
      const u0 = -hl - (N - i) * run, u1 = -hl - (N - i - 1) * run;
      const zz = rise * (i + 1);
      quad(B, P(u0, -7.5, zz), P(u1, -7.5, zz), P(u1, 7.5, zz), P(u0, 7.5, zz), lin(0x8b8681));
      quad(B, P(u0, -7.5, zz - rise), P(u0, 7.5, zz - rise), P(u0, 7.5, zz), P(u0, -7.5, zz),
           lin(0x6f6a65));
    }
  }

  // ---- THE FASCIA BEAM — one blond timber member all the way round --------
  const fasciaRing = (h0, h1) => {
    for (const sg of [-1, 1]) {
      quad(B, P(-hl - OVER, sg * (hw + OVER), h0), P(hl + OVER, sg * (hw + OVER), h0),
           P(hl + OVER, sg * (hw + OVER), h1), P(-hl - OVER, sg * (hw + OVER), h1),
           sg > 0 ? GLULAM : scalec(GLULAM, 0.88));
      quad(B, P(sg * (hl + OVER), -hw - OVER, h0), P(sg * (hl + OVER), hw + OVER, h0),
           P(sg * (hl + OVER), hw + OVER, h1), P(sg * (hl + OVER), -hw - OVER, h1),
           sg > 0 ? scalec(GLULAM, 0.94) : GLULAM_LO);
    }
    // the soffit
    for (const sg of [-1, 1]) {
      quad(B, P(-hl - OVER, sg * hw, h0), P(hl + OVER, sg * hw, h0),
           P(hl + OVER, sg * (hw + OVER), h0), P(-hl - OVER, sg * (hw + OVER), h0), GLULAM_LO);
    }
  };
  fasciaRing(EAVE - 0.95, EAVE);

  // ---- THE ROOF: shallow green standing seam, ribs you can count ----------
  const rw = hw + OVER, rl = hl + OVER;
  const NRB = 34;                     // standing seams along the length
  for (let i = 0; i < NRB; i++) {
    const u0 = -rl + (i / NRB) * (2 * rl), u1 = -rl + ((i + 1) / NRB) * (2 * rl);
    const col = i % 2 ? G_ROOF : G_ROOF_LO;
    for (const sg of [-1, 1]) {
      quad(B, P(u0, sg * rw, EAVE), P(u1, sg * rw, EAVE),
           P(u1, 0, RIDGE), P(u0, 0, RIDGE), sg > 0 ? col : scalec(col, 0.90));
    }
  }
  // ridge cap + the gable barge boards
  for (const sg of [-1, 1]) {
    tri(B, P(sg * rl, -rw, EAVE), P(sg * rl, rw, EAVE), P(sg * rl, 0, RIDGE), scalec(G_ROOF_LO, 0.8));
  }
  // ---- the raised end panel over the plaza doors, lettered FUNITEL --------
  {
    const u0 = -rl, u1 = -rl + 7.0;
    const zt = RIDGE + 1.35;
    for (const sg of [-1, 1]) {
      quad(B, P(u0, sg * 5.2, EAVE + 1.2), P(u1, sg * 5.2, EAVE + 1.2),
           P(u1, sg * 5.2, zt), P(u0, sg * 5.2, zt), sg > 0 ? G_ROOF : scalec(G_ROOF, 0.9));
    }
    quad(B, P(u0, -5.2, EAVE + 1.2), P(u0, 5.2, EAVE + 1.2), P(u0, 5.2, zt), P(u0, -5.2, zt), G_ROOF);
    quad(B, P(u0, -5.2, zt), P(u1, -5.2, zt), P(u1, 5.2, zt), P(u0, 5.2, zt), scalec(G_ROOF, 1.12));
    panel = { at: P(u0 - 0.06, 0, (zt + EAVE + 1.2) / 2), w: 9.2, h: 2.6 };
  }

  // ---- the guide-beam rail the four ropes enter over, and the gantry ------
  // In view-51 it projects clear out over the plaza on steel legs with
  // catwalks; that is what you walk under coming up the mall.
  for (const v of ROPE_OFFSETS) {
    tube(B, P(-hl - 2, v, PLINTH + 4.6), P(hl + 16, v, PLINTH + 4.9), 0.20, PAL.galv, 5);
  }
  for (const sg of [-1, 1]) {
    tube(B, P(hl + 4, sg * (ROPE_ARM + 2.6), PLINTH + 4.9), P(hl + 16, sg * (ROPE_ARM + 2.6), PLINTH + 5.1),
         0.16, PAL.galv, 4);
    tube(B, P(hl + 15, sg * (ROPE_ARM + 2.6), 0), P(hl + 15, sg * (ROPE_ARM + 2.6), PLINTH + 4.9),
         0.34, PAL.steelLo, 6);
  }
  // the bullwheel pit inside
  {
    const ring = [];
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      ring.push(P(-hl * 0.55 + Math.cos(a) * 4.6, Math.sin(a) * 4.6, PLINTH + 3.4));
    }
    plate(B, ring, PAL.steelLo);
  }
  return { signAt: (v) => P(-hl + 1, v, EAVE + 2.0), signYaw: yaw,
           len, w, deck: 0, bodyH: EAVE, ropeZ: PLINTH + 4.8,
           eave: EAVE, ridge: RIDGE, plinth: PLINTH,
           // the roof-end panel over the plaza doors — world.mjs hangs the
           // FUNITEL wordmark on it (view-36: white on green, and the ONLY
           // lettering on this building)
           panel };
}

// =========================================================== THE TOP TERMINAL
//
// A COMPLETELY DIFFERENT BUILDING FROM THE BASE, and that is the point. Where
// the base is granite, timber and green metal standing on the plaza at grade,
// this is a machine: a long charcoal metal shed with a BARREL-VAULT roof,
// standing on slender steel legs over an open, board-formed concrete undercroft
// with the snow blowing through it.
//
// view-66 is the frame this is built from — the whole SE flank end to end — and
// views 11, 35 and 67 corroborate it from three more angles:
//
//   * the roof is a SHALLOW BARREL VAULT, not a gable and not a flat. It springs
//     at the eaves, so the curve IS the roof; end-on it reads as a half
//     cylinder, and the end is capped with a big rolled hood.
//   * a PALE GREY standing-seam trim runs the eave line with the CURVED RAFTER
//     TAILS combed out under it — the scalloped edge is unmistakable in view-66
//     and is the reason this building does not read as a box.
//   * a CONTINUOUS GLAZED CLERESTORY, two bands of big dark panels, runs the
//     whole flank under the eaves. Below it, vertically-ribbed charcoal metal.
//   * the deck is a WEDGE. The bench falls away down-valley, so the undercroft
//     is 4.5 m at the down-valley end and comes to grade at the uphill end —
//     the first cut gave the whole thing a uniform 6.4 m and it read as a pier.
//   * the cabin opening is in the END WALL under the vault at the down-valley
//     end (view-67; view-35 approaches it head on).
//
// The plan is a LENS: 46 x 24 with the ends pulled in, which is what makes
// view-11 call it "rounded".
export function funitelTop(B, seed, { x, y, z, yaw, len = 46, w = 24,
                                      deckHi = 4.5, deckLo = 1.1 } = {}) {
  const rng = makeRng(seed);
  const c = Math.cos(yaw), s = Math.sin(yaw);
  const P = (u, v, h) => [x + u * c - v * s, y + u * s + v * c, z + h];
  const hw = w / 2, hl = len / 2;

  // the deck wedge: -u is DOWN the line (the cabin end, the high undercroft),
  // +u is up the bench toward the lodge, where it comes to grade
  const deckAt = (u) => lerp(deckHi, deckLo, clamp((u + hl) / len, 0, 1));
  const NR = 12;
  const uAt = (i) => -hl + (i / NR) * len;
  const wAt = (u) => hw * (1 - 0.30 * Math.pow(Math.abs(u) / hl, 2.4));

  // ---- the undercroft: a board-formed concrete base wall down the middle and
  // slender steel columns either side of it. The underside is OPEN.
  for (let i = 0; i <= NR; i += 2) {
    const u = uAt(i), d = deckAt(u);
    if (d < 0.5) continue;
    for (const v of [-wAt(u) * 0.74, wAt(u) * 0.74]) {
      tube(B, P(u, v, 0), P(u, v, d), 0.30, PAL.steelLo, 6, 0.26);
    }
  }
  for (let i = 3; i <= 7; i++) {
    const u0 = uAt(i), u1 = uAt(i + 1);
    const d0 = deckAt(u0), d1 = deckAt(u1);
    for (const sg of [-1, 1]) {
      quad(B, P(u0, sg * 4.2, 0), P(u1, sg * 4.2, 0), P(u1, sg * 4.2, d1), P(u0, sg * 4.2, d0),
           sg > 0 ? CONCRETE : scalec(CONCRETE, 0.84));
    }
  }

  // ---- the deck slab and its dark soffit
  for (let i = 0; i < NR; i++) {
    const u0 = uAt(i), u1 = uAt(i + 1), w0 = wAt(u0), w1 = wAt(u1);
    const d0 = deckAt(u0), d1 = deckAt(u1);
    quad(B, P(u0, -w0, d0), P(u1, -w1, d1), P(u1, w1, d1), P(u0, w0, d0), scalec(CONCRETE, 1.02));
    quad(B, P(u0, w0, d0 - 0.65), P(u1, w1, d1 - 0.65), P(u1, -w1, d1 - 0.65), P(u0, -w0, d0 - 0.65), SHED_LO);
    for (const sg of [-1, 1]) {
      quad(B, P(u0, sg * w0, d0 - 0.65), P(u1, sg * w1, d1 - 0.65),
           P(u1, sg * w1, d1), P(u0, sg * w0, d0), scalec(CONCRETE, 0.78));
    }
  }

  // ---- the flanks: ribbed charcoal skirt, then the glazed clerestory
  const SKIRT = 1.9, GLAZE = 3.1;      // to the eaves at deck + 5.0
  const BODY = SKIRT + GLAZE;
  for (let i = 0; i < NR; i++) {
    const u0 = uAt(i), u1 = uAt(i + 1), w0 = wAt(u0), w1 = wAt(u1);
    const d0 = deckAt(u0), d1 = deckAt(u1);
    for (const sg of [-1, 1]) {
      // vertically ribbed metal — the rib is the alternating column colour
      const col = i % 2 ? SHED : mixc(SHED, SHED_LO, 0.55);
      quad(B, P(u0, sg * w0, d0), P(u1, sg * w1, d1),
           P(u1, sg * w1, d1 + SKIRT), P(u0, sg * w0, d0 + SKIRT), sg > 0 ? col : scalec(col, 0.9));
      // THE CLERESTORY — two bands with a mullion rail between them
      quad(B, P(u0, sg * w0, d0 + SKIRT), P(u1, sg * w1, d1 + SKIRT),
           P(u1, sg * w1, d1 + SKIRT + GLAZE * 0.47), P(u0, sg * w0, d0 + SKIRT + GLAZE * 0.47),
           PAL.glass);
      quad(B, P(u0, sg * w0, d0 + SKIRT + GLAZE * 0.47), P(u1, sg * w1, d1 + SKIRT + GLAZE * 0.47),
           P(u1, sg * w1, d1 + SKIRT + GLAZE * 0.53), P(u0, sg * w0, d0 + SKIRT + GLAZE * 0.53),
           scalec(SHED, 1.25));
      quad(B, P(u0, sg * w0, d0 + SKIRT + GLAZE * 0.53), P(u1, sg * w1, d1 + SKIRT + GLAZE * 0.53),
           P(u1, sg * w1, d1 + BODY), P(u0, sg * w0, d0 + BODY), PAL.glass);
      // the mullions themselves, one a bay
      quad(B, P(u0, sg * w0 * 1.002, d0 + SKIRT), P(u0 + 0.28, sg * w0 * 1.002, d0 + SKIRT),
           P(u0 + 0.28, sg * w0 * 1.002, d0 + BODY), P(u0, sg * w0 * 1.002, d0 + BODY),
           scalec(SHED, 1.15));
    }
  }

  // ---- THE BARREL VAULT. A half cylinder springing at the eaves.
  const NS = 9, rise = hw * 0.52;
  const arcV = (k, u) => Math.cos(Math.PI * k / NS) * wAt(u) * 1.06;
  const arcH = (k, u) => deckAt(u) + BODY + Math.sin(Math.PI * k / NS) * rise;
  for (let i = 0; i < NR; i++) {
    const u0 = uAt(i), u1 = uAt(i + 1);
    for (let k = 0; k < NS; k++) {
      const col = i % 2 ? scalec(SHED, 1.16) : SHED;
      quad(B, P(u0, arcV(k, u0), arcH(k, u0)), P(u1, arcV(k, u1), arcH(k, u1)),
           P(u1, arcV(k + 1, u1), arcH(k + 1, u1)), P(u0, arcV(k + 1, u0), arcH(k + 1, u0)), col);
      if (k >= 3 && k <= NS - 4) {
        quad(B, P(u0, arcV(k, u0) * 0.985, arcH(k, u0) + 0.22), P(u1, arcV(k, u1) * 0.985, arcH(k, u1) + 0.22),
             P(u1, arcV(k + 1, u1) * 0.985, arcH(k + 1, u1) + 0.22),
             P(u0, arcV(k + 1, u0) * 0.985, arcH(k + 1, u0) + 0.22), PAL.snow);
      }
    }
  }
  // ---- the PALE GREY eave trim and the combed-out CURVED RAFTER TAILS
  for (let i = 0; i < NR; i++) {
    const u0 = uAt(i), u1 = uAt(i + 1), w0 = wAt(u0), w1 = wAt(u1);
    const d0 = deckAt(u0), d1 = deckAt(u1);
    for (const sg of [-1, 1]) {
      quad(B, P(u0, sg * w0 * 1.06, d0 + BODY), P(u1, sg * w1 * 1.06, d1 + BODY),
           P(u1, sg * w1 * 1.06, d1 + BODY + 0.34), P(u0, sg * w0 * 1.06, d0 + BODY + 0.34),
           PAL.galv);
      // one tail a bay, hanging under the trim
      tube(B, P(u0 + 0.4, sg * w0 * 1.00, d0 + BODY + 0.10),
           P(u0 + 0.4, sg * w0 * 1.22, d0 + BODY - 0.42), 0.085, PAL.steel, 4);
    }
  }
  // ---- the two end hoods, and THE CABIN OPENING in the down-valley one
  for (const u of [-hl, hl]) {
    const pts = [];
    for (let k = 0; k <= NS; k++) pts.push(P(u, arcV(k, u), arcH(k, u)));
    pts.push(P(u, wAt(u) * 1.06, deckAt(u)), P(u, -wAt(u) * 1.06, deckAt(u)));
    plate(B, pts, u > 0 ? SHED : SHED_LO);
    plate(B, pts.slice().reverse(), scalec(SHED_LO, 0.9));
    // the rolled hood: the vault's last segment carried 0.7 m past the wall
    for (let k = 0; k < NS; k++) {
      const uo = u + Math.sign(u) * 0.7;
      quad(B, P(u, arcV(k, u) * 1.03, arcH(k, u) + 0.05), P(uo, arcV(k, u) * 0.92, arcH(k, u) - 0.35),
           P(uo, arcV(k + 1, u) * 0.92, arcH(k + 1, u) - 0.35), P(u, arcV(k + 1, u) * 1.03, arcH(k + 1, u) + 0.05),
           scalec(PAL.galv, 0.72));
    }
  }
  {
    const u = -hl, d = deckAt(u);
    quad(B, P(u - 0.05, -8.6, d + 0.1), P(u - 0.05, 8.6, d + 0.1),
         P(u - 0.05, 8.6, d + 4.4), P(u - 0.05, -8.6, d + 4.4), PAL.black);
  }
  // THE GLAZED CONTROL ROOM box on the upper flank (view-11)
  box(B, { x: P(hl * 0.30, hw * 0.99, deckAt(hl * 0.30) + BODY - 1.0)[0],
           y: P(hl * 0.30, hw * 0.99, deckAt(hl * 0.30) + BODY - 1.0)[1],
           z: z + deckAt(hl * 0.30) + BODY - 1.0, sx: len * 0.20, sy: 0.45, sz: 2.1, yaw, col: PAL.glass });
  // THE GUIDE-BEAM RAIL the four ropes enter over, and the two bullwheel pits
  for (const v of ROPE_OFFSETS) {
    tube(B, P(-hl - 3.5, v, deckAt(-hl) + 2.9), P(hl + 3.5, v, deckAt(hl) + 2.9), 0.20, PAL.galv, 5);
  }
  for (const sgn of [-1, 1]) {
    const ring = [];
    const uu = sgn * hl * 0.62;
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      ring.push(P(uu + Math.cos(a) * 4.6, Math.sin(a) * 4.6, deckAt(uu) + 2.2));
    }
    plate(B, ring, PAL.steelLo);
    plate(B, ring.slice().reverse(), scalec(PAL.steelLo, 0.8));
  }
  // the stair off the uphill end onto the bench (view-66's left edge)
  for (let i = 0; i < 6; i++) {
    const zz = deckAt(hl) - (i + 1) * (deckAt(hl) / 6);
    quad(B, P(hl + 0.6 + i * 0.7, -hw * 0.5, zz), P(hl + 1.3 + i * 0.7, -hw * 0.5, zz),
         P(hl + 1.3 + i * 0.7, -hw * 0.5 + 2.2, zz), P(hl + 0.6 + i * 0.7, -hw * 0.5 + 2.2, zz),
         PAL.steelLo);
  }
  return { signAt: (v) => P(0, v, deckAt(0) + BODY * 0.62), signYaw: yaw,
           len, w, deck: deckHi, bodyH: BODY, ropeZ: deckAt(0) + 2.9,
           deckAt };
}

// ------------------------------------------------------------- the line plan
// WHERE THE TEN TOWERS GO, AND HOW TALL THEY ARE.
//
// Increment 1 put sixteen towers at even spacing and set each height from a
// local convexity term with the sign the wrong way round. Both halves are now
// replaced, and the count is no longer a choice:
//
//   Hans Burkhart, GM, Squaw Valley Ski Corp., OITAF 8th International Congress,
//   San Francisco, May 1999, presenting this lift's construction with Garaventa:
//     "TEN TOWERS had to be built with very large and complicated footings."
//     "TOWER 3 IS 152 FEET HIGH."
//
// POSITIONS are derived, and the derivation is the real one: a tower goes where
// the ground CHANGES SLOPE, because that is where a rope has to be held down or
// pushed up. So the ten sit on the ten largest |d2z/ds2| extrema of the 3DEP
// profile, no two closer than 150 m.
//
// HEIGHTS are then solved rather than guessed. The rope runs in straight chords
// from tower top to tower top; every chord must clear the ground beneath it by
// CLR. Raise the nearer end wherever it does not, iterate, stop. That is what a
// line designer does and it is checkable against the photographs: it puts the
// short towers on the flat run out of the village and the tall ones on the wall,
// which is what liftblog's own captions ("Breakover towers", "Tall tower") show.
//
// AND IT CORROBORATES THE PUBLISHED FIGURE WITHOUT USING IT. Asked only for
// 7 m of clearance over the 3DEP surface, the solver puts a **39 m** tower on
// the valley wall — within 16 % of the 152 ft (46.3 m) Squaw Valley published,
// from elevation data that has never heard of it. What it does NOT do is put
// that tower at plate 3, and the honest reading is in REPORT §17.14: the real
// spacing is not published, and forcing 46.3 m onto a DERIVED position three
// would stand the tallest structure on the mountain in the middle of an even
// slope where nothing needs it.
export function funitelLine(fr, n = 10, { clr = 7.0, hMin = 9, hMax = 46.33,
                                          ropeBase = 6.3, ropeTop = 7.4 } = {}) {
  const S = fr.L, H = 60;
  const samp = [];
  for (let s = 40; s <= S - 40; s += 10) {
    const p = fr.at(s);
    const a = fr.at(Math.min(S, s + H)), b = fr.at(Math.max(0, s - H));
    samp.push({ s, conv: (a.z - p.z) / H - (p.z - b.z) / H });
  }
  const pick = [];
  for (const q of samp.slice().sort((a, b) => Math.abs(b.conv) - Math.abs(a.conv))) {
    if (pick.length >= n) break;
    if (pick.some((p) => Math.abs(p.s - q.s) < 150)) continue;
    pick.push(q);
  }
  // if the profile is too smooth to offer n extrema, fill the widest gaps
  while (pick.length < n) {
    pick.sort((a, b) => a.s - b.s);
    let gi = 0, gw = 0;
    const ends = [{ s: 40 }, ...pick, { s: S - 40 }];
    for (let i = 0; i < ends.length - 1; i++) {
      const w = ends[i + 1].s - ends[i].s;
      if (w > gw) { gw = w; gi = i; }
    }
    pick.push({ s: (ends[gi].s + ends[gi + 1].s) / 2, conv: 0 });
  }
  pick.sort((a, b) => a.s - b.s);

  const pts = [{ s: 0, z: fr.at(0).z + ropeBase, fixed: true },
               ...pick.map((q) => ({ s: q.s, z: fr.at(q.s).z + hMin })),
               { s: S, z: fr.at(S).z + ropeTop, fixed: true }];
  for (let it = 0; it < 80; it++) {
    let worst = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      const span = (b.s - a.s) || 1;
      for (let s = a.s; s <= b.s; s += 8) {
        const t = (s - a.s) / span;
        const need = fr.at(s).z + clr - (a.z + (b.z - a.z) * t);
        if (need <= 0) continue;
        if (need > worst) worst = need;
        if (t < 0.5 && !a.fixed) a.z += need * (1 - t) * 0.6;
        else if (!b.fixed) b.z += need * t * 0.6;
        else if (!a.fixed) a.z += need * (1 - t) * 0.6;
      }
    }
    if (worst < 0.05) break;
  }
  return pts.slice(1, -1).map((p, i) => ({
    n: i + 1, s: p.s, t: p.s / S,
    h: clamp(p.z - fr.at(p.s).z, hMin, hMax),
  }));
}

// ---------------------------------------------------------------- the tower
// Squat and WIDE: a fat cylindrical column and a box-truss crosshead carrying
// FOUR sheave trains (view-12 / view-33). `n` stamps the tower plate.
export function funitelTower(B, seed, { x, y, z, yaw, h = 12, n = 0 } = {}) {
  const c = Math.cos(yaw), s = Math.sin(yaw);
  const P = (u, v, hh) => [x + u * c - v * s, y + u * s + v * c, z + hh];
  const R = 0.78;                                   // "one FAT cylindrical column"
  tube(B, P(0, 0, 0), P(0, 0, h * 0.55), R * 1.3, PAL.galv, 8, R * 1.08);
  tube(B, P(0, 0, h * 0.55), P(0, 0, h), R * 1.08, PAL.galv, 8, R * 0.95);
  quad(B, P(-2.2, -2.2, 0.10), P(2.2, -2.2, 0.10), P(2.2, 2.2, 0.10), P(-2.2, 2.2, 0.10), lin(0x77756f));

  // BOX-TRUSS CROSSHEAD — two chords with verticals and diagonals between them,
  // because view-12's crosshead is a truss and not a stick.
  const A = ROPE_ARM + ROPE_DV / 2 + 1.3;           // reach past the outer rope
  for (const dz of [0, -1.5]) {
    for (const du of [-0.55, 0.55]) {
      tube(B, P(du, -A, h + dz), P(du, A, h + dz), 0.17, PAL.galv, 5);
    }
  }
  for (let v = -A + 0.9; v <= A - 0.8; v += 1.9) {
    tube(B, P(-0.55, v, h), P(0.55, v, h - 1.5), 0.07, PAL.galv, 3);
    tube(B, P(0.55, v, h), P(-0.55, v, h - 1.5), 0.07, PAL.galv, 3);
    tube(B, P(-0.55, v, h), P(-0.55, v, h - 1.5), 0.06, PAL.galv, 3);
    tube(B, P(0.55, v, h), P(0.55, v, h - 1.5), 0.06, PAL.galv, 3);
  }

  // FOUR SHEAVE TRAINS, one per rope — the thing that makes it a funitel
  for (const v of ROPE_OFFSETS) {
    const drop = 1.05;
    tube(B, P(0, v, h), P(0, v, h - drop), 0.16, PAL.galv, 5);
    const NS = 6, sp = 0.62;
    for (let i = 0; i < NS; i++) {
      const u = (i - (NS - 1) / 2) * sp;
      tube(B, P(u, v - 0.33, h - drop), P(u, v + 0.33, h - drop), 0.185, PAL.steel, 7);
    }
    tube(B, P(-NS / 2 * sp, v, h - drop + 0.30), P(NS / 2 * sp, v, h - drop + 0.30), 0.115, PAL.galv, 5);
  }
  // ladder + catwalk to the crosshead
  for (const v of [-0.34, 0.34]) tube(B, P(-R * 2.0, v, 0.4), P(-R * 1.7, v, h - 0.7), 0.038, PAL.galv, 3);
  for (let i = 1; i * 0.44 < h - 1.1; i++) {
    tube(B, P(-R * 1.85, -0.34, i * 0.44), P(-R * 1.85, 0.34, i * 0.44), 0.024, PAL.galv, 3);
  }
  // tower plate — view-12 reads plate 10 from below, so the plates are legible
  if (n) box(B, { x: P(0.15, -1.0, h * 0.50)[0], y: P(0.15, -1.0, h * 0.50)[1],
                  z: z + h * 0.50, sx: 0.78, sy: 0.06, sz: 0.78, yaw, col: PAL.white });
  return { top: P(0, 0, h), armW: ROPE_ARM };
}

// ----------------------------------------------------------------- the ropes
// FOUR strands, not two. Same parabolic sag model as lift.mjs's `cable`, run
// once per rope offset.
export function funitelRopes(B, nodes, { r = 0.050, sagK = 0.009, seg = 5 } = {}) {
  for (const off of ROPE_OFFSETS) {
    for (let i = 0; i < nodes.length - 1; i++) {
      const a = nodes[i], b = nodes[i + 1];
      const dx = b[0] - a[0], dy = b[1] - a[1];
      const L = Math.hypot(dx, dy) || 1;
      const nx = -dy / L * off, ny = dx / L * off;
      const sag = sagK * L;
      let prev = null;
      for (let k = 0; k <= seg; k++) {
        const t = k / seg;
        const p = [a[0] + dx * t + nx, a[1] + dy * t + ny, lerp(a[2], b[2], t) - 4 * sag * t * (1 - t)];
        if (prev) tube(B, prev, p, r, PAL.black, 3);
        prev = p;
      }
    }
  }
}

// ----------------------------------------------------------------- the cabin
// 28 passengers on two parallel ropes, four grips per hanger. The hanger
// BRIDGES the pair (view-12: "a cabin hangs from a hanger gripping *both* ropes
// of its side"), which is the visual signature from underneath.
export function funitelCabin(seed) {
  const B = buf();
  const rng = makeRng(seed);
  const CW = 3.15, CL = 4.5, CH = 2.55;             // 28-pax box, ~14 m2 of floor
  const shell = lin(0xd7dbe0), band = lin(0x2a2d33), accent = lin(0xb5202a);
  // the bridging hanger: a beam across the pair with a grip head over each rope
  for (const dv of [-ROPE_DV / 2, ROPE_DV / 2]) {
    box(B, { x: 0, y: dv, z: -0.30, sx: 0.62, sy: 0.30, sz: 0.62, col: PAL.steelLo });
    tube(B, [0, dv, -0.55], [0, dv * 0.32, -1.35], 0.085, PAL.steelLo, 5);
  }
  tube(B, [0, -ROPE_DV / 2, -0.20], [0, ROPE_DV / 2, -0.20], 0.10, PAL.steelLo, 5);
  tube(B, [0, 0, -1.35], [0, 0, -2.20], 0.11, PAL.steelLo, 5);
  // roof pan + body
  box(B, { x: 0, y: 0, z: -2.55, sx: CL, sy: CW, sz: 0.28, col: band });
  box(B, { x: 0, y: 0, z: -2.55 - CH / 2 - 0.14, sx: CL, sy: CW, sz: CH, col: shell });
  // glazing band all the way round — a funitel cabin is mostly window
  for (const sgn of [-1, 1]) {
    box(B, { x: 0, y: sgn * (CW / 2 + 0.02), z: -3.55, sx: CL * 0.88, sy: 0.05, sz: 1.32, col: PAL.glass });
    box(B, { x: sgn * (CL / 2 + 0.02), y: 0, z: -3.55, sx: 0.05, sy: CW * 0.84, sz: 1.32, col: PAL.glass });
  }
  // the door split and a livery band
  box(B, { x: 0, y: CW / 2 + 0.04, z: -4.20, sx: CL * 0.90, sy: 0.05, sz: 0.30, col: accent });
  box(B, { x: 0, y: -CW / 2 - 0.04, z: -4.20, sx: CL * 0.90, sy: 0.05, sz: 0.30, col: accent });
  // skirt
  box(B, { x: 0, y: 0, z: -2.55 - CH - 0.34, sx: CL * 0.94, sy: CW * 0.94, sz: 0.22, col: band });
  return B;
}
