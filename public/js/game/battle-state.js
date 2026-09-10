'use strict';
// ===== BATTLE STATE: estado compartido + accessores + wrappers VFX =====
let squad = [];
let enemies = [];
let spawnT = 1, bossT = 0, shake = 0, time = 0, stageFlash = 0, dustT = 0, lastChapter = -1;
let healT = 2, venT = 3, petCastT = 0;
let stageStartTime = Date.now(), stageHadDeaths = false;
let advance = 0;
// ===== L26: COMBO — kills encadenadas suben el daño y decaen si dejás de matar =====
// (constantes de balance en core/data.js)
let combo = 0, comboT = 0;
const comboMult = () => Math.min(COMBO_MAX, 1 + combo * COMBO_STEP);
const comboPct = () => Math.round((comboMult() - 1) * 100);
function addCombo() {
  combo++; comboT = COMBO_WINDOW;
  if (!S.stats) S.stats = {};
  if (combo > (S.stats.bestCombo || 0)) S.stats.bestCombo = combo;
}
function resetCombo() { combo = 0; comboT = 0; }
// ===== L26: FURIA DEL JEFE — el reloj de 30s ahora tiene consecuencia =====
let bossRage = 0;
const bossRageMult = () => 1 + bossRage * BOSS_RAGE_STEP;
// Reinicia el cronómetro de la etapa (rangos S/A/B/C) — se llamaba mal en varios sitios
function startStageClock() { stageStartTime = Date.now(); stageHadDeaths = false; bossRage = 0; }
// ===== L26: GOLPE MANUAL (game/tap.js) =====
let tapCd = 0;
const HOOKS = { ult: null, crit: null, kill: null, cutin: null, bossShow: null, bossHide: null, bossTick: null, bossRoar: null, tap: null };
const VFX = { float(){}, burst(){}, coin(){}, puff(){} };
const notify = t => { if (typeof toast !== 'undefined') toast(t); };
function float(x, y, txt, color, big) { VFX.float(x, y, txt, color, big); }
function burst(x, y, color, n) { VFX.burst(x, y, color, n); }
function spawnCoins(x, y, n) { for (let i = 0; i < n; i++) VFX.coin(x, y); }
function puff(x, y) { VFX.puff(x, y); }
const heroX = () => Math.min(230, W * 0.22);
const groundY = () => H - 78;
const slotX = m => heroX() + (m.def.role === 'dps' ? 52 : m.def.role === 'archer' ? -6 : -70);
function pickTarget() {
  return enemies.filter(e => e.dying === null && e.x < heroX() + advance + 420).sort((a, b) => a.x - b.x)[0] || null;
}
function aliveByPriority() {
  for (const r of ['dps', 'archer', 'mage']) {
    const m = squad.find(m => m.def.role === r && m.alive);
    if (m) return m;
  }
  return null;
}