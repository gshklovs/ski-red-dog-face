// The environment flags — specs/0003.
//
// ONE product, two environments. The bench is the SUPERSET (debug instruments,
// F8 dev mode, the full secret locker with the bikes in it); the shareable Red
// Dog build is the same product with those switched off. Nothing forks: every
// difference between the two is one of the four values below, read here, once,
// and read nowhere else in the player.
//
// THE DEFAULTS ARE THE LAB'S, on purpose. A new bench page that sets no flags
// at all gets the superset — the failure mode of forgetting a flag is "the lab
// shows a debug instrument", never "the public build ships one". The deploy
// strips by SAYING SO OUT LOUD in tools/export-red-dog/templates/index.html,
// where the strip is reviewable in one screen.
//
// Set by the host page before it imports main.js:
//
//   guide     true  → the guided run, its intro cards and the idle nudge
//   gearSet   'skis' → the ski mountain: no bike gear, no bike rack, hold-E is
//                      boots+skis. Glider / sled / snowmobile stay in the secret
//                      I locker, which is where they already were.
//             'full' → the lab: bikes back in the registry and in the locker.
//   debugHud  true  → the top-left readout, the fps chip, the B reference
//                     viewer, the full ESC key reference, the bench pause row,
//                     the T fast-travel card, the [play] console dump.
//   brand     'RED DOG' | 'POI-LAB' → the wordmark on the gear, the HUD chip,
//                     the pause header and the tab title.
//   label     bench chrome only: the name the LAB lists this world/mode under.
//                     It never reaches the game, so a bench mode that reproduces
//                     the shipped build reproduces it exactly and still shows up
//                     in the fleet under its own name. The deploy never sets it.
//
// `guide` is deliberately NOT re-derived here: main.js has owned that decision
// since before this file existed (`?guide=` beats `__PLAY.guide`, so the query
// form is an override rather than only a switch) and moving it would break the
// one seam that is already correct.

const P = (typeof window !== 'undefined' && window.__PLAY) || {};

// ------------------------------------------------------------------ gearSet
export const GEAR_SET = P.gearSet === 'skis' ? 'skis' : 'full';
// The single question every gear site actually asks. Named for what it MEANS
// rather than for the flag, so a reader at the call site does not have to come
// back here to find out which way round 'skis' runs.
export const FULL_LOCKER = GEAR_SET === 'full';

// ----------------------------------------------------------------- debugHud
export const DEBUG_HUD = P.debugHud !== false;

// -------------------------------------------------------------------- brand
export const BRAND = P.brand === 'RED DOG' ? 'RED DOG' : 'POI-LAB';
export const RED_DOG = BRAND === 'RED DOG';

// Pick a string per brand. Two arguments in the order (lab, red) at every call
// site, so a scan of `pick(` reads as a two-column table of every user-visible
// identity string in the build — which is exactly what D9 wants to be able to
// audit.
export const pick = (lab, red) => (RED_DOG ? red : lab);

// -------------------------------------------------------------------- label
export const LABEL = (typeof P.label === 'string' && P.label) ? P.label : null;
