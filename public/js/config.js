'use strict';
const $ = id => document.getElementById(id);
const TAU = Math.PI * 2;
const fmt = n => { n = Math.floor(n); if (n < 1e3) return '' + n; if (n < 1e6) return (n/1e3).toFixed(1)+'K'; if (n < 1e9) return (n/1e6).toFixed(1)+'M'; return (n/1e9).toFixed(1)+'B'; };

const COSTS = { dmg:[15,1.5], vit:[12,1.5], regen:[20,1.6], venom:[30,1.6], fortune:[25,1.6] };
const UPDEF = {
    dmg:     { icon:'⚔️', name:'Daño' },
    vit:     { icon:'❤️', name:'Vitalidad' },
    regen:   { icon:'💚', name:'Regeneración' },
    venom:   { icon:'☠️', name:'Veneno' },
    fortune: { icon:'🪙', name:'Fortuna' }
};
const ACH = [
    { id:'k100',  d:'Eliminá 100 enemigos',     r:{g:300},  c:()=>S.kills>=100 },
    { id:'k1000', d:'Eliminá 1.000 enemigos',   r:{g:3000}, c:()=>S.kills>=1000 },
    { id:'s10',   d:'Llegá a etapa 10',         r:{a:1},    c:()=>S.best>=10 },
    { id:'s25',   d:'Llegá a etapa 25',         r:{a:2},    c:()=>S.best>=25 },
    { id:'s50',   d:'Llegá a etapa 50',         r:{a:3},    c:()=>S.best>=50 },
    { id:'p1',    d:'Hacé tu primer prestigio', r:{a:3},    c:()=>S.prestiges>=1 },
    { id:'d10',   d:'Daño nivel 10',            r:{g:2000}, c:()=>S.ups.dmg>=10 },
    { id:'v5',    d:'Veneno nivel 5',           r:{g:2500}, c:()=>S.ups.venom>=5 }
];
/* ===== Settings persistentes ===== */
const SETTINGS_KEY = 'le100_settings_v1';
const DEFAULT_SETTINGS = { audio:true, musicVol:0.5, sfxVol:0.7, speed:1, reduceFx:false, tutorialDone:false };
let SETTINGS = loadSettings();
function loadSettings() {
    try { const s = JSON.parse(localStorage.getItem(SETTINGS_KEY)); if (s) return Object.assign({}, DEFAULT_SETTINGS, s); } catch (e) {}
    return Object.assign({}, DEFAULT_SETTINGS);
}
function saveSettings() { localStorage.setItem(SETTINGS_KEY, JSON.stringify(SETTINGS)); }

/* Capítulos temáticos (cambian fondo/paleta cada 10 etapas) */
const CHAPTERS = [
    { name:'Bosque Nocturno', bg:'img/bg.png' },
    { name:'Cueva Cristal',   bg:'img/bg_cave.png' },
    { name:'Pantano Tóxico',  bg:'img/bg_swamp.png' }
];
const chapterOf = stage => CHAPTERS[Math.min(CHAPTERS.length - 1, Math.floor((stage - 1) / 10))];