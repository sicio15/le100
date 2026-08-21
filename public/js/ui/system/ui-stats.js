'use strict';
// ===== PANEL DE ESTADÍSTICAS: transparencia de multiplicadores =====
wire('btnStats', 'click', () => { renderStats(); $('mStats').style.display = 'flex'; Audio.SFX.click(); });
wire('statsClose', 'click', () => { $('mStats').style.display = 'none'; });
function renderStats() {
  const box = $('statsBody'); if (!box) return;
  const g = gearBonuses();
  const rows = [
    ['⚔️ Daño base', '5'],
    ['🆙 Mejoras', 'x' + Math.pow(1.3, S.ups.dmg).toFixed(2)],
    ['🧬 ADN', 'x' + adnMult().toFixed(2)],
    ['🎒 Gear', 'x' + (1 + g.atk / 100).toFixed(2)],
    ['🐜 Colonia', 'x' + (1 + 0.02 * ((S.colonyLevel || 1) - 1)).toFixed(2)],
    ['🛒 Tienda (Furia)', 'x' + (1 + 0.05 * shopLv('fury')).toFixed(2)],
    ['✨ Evento', evHas('furia') ? 'x1.30' : 'x1.00'],
    ['= DAÑO TOTAL', fmt(dps()) + '/s'],
    ['🎯 Crítico', Math.round(critChance() * 100) + '% · x' + critMult().toFixed(1)],
    ['❤️ Vida máx', fmt(maxHP())],
    ['💚 Regen', fmt(regenPs()) + '/s'],
    ['☠️ Veneno', fmt(venomDm()) + ' c/' + venomCd().toFixed(0) + 's'],
    ['🪙 Oro por kill', fmt(goldKill(S.stage))],
    ['💀 Kills totales', fmt(S.kills)],
    ['🏆 Récord', 'Etapa ' + S.best],
    ['🗼 Torre', 'Piso ' + S.tower + ' (récord ' + S.towerBest + ')'],
    ['🏟️ Arena', S.arenaPts + ' pts']
  ];
  box.innerHTML = rows.map(r => '<div class="mrow"><span>' + r[0] + '</span><b style="color:#7efcff">' + r[1] + '</b></div>').join('');
}