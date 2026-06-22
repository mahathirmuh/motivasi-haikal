# 🌸 Flower Garden by the Sea

A cozy, **cel-shaded (anime / Ghibli-style) 3D web game** where you garden flowers
on a little grassy island by the sea. Pick a character, plant seeds, water them,
watch them bloom, and harvest for coins — all in the browser.

Built with **Vite + Three.js (vanilla, no React)**. It runs **with zero external
assets** — every character, flower, prop, and sound is generated procedurally in
code — so you can `npm install && npm run dev` and immediately play, then swap in
real `.glb` models / audio later.

![screens: intro → character select → seaside garden]

## ✨ Features

- **Cel-shading**: `MeshToonMaterial` + a procedural stepped gradient map, with
  **inverted-hull outlines** (custom GLSL, drawn as back-faces pushed along the
  view-space normal).
- **Screen flow**: 3D title intro (camera orbiting over the beach) → character
  select → loading → seaside garden.
- **Character customization**: gender toggle (perempuan / laki-laki / netral)
  that changes the body, plus appearance presets with arrow switching and a
  rotating 3D preview — four humanoids, two creatures (**Dinosaur & Godzilla**),
  and three Pokémon (**Pikachu, Jigglypuff & Dedenne**), each with their own
  procedural body and gait. Optional name. Saved to `localStorage`.
- **Garden fairy & pet**: a fairy NPC gives Haikal motivational messages (and the
  odd coin), and a little chick hops along behind you.
- **Levels & XP**: gardening and fishing earn XP; level up for a coin bonus and a
  little celebration. Your level + XP bar show top-left, and your name floats
  above your character.
- **Seaside world**: a lightweight **toon ocean** (vertex-displaced waves +
  animated shoreline foam), a grass plateau ringed by sand and a low cliff,
  palm trees, rocks, drifting clouds, seagulls, and a full **day/night cycle**
  (sun arc, warm→dusk→night sky, fading stars + moon).
- **Gameplay**: third-person follow + orbit camera, **point-and-click + keyboard
  movement**, a grid of plots, timed growth (`seed → sprout → bloom`),
  **plant / water (speeds growth) / harvest (coins + bonus seeds)**, a seed
  inventory of 5 flower types (mawar, tulip, bunga matahari, lily, and the rare
  **anggrek/orchid**) — each worth different coins on harvest — coins,
  a **seed shop** (spend coins to buy seeds), **harvest particle bursts +
  floating coin numbers**, a **bloom sparkle** when a flower opens, and a
  **dynamic mission checklist** that rotates: each finished mission is replaced
  by a fresh random one (plant N, plant a type, harvest N, water N, earn N coins).
- **Living scene & weather**: butterflies by day, fireflies at night, crabs
  scuttling on the sand, fish leaping from the sea, shooting stars at night, and
  occasional **rain** (which auto-waters the garden) clearing into a **rainbow**.
- **Flower album + achievements**: a collection panel tracking discovered/
  harvested flowers, and unlockable achievements with progress.
- **Upgrades & expansion**: spend coins on permanent upgrades — faster growth
  (Pupuk), bigger harvest payouts (Panen Emas), and an auto-watering sprinkler —
  and **unlock more plots** (locked tiles you buy in order to grow your garden).
- **Touch controls**: on touch devices an on-screen joystick + action button
  appear automatically, so it's fully playable on a phone.
- **Audio (Howler.js)**: a calming ocean + wind ambiance loop, gentle music, and
  SFX for footsteps, watering, harvest, and UI — all synthesized to WAV at
  runtime (no audio files needed).
- **Persistence**: profile + coins + inventory + missions + the whole garden are
  saved to `localStorage` and restored on reload.

## 🚀 Getting started

```bash
npm install      # also copies the bundled 3D-title font into /public
npm run dev      # start the dev server (http://localhost:5173)
npm run build    # production build into /dist
npm run preview  # preview the production build
```

Requires Node 18+.

## 🎮 How to play

- **BEGIN** → choose gender, flip presets with the ‹ › arrows, optionally type a
  name → **MULAI**.

**Mouse**
- **Walk**: click the ground.
- **A plot**: click it to walk over and act — **plant** (uses the selected seed),
  **water** it while growing (speeds it up), and **harvest** once it blooms
  (+coins, +bonus seed). Locked plots: click to **unlock** with coins.
- Pick the active seed in the bottom inventory bar. Top-right buttons: weather
  🌦️, upgrades 🔧, achievements 🏆, album 🏵️, shop 🛒, sound 🔊, customize 👕.

**Jump & fishing**
- Press `Space` to **jump**. Walk to the beach edge and press `F` to **fish** —
  wait for the bite, then press again to reel in coins (and sometimes a seed).

**Keyboard shortcuts**

| Key | Action |
|-----|--------|
| `W` `A` `S` `D` / Arrow keys | Move the character (camera-relative) |
| `E` or `Space` | Act on the nearest plot (plant / water / harvest) |
| `1` `2` `3` `4` `5` | Select seed (Mawar / Tulip / Matahari / Lily / Anggrek) |
| `B` | Open the seed shop |
| `G` | Open the flower album |
| `T` | Open achievements |
| `U` | Open upgrades |
| `M` | Toggle sound |
| `C` | Open character customization |

On a phone/tablet, use the on-screen **joystick** (bottom-left) to walk and the
**✿ button** (bottom-right) to act on a nearby plot.

Drag with the mouse to orbit the camera, scroll to zoom.

## 🗂️ Project structure

```
flower-garden/
├─ index.html
├─ scripts/copy-assets.mjs      # postinstall: copies the title font to /public
├─ public/assets/               # fonts (auto), + optional models/ and audio/
└─ src/
   ├─ main.js                   # bootstrap: state, app, screens
   ├─ style.css                 # overlay UI styling
   ├─ core/                     # App loop, ScreenManager, persistent state
   ├─ config/                   # constants, characters, flowers, missions
   ├─ gfx/                      # toon material, outline, lighting, GLTF/DRACO loader
   ├─ audio/                    # Howler manager + procedural WAV synth
   ├─ entities/                 # Avatar (movement), Plot, Flower (growth)
   ├─ world/                    # Sky, Sea, Island, Scenery
   ├─ screens/                  # Intro, CharacterSelect, Loading, Garden
   └─ ui/                       # HUD (coins, missions, inventory)
```

## 🔧 Swapping in real assets

Everything is procedural by default. To upgrade:

- **Models** (`GLTFLoader` + `DRACOLoader` already wired in
  `src/gfx/ModelLoader.js`): drop `.glb` files in `public/assets/models/`, then
  reference them and call `loadGLB()`. Good free CC0/open sources: **Quaternius**,
  **Kenney**, **Mixamo** (Mixamo also gives walk/idle animations).
- **Audio**: drop CC0 files (e.g. ocean waves from **Freesound.org**) into
  `public/assets/audio/` and point the relevant `Howl({ src: [...] })` in
  `src/audio/AudioManager.js` at them.

See `public/assets/README.md` for details.

## ♻️ Resetting

Clear the save from the browser console:

```js
localStorage.removeItem('flowerGarden.save.v1'); location.reload();
```

## 🎨 Notes on the look

The toon style uses a few classic tricks that suit cel-shading well: stepped
gradient ramps instead of smooth lighting, hand-controlled inverted-hull outlines,
a soft gradient sky, warm tone mapping, and a deliberately simple **toon water**
shader (cheap vertex waves + animated foam) rather than a heavy realistic ocean —
which keeps it light and on-style.

---

_By Kakak Mahathir ya Haikal ^,^_ 🌸
