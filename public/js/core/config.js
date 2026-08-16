'use strict';
// ===== CONFIG: helpers globales + tablas de diseño =====
const $ = id => document.getElementById(id);
const TAU = Math.PI * 2;
let W = 0, H = 0; // tamaño del viewport de batalla (lo actualiza Phaser)
const fmt = n => { n = Math.floor(n); if (n < 1e3) return '' + n; if (n < 1e6) return (n / 1e3).toFixed(1) + 'K'; if (n < 1e9) return (n / 1e6).toFixed(1) + 'M'; return (n / 1e9).toFixed(1) + 'B'; };
const COSTS = { dmg: [15, 1.5], vit: [12, 1.5], regen: [20, 1.6], venom: [30, 1.6], fortune: [25, 1.6] };
// pic = ícono pixel (icons.js) · icon = emoji fallback / toasts
const UPDEF = {
  dmg:     { icon: '⚔️', pic: 'sword',  name: 'Daño' },
  vit:     { icon: '❤️', pic: 'heart',  name: 'Vitalidad' },
  regen:   { icon: '💚', pic: 'potion', name: 'Regeneración' },
  venom:   { icon: '☠️', pic: 'venom',  name: 'Veneno' },
  fortune: { icon: '🪙', pic: 'coin',   name: 'Fortuna' }
};
const ACH = [
  { id: 'k100',  d: 'Eliminá 100 enemigos',           r: { g: 300 },  c: () => S.kills >= 100 },
  { id: 'k1000', d: 'Eliminá 1.000 enemigos',         r: { g: 3000 }, c: () => S.kills >= 1000 },
  { id: 's10',   d: 'Llegá a etapa 10',               r: { a: 1 },    c: () => S.best >= 10 },
  { id: 's25',   d: 'Llegá a etapa 25',               r: { a: 2 },    c: () => S.best >= 25 },
  { id: 's50',   d: 'Llegá a etapa 50',               r: { a: 3 },    c: () => S.best >= 50 },
  { id: 'p1',    d: 'Hacé tu primer prestigio',       r: { a: 3 },    c: () => S.prestiges >= 1 },
  { id: 'd10',   d: 'Daño nivel 10',                  r: { g: 2000 }, c: () => S.ups.dmg >= 10 },
  { id: 'v5',    d: 'Veneno nivel 5',                 r: { g: 2500 }, c: () => S.ups.venom >= 5 },
  { id: 't10',   d: '🗼 Torre: piso 10',              r: { g: 5000 }, c: () => S.towerBest >= 10 },
  { id: 't25',   d: '🗼 Torre: piso 25',              r: { a: 2 },    c: () => S.towerBest >= 25 },
  { id: 'a100',  d: '⚔️ Arena: llegá a 100 pts',      r: { g: 4000 }, c: () => S.arenaPts >= 100 },
  { id: 'sh5',   d: '🛒 Tienda: 5 niveles comprados', r: { g: 3000 }, c: () => Object.values((S.shop && S.shop.lv) || {}).reduce((a, b) => a + b, 0) >= 5 },
  { id: 'sk1',   d: '🎨 Coleccioná una skin',         r: { a: 2 },    c: () => ((S.shop && S.shop.skins) || []).length >= 1 }
];
// ===== Settings persistentes =====
const SETTINGS_KEY = 'le100_settings_v1';
const DEFAULT_SETTINGS = { audio: true, musicVol: 0.5, sfxVol: 0.7, speed: 1, reduceFx: false, tutorialDone: false };
let SETTINGS = loadSettings();
function loadSettings() {
  try { const s = JSON.parse(localStorage.getItem(SETTINGS_KEY)); if (s) return Object.assign({}, DEFAULT_SETTINGS, s); } catch (e) {}
  return Object.assign({}, DEFAULT_SETTINGS);
}
function saveSettings() { localStorage.setItem(SETTINGS_KEY, JSON.stringify(SETTINGS)); }
// ===== Capítulos temáticos (cambian fondo/paleta cada 10 etapas) =====
const CHAPTERS = [
  { name: 'Bosque Nocturno', bg: 'img/bg.png' },
  { name: 'Cueva Cristal',   bg: 'img/bg_cave.png' },
  { name: 'Pantano Tóxico',  bg: 'img/bg_swamp.png' }
];
const chapterOf = stage => CHAPTERS[Math.min(CHAPTERS.length - 1, Math.floor((stage - 1) / 10))];
// ===== Escuadrón: héroe principal + compañeros (LOTE 4) =====
// look: 'main' = sigue el vestidor (cienpies | human_a) · resto = sheet fijo propio.
// roles: dps (melee) · archer (rango, AoE) · mage (AoE + cura).
const HEROES = [
  { id: 'sting', name: 'Aguijón', role: 'dps',    look: 'main',    color: '#6ee87e', tint: null, unlock: 1,  ult: 'Tajo Triple' },
  { id: 'leaf',  name: 'Elara',   role: 'archer', look: 'human_b', color: '#7efcff', tint: null, unlock: 5,  ult: 'Lluvia de Flechas' },
  { id: 'shell', name: 'Kael',    role: 'mage',   look: 'human_c', color: '#c86bfa', tint: null, unlock: 10, ult: 'Nova Arcana' }
];
// ===== Equipo =====
const RAR_NAMES  = ['Común', 'Raro', 'Épico', 'Legendario', 'Mítico'];
const RAR_COLORS = ['#cfcfcf', '#4fc3f7', '#c86bfa', '#ffa726', '#ff5252'];
const SLOT_DEFS = {
  fang:    { name: 'Colmillo',  stat: 'atk',   icon: '🗡️', pic: 'sword' },
  shell:   { name: 'Caparazón', stat: 'hp',    icon: '🛡️', pic: 'shell' },
  antenna: { name: 'Antena',    stat: 'crit',  icon: '📡', pic: 'bolt'  },
  charm:   { name: 'Dije',      stat: 'regen', icon: '🍀', pic: 'leaf'  }
};
const STAT_NAMES = { atk: 'Daño%', hp: 'Vida%', crit: 'Crítico%', critd: 'DañoCrit%', regen: 'Regen%' };
const SUB_POOL = ['atk', 'hp', 'crit', 'critd', 'regen'];