'use strict';
// ===== PANEL DE ESTADÍSTICAS: transparencia de multiplicadores =====
// L26: agrega el bonus por rangos (que antes no existía en dps()), el combo activo,
// la furia del jefe y un bloque de estadísticas de vida. La etiqueta "🐜 Colonia"
// pasa a "🛡️ Gremio", que es de donde sale realmente ese multiplicador desde L25.
wire('btnStats', 'click', () => { renderStats(); $('mStats').style.display = 'flex'; Audio.SFX.click(); });
wire('statsClose', 'click', () => { $('mStats').style.display = 'none'; });

const fmtDur = ms => {
  const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000);
  return h > 0 ? h + 'h ' + m + 'min' : m + 'min';
};

function renderStats() {
  const box = $('statsBody'); if (!box) return;
  const g = gearBonuses();
  const rb = getTotalRankBonus();
  const st = S.stats || {};
  const dmgRows = [
    ['⚔️ Daño base', '5'],
    ['🆙 Mejoras', 'x' + Math.pow(1.3, S.ups.dmg).toFixed(2)],
    ['🧬 ADN', 'x' + adnMult().toFixed(2)],
    ['🎒 Equipo', 'x' + (1 + g.atk / 100).toFixed(2)],
    ['🛡️ Gremio', 'x' + (1 + 0.02 * ((S.colonyLevel || 1) - 1)).toFixed(2)],
    ['🛒 Tienda (Furia)', 'x' + (1 + 0.05 * shopLv('fury')).toFixed(2)],
    ['🏆 Rangos (' + rb.sCount + 'S · ' + rb.aCount + 'A)', 'x' + (1 + rb.damage).toFixed(3)],
    ['✨ Evento semanal', evHas('furia') ? 'x1.30' : 'x1.00'],
    ['🌠 Relámpago', 'x' + flashMult('dano').toFixed(2)],
    ['= DAÑO BASE', fmt(dps()) + '/s'],
    ['🔥 Combo actual', 'x' + comboMult().toFixed(2) + ' (' + Math.floor(combo) + ' kills)'],
    ['= DAÑO EN COMBATE', fmt(liveDps()) + '/s']
  ];
  const otherRows = [
    ['🎯 Crítico', Math.round(critChance() * 100) + '% · x' + critMult().toFixed(1)],
    ['❤️ Vida máx', fmt(maxHP())],
    ['💚 Regen', fmt(regenPs()) + '/s'],
    ['☠️ Veneno', fmt(venomDm()) + ' c/' + venomCd().toFixed(0) + 's'],
    ['👊 Golpe manual', fmt(liveDps() * TAP_MULT) + ' c/' + TAP_CD + 's'],
    ['🪙 Oro por kill', fmt(goldKill(S.stage))],
    ['🏆 Récord', 'Etapa ' + S.best],
    ['🗼 Torre', 'Piso ' + S.tower + ' (récord ' + S.towerBest + ')'],
    ['🏟️ Arena', S.arenaPts + ' pts']
  ];
  const lifeRows = [
    ['💀 Kills totales', fmt(S.kills)],
    ['👑 Jefes derrotados', fmt(st.bossKills || 0)],
    ['✨ Élites cazados', fmt(st.elites || 0)],
    ['💥 Ultimates lanzadas', fmt(st.ultimates || 0)],
    ['🔥 Mejor combo', Math.floor(st.bestCombo || 0) + ' kills'],
    ['🪙 Oro ganado', fmt(st.goldEarned || 0)],
    ['🧬 Prestigios', fmt(S.prestiges)],
    ['⏱️ Tiempo jugado', fmtDur(st.playMs || 0)]
  ];
  const sec = (title, rows) => '<h3 style="color:#ffd700;font-size:11px;margin:12px 0 6px;text-align:left">' + title + '</h3>' +
    rows.map(r => '<div class="mrow"><span>' + r[0] + '</span><b style="color:#7efcff">' + r[1] + '</b></div>').join('');
  box.innerHTML = sec('⚔️ CÓMO SE ARMA TU DAÑO', dmgRows) + sec('📈 OTROS', otherRows) + sec('🏅 TU HISTORIA', lifeRows);
}
