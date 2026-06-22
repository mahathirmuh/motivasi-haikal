// Achievements — unlocked when a tracked stat reaches its goal.
// `metric` keys into the stats object the garden builds from game state.
export const ACHIEVEMENTS = [
  { id: 'sprout', name: 'Tunas Pertama', icon: '🌱', metric: 'plant', goal: 1, desc: 'Tanam 1 bunga' },
  { id: 'green', name: 'Tangan Hijau', icon: '🌿', metric: 'plant', goal: 25, desc: 'Tanam 25 bunga' },
  { id: 'firstHarvest', name: 'Panen Perdana', icon: '🧺', metric: 'harvest', goal: 1, desc: 'Panen 1 bunga' },
  { id: 'farmer', name: 'Petani Rajin', icon: '👩‍🌾', metric: 'harvest', goal: 25, desc: 'Panen 25 bunga' },
  { id: 'rich', name: 'Saudagar', icon: '💰', metric: 'coins', goal: 200, desc: 'Kumpulkan 200 koin (total)' },
  { id: 'botanist', name: 'Ahli Botani', icon: '🌼', metric: 'variety', goal: 4, desc: 'Tanam 4 jenis berbeda' },
  { id: 'collector', name: 'Kolektor', icon: '🏵️', metric: 'discovered', goal: 4, desc: 'Temukan semua 4 bunga' },
];
