# Assets

The game ships **playable with zero external assets** — characters, flowers,
scenery, and all audio are generated procedurally in code. This folder is where
you drop authored assets when you want to upgrade the look/sound.

## fonts/
`helvetiker_bold.typeface.json` is copied here automatically by `npm install`
(see `scripts/copy-assets.mjs`). The intro's 3D title uses it; if it's missing
the intro falls back to a styled HTML title.

## models/  (optional)
Drop `.glb` files here to replace the procedural placeholders.

- Free CC0/open humanoids + walk animations: **Quaternius**, **Kenney**, **Mixamo**.
- Free low-poly palms/rocks/props: **Quaternius**, **Kenney**.

To use a model for an avatar, add a `model` path to a preset in
`src/config/characters.js` and load it with `loadGLB()` from
`src/gfx/ModelLoader.js` (GLTFLoader + DRACOLoader are already wired). For
Draco-compressed models, either keep the default CDN decoder or copy three's
decoder into `/public/draco` and call `setDecoderPath('/draco/')`.

## audio/  (optional)
Drop CC0 sound files here (e.g. ocean waves from **Freesound.org**) and point
the relevant `Howl({ src: [...] })` in `src/audio/AudioManager.js` at them
instead of the synthesized data URIs.
