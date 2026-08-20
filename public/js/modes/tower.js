'use strict';
// ===== TORRE INFINITA + tracking semanal + hitos =====
wire('btnTower', 'click', () => { renderTower(); $('mTower').style.display = 'flex'; Audio.SFX.click(); });
wire('towerClose', 'click', () => { $('mTower').style.display = 'none'; });
wire('towerFight', 'click', towerFight);
const towerPower = f => ({ hp: eHP(S.best + f) * (6 + f * 0.5), atk: eDmg(S.best + f) * (1.5 + f * 0.08) });
function renderTower() {
  const f = S.tower, p = towerPower(f);
  $('towerInfo').innerHTML = '🗼 Piso ' + f + ' <small>(récord ' + S.towerBest + ' · semana ' + (S.weekTower || 1) + ')</small> <br>' +
    '<small>❤️ ' + fmt(p.hp) + ' · ⚔️ ' + fmt(p.atk) + '/s</small> <br>' +
    '<small style="color:#8fa3c8">Cada piso: oro · cada 3: 🎒 · cada 10: +1🧬 · Hitos: 10/25/50/100</small>';
  $('towerFight').disabled = false;
}
function towerFight() {
  const f = S.tower;
  const p = towerPower(f);
  const our = dps() * 30 * 1.4;
  const aguante = maxHP() / (p.atk * 0.5);
  const ratio = our / p.hp;
  const win = Math.random() < Math.max(0.05, Math.min(0.95, ratio * (aguante >= 20 ? 1 : 0.5)));
  const g = goldKill(S.best + f) * (win ? 12 : 3);
  S.gold += g;
  let msg;
  if (win) {
    S.tower++;
    S.towerBest = Math.max(S.towerBest, S.tower);
    S.weekTower = Math.max(S.weekTower || 1, S.tower); // tracking semanal
    msg = '✅ Piso ' + f + ' superado! +' + fmt(g) + ' 🪙';
    if (f % 3 === 2) { dropItem(1 + Math.floor(f / 10)); msg += ' +🎒'; }
    if (f % 10 === 9) { S.adn++; msg += ' +1🧬'; }
    Audio.SFX.levelup();
    checkMilestones(); // hitos permanentes
  } else {
    msg = '💀 El piso ' + f + ' te frenó. +' + fmt(g) + ' 🪙';
    Audio.SFX.death();
  }
  toast(msg); $('towerResult').textContent = msg;
  persist(); netScore(S.name, S.best); renderTower();
}