'use strict';
const TAU = Math.PI * 2; // rotación completa (2π), usada por Phaser
let W = 0, H = 0; // viewport, mutado por BattleScene
// ===== CONFIG: constantes globales compartidas =====
const $ = id => document.getElementById(id);
const fmt = n => {
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
  { id:'adn500',    d:'Acumular 500 ADN', r:{g:10000},c:()=>S.adn>=500 }
];
const SETTINGS = {
  audio: true, musicVol: 0.5, sfxVol: 0.7, speed: 1,
  reduceFx: false, tutorialDone: false, buyQty: 1
};
const saveSettings = () => localStorage.setItem('le100_settings', JSON.stringify(SETTINGS));
try { Object.assign(SETTINGS, JSON.parse(localStorage.getItem('le100_settings')) || {}); } catch(e) {}
const CHAPTERS = [
  { name:'Bosque de los Inicios' },
  { name:'Cuevas del Eco' },
  { name:'Pantano de Niebla' },
  { name:'Torre del Rey Bestia' },
  { name:'Más allá del Mapa' }
];
const chapterOf = stage => CHAPTERS[Math.min(CHAPTERS.length-1, Math.floor((stage-1)/10))];
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