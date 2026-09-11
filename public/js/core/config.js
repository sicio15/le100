'use strict';
const TAU = Math.PI * 2; // rotación completa (2π), usada por Phaser
let W = 0, H = 0; // viewport, mutado por BattleScene
// ===== CONFIG: constantes globales compartidas =====
const $ = id => document.getElementById(id);
// 'Press Start 2P' no tiene mayúsculas acentuadas: "VACÍO" mezclaba la fuente pixel
// con la de respaldo en mitad de la palabra. Para los títulos en esa fuente
// pasamos a mayúsculas Y quitamos las tildes.
const pixelUpper = s => String(s || '').toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const fmt = n => {
  if (n >= 1e12) return (n/1e12).toFixed(1)+'T';
  if (n >= 1e9) return (n/1e9).toFixed(1)+'B';
  if (n >= 1e6) return (n/1e6).toFixed(1)+'M';
  if (n >= 1e4) return (n/1e3).toFixed(1)+'K';
  return String(Math.floor(n));
};
const COSTS = {
  dmg:     [10,  1.18],
  vit:     [12,  1.20],
  regen:   [20,  1.28],
  venom:   [80,  1.45],
  fortune: [25,  1.32]
};
const UPDEF = {
  dmg:     { name:'Daño',       icon:'⚔️', pic:'up_dmg' },
  vit:     { name:'Vitalidad',  icon:'❤️', pic:'up_vit' },
  regen:   { name:'Regen',      icon:'💚', pic:'up_reg' },
  venom:   { name:'Veneno',     icon:'☠️', pic:'up_ven' },
  fortune: { name:'Fortuna',    icon:'🍀', pic:'up_fort' }
};
const ACH = [
  { id:'kill100',   d:'100 kills',    r:{g:500},  c:()=>S.kills>=100 },
  { id:'kill1k',    d:'1.000 kills',  r:{g:2500}, c:()=>S.kills>=1000 },
  { id:'kill10k',   d:'10.000 kills', r:{g:10000},c:()=>S.kills>=10000 },
  { id:'stage10',   d:'Etapa 10',     r:{a:2},    c:()=>S.best>=10 },
  { id:'stage50',   d:'Etapa 50',     r:{a:10},   c:()=>S.best>=50 },
  { id:'stage100',  d:'Etapa 100',    r:{a:30},   c:()=>S.best>=100 },
  { id:'prestige1', d:'Primer Prestigio', r:{a:20}, c:()=>S.prestiges>=1 },
  { id:'prestige5', d:'5 Prestigios',     r:{a:50}, c:()=>S.prestiges>=5 },
  { id:'adn50',     d:'Acumular 50 ADN', r:{g:2000}, c:()=>S.adn>=50 },
  { id:'adn500',    d:'Acumular 500 ADN', r:{g:10000},c:()=>S.adn>=500 },
  // L28: logros ligados al lore y a los jefes de zona
  { id:'boss1',   d:'Derrotar al primer Jefe de Zona', r:{a:5},  c:()=>countBossesBeaten()>=1 },
  { id:'boss4',   d:'Derrotar a 4 Jefes de Zona',      r:{a:25}, c:()=>countBossesBeaten()>=4 },
  { id:'bossAll', d:'Derrotar a todos los Jefes',      r:{a:100},c:()=>countBossesBeaten()>=ZONES.length },
  { id:'relic3',  d:'Reunir 3 Reliquias',              r:{a:15}, c:()=>countRelics()>=3 },
  { id:'codex50', d:'Completar 50% del Bestiario',     r:{g:25000}, c:()=>codexProgress()>=0.5 }
];
const SETTINGS = {
  audio: true, musicVol: 0.5, sfxVol: 0.7, speed: 1,
  reduceFx: false, tutorialDone: false, buyQty: 1,
  // L27: resaltar la mejora con mejor relación beneficio/precio
  hintBest: true,
  // L28: velocidad del texto de los diálogos (0 = instantáneo) y saltar cinemáticas
  textSpeed: 22, skipCutscenes: false
};
const saveSettings = () => localStorage.setItem('le100_settings', JSON.stringify(SETTINGS));
try { Object.assign(SETTINGS, JSON.parse(localStorage.getItem('le100_settings')) || {}); } catch(e) {}

// ===================== ZONAS (LOTE 28) =====================
// Antes eran 5 nombres sueltos en un array. Ahora cada zona es una entidad con
// fondo, clima, música, color, jefe y lore propios: es la unidad que ordena TODO
// (mapa, ambiente, banda sonora, bestiario, diálogos y el jefe que la cierra).
// El texto narrativo vive en core/lore.js; acá está sólo la ficha técnica.
const ZONES = [
  { id:'bosque',  name:'Bosque de los Inicios', sub:'Donde todo empieza',        bg:'bg',        fx:'forest', music:0, color:'#7bed9f', boss:'escarabajo' },
  { id:'cuevas',  name:'Cuevas del Eco',        sub:'La piedra recuerda',        bg:'bg_cave',   fx:'cave',   music:1, color:'#7efcff', boss:'tejedora' },
  { id:'pantano', name:'Pantano de Niebla',     sub:'Nada se pudre del todo',    bg:'bg_swamp',  fx:'swamp',  music:2, color:'#9ad46a', boss:'reina' },
  { id:'torre',   name:'Torre del Rey Bestia',  sub:'El trono de lo que fuimos', bg:'bg_tower',  fx:'tower',  music:3, color:'#ff6b81', boss:'reybestia' },
  { id:'soto',    name:'Sotobosque Profundo',   sub:'Bajo las raíces del mundo', bg:'bg_rogue',  fx:'deep',   music:4, color:'#c86bfa', boss:'obsidiana' },
  { id:'ceniza',  name:'Jardín Calcinado',      sub:'Floreció una sola vez',     bg:'bg',        fx:'ash',    music:5, color:'#ffa726', boss:'cenizas' },
  { id:'cristal', name:'Abismo de Cristal',     sub:'Tu reflejo llegó primero',  bg:'bg_cave',   fx:'crystal',music:6, color:'#e0c3fc', boss:'prismatica' },
  { id:'vacio',   name:'Más allá del Mapa',     sub:'Acá el mapa deja de dibujar', bg:'bg_tower',fx:'void',   music:7, color:'#b388ff', boss:'vacio' }
];
const zoneIndex = stage => Math.min(ZONES.length - 1, Math.max(0, Math.floor((stage - 1) / 10)));
const zoneOf = stage => ZONES[zoneIndex(stage)];
// Compatibilidad: el resto del código llamaba a CHAPTERS/chapterOf desde el Lote 1
const CHAPTERS = ZONES;
const chapterOf = zoneOf;
// Etapa en la que vive el Jefe de Zona de cada zona (la última de sus 10)
const zoneBossStage = idx => idx * 10 + 10;
const isZoneBossStage = stage => stage % 10 === 0;
const isMiniBossStage = stage => stage % 5 === 0 && stage % 10 !== 0;

// FIX LOTE 20: campo `look` restaurado — es el que usa battle-scene para el sprite de cada héroe
const HEROES = [
  { id:'hero_a', name:'Aguijón', role:'dps',    icon:'🗡️', color:'#ff6b81', look:'human_a', pic:'hero_human_a', unlock:1,  ult:'Tajo Triple' },
  { id:'hero_b', name:'Elara',   role:'archer', icon:'🏹', color:'#7efcff', look:'human_b', pic:'hero_human_b', unlock:5,  ult:'Lluvia de Flechas' },
  { id:'hero_c', name:'Kael',    role:'mage',   icon:'🔮', color:'#c86bfa', look:'human_c', pic:'hero_human_c', unlock:10, ult:'Nova Arcana' }
];
const SLOT_DEFS = {
  fang:    { name:'Colmillo', icon:'🗡️', stat:'atk',   pic:'gear_fang' },
  shell:   { name:'Caparazón',icon:'🛡️', stat:'hp',    pic:'gear_shell' },
  antenna: { name:'Antena',   icon:'📡', stat:'crit',  pic:'gear_antenna' },
  charm:   { name:'Amuleto',  icon:'✨', stat:'critd', pic:'gear_charm' }
};
const STAT_NAMES = { atk:'Ataque', hp:'Vida', crit:'Crítico', critd:'Daño Crítico', regen:'Regen' };
const SUB_POOL = ['atk','hp','crit','critd','regen'];
const RAR_NAMES = ['Común','Poco Común','Raro','Épico','Mítico'];
const RAR_COLORS = ['#cfcfcf','#7bed9f','#7efcff','#c86bfa','#ffd700'];
