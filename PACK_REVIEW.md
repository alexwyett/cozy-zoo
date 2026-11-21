# Cozy Zoo free sampler review

Source: [Cozy Zoo by Sandial](https://sandial.itch.io/cozy-zoo-low-poly-mega-modular-3d-pack). Downloaded 18 November 2026 for $0. Archive: `Zoo_Cozy_FREE_Sampler.zip`, 14,509,449 bytes. SHA-256: `3e4528862e91734a456b589107b23f7de846dcfd1600a2f2d351aea8e33c6e8a`.

The observations below come from the actual ZIP and parsed GLBs. Storefront claims are identified separately.

## Actual contents

- **47 individual models**, each in GLB and FBX, across **16 categories**.
- **Nine animal species**, each with a rigid-part skeletal rig; **35 clips total**.
- **38 scenery pieces**: four ground/path tiles, four barriers, six wall/roof modules, two shelters, two visitor buildings, four enrichment items, four plants, two pool tiles, five visitor amenities, two signs, two keeper items and a rock pile.
- A complete catalog FBX, one starter diorama FBX and three assembled prefab FBXs (entrance plaza, lion exhibit, panda garden). These assembled scenes are not supplied as GLBs in this ZIP.
- 28 material colour swatches and a tiny palette image. Individual GLBs use plain colour materials and do not need external textures.
- User guide, asset inventory and licence.

| Animal | Supplied clips | Triangles |
| --- | --- | ---: |
| Elephant | Idle, Walk, Eat, TrunkSwing | 5,200 |
| Giraffe | Idle, Walk, Eat, Browse | 5,980 |
| Lion | Idle, Walk, Eat, Roar | 4,874 |
| Giant panda | Idle, Walk, Eat, HeadShake | 3,696 |
| Gorilla | Idle, Walk, Eat, ChestBeat | 3,364 |
| Emperor penguin | Idle, Waddle, Swim, Slide | 2,760 |
| Harbor seal | Idle, Scoot, Swim | 4,076 |
| Crocodile | Idle, Crawl, Snap | 3,744 |
| Flamingo | Idle, Walk, Peck, Flap, Display | 2,848 |

## Differences from the storefront

The linked page describes a different free selection (red panda, macaw, tortoise and train in place of four of the animals above), 29 clips, 19 categories and 2 m grid snapping. The downloaded user guide and files instead provide 35 clips, 16 categories and a 4 m grid. Use the included inventory when deciding the prototype's roster.

The page advertises roughly 150–1,800 triangles per asset. Measured GLBs range from **188 to 9,960 triangles**; the ticket booth is the heaviest single model. The animal models range from 2,760 to 5,980 triangles. Individual GLBs have multiple material primitives, so sharing a palette alone will not make the complete park a single draw call.

The included user guide says the promotional look uses a render-time toon shader with outlines, warm rim light and lavender shadows, supplied with the Complete tier. The free GLBs contain ordinary colour materials. Our previews use these colours with simplified lighting; they do not reproduce that promotional shader.

## Visual assessment

The animals form a consistent, rounded toy-like collection, with large eyes and pink cheek details. Buildings and props have considerably more ornament than our original minimal art test. This is a workable coherent direction for a friendly Pocket Zoo, with enough free species and enrichment props for an initial progression loop.

Paths, trees and fencing read clearly from an orthographic camera. Long legs, narrow flippers and face details will benefit from a limited zoom range on a phone. The larger building and multi-material costs warrant profiling a populated scene before choosing visitor/animal limits.

## Validation and previews

All 47 individual GLBs were loaded with Three.js. Geometry bounds were checked; each of the 35 clips was sampled to confirm bone movement and near-matching start/end poses. This is an import/animation audit, not a full gameplay or mobile performance test. FBX animations and the supplied assembled FBX scenes have not been validated.

- `cozy-zoo-free.html`: offline review page; opens directly without a server.
- `art-previews/cozy-zoo-free/animals.png`: all nine animals.
- `art-previews/cozy-zoo-free/scenery.png`: all 38 scenery pieces.
- `art-previews/cozy-zoo-free/animations.gif`: locomotion clips, with one loop per tile and timing normalised for comparison.
- `art-previews/cozy-zoo-free/scene.png`: a new comparison scene assembled from the individual GLBs, rather than the supplied FBX diorama.
- `art-previews/cozy-zoo-free/inventory.json`: measured per-asset details and animation checks.

The original Pocket Zoo art test remains available in `index.html`.

## Local source assets and licence

The extracted originals are in `assets/vendor/sandial-cozy-zoo-free/`; the original archive is in `.downloads/`. Both locations are ignored by Git to avoid redistributing the raw pack. Retain the included `LICENSE.txt` and source attribution with local copies.

The included licence permits commercial and non-commercial project use and modifications, without mandatory credit. It prohibits selling, re-uploading or redistributing the raw assets as assets, packs, templates or kits, and claiming authorship. Renders are permitted. This pack is not CC0. No purchase or paid-tier download was made.

The storefront labels its graphics AI-assisted. Its separate claim that the collection is hand-crafted does not remove that disclosure.

## Reproduce locally

With the creator's ZIP extracted at the path above and Node dependencies installed:

```sh
npm run pack:audit
npm run pack:render
```

The audit additionally reads the original ZIP from `.downloads/` to record its hash. Both commands run offline and do not open a listening network port.
