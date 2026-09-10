'use strict';
// ===== TORRE INFINITA =====
// L26: la deuda #5 figuraba cerrada pero tower.js seguía duplicando, línea por línea,
// la fórmula de fightChance() de modes/sim.js. Ahora la usa (única fuente de verdad) y,
// de paso, muestra la probabilidad ANTES de gastar el intento en vez de después.
wire('btnTower', 'click', () => { renderTower(); const m = $('mTower'); if (m) m.style.display = 'flex'; Audio.SFX.click(); });
wire('towerClose', 'click', () => { const m = $('mTower'); if (m) m.style.display = 'none'; });

const towerHpMul = f => 6 + f * 0.5;
const towerAtkMul = f => 1.5 + f * 0.08;
const towerOdds = f => fightChance(S.best + f, towerHpMul(f), towerAtkMul(f));

function renderTower() {
  const body = $('towerBody');
  if (!body) return; // GUARDIÁN
  const f = S.tower;
  const p = { hp: eHP(S.best + f) * towerHpMul(f), atk: eDmg(S.best + f) * towerAtkMul(f) };
  const ch = towerOdds(f);
  const col = ch >= 0.7 ? '#7bed9f' : ch >= 0.4 ? '#ffd700' : '#ff5252';
  const dayBonus = (typeof dayHas === 'function' && dayHas('torre')) ? ' · 🗼 HOY x2' : '';
  body.innerHTML = '<div id="towerInfo" style="text-align:left;font-size:12px;margin-bottom:12px;">' +
    '🗼 Piso <b>' + f + '</b> <small>(récord ' + S.towerBest + ' · semana ' + (S.weekTower || 1) + ')</small><br>' +
    '<small>❤️ ' + fmt(p.hp) + ' · ⚔️ ' + fmt(p.atk) + '/s</small><br>' +
    '<small>Probabilidad de éxito: <b style="color:' + col + '">' + Math.round(ch * 100) + '%</b></small><br>' +
    '<small style="color:#8fa3c8">Cada piso: oro · cada 3: 🎒 · cada 10: +1🧬 · Hitos: 10/25/50/100' + dayBonus + '</small></div>' +
    '<button class="mbtn" id="towerFight">SUBIR PISO</button>' +
    '<p id="towerResult" style="min-height:20px;color:#8fa3c8;font-size:11px;margin-top:8px;"></p>';
  const b = $('towerFight');
  if (b) b.onclick = towerFight;
}

function towerFight() {
  const f = S.tower;
  const win = rollFight(towerOdds(f));
  const mult = (typeof dayHas === 'function' && dayHas('torre')) ? 2 : 1;
  const g = goldKill(S.best + f) * (win ? 12 : 3) * mult;
  S.gold += g;
  if (!S.stats) S.stats = {};
  S.stats.goldEarned = (S.stats.goldEarned || 0) + g;
  let msg;
  if (win) {
    S.tower++;
    S.towerBest = Math.max(S.towerBest, S.tower);
    S.weekTower = Math.max(S.weekTower || 1, S.tower);
    msg = '✅ Piso ' + f + ' superado! +' + fmt(g) + ' 🪙';
    if (f % 3 === 2) { dropItem(1 + Math.floor(f / 10)); msg += ' +🎒'; }
    if (f % 10 === 9) { const adn = 1 * mult; S.adn += adn; msg += ' +' + adn + '🧬'; }
    Audio.SFX.levelup();
    checkMilestones();
  } else {
    msg = '💀 El piso ' + f + ' te frenó. +' + fmt(g) + ' 🪙';
    Audio.SFX.death();
  }
  toast(msg);
  const res = $('towerResult'); if (res) res.textContent = msg;
  persist(); netScore(S.name, S.best); renderTower();
}
