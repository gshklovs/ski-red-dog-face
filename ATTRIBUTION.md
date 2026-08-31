# Attribution

The MIT licence in `LICENSE` covers the **code**. The **data** this code renders
is licensed separately, and those licences are listed here.

## Terrain — USGS 3DEP

Elevation is the U.S. Geological Survey's 3D Elevation Program (3DEP) lidar-derived
DEM, resampled to the frames in `public/scene/dem-*.mjs`. USGS 3DEP is a work of
the United States Government and is in the **public domain**.

> Terrain: U.S. Geological Survey, 3D Elevation Program.

## Trails and lifts — OpenStreetMap

Every run centreline and every lift line is derived from OpenStreetMap. The
`osmWay` ids are carried through into `public/scene/layout.mjs` and
`public/scene/sector-data.mjs` so any geometry here can be traced back to the
way it came from.

OpenStreetMap data is licensed under the
[Open Data Commons Open Database License (ODbL) v1.0](https://opendatacommons.org/licenses/odbl/1-0/).
ODbL requires attribution to travel with the produced work, so this credit is
rendered **in the game** — on the intro card and in the pause panel — as well as
here:

> Trails and lifts © OpenStreetMap contributors, licensed under ODbL.

Derived geometry (the smoothed corridors, the piste stamp, the tree placement)
is a Produced Work under ODbL §4.5.

## three.js

Rendering is [three.js](https://threejs.org/) r180, MIT licensed,
© 2010–2025 three.js authors. It is vendored in `public/vendor/` rather than
loaded from a CDN, bundled and minified but otherwise unmodified.

## Names

*Palisades Tahoe*, *Red Dog*, *Champs Élysées*, *KT-22*, *Snow King*,
*Olympic Valley* and the other run and lift names are used **descriptively**, to
identify the real places this terrain is a model of. This project is not
affiliated with, endorsed by, or sponsored by Palisades Tahoe or Alterra
Mountain Company.

## What is *not* here

No photographs, no aerial imagery, no resort trail maps and no logos are
distributed with this repository. Every texture in the game is painted to a
`<canvas>` at runtime by code in `public/js/play/`. The forest, the rock and the
snow reads are derived from raster *statistics* baked to numbers — there is no
image file anywhere in `public/`.
