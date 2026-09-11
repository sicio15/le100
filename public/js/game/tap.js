'use strict';
// ===== TAP (LOTE 26): golpe manual =====
// El juego era 100% pasivo: mirabas pelear y comprabas mejoras. Tocar la batalla
// ahora hace daño real, carga energía de ultimates y alimenta el combo, así que
// jugar activo rinde más que dejarlo solo — sin volverse obligatorio (sigue siendo idle).
// Constantes de balance: TAP_CD · TAP_MULT · TAP_ENERGY en core/data.js

// Enemigo más cercano al punto tocado; si no hay ninguno cerca, el del frente.
function tapPick(x) {
  const live = liveEnemies();
  if (!live.length) return null;
  let best = null, bestD = Infinity;
  for (const e of live) {
    const d = Math.abs(e.x - x);
    if (d < bestD) { bestD = d; best = e; }
  }
  return bestD <= 140 ? best : pickTarget();
}

function doTap(x, y) {
  if (tapCd > 0) return false;
  const t = tapPick(x);
  if (!t) return false;
  tapCd = TAP_CD;
  const gy = groundY();
  const isCrit = Math.random() < critChance();
  const d = liveDps() * TAP_MULT * (isCrit ? critMult() : 1) * affixDmgTaken(t);
  t.hp -= d; t.flash = 0.18; t.kb = isCrit ? 14 : 9;
  trackDmg(d);
  float(t.x, gy - 76 * t.size, fmt(d), isCrit ? '#ffeb3b' : '#7efcff', isCrit);
  burst(t.x, gy - 44 * t.size, isCrit ? '#ffeb3b' : '#7efcff', isCrit ? 14 : 9);
  VFX.spark(t.x, gy - 44 * t.size, isCrit ? '#ffeb3b' : '#7efcff');
  shake = Math.max(shake, isCrit ? 5 : 2);
  if (!S.stats) S.stats = {};
  S.stats.taps = (S.stats.taps || 0) + 1;
  if (isCrit) { Audio.SFX.crit(); if (HOOKS.crit) HOOKS.crit(t.x, gy - 44 * t.size); }
  else Audio.SFX.hit();
  if (HOOKS.tap) HOOKS.tap(x, y);
  squad.forEach(m => { if (m.alive) { m.lunge = 1; gainEnergy(m, TAP_ENERGY); } });
  if (t.boss) checkBossPhase(t);
  if (t.hp <= 0) killEnemy(t);
  return true;
}

// ----- Entrada: puntero sobre el canvas + barra espaciadora alternativa -----
(function wireTap() {
  const wrap = document.getElementById('battleWrap');
  if (!wrap) return;
  const onDown = ev => {
    // Ignorar si hay un modal abierto por encima
    if (document.querySelector('.modal[style*="flex"]')) return;
    const r = wrap.getBoundingClientRect();
    const p = (ev.touches && ev.touches[0]) || ev;
    doTap(p.clientX - r.left, p.clientY - r.top);
  };
  wrap.addEventListener('pointerdown', onDown);
  wrap.style.cursor = 'crosshair';
})();
