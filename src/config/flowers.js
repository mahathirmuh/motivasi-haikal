// Flower species. Each has colors, a `shape` recipe (entities/Flower.js builds
// the bloom from it), and a coin `value` paid on harvest (before upgrades).

export const FLOWERS = {
  rose: {
    id: 'rose',
    name: 'Mawar',
    icon: '🌹',
    shape: 'rose',
    petal: '#ef5d7a',
    petalInner: '#ff96ad',
    center: '#b23a52',
    stem: '#4f8f2c',
    value: 12,
  },
  tulip: {
    id: 'tulip',
    name: 'Tulip',
    icon: '🌷',
    shape: 'tulip',
    petal: '#f5a3d0',
    petalInner: '#ffd1ec',
    center: '#e0609f',
    stem: '#4f8f2c',
    value: 12,
  },
  sunflower: {
    id: 'sunflower',
    name: 'Matahari',
    icon: '🌻',
    shape: 'sunflower',
    petal: '#ffce4a',
    petalInner: '#ffe48a',
    center: '#7a4a22',
    stem: '#4f8f2c',
    value: 14,
  },
  lily: {
    id: 'lily',
    name: 'Lily',
    icon: '🪷',
    shape: 'lily',
    petal: '#fbf3ff',
    petalInner: '#ffe2f0',
    center: '#ffcf5a',
    stem: '#4f8f2c',
    value: 16,
  },
  orchid: {
    id: 'orchid',
    name: 'Anggrek',
    icon: '🪻',
    shape: 'orchid',
    petal: '#c77dff',
    petalInner: '#e9c6ff',
    center: '#ffd166',
    stem: '#4f8f2c',
    value: 24, // rare / premium
  },
};

export const FLOWER_IDS = Object.keys(FLOWERS);

export function getFlower(id) {
  return FLOWERS[id] || FLOWERS.rose;
}
