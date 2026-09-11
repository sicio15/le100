'use strict';
// ===== SQUAD: héroes (creación, reset, energía, ultimates) =====
function makeHero(def) {
  const share = def.role === 'dps' ? 0.45 : def.role === 'archer' ? 0.3 : 0.25;
  const mh = maxHP() * share;
  return { def, share, maxHp: mh, hp: mh, energy: 0, alive: true,
    flash: 0, lunge: 0, castT: 0, atkT: Math.random() * 0.4, sprite: null, fx: false, su: 1,
    px: -80 - Math.random() * 60, entering: true };
}
function initSquad() {
  const defs = (typeof HEROES !== 'undefined' ? HEROES : []).filter(h => S.best >= h.unlock);
  const old = {}; squad.forEach(m => old[m.def.id] = m);
  const prev = squad.length;
  squad = defs.map(d => old[d.id] || makeHero(d));
  squad.forEach(m => {
    const sh = maxHP() * m.share;
    const r = m.maxHp > 0 ? Math.min(1, m.hp / m.maxHp) : 1;
    m.maxHp = sh; m.hp = sh * r;
  });
  if (squad.length > prev && prev > 0) notify('🐛 ¡Nuevo compañero: ' + squad[squad.length - 1].def.name + '!');
}
function resetSquad() {
  squad.forEach(m => { m.alive = true; m.hp = m.maxHp; m.energy = 0; m.flash = 0; m.lunge = 0; m.castT = 0; });
}
function reEnter() {
  advance = 0;
  squad.forEach(m => { m.px = -60 - Math.random() * 90; m.entering = true; });
}
function showCutin(m) { if (HOOKS.cutin) HOOKS.cutin(m); }
function gainEnergy(m, n) {
  n *= (typeof flashMult === 'function' ? flashMult('energia') : 1);
  n *= (typeof dayHas === 'function' && dayHas('energia')) ? 2 : 1;
  const was = m.energy;
  m.energy = Math.min(100, m.energy + n);
  // L27: aviso visual un instante ANTES de la ultimate para que se pueda leer
  if (was < 100 && m.energy >= 100) { m.energy = 0; castUlt(m); }
}

// L27: la muerte de un héroe se disparaba desde un solo sitio (el golpe del enemigo);
// ahora también la causan las explosiones de los Volátiles, así que vive acá.
function killHero(m) {
  if (!m.alive) return;
  m.alive = false; m.hp = 0;
  stageHadDeaths = true;
  notify('💀 ' + m.def.name + ' cayó');
  Audio.SFX.death();
  if (aliveByPriority()) return;
  // Escuadrón entero caído → retroceso de etapa
  if (S.stage > 1) S.stage--;
  S.ks = 0;
  enemies.forEach(x => { if (x.dying === null) { x.dying = 0.45; puff(x.x, groundY() + 2); } });
  if (HOOKS.bossHide) HOOKS.bossHide();
  spawnT = 0.8;
  reEnter();
  resetCombo();
  clearBuffs();
  // FIX L26: el cronómetro no se reiniciaba al caer, así que la etapa siguiente
  // heredaba el tiempo acumulado y salía siempre rango C/R.
  startStageClock();
  persist(); netScore(S.name, S.best);
  notify('💀 Caíste → Etapa ' + S.stage + '. ¡Farmeá y volvé!');
  resetSquad();
}

function castUlt(m) {
  m.castT = 0.9; Audio.SFX.ult(); showCutin(m);
  if (HOOKS.ult) HOOKS.ult(m);
  if (!S.stats) S.stats = {};
  S.stats.ultimates = (S.stats.ultimates || 0) + 1;
  const gy = groundY();
  if (m.def.role === 'dps') {
    // 🗡️ Tajo Triple: tres cortes encadenados sobre el frente
    for (let i = 0; i < 3; i++) {
      const t = pickTarget(); if (!t) break;
      VFX.slash(t.x, gy - 50 * t.size, m.def.color);
      hitEnemy(t, liveDps() * 1.5 * affixDmgTaken(t), '#ffeb3b', true);
    }
  } else if (m.def.role === 'archer') {
    // 🏹 Lluvia de Flechas: un haz por enemigo desde fuera de pantalla
    const live = liveEnemies();
    if (!live.length) return;
    live.forEach(e => {
      VFX.beam(e.x, gy - 60 * e.size, m.def.color);
      hitEnemy(e, liveDps() * 1.2 * affixDmgTaken(e), '#7efcff', false);
    });
    Audio.SFX.venom();
  } else if (m.def.role === 'mage') {
    // 🔮 Nova Arcana: estallido en área + cura al escuadrón
    VFX.nova(heroX() + advance + 220, gy - 60, 0xc86bfa);
    const live = liveEnemies();
    live.forEach(e => hitEnemy(e, liveDps() * 1.8 * affixDmgTaken(e), '#c86bfa', true));
    squad.forEach(a => {
      if (!a.alive) return;
      const h = a.maxHp * 0.15;
      a.hp = Math.min(a.maxHp, a.hp + h);
      float(a.px, gy - 110, '+' + fmt(h), '#7efcff');
    });
  }
}
