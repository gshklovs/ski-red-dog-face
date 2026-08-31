# Red Dog Chair

Ski **Red Dog Face** at Palisades Tahoe, in a browser tab. No install, no
account, no loading a 200 MB game.

You start at the top of the Red Dog Express, one turn off the unload ramp, on
the flat, facing down Champs Élysées. Press **W**.

**→ [play it](https://ski-red-dog-face.vercel.app)**

---

## Controls

| | |
|---|---|
| `W A S D` | move — on skis, `A`/`D` carve and `S` snowplows |
| `MOUSE` | look |
| `← →` | spin, in the air |
| `SPACE` | jump |
| `SHIFT` | sprint / brake |
| `C` | camera — first person ↔ chase |
| `F` | ride the chairlift, standing at the base terminal |
| `R` | respawn |
| `ESC` | pause |

On a phone: drag the **left** half to carve, the **right** half to look, tap to
jump, swipe ← → in the air for spins.

---

## What this actually is

The mountain is not modelled by hand. It is **measured**.

- **The ground is real.** Elevation comes from USGS 3DEP lidar. The Red Dog pod
  is carried at its full native 1.37 m/px, so the terrain function reproduces
  3DEP exactly at every DEM sample; the only loss is Int16 decimetre
  quantisation (±0.05 m). Six independent 3DEP frames are merged, coarsest
  first, each faded in over 70 m of its own inset so a resolution change is a
  gradient and never a step.
- **The runs are real.** Every centreline and every lift line is OpenStreetMap
  geometry, carried with its `osmWay` id. Champs Élysées, Red Dog Face, the Dog
  Legs, Red Dog Glades, Secret Garden, Snow King Road — those are the ways, not
  a sketch of them.
- **The trees are real-ish.** Canopy density is read off summer aerials at
  0.49 m/px and classified per cell. The forest striping *is* the aerial's
  striping: where the photograph shows a glade, there is a glade.
- **The piste is built.** A 2 m raster carries a flatten weight and target
  under every corridor, so a groomed run has a steady skiable grade instead of
  the raw hillside's cross-slope, feathering back out to untouched mountain at
  the corridor edge. Moguls are an egg-carton in the run's own along/across
  frame, 5.6 m × 3.9 m, ±0.34 m — real Red Dog Face bumps run 4–7 m.

Total download: about 2 MB compressed. It is a static site — there is no server.

## Tech notes

- three.js r180, vendored (never a CDN), bundled and minified.
- ES modules + an importmap. No build step to run it: `npm run dev` is just a
  static file server.
- Zero network calls after the initial load. Zero image assets — every texture
  is painted to a `<canvas>` at runtime.
- The terrain, the collision floor and the physics all read **one** height
  function, so there is nothing you can see that you cannot stand on, and no
  invisible wall anywhere.
- Ski down far enough west and the fog closes in, the grooming stops and the
  world quietly puts you back at the top. There is no boundary to hit.

Generated from a private research repo (`poi-lab`) by one script, from commit
`37045523d4` on `2026-08-31T06:27:24Z`. Nothing in here is hand-edited; a re-bake of the
terrain regenerates the whole tree.

## Run it locally

```sh
npm run dev          # http://localhost:3000
```

Any static file server works. **`file://` will not** — ES modules and importmaps
are blocked by CORS on the `file:` scheme, and it will fail for a reason that has
nothing to do with this project.

## Licence and credits

- **Code** — MIT, see [`LICENSE`](LICENSE).
- **Terrain** — USGS 3DEP, public domain.
- **Trails and lifts** — © OpenStreetMap contributors, [ODbL](https://opendatacommons.org/licenses/odbl/1-0/).
- **three.js** — MIT, © 2010–2025 three.js authors.

Full detail in [`ATTRIBUTION.md`](ATTRIBUTION.md).

Resort, run and lift names are used **descriptively**, to identify the real
places this terrain is a model of. Not affiliated with, endorsed by, or
sponsored by Palisades Tahoe or Alterra Mountain Company.
