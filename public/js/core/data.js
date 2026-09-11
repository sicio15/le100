'use strict';
// ===== DATA: datos puros de balance (única fuente de verdad) =====
// La lógica vive en gear/events/season/progression/formulas/skills/affixes.

// ----- Battle Pass / Temporadas -----
const SEASON_DURATION = 30 * 24 * 60 * 60 * 1000;
const SEASON_MAX_LEVEL = 50;
const PREMIUM_PASS_COST = 50;
const SEASON_XP_PER_KILL = 1;
const SEASON_XP_PER_STAGE = 10;
const SEASON_XP_PER_BOSS = 50;
const SEASON_XP_PER_MISSION = 100;
const SEASON_REWARDS = [];
for (let lvl = 1; lvl <= SEASON_MAX_LEVEL; lvl++) {
  const free = {}, premium = {};
  if (lvl % 2 === 0) free.gold = 500 * lvl;
  if (lvl % 10 === 0) free.adn = 5;
  if (lvl % 5 === 0) free.item = { rarity: Math.min(4, Math.floor(lvl / 10)) };
  premium.gold = 1000 * lvl;
  if (lvl % 5 === 0) premium.adn = 3;
  if (lvl === 10) premium.skin = 'bronce';
  if (lvl === 25) premium.skin = 'plata';
  if (lvl === 50) { premium.skin = 'oro'; premium.title = 'Conquistador de Temporada'; }
  SEASON_REWARDS.push({ lvl, free, premium });
}

// ----- Eventos semanales -----
const EVENTS = [
  { id: 'fiebre',    n: '🪙 Fiebre del Oro',       d: 'Todo el oro x2' },
  { id: 'precision', n: '🎯 Precisión Total',      d: '+25% crítico' },
  { id: 'furia',     n: '🗡️ Furia Ancestral',      d: '+30% daño' },
  { id: 'vital',     n: '❤️ Vitalidad Floreciente', d: '+30% vida y regeneración' },
  { id: 'toxico',    n: '☠️ Marea Tóxica',         d: 'Veneno +50% y cooldown -2s' },
  { id: 'racha',     n: '🛒 Semana de Ofertas',    d: 'Mejoras 20% más baratas' }
];

// ----- Calendario diario (0=domingo) -----
const DAY_EVENTS = [
  { id: 'oro',     d: 0, n: '🪙 Finde Dorado',        desc: 'Oro x2' },
  { id: 'torre',   d: 1, n: '🗼 Día de Torre',        desc: 'Recompensas de Torre x2' },
  { id: 'soto',    d: 2, n: '🌀 Día del Sotobosque',  desc: '+1 ticket de Sotobosque' },
  { id: 'daily',   d: 3, n: '🎯 Día del Jefe Diario', desc: '+1 ticket de Jefe Diario' },
  { id: 'drops',   d: 4, n: '🎒 Día de Drops',        desc: 'Chance de drop x2' },
  { id: 'energia', d: 5, n: '⚡ Día de Energía',       desc: 'Energía de ultimates x2' },
  { id: 'oro',     d: 6, n: '🪙 Finde Dorado',        desc: 'Oro x2' }
];

// ----- Eventos relámpago -----
const FLASH_TYPES = [
  { id: 'oro',     n: '🌠 Lluvia de Oro',  d: 'Oro x3',    mult: 3 },
  { id: 'drop',    n: '🎁 Cosecha',        d: 'Drops x3',  mult: 3 },
  { id: 'energia', n: '⚡ Sobrecarga',     d: 'Energía x2', mult: 2 },
  { id: 'dano',    n: '🔥 Furia Estelar',  d: 'Daño x2',   mult: 2 }
];
const FLASH_DUR = 5 * 60 * 1000;

// ----- Hitos de Torre -----
const TOWER_MILESTONES = [
  { id: 't10',  f: 10,  g: 2000, a: 0,  t: '🥾 Escalador Novato' },
  { id: 't25',  f: 25,  g: 0,    a: 2,  t: '🧗 Alpinista' },
  { id: 't50',  f: 50,  g: 0,    a: 10, t: '🏔️ Maestro de la Torre' },
  { id: 't100', f: 100, g: 0,    a: 25, t: '👑 Conquistador de la Torre' }
];

// ----- Equipo 2.0 -----
const ESSENCE_BY_RAR = [1, 3, 8, 20, 50];
const FUSE_COST = [3, 10, 25, 60];
const AMULET_DROP_CHANCE = [0, 0, 0.05, 0.15, 0.4];

// ----- Rangos de etapa -----
const RANK_COLORS = { S: '#ffd700', A: '#7bed9f', B: '#7efcff', C: '#cfcfcf', R: '#ff4757' };

// ===================== LOTE 26 =====================
// ----- Combo de kills (battle-state.js) -----
const COMBO_WINDOW = 4;      // s sin matar antes de que el combo empiece a caer
const COMBO_STEP   = 0.02;   // +2% daño por kill encadenada
const COMBO_MAX    = 1.5;    // tope x1.5 (se alcanza a las 25 kills)
const COMBO_DECAY  = 6;      // kills por segundo que se pierden al cortar la racha
// L27: escalones visuales del combo (el HUD y los VFX cambian de color en cada uno)
const COMBO_TIERS = [
  { at: 2,  name: 'RACHA',   color: '#7efcff' },
  { at: 8,  name: 'ARDIENTE', color: '#ffd700' },
  { at: 16, name: 'IMPARABLE', color: '#ffa726' },
  { at: 25, name: 'MASACRE',  color: '#ff4757' }
];

// ----- Enemigos élite (enemies.js) -----
const ELITE_CHANCE = 0.07;   // 7% de los spawns normales
const ELITE_HP     = 3.2;    // multiplicador de vida
const ELITE_GOLD   = 4;      // multiplicador de oro
const ELITE_SIZE   = 1.35;   // escala visual
const ELITE_DROP   = 0.55;   // probabilidad de soltar equipo

// ----- Furia del jefe (battle-update.js) -----
const BOSS_RAGE_STEP = 0.25; // +25% de daño del jefe por cada ciclo de 30s agotado
const BOSS_TIMER     = 30;   // s por ciclo

// ----- Golpe manual (tap.js) -----
const TAP_CD   = 0.35;       // s entre golpes manuales
const TAP_MULT = 1.6;        // daño = dps() * TAP_MULT
const TAP_ENERGY = 6;        // energía que otorga al escuadrón

// ----- Sotobosque (modes/rogue.js) -----
const ROGUE_ROOMS   = 8;
const ROGUE_HP_MUL  = 4;     // dureza base de la sala 1
const ROGUE_STEP    = 1.35;  // dureza x1.35 por sala

// ===================== LOTE 27 =====================
// ----- HABILIDADES ACTIVAS (game/skills.js) -----
// Tres botones con cooldown que le dan agencia real al jugador sin romper el idle
// (existe un auto-cast opcional para quien quiera seguir dejándolo solo).
const SKILL_MAX_LV = 10;
const SKILLS = [
  { id: 'smash',  n: 'Golpe Sísmico', ico: '💥', hot: '1', unlock: 3,  cd: 12, dur: 0, color: '#ffa726',
    d: lv => 'Sacude el suelo: ' + (5 + 2 * lv) + 'x tu daño a TODOS los enemigos.' },
  { id: 'frenzy', n: 'Frenesí',       ico: '⚡', hot: '2', unlock: 8,  cd: 26, dur: 8, color: '#7efcff',
    d: lv => '8s de ataque al doble de velocidad y +' + Math.round((0.15 + 0.03 * lv) * 100) + '% de crítico.' },
  { id: 'aegis',  n: 'Égida',         ico: '🛡️', hot: '3', unlock: 15, cd: 34, dur: 7, color: '#7bed9f',
    d: lv => 'Cura ' + Math.round((0.25 + 0.05 * lv) * 100) + '% de vida al escuadrón y reduce el daño recibido 60% por 7s.' }
];
const skillCost = lv => Math.floor(1200 * Math.pow(2.35, lv - 1));
const SKILL_SMASH_MULT  = lv => 5 + 2 * lv;
const SKILL_FRENZY_CRIT = lv => 0.15 + 0.03 * lv;
const SKILL_AEGIS_HEAL  = lv => 0.25 + 0.05 * lv;
const AEGIS_REDUCTION   = 0.4;   // daño recibido x0.4 mientras dura
const FRENZY_HASTE      = 2;     // ataques por segundo x2

// ----- AFIJOS DE ENEMIGO (game/affixes.js) -----
// Rompen la monotonía del farmeo: cada afijo cambia CÓMO se pelea, no sólo cuánto.
const AFFIX_STAGE  = 6;    // a partir de qué etapa pueden aparecer
const AFFIX_CHANCE = 0.16; // probabilidad en spawns normales (los élites siempre llevan uno)
const AFFIXES = [
  { id: 'armored',  n: 'Acorazado', ico: '🛡', css: '#9fb0d8', tint: 0xb9c6ea,
    gold: 2.2, dmgTaken: 0.55, hp: 1.5,
    d: 'Recibe 45% menos daño' },
  { id: 'swift',    n: 'Veloz',     ico: '💨', css: '#7efcff', tint: 0x8ff2ff,
    gold: 1.8, spd: 1.85, atkSpd: 0.62,
    d: 'Corre y ataca mucho más rápido' },
  { id: 'vampiric', n: 'Vampírico', ico: '🩸', css: '#ff6b81', tint: 0xff9aa8,
    gold: 2.2, leech: 0.35,
    d: 'Se cura con el daño que hace' },
  { id: 'volatile', n: 'Volátil',   ico: '💣', css: '#ffa726', tint: 0xffc879,
    gold: 2.6, boom: 1.1,
    d: 'Explota al morir' }
];

// ----- FASES DE JEFE (enemies.js + battle-update.js) -----
// El jefe deja de ser una bolsa de HP: a 60% y 30% cambia de fase, invoca esbirros
// y sube su presión. El HUD muestra los puntos de fase.
const BOSS_PHASES = [0.6, 0.3];
const BOSS_PHASE_DMG = 0.3;   // +30% daño por fase
const BOSS_PHASE_SPD = 0.25;  // +25% velocidad de ataque por fase
const BOSS_PHASE_ADDS = 2;    // esbirros invocados en cada cambio de fase

// ----- AMBIENTE POR ZONA (game/ambience.js) -----
// Partículas + gradación de color: cada zona se SIENTE distinta aunque comparta
// sprites y fondos. `grade` es un velo de color sobre la escena.
// L28: se busca por id (ZONES[n].fx), no por índice, para poder reordenar zonas.
const CHAPTER_FX = [
  { id: 'forest', kind: 'leaf',   color: 0x9ad46a, n: 18, grade: 0x123a1e, gradeA: 0.10, fog: 0 },
  { id: 'cave',   kind: 'drip',   color: 0x8fd8ff, n: 14, grade: 0x0b1740, gradeA: 0.22, fog: 0.12 },
  { id: 'swamp',  kind: 'bubble', color: 0x7bed9f, n: 16, grade: 0x0d2a1c, gradeA: 0.20, fog: 0.22 },
  { id: 'tower',  kind: 'ember',  color: 0xffa726, n: 22, grade: 0x3a0e12, gradeA: 0.20, fog: 0.08 },
  { id: 'deep',   kind: 'spore',  color: 0xc86bfa, n: 20, grade: 0x1b0f30, gradeA: 0.26, fog: 0.18 },
  { id: 'ash',    kind: 'ember',  color: 0xff7043, n: 30, grade: 0x3d1205, gradeA: 0.28, fog: 0.10 },
  { id: 'crystal',kind: 'shard',  color: 0xe0c3fc, n: 22, grade: 0x241442, gradeA: 0.24, fog: 0.06 },
  { id: 'void',   kind: 'star',   color: 0xb388ff, n: 28, grade: 0x140a2e, gradeA: 0.30, fog: 0.12 }
];
const chapterFx = id => CHAPTER_FX.find(f => f.id === id) || CHAPTER_FX[0];

// ===================== LOTE 28 =====================
// ----- Jefes de zona y mini-jefes (game/bosses.js) -----
const ZONE_BOSS_HP   = 22;   // multiplicador de eHP para el Jefe de Zona (etapa %10)
const MINI_BOSS_HP   = 9;    // …y para el mini-jefe (etapa %5)
const MINI_BOSS_SIZE = 0.62; // escala relativa al jefe de la zona
const MINI_BOSS_GOLD = 4;
const ZONE_BOSS_GOLD = 14;
// Ciclos y potencias de las habilidades de jefe
const BOSS_SHIELD_PCT   = 0.35;  // escudo = 35% de su vida máxima, por fase
const BOSS_SLAM_CD      = 11;    // s entre embates
const BOSS_SLAM_TELL    = 1.3;   // s de aviso antes del golpe
const BOSS_SLAM_DMG     = 1.7;   // xeDmg a TODO el escuadrón (telegrafiado: se puede cortar con la Égida)
const BOSS_DRAIN        = 0.45;  // se cura el 45% del daño que hace
const BOSS_CURSE_CD     = 16;
const BOSS_CURSE_DUR    = 6;
const BOSS_CURSE_MULT   = 0.65;  // tu daño x0.65 mientras dure
const BOSS_VOLLEY_CD    = 8;
const BOSS_VOLLEY_N     = 3;
const BOSS_VOLLEY_DMG   = 0.9;
const BOSS_REFLECT      = 0.05;  // te devuelve el 5% del daño que le hacés…
const BOSS_REFLECT_CAP  = 0.04;  // …con tope del 4% de la vida máxima del héroe por golpe.
// Sin ese tope las Espinas escalaban con TU daño: cuanto más fuerte te hacías,
// más te mataban ellas solas. El tope las deja molestas pero nunca letales de golpe.
const BOSS_HASTE_MAX    = 0.9;   // hasta +90% de velocidad de ataque con 0% de vida

// ----- Códice / bestiario (core/codex.js) -----
const CODEX_TIERS      = [25, 100, 500];  // kills para ★ ★★ ★★★ de un bicho
const CODEX_BOSS_TIERS = [1, 5, 25];      // victorias para ★ ★★ ★★★ de un jefe
const CODEX_STAR_DMG   = 0.005;           // +0.5% de daño por estrella

// ----- Diálogos (ui/system/ui-dialogue.js) -----
const DLG_AUTO_MS = 5200;  // si no tocás nada, la línea avanza sola (AFK-friendly)
const DLG_MIN_MS  = 700;   // tiempo mínimo antes de poder saltar una línea
