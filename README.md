# Cozy Zoo

An independent, mobile-first 3D zoo builder with a fixed isometric camera. The playable starter uses the Cozy Zoo free sampler, Kenney Mini Characters, Quaternius farm animals, Kenney Coaster Kit railway pieces and original road vehicles.

**Play:** serve the `dist/` folder over HTTP and open it in a WebGL 2-capable browser. The web build has a small HTML loader, separate JavaScript chunks, model files and WebP thumbnails. Opening `dist/index.html` directly from disk shows instructions and an old-save export button; it cannot launch the web build. No single-file offline build is generated.

You start with an entrance, a connected path network, one ready-built penguin cove and **1,800 coins**. Drag to explore, pinch or scroll to zoom, and tap a pen to look after its animals.

The bottom toolbar uses matching icon buttons in this order: **Home | Shop | Animals | Visitors | Dig | Guide**. Home closes panels and recentres the camera; Dig toggles removal mode. All six controls stay visible on phone screens. When building, click or tap to select a tile; that selection stays fixed as you move to Build or Rotate. Click another tile or use the arrows to adjust it. Hovering and camera dragging do not change the selected tile.

## Starter gameplay

- Each pen has individual residents with editable names and consistent size differences. Open its details, enter a name and Save. Names and sizes survive saves, reloads and upgrades; older parks receive default residents automatically. Every completed pen upgrade adds one animal. Existing residents stay visible during upgrades. Penguin and flamingo pens hold 2/3/4 residents at levels 1/2/3; other single-species pens hold 1/2/3 and petting farms hold 3/4/5.
- Each resident also has its own coat colour selector beside its name: six swatches, a custom colour picker and a Natural reset. Colour choices apply and save immediately without clearing name edits. Colours survive upgrades and save imports; new and legacy residents start with natural coats. Only coat materials are changed, with contrasting details and markings retained. Each coloured animal owns its materials, so other residents and scenery stay independent.
- Animal care has a horizontal attention scroller in the Animals panel and on pen details. It shows all pens below the food/cleanliness thresholds, with direct Feed and Clean buttons, current supplies and resident counts. Swipe, scroll or use its arrows; selecting a card opens that pen. Feeding and cleaning serve the whole pen. The selected pen stays available while other urgent pens move through the queue.
- Visitors watching poorly fed or dirty pens lose happiness. Small icons over their heads indicate hunger, thirst, toilet needs or unhappiness; care concerns clear when the pen is cared for, and personal needs clear when facilities serve the guest.

- Visitors are 30% smaller, including seated riders. On foot, they keep personal space, use the right side of paths, move around other guests and wait where there is no room to pass. People watching animals or queueing at facilities find space at the side; blocked visitors can abandon a long queue. Collision positions match the rendered characters.
- **Draw paths and railways:** choose a Garden path or any railway track item. Draw mode starts enabled: drag a route, review its pieces and total price, then Build. Railways automatically choose straights, corners, rotations and footbridges over existing paths. Draw back over your stroke to shorten it, or use Undo. Existing pieces are reused without charging. The entire route is validated before anything is bought; blocked or unaffordable routes never leave partial construction. Two fingers pan/pinch on touch screens. Turn Draw off for normal one-finger panning and individual placement; mouse users can also Alt-drag or right-drag to pan. Stations remain ready-made shop items.

- Build a zoo railway from **Shop > Railway**: one ready-made station with a train ($350, 8 seconds), straight track ($25), quarter-turn curves ($30) and railway footbridges ($45). A footbridge spans three path tiles: the crossing and a ramp on either side. Other pieces occupy one tile. Use Rotate to align matching rail ends; close a loop back to the station to run the train. The station needs a connected visitor path. Choose a footbridge over an existing path; it includes any missing ramp paths. Adding a Garden path across existing straight track also creates a bridge, for the normal path price. Guests walk up the ramps and across the deck while trains pass below. Ground pavement beneath the deck and ramps is hidden, including in placement previews; the connected paths remain usable and reappear when the bridge is removed. Ramps have no side exits, and facilities need a separate level approach. Placement protects existing building access and guest routes. Removing the bridge keeps all three ground paths. Busy bridges cannot be turned or removed until guests have crossed; ramp paths stay protected until their bridge is removed. Older saves upgrade crossings where there is room; cramped ones remain level until rebuilt.
- Up to four visitors queue and ride for $8 each. Riders use their own Kenney character models and the supplied sitting pose, with two seated passengers per carriage; they face forward, follow bends and return to walking after the lap. Fares use the existing floating coin/chime, with a happiness boost after a lap. The station shows connection status and occupancy. Choose **Close ride** to stop boarding, finish the current lap and park for track work; reopen when ready. Track edits are blocked while passengers are aboard. Track, station orientation, construction and closure save with the zoo; trains and visitors restart on reload.

- Shop for all nine animal pens, including their animals, flooring, fencing and enrichment. Choose a location beside a connected path and confirm the purchase. Construction takes 6–16 active seconds depending on the building.
- Buy food and clean pens. Bowl and brush icons flag low supplies and cleanliness; the care panel shows all habitats. Feeding costs coins, cleaning is free. Habitat upgrades reduce care consumption and improve visitor enjoyment.
- Cars and coaches bring guests to the entrance, where each pays 12 coins. Departing visitors walk back to the stop and board a later vehicle.
- Visitors follow connected paths, watch animals and seek snacks, lemonade and toilets. Unmet hunger, thirst and toilet needs reduce happiness. Snack, drink and gift purchases generate income; toilets are free. Facilities serve visitors automatically.
- Income produces a floating coin and a short synthesised chime. Audio unlocks on the first interaction; mute, pause and 1x/2x/3x controls are available.
- Your layout, money, construction progress and care levels save on the current device. Guest populations restart on reload; previously collected income is preserved. Hidden tabs pause simulation. There is no offline income or cloud save.
- Paths automatically join neighbouring tiles into corners, T-junctions, crossings and capped ends. Adding or removing a tile updates its neighbours too.
- Expand through **Zoo shop → Land**. Preview an adjoining meadow, then confirm **Buy land**. Each plot adds 30 usable tiles, with eight available around the original 120-tile park (360 tiles at full expansion). The first costs 450 coins; each subsequent purchase costs 150 more. Unowned land blocks construction; purchased land still needs connected paths. Purchases, extended paths and buildings save together, and older saves retain their original park.
- **Mini petting farm**, in Animal pens, costs 650 coins and takes 12 active seconds to build. Its cow, sheep and pig are included, along with a feeding shelter, hay, grass and fencing. Visitors seek it like other animal pens; food, cleaning, upgrades and rotation all work. The original animated animals are from [Quaternius's CC0 Farm Animal Pack](https://quaternius.com/packs/farmanimal.html), distributed as GLBs on [Poly Pizza](https://poly.pizza/bundle/Farm-Animal-Pack-1kUvRTPLzT). This is our assembled farm diorama, following the requested farm-animal interpretation rather than the advertised Sandial starter plaza.
- Rotate any shop object except paths in 90-degree steps. Use **Rotate** during placement to see the actual model turn, or tap a built object and use **Rotate 90°** in its details. Rotation is free, works during construction and saves with the park. Paths choose their orientation automatically from their neighbours.
- Tap Dig in the toolbar or the shovel in the Zoo shop to remove paths, facilities, benches and trees. Select a tile and confirm Remove; the highlighted footprint and refund are shown first. Facilities also offer a Remove button in their details. You recover half the base purchase price; upgrades are not refunded. Entrance tiles, animal homes and routes still needed by buildings or guests are protected. Guests reroute after edits, and removed facilities stop serving immediately.
- Visitors use all 13 civilian models from [Kenney Mini Characters](https://kenney.nl/assets/mini-characters), with the supplied idle, walk and sit animations. The downloaded 2.0 archive is CC0. Their palette is baked into vertex colours to preserve colours without loading external textures. Each guest has an independent animation rig while sharing geometry and materials.

The road and both pavements reach the edges of the environment. Six roadside acacias and six benches decorate the frontage, with the entrance and drop-off kept clear. Cars and coaches enter and leave beyond the road ends. These permanent decorations do not occupy the zoo?s building tiles.

The shop supports paths, benches and acacias too. Benches and trees are decorative in this prototype. Upgrades stop service until their construction completes.

The separately downloaded Cozy Zoo free sampler is reviewed in `cozy-zoo-free.html`. See [PACK_REVIEW.md](PACK_REVIEW.md) for the actual nine-species roster, supplied animations, measured model costs and differences from the storefront. Vendor source files remain local and are ignored by Git under the creator's redistribution terms.

## Review

- `art-previews/zoo-diorama.png`: complete isometric scene.
- `art-previews/animal-lineup.png`: individual animal close-ups.
- `art-previews/kenney-visitors.png`: all 13 actual Kenney visitors at the game scale.
- `art-previews/path-junctions.png`: all 16 path connection combinations.
- `art-previews/animal-upgrades.png`: actual level 1/2/3 penguin pens with 2/3/4 differently sized residents.
- `art-previews/animal-colours.png`: actual penguin, giraffe and farm models in Natural, Sage, Sky and Lilac coats (`npm run render:colours`, no server).
- `art-previews/animal-care-review.html`: static review of the actual care scroller, name fields and mobile styling.
- `art-previews/drawn-railway.png`: a complete railway route preview with automatic corners and a footbridge.
- `art-previews/train-passengers.png`: four actual visitors seated in the carriages after boarding.
- `art-previews/zoo-railway.png`: actual station, train, curves and wooden footbridge in a demonstration loop.
- `art-previews/petting-farm.png`: the new farm animal diorama.
- `art-previews/expanded-zoo.png`: a purchased meadow connected to the original park.
- `art-previews/mobile-portrait.png`: 1080 × 1920 phone composition study.
- `art-previews/giraffe.png`, `elephant.png`, `penguin.png`: transparent individual renders.
- `assets/models/`: self-contained GLB exports of each animal and the full scene.

## Build and verify

Requires Node.js 22 or newer.

```sh
npm install
npm run build
npm test
```

After explicit permission to open a listening port, run `npm run preview` and visit **http://127.0.0.1:4173**. The preview serves only `dist/`, binds to the local computer and stops with Ctrl+C. Builds and tests never start a server, and `npm test` rebuilds the distribution as part of its checks.

`npm run build` writes `dist/index.html` (about 3 KB), four JavaScript chunks (about 680 KB combined), a separate stylesheet, an asset manifest and content-hashed GLBs/WebP thumbnails. A fresh zoo initially loads 21 of 50 models (about 2.52 MiB); saved parks load all models needed by their existing buildings. Other shop models load on selection, with progress, cancellation and retry. Requests share in-flight loads and parsed models, with up to three concurrent downloads per batch. Shop purchases charge only after successful loading and placement confirmation. The HTML loader appears before the engine downloads; model progress reflects download and parsing. `dist/build-report.json` records actual byte counts for each build. Generated-file tracking removes superseded chunks on subsequent builds without clearing other files from `dist/`.

Deploy the entire `dist/` folder together. Serve HTML and `assets/manifest.json` with revalidation/no-cache; the hashed JS, CSS, model and image files can have long cache lifetimes. All game assets remain on the same server; there are no CDN dependencies. Unloaded items need a connection to load. This build does not provide service-worker/offline caching.

The selected Sandial GLBs come from the creator's free ZIP extracted at `assets/vendor/sandial-cozy-zoo-free/`. Read `PACK_REVIEW.md` for archive details. Prepared Kenney GLBs and their CC0 licence are in `assets/characters/kenney/`. To regenerate them, extract the official Mini Characters ZIP into `assets/vendor/kenney-mini-characters/` and run `npm run prepare:visitors`. Preparation keeps civilian meshes, rigs and idle/walk/sit clips, bakes the palette and removes unused animation data. Assets remain independent of every other local project.

**Move an existing save:** browser storage is tied to its origin, so the old `file:` game and `http://127.0.0.1:4173` do not share a save. Open the updated `dist/index.html` using the exact same file path and browser as before and choose **Export saved zoo**. In the web game, open **Zoo shop → Guide & saved zoo → Import zoo** and select that JSON file. Import validates the park before replacing the current browser's zoo; invalid files leave the current zoo intact. The Guide also provides export for later backups. Keep using the same hostname and port to keep the same browser save.

The game simulation tests cover purchases, path access, construction, care, gate income, visitor needs and service income, transport, animal pens, upgrades and save validation. Landscape tests check path openings, junction changes, removals, guest rerouting and expansion. Scene tests load actual GLBs and exercise every building and visitor rig. Loading tests cover starter dependencies, lazy habitats, shared requests and retry after failure. Build tests check chunk references, GLB hashes, WebP images, notices, startup size and stale-chunk cleanup. Drawing tests cover skipped tiles, backtracking, reverse-direction routes, automatic curves and bridges, total prices, and atomic purchases. Input tests cover drawing, hover stability, cancellation and switching to two-finger camera gestures. Crowd tests check separation, service access, departures and opposing bridge traffic. Animal-care tests cover named resident save migration, delayed population growth, independent animation rigs, consistent sizes, attention scroller markup, escaped name fields, welfare penalties and visitor icon lifecycles. Live browser interaction, save-file transfer, audio playback and mobile GPU performance still require manual verification.

The railway uses six models from [Kenney Coaster Kit](https://kenney.nl/assets/coaster-kit), licensed CC0. Prepared self-contained GLBs, the licence and provenance are in `assets/railway/kenney/`. To regenerate, extract the official archive to `assets/vendor/kenney-coaster-kit/` and run `npm run prepare:railway`. Palette colours are baked into vertices; flat track origins are normalised to the game grid. Railway models load on selection and are included at startup only when a saved park uses them. This first version supports flat loops, one station and one train; slopes and track junctions are not included.

Railway tests cover exact connections, continuous corner geometry, crossings and path preservation, fares, capacity, complete laps, closing for track work, save compatibility and moving the actual Kenney train meshes. Bridge tests cover both axes, ramp occupancy, smooth visitor elevation, deck and train clearance, automatic path-over-track construction, protected routes and older save migration.

Additional art commands:

```sh
npm run render
npm run export
npm run check
npm run render:starter
npm run render:visitors
npm run render:expansion
npm run render:railway
npm run render:passengers
npm run render:drawing
npm run render:care
```

All build, render and test scripts run offline once dependencies and assets are installed. They do not open a listening network port. On Windows PowerShell use `npm.cmd` if script execution policy prevents `npm`.

`three` supplies rendering, animation and GLB import/export. `esbuild` splits the game into modules. `sharp` composites offline preview images and prepares WebP shop thumbnails. There are no project-to-project imports, symlinks, shared application code, backend connections or external runtime services. Runtime static geometry is batched by material; skinned animals remain independently animated. Mobile rendering caps pixel density at 1.5 and uses a 1024px directional shadow map.

## Art direction

Art study 01 uses clean silhouettes, bevelled forms, natural pastel colours and restrained details. Honey yellow and warm patches identify the giraffe; broad blue-grey ears, a curled trunk and small tusks identify the elephant; a cream belly, orange beak and flippers identify the penguin. Its scenery and animal meshes are original; no Kenney asset files have been included. The separate pack review uses Sandial's assets and preserves their authorship.

The world uses stylised metres, Y up, +Z forward. Animal parts have named groups for subsequent animation work. Runtime model materials are texture-free; facility signs use small generated canvas textures. The included plinth, paths, fencing, kiosk, visitors and plants demonstrate how a consistent collection could look together.

## Art archive and limitations

The original study in `index.html` and the pack review in `cozy-zoo-free.html` are preserved. They are static previews; the playable game is `dist/index.html`. `art-previews/starter-desktop.png` and `starter-phone.png` are offline renders of the real game scene graph, without the browser UI. Their lighting differs from the WebGL renderer.

The starter has no staff automation, breeding, research unlocks, terrain editing, building relocation or multiplayer. Visitors do not queue physically or collide with one another; petting-farm visitors view the animals from adjoining paths. Land expansion stops after eight extra meadows. These are possible subsequent milestones after playtesting the care and economy loop.
