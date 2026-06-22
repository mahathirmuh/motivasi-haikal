// Purchasable, persistent upgrades. Each has levels with escalating cost.
export const UPGRADES = [
  {
    id: 'growth',
    name: 'Pupuk Ajaib',
    icon: '🌿',
    desc: 'Bunga tumbuh lebih cepat (+12% / level)',
    max: 5,
    baseCost: 30,
    costMul: 1.6,
  },
  {
    id: 'coin',
    name: 'Panen Emas',
    icon: '💰',
    desc: 'Panen memberi lebih banyak koin (+25% / level)',
    max: 5,
    baseCost: 40,
    costMul: 1.7,
  },
  {
    id: 'sprinkler',
    name: 'Penyiram Otomatis',
    icon: '💧',
    desc: 'Menyiram kebun secara otomatis',
    max: 3,
    baseCost: 60,
    costMul: 2.0,
  },
];

export function getUpgrade(id) {
  return UPGRADES.find((u) => u.id === id);
}

export function upgradeCost(u, level) {
  return Math.round(u.baseCost * Math.pow(u.costMul, level));
}
