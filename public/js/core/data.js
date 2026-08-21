'use strict';
// ===== DATA: datos puros de balance (única fuente de verdad) =====
// La lógica vive en gear/events/season/progression/formulas.

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