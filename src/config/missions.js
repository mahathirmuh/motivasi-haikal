// Dynamic missions: randomly generated, incremental goals that rotate — when one
// completes it's replaced by a fresh one, so the checklist keeps changing.
import { FLOWERS, FLOWER_IDS } from './flowers.js';

let _seq = 0;
function uid() {
  _seq += 1;
  return `m${_seq}_${Math.floor(Math.random() * 1e6)}`;
}
const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

// Each recipe returns the variable part of a mission.
const RECIPES = [
  () => {
    const n = ri(3, 6);
    return { type: 'plant', target: n, text: `Tanam ${n} bunga`, reward: 6 };
  },
  () => {
    const f = FLOWER_IDS[Math.floor(Math.random() * FLOWER_IDS.length)];
    const n = ri(2, 4);
    return { type: 'plantType', flower: f, target: n, text: `Tanam ${n} ${FLOWERS[f].name}`, reward: 8 };
  },
  () => {
    const n = ri(2, 4);
    return { type: 'harvest', target: n, text: `Panen ${n} bunga`, reward: 10 };
  },
  () => {
    const n = ri(3, 6);
    return { type: 'water', target: n, text: `Siram ${n} kali`, reward: 5 };
  },
  () => {
    const n = ri(3, 8) * 10;
    return { type: 'earn', target: n, text: `Kumpulkan ${n} koin`, reward: Math.round(n / 4) };
  },
  () => {
    const n = ri(2, 5);
    return { type: 'fish', target: n, text: `Pancing ${n} ikan`, reward: 9 };
  },
];

export function generateMission(existingTexts = []) {
  for (let i = 0; i < 16; i++) {
    const m = RECIPES[Math.floor(Math.random() * RECIPES.length)]();
    if (!existingTexts.includes(m.text)) return { id: uid(), progress: 0, done: false, ...m };
  }
  const m = RECIPES[0]();
  return { id: uid(), progress: 0, done: false, ...m };
}

export function generateMissions(count) {
  const list = [];
  for (let i = 0; i < count; i++) list.push(generateMission(list.map((x) => x.text)));
  return list;
}
