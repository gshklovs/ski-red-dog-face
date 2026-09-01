# This repository is a generated artifact — do not hand-edit it

Everything under `public/` is written by one script in a private research repo:

```
poi-lab/tools/export-red-dog/build.mjs --out <this repo> --gate
```

Built from poi-lab commit `420bde3d9373f043c725bc3a33f5143957907ce8` on `2026-09-01T04:05:09Z`.

A hand-edited change here is lost on the next bake, silently. If something in
`public/` is wrong, the fix belongs in one of three places in poi-lab:

| what is wrong | where the fix goes |
|---|---|
| the mountain — terrain, runs, trees, signs | `runs/palisades-front-A-merge-01/scene/` (then re-bake) |
| the game — physics, HUD, camera, gear | `bench/public/js/play/` (then re-bake) |
| the *crop* — what geometry ships | `tools/export-red-dog/manifest.json` and `tools/export-red-dog/patches/` |
| the *strip* — debug HUD, gear set, branding, the guide | the four flags in `tools/export-red-dog/templates/index.html` |

## How the bake works

1. **Pin.** Every source file is read with `git show <pin>:<path>`. The working
   tree is never touched, so a parallel editing session cannot leak into a
   release.
2. **Allowlist.** `manifest.json` names every source file, its destination and
   its transform. There is no directory walk anywhere in the builder — a
   walk-and-filter would silently ship the next scratch directory somebody drops
   into the source repo. The build asserts afterwards that nothing landed in
   `public/` that the manifest did not name.
3. **Transforms.** `copy`, `stub-module` (replace a module body with the named
   exports it must still provide), `crop-dem` (block-mean decimation of a base64
   Int16 DEM frame, span/origin untouched) and `bundle-three`.
4. **Flags, then patches.** Since poi-lab's specs/0003 the lab and this build
   are ONE product: every difference between them is one of four values —
   `guide`, `gearSet`, `debugHud`, `brand` — declared in `templates/index.html`
   and read once by `js/play/flags.js`. Nothing is forked and nothing user-
   visible is text-patched any more.

   What is left in `tools/export-red-dog/patches/` is the two SCENE patches,
   whose every hunk is a pure function of the crop: the raster extent, the
   derived spawn block, the positional marker filter, the fog distance. They are
   anchored find/replace hunks applied at build time, and **a hunk whose anchor
   is missing, or present more times than declared, fails the build.** That
   rejection is the signal that the source moved under a crop site and a human
   has to look — which is the entire reason they are patches rather than a
   forked copy that would rot in silence.
5. **Spawn.** Derived, not transcribed. The builder loads the *cropped* scene's
   own `layout.mjs` and `ground.mjs`, walks Snow King Road from the point
   nearest the Red Dog Express top terminal, and asserts that the resulting
   ground is flat enough to stand on and that the aim agrees with the fall line.
   Tunable in `tools/export-red-dog/spawn.config.json`.
6. **Gate.** `--gate` loads the built site headless and fails on any budget in
   `manifest.json`'s `budget` block: draw calls, triangles, collidable
   triangles, brotli transfer, JS heap.

## What shipped in this wave

**Tier A** of the crop (spec `0001` §2, D11): data-module surgery only. No
procedural module is restructured, so none of the fourteen hardcoded-lookup
breakage sites is touched.

- `sector-canopy.mjs` and `sector-rock.mjs` stubbed to `[]` — 7.7 MB raw. Every
  sector raster starts at x₀ ≤ −800 and none of them touches the playable box.
- `dem-upper.mjs` `DEM_UP_W` / `DEM_UP_E` decimated 4× and `dem-kt.mjs`
  `DEM_KT` decimated 4× — those are backdrop 2–3 km west of anywhere you can
  ski. `dem-data.mjs` and `canopy-data.mjs`, the playable frame, are untouched.
- The stamp raster is sized to the crop instead of to the whole world.
- **All seven lifts are rideable** (2026-08-30). The Tier A wave shipped a
  one-line filter in `scene-world.patch.mjs` that cut `world.lifts` down to Red
  Dog Express — there is no rideable flag anywhere in the world or the player,
  so that array *is* the flag. The filter is gone: `world.mjs` ships the seven
  lifts it already built, `lift.js` derives an unload spawn for each of them
  from `LIFT_SPAWNS`, and the F boarding circles follow off the same list. The
  F *chip* stays dark in the legend; the contextual prompt at the terminal is
  still the only thing that announces a ride.

- **The respawn fence is surface-aware** (2026-08-30, same day, and it is the
  bill for the line above). Four of the seven top terminals — Olympic Lady,
  KT-22 Express and both Gold Coast lines — unload *outside* the CORE+250 m box
  the old D16.2 fence used. That fence fired on position, so riding one started
  its 2 s grace the moment you pushed off, faded the screen white and put you
  back on Red Dog. Ride up again, same again. Greg played it: "flashing and
  teleporting".

  The rule now is the one that was always meant: **standing on real ground never
  trips the fence, at any coordinate.** It is not a boundary any more, it is the
  recovery from falling into nothing, and it fires only when there is no ground
  under you to land on — off the west edge of the world, through a hole, or
  below the map. Probed on the built scene before the change: every one of the
  seven terminals, the whole Mountain Run corridor down to the village and the
  KT descent all have collidable ground under them, so nothing had to be added
  to the collision to make this ski. The rule lives in `js/play/main.js` now
  (poi-lab specs/0003 upstreamed it — it is the LAB's fence rule too, and the
  lab simply declares no `fence` for it to read).

  The old box survives as a hard backstop at CORE ± 8 km and nothing in play can
  reach it — `controller.js` clamps you into the collision grid, which runs to
  about x -4527. It is there for a teleport that goes wrong.

**Tier B** — pruning `SECTORS`, `RUNS`, `LIFTS` and `KT_DETAIL`, and deleting
the upper-mountain blocks in `world.mjs` — is a later wave. It buys the
triangles and the draw calls; Tier A buys the bytes and the heap.

## The control surface

There are **four** documented keys, and they appear in exactly two places, with
identical wording: the intro card, and the ESC pause panel.

```
W A S D   move
  ← →     tricks in the air
   R      reset
   C      camera
```

The bottom-left legend strip carries **six chips** and they are the same keys:
`WASD move · SPACE jump · ← → spin · C camera · R reset · ESC pause`. R earned
its chip on 2026-08-30 — it is the key you want at the exact moment you are
least likely to reopen a panel to look it up. And if you stop moving for seven
seconds on the ground with no input, one quiet line says `R — back to the run`;
it is gone on the first key, the first touch or the first metre travelled, and
it re-arms. That is `js/play/idle.js`, ~120 lines, and since poi-lab's
specs/0003 it is ordinary player source that runs wherever the guided run does.

Everything else the player can do still works and is simply not advertised —
SHIFT, SPACE, carve and snowplow are found in about four seconds by anyone who
has held a controller; `F` to board the chair is announced by the contextual
prompt under the crosshair *at the terminal*, at the moment it is true, which is
better than a line in a panel nobody reopens; and `E` / `I` / `T` stay hidden
(D34). The rocket pack's throttle is **hold SPACE** — it moved off `G` on
2026-08-31, and its chip only ever appears to somebody already wearing the pack.

While the intro is up, **nothing else is on the screen at all** — not the pause
panel, not the instrument HUD, not the marker prompt. That is one structural CSS
rule (`body.intro-up > *:not(canvas):not(.intro):not(.pboot)`) with the class
set in the static markup, so there is no frame in which any of it can flash.

The build gate reads `document.body.innerText` at first paint and fails on a
list of legacy control strings. It asserts on **the screen**, not on the element
the builder created: the first version of the gate checked only its own card's
text and cheerfully passed a boot screen with two overlapping control lists on
it, because the desktop game boots paused and the legacy panel was painting
straight through the intro.

Two things came *in* beyond Tier A, because leaving them out would have shipped
a broken promise rather than a smaller one:

- **`js/play/touch.js` (D27/D28).** D29 makes a phone boot unpaused. Without an
  input layer that boots you into a mountain you cannot move on, which is worse
  than the pause. It is ~120 lines, it writes the same mutable boolean object
  the physics already reads by reference and calls the same `look()` the mouse
  calls, and **no physics module and no gear module learns that touch exists.**
- **`js/play/intro.js` + `css/intro.css`.** The boot flow (D32): title card,
  controls card, then playing. It also carries the ODbL line D6 requires.

## Honest deviations from the spec

- **`te.css` ships whole** rather than tree-shaken (D22). 22 KB raw / ~4 KB
  brotli is 0.2 % of the download, and hand-pruning the stylesheet the player
  draws its entire palette from is a visual-regression risk that buys nothing
  measurable. Recorded as a decision.
- **The stamp-raster heap target.** The spec's ≤ 16 MB row was computed against
  11 `Float32Array`s. `ground.mjs` actually allocates **18**. The crop is doing
  exactly what the spec asked of it — the array is a fraction of its old size —
  but the absolute number is correspondingly higher than the spec's row.
  `tools/build-report.json` carries the measured figure.
- **More markers survive the positional filter than D37a's five.** The filter is
  exactly the one D37a specifies (`pos[0] > -620 && pos[1] < 740`); the spec's
  count of what it would keep was off by two. `funitel-base` (the village
  station, x -395) is not in D37a's list of eleven upper-mountain markers at
  all, and `exhibition` is its lift's **top** station at x -591.7, inside the box
  rather than west of it. Both are stations of lifts this build still renders in
  full, so they are signs pointing at real structures.

  One more survives **by name**: `kt22`, the KT-22 summit, allowlisted in
  `manifest.json` (`crop.markerFilter.keep`). Its lift boards and, since the
  fence rewrite, its summit is a place you can ski down from — a rideable summit
  with no sign on it is a worse outcome than a sign 900 m west of CORE.
  `eagles-nest`, 19 m away on the same knob, is deliberately *not* allowlisted:
  two signs on one summit is the clutter D37a exists to prevent. The build gate
  asserts both halves — zero *unlisted* upper-mountain markers, and every
  allowlisted one actually present, aimable and fast-travellable.
