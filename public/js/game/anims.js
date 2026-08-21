'use strict';
// ===== ANIMS: data pura de animaciones + fallbacks (si falta sheet → hermano) =====
const ANIM_DEFS = [
  { key: 'hero_walk',     tex: 'hero_walk',      fps: 12, loop: true  },
  { key: 'hero_idle',     tex: 'hero_idle',      fps: 3,  loop: true  },
  { key: 'hero_attack',   tex: 'hero_attack',    fps: 14, loop: false },
  { key: 'hero_cast',     tex: 'hero_cast',      fps: 10, loop: false },
  { key: 'hero_hurt',     tex: 'hero_hurt',      fps: 10, loop: false, start: 0, end: 2 },
  { key: 'hero_death',    tex: 'hero_hurt',      fps: 8,  loop: false, start: 3, end: 5 },
  { key: 'beetle_walk',   tex: 'enemy_beetle',    fps: 7,  loop: true  },
  { key: 'spider_walk',   tex: 'enemy_spider',    fps: 10, loop: true  },
  { key: 'wasp_walk',     tex: 'enemy_wasp',      fps: 12, loop: true  },
  { key: 'scorpion_walk', tex: 'enemy_scorpion',  fps: 8,  loop: true  },
  // Rey Bestia v2 (ciclo 8f + idle/attack/roar con fallback al walk)
  { key: 'boss_walk',     tex: 'enemy_boss',    fps: 8,  loop: true  },
  { key: 'boss_idle',     tex: 'boss_idle',     fps: 4,  loop: true,  fallback: { tex: 'enemy_boss', start: 0, end: 0 } },
  { key: 'boss_attack',   tex: 'boss_attack',   fps: 10, loop: false, start: 0, end: 3, fallback: { tex: 'enemy_boss', start: 0, end: 0 } },
  { key: 'boss_roar',     tex: 'boss_roar',     fps: 8,  loop: false, start: 0, end: 3, fallback: { tex: 'enemy_boss', start: 0, end: 0 } },
  // Aguijón (human_a)
  { key: 'human_a_walk',  tex: 'hero_human_a',        fps: 10, loop: true  },
  { key: 'human_a_idle',  tex: 'hero_human_a_idle',   fps: 3,  loop: true  },
  { key: 'human_a_attack',tex: 'hero_human_a_attack', fps: 9,  loop: false },
  { key: 'human_a_hurt',  tex: 'hero_human_a_hurt',   fps: 10, loop: false, start: 0, end: 2 },
  { key: 'human_a_death', tex: 'hero_human_a_hurt',   fps: 8,  loop: false, start: 3, end: 4 },
  // Elara (human_b)
  { key: 'human_b_walk',  tex: 'hero_human_b',        fps: 10, loop: true  },
  { key: 'human_b_idle',  tex: 'hero_human_b_idle',   fps: 3,  loop: true  },
  { key: 'human_b_attack',tex: 'hero_human_b_attack', fps: 9,  loop: false },
  { key: 'human_b_hurt',  tex: 'hero_human_b_hurt',   fps: 10, loop: false, start: 0, end: 2 },
  { key: 'human_b_death', tex: 'hero_human_b_hurt',   fps: 8,  loop: false, start: 3, end: 4 },
  // Kael (human_c)
  { key: 'human_c_walk',  tex: 'hero_human_c',        fps: 10, loop: true  },
  { key: 'human_c_idle',  tex: 'hero_human_c_idle',   fps: 3,  loop: true  },
  { key: 'human_c_attack',tex: 'hero_human_c_attack', fps: 9,  loop: false },
  { key: 'human_c_hurt',  tex: 'hero_human_c_hurt',   fps: 10, loop: false, start: 0, end: 2 },
  { key: 'human_c_death', tex: 'hero_human_c_hurt',   fps: 8,  loop: false, start: 3, end: 4 },
  { key: 'acc_crown',     tex: 'acc_crown',           fps: 1,  loop: false }
];