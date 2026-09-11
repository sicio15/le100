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
// L27: escalón visual del combo (COMBO_TIERS) — lo usan el HUD y los VFX
function comboTier() {
  let t = null;
  for (const c of COMBO_TIERS) if (combo >= c.at) t = c;
  return t;
}
function addCombo() {
  const before = comboTier();
  combo++; comboT = COMBO_WINDOW;
  if (!S.stats) S.stats = {};
  if (combo > (S.stats.bestCombo || 0)) S.stats.bestCombo = combo;
  const after = comboTier();
  // sólo avisamos cuando se CRUZA un escalón, no en cada kill
  if (after && after !== before) {
    notify('🔥 ' + after.name + ' · x' + comboMult().toFixed(2));
    if (typeof HOOKS !== 'undefined' && HOOKS.comboTier) HOOKS.comboTier(after);
  }
}
function resetCombo() { combo = 0; comboT = 0; }

// ===== L26: FURIA DEL JEFE — el reloj de 30s ahora tiene consecuencia =====
let bossRage = 0;
const bossRageMult = () => 1 + bossRage * BOSS_RAGE_STEP;

// ===== L27: BUFFS ACTIVOS (habilidades de game/skills.js) =====
// Un mapa id → segundos restantes. Las fórmulas lo consultan con guardias `typeof`
// para que core/ siga sin depender de game/.
const buffs = { frenzy: 0, aegis: 0 };
function hasBuff(id) { return (buffs[id] || 0) > 0; }
function buffCrit() { return hasBuff('frenzy') ? SKILL_FRENZY_CRIT(skillLv('frenzy')) : 0; }
function buffHaste() { return hasBuff('frenzy') ? FRENZY_HASTE : 1; }
function damageTakenMult() { return hasBuff('aegis') ? AEGIS_REDUCTION : 1; }
function clearBuffs() { Object.keys(buffs).forEach(k => { buffs[k] = 0; }); }
function tickBuffs(dt) {
  for (const k in buffs) {
    if (buffs[k] <= 0) continue;
    buffs[k] = Math.max(0, buffs[k] - dt);
    if (buffs[k] === 0) notify('⏳ ' + (SKILLS.find(s => s.id === k) || { n: k }).n + ' terminó');
  }
}

// Reinicia el cronómetro de la etapa (rangos S/A/B/C) — se llamaba mal en varios sitios
function startStageClock() { stageStartTime = Date.now(); stageHadDeaths = false; bossRage = 0; bossPhase = 0; }

// ===== L26: GOLPE MANUAL (game/tap.js) =====
let tapCd = 0;
// ===== L27: FASES DE JEFE (data.js → BOSS_PHASES) =====
let bossPhase = 0;
// ventana en la que el jefe reproduce su animación de rugido (boss_roar)
let bossRoarT = 0;
function bossRoar() { bossRoarT = 1.1; if (HOOKS.bossRoar) HOOKS.bossRoar(); }

// ===== L28: MALDICIÓN DE JEFE — recorta tu daño mientras dura =====
let curseT = 0;
const curseMult = () => curseT > 0 ? BOSS_CURSE_MULT : 1;

// ===== L28: CINEMÁTICAS — mientras haya un diálogo en pantalla el combate se
// congela. No es una pausa "dura": los temporizadores de UI siguen y el diálogo
// avanza solo a los DLG_AUTO_MS, así que un jugador AFK nunca queda trabado.
let dialogueActive = false;
const bossIntroShown = {};   // idJefe → ya mostramos su charla en esta partida

// ===== L27: medidor de rendimiento (oro/s y daño/s REALES de la sesión) =====
// Ventana deslizante de 5s: es lo que el HUD muestra, en vez de un número teórico.
const _perfWin = 5;
let _perfGold = [], _perfDmg = [];
function trackGold(n) { _perfGold.push({ t: time, n }); }
function trackDmg(n) { _perfDmg.push({ t: time, n }); }
function _perfSum(arr) {
  const cut = time - _perfWin;
  while (arr.length && arr[0].t < cut) arr.shift();
  let s = 0;
  for (const e of arr) s += e.n;
  return s / _perfWin;
}
const goldPerSec = () => _perfSum(_perfGold);
const dmgPerSec = () => _perfSum(_perfDmg);

const HOOKS = { ult: null, crit: null, kill: null, cutin: null, bossShow: null, bossHide: null,
  bossTick: null, bossRoar: null, tap: null, comboTier: null, skill: null, bossPhase: null,
  zoneIn: null, bossIntro: null, bossDefeat: null, portal: null };
const VFX = { float(){}, burst(){}, coin(){}, puff(){}, shockwave(){}, beam(){}, nova(){}, slash(){},
  spark(){}, projectile(){}, portal(){}, telegraph(){} };
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
// Enemigos vivos (se pedía con este mismo filter en 6 sitios distintos)
const liveEnemies = () => enemies.filter(e => e.dying === null);
