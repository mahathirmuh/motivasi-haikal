// Character definitions.
//
// Two axes of customization:
//   GENDERS  -> drives body proportions (and a default voice/skin nudge)
//   PRESETS  -> drives appearance (hair style/color, clothing colors, skin)
//
// The Avatar builds a procedural low-poly humanoid from these params, so no
// .glb files are required to play. To swap in real models later, add a
// `model` path to a preset (and/or per gender) and Avatar will load it.

export const GENDERS = [
  {
    id: 'female',
    label: 'Perempuan',
    icon: '♀',
    body: { height: 1.0, shoulders: 0.82, hips: 1.04, torsoTaper: 0.86, headScale: 1.0 },
  },
  {
    id: 'male',
    label: 'Laki-laki',
    icon: '♂',
    body: { height: 1.06, shoulders: 1.12, hips: 0.92, torsoTaper: 1.0, headScale: 1.02 },
  },
  {
    id: 'neutral',
    label: 'Netral',
    icon: '⚥',
    body: { height: 1.03, shoulders: 0.98, hips: 0.98, torsoTaper: 0.94, headScale: 1.0 },
  },
];

// `kind` selects which body recipe Avatar builds: 'humanoid' | 'dino' | 'godzilla'.
// Hair styles (humanoid only) are procedural; `style` selects the hair recipe.
export const PRESETS = [
  {
    id: 'sora',
    name: 'Sora',
    kind: 'humanoid',
    skin: '#f3c9a3',
    hair: { style: 'short', color: '#3a2a22' },
    cloth: { primary: '#7ec4ef', secondary: '#fff3d6' }, // shirt / trousers
    accent: '#ef7a9b',
  },
  {
    id: 'hana',
    name: 'Hana',
    kind: 'humanoid',
    skin: '#f7d3b0',
    hair: { style: 'long', color: '#5a2d1c' },
    cloth: { primary: '#ef9bbd', secondary: '#fbe7b0' },
    accent: '#9be07a',
  },
  {
    id: 'kai',
    name: 'Kai',
    kind: 'humanoid',
    skin: '#d9a878',
    hair: { style: 'spiky', color: '#1f1b18' },
    cloth: { primary: '#9be07a', secondary: '#5a8f3a' },
    accent: '#ffd166',
  },
  {
    id: 'yuki',
    name: 'Yuki',
    kind: 'humanoid',
    skin: '#f6dcc4',
    hair: { style: 'bun', color: '#6b6f78' },
    cloth: { primary: '#c6a8ef', secondary: '#efe6fb' },
    accent: '#7ec4ef',
  },
  {
    id: 'dino',
    name: 'Dino',
    kind: 'dino',
    body: '#7ac74f',
    belly: '#e7f3c0',
    spike: '#f4a14a',
    accent: '#ef7a9b',
  },
  {
    id: 'godzilla',
    name: 'Godzilla',
    kind: 'godzilla',
    body: '#3f5d52',
    belly: '#8aa39a',
    spike: '#dfe7e2',
    accent: '#9be07a',
  },
  // To use a real .glb (e.g. a rigged Mixamo character) instead of a procedural
  // body, add a preset like the following. Avatar will load it and play its
  // walk/idle clips, falling back to the placeholder if it can't be loaded:
  //   { id: 'maya', name: 'Maya', kind: 'humanoid',
  //     model: 'assets/models/maya.glb', modelScale: 1 }
];

export const DEFAULT_PROFILE = {
  name: '',
  gender: 'neutral',
  preset: 0, // index into PRESETS
};

export function getGender(id) {
  return GENDERS.find((g) => g.id === id) || GENDERS[2];
}
export function getPreset(index) {
  const i = ((index % PRESETS.length) + PRESETS.length) % PRESETS.length;
  return PRESETS[i];
}
