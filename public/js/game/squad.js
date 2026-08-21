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
  m.energy = Math.min(100, m.energy + n);
  if (m.energy >= 100) { m.energy = 0; castUlt(m); }
}
function castUlt(m) {
  m.castT = 0.9; Audio.SFX.ult(); showCutin(m);
  if (HOOKS.ult) HOOKS.ult(m);
  const gy = groundY();
  if (m.def.role === 'dps') {
    for (let i = 0; i < 3; i++) {
      const t = pickTarget(); if (!t) break;
      hitEnemy(t, dps() * 1.5, '#ffeb3b', true);
    }
  } else if (m.def.role === 'archer') {
    const aliveE = enemies.filter(e => e.dying === null);
    if (!aliveE.length) return;
    aliveE.forEach(e => hitEnemy(e, dps() * 1.2, '#7efcff', false));
    Audio.SFX.venom();
  } else if (m.def.role === 'mage') {
    const aliveE = enemies.filter(e => e.dying === null);
    aliveE.forEach(e => hitEnemy(e, dps() * 1.8, '#c86bfa', true));
    squad.forEach(a => {
      if (a.alive) {
        const h = a.maxHp * 0.15;
        a.hp = Math.min(a.maxHp, a.hp + h);
        float(a.px, gy - 110, '+' + fmt(h), '#7efcff');
      }
    });
  }
}