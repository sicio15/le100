'use strict';
// ===== TORRE INFINITA =====
wire('btnTower', 'click', () => { renderTower(); const m = $('mTower'); if (m) m.style.display = 'flex'; Audio.SFX.click(); });
wire('towerClose', 'click', () => { const m = $('mTower'); if (m) m.style.display = 'none'; });

function renderTower() {
  const body = $('towerBody');
  if (!body) return; // GUARDIÁN
  const f = S.tower;
  const p = { hp: eHP(S.best + f) * (6 + f * 0.5), atk: eDmg(S.best + f) * (1.5 + f * 0.08) };
  const dayBonus = (typeof dayHas === 'function' && dayHas('torre')) ? ' · 🗼 HOY x2' : '';
  body.innerHTML = '<div id="towerInfo" style="text-align:left;font-size:12px;margin-bottom:12px;">' +
    '🗼 Piso <b>' + f + '</b> <small>(récord ' + S.towerBest + ' · semana ' + (S.weekTower || 1) + ')</small><br>' +
    '<small>❤️ ' + fmt(p.hp) + ' · ⚔️ ' + fmt(p.atk) + '/s</small><br>' +
    '<small style="color:#8fa3c8">Cada piso: oro · cada 3: 🎒 · cada 10: +1🧬 · Hitos: 10/25/50/100' + dayBonus + '</small></div>' +
    '<button class="mbtn" id="towerFight">SUBIR PISO</button>' +
    '<p id="towerResult" style="min-height:20px;color:#8fa3c8;font-size:11px;margin-top:8px;"></p>';
  const b = $('towerFight');
  if (b) b.onclick = towerFight;
}

function towerFight() {
  const f = S.tower;
  const p = { hp: eHP(S.best + f) * (6 + f * 0.5), atk: eDmg(S.best + f) * (1.5 + f * 0.08) };
  const our = dps() * 30 * 1.4;
  const aguante = maxHP() / (p.atk * 0.5);
  const ratio = our / p.hp;
  const win = Math.random() < Math.max(0.05, Math.min(0.95, ratio * (aguante >= 20 ? 1 : 0.5)));
  const mult = (typeof dayHas === 'function' && dayHas('torre')) ? 2 : 1;
  const g = goldKill(S.best + f) * (win ? 12 : 3) * mult;
  S.gold += g;
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