'use strict';
// ===== PANEL DE ESTADÍSTICAS: transparencia de multiplicadores =====
// L26: bonus por rangos, combo activo, furia del jefe y estadísticas de vida.
// L27: buffs de habilidad, rendimiento real medido (daño/s y oro/s de verdad,
// no el teórico) y el recuento de lo nuevo (casts, afijos, golpes manuales).
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
    ['📖 Códice (' + codexStars().stars + '★)', 'x' + codexMult().toFixed(3)],
    ['🏺 Reliquias (' + countRelics() + ')', 'x' + relicDmg().toFixed(2)],
    ['✨ Evento semanal', evHas('furia') ? 'x1.30' : 'x1.00'],
    ['🌠 Relámpago', 'x' + flashMult('dano').toFixed(2)],
    ['= DAÑO BASE', fmt(dps()) + '/s'],
    ['🔥 Combo actual', 'x' + comboMult().toFixed(2) + ' (' + Math.floor(combo) + ' kills)'],
    ['🌑 Maldición', curseT > 0 ? 'x' + BOSS_CURSE_MULT.toFixed(2) + ' (' + curseT.toFixed(1) + 's)' : 'x1.00'],
    ['= DAÑO EN COMBATE', fmt(liveDps()) + '/s'],
    ['📈 Daño real medido', fmt(dmgPerSec()) + '/s']
  ];
  const zi = zoneIndex(S.stage), zb = zoneBoss(zi);
  const worldRows = [
    ['🌄 Zona actual', zoneOf(S.stage).name],
    ['👑 Jefe de zona', zb.ico + ' ' + zb.name],
    ['📖 Bestiario', codexStars().stars + '/' + codexStars().maxStars + ' ★ (' + Math.round(codexProgress() * 100) + '%)'],
    ['🏺 Reliquias', countRelics() + '/' + BOSSES.length],
    ['⚔️ Jefes de zona vencidos', countBossesBeaten() + '/' + BOSSES.length]
  ];
  const skillRows = SKILLS.map(s => {
    const lv = skillLv(s.id);
    const state = !skillUnlocked(s.id) ? '🔒 Etapa ' + s.unlock
      : hasBuff(s.id) ? '⏳ activa ' + buffs[s.id].toFixed(1) + 's'
      : skillReady(s.id) ? '✅ lista'
      : Math.ceil(skillCd[s.id]) + 's';
    return [s.ico + ' ' + s.n + ' (Nv ' + lv + ')', state];
  }).concat([['🤖 Auto-lanzar', S.skillAuto !== false ? 'ON' : 'OFF']]);
  const otherRows = [
    ['🎯 Crítico', Math.round(critChance() * 100) + '% · x' + critMult().toFixed(1)],
    ['❤️ Vida máx', fmt(maxHP())],
    ['💚 Regen', fmt(regenPs()) + '/s'],
    ['☠️ Veneno', fmt(venomDm()) + ' c/' + venomCd().toFixed(0) + 's'],
    ['👊 Golpe manual', fmt(liveDps() * TAP_MULT) + ' c/' + TAP_CD + 's'],
    ['🪙 Oro por kill', fmt(goldKill(S.stage))],
    ['💰 Oro real medido', fmt(goldPerSec()) + '/s'],
    ['🏆 Récord', 'Etapa ' + S.best],
    ['🗼 Torre', 'Piso ' + S.tower + ' (récord ' + S.towerBest + ')'],
    ['🏟️ Arena', S.arenaPts + ' pts']
  ];
  const lifeRows = [
    ['💀 Kills totales', fmt(S.kills)],
    ['👑 Jefes derrotados', fmt(st.bossKills || 0)],
    ['✨ Élites cazados', fmt(st.elites || 0)],
    ['🩸 Enemigos con afijo', fmt(st.affixKills || 0)],
    ['💥 Ultimates lanzadas', fmt(st.ultimates || 0)],
    ['🎇 Habilidades usadas', fmt(st.skillCasts || 0)],
    ['👊 Golpes manuales', fmt(st.taps || 0)],
    ['🔥 Mejor combo', Math.floor(st.bestCombo || 0) + ' kills'],
    ['🪙 Oro ganado', fmt(st.goldEarned || 0)],
    ['🧬 Prestigios', fmt(S.prestiges)],
    ['⏱️ Tiempo jugado', fmtDur(st.playMs || 0)]
  ];
  const sec = (title, rows) => '<h3 style="margin:14px 0 6px;text-align:left">' + title + '</h3>' +
    rows.map(r => '<div class="mrow"><span>' + r[0] + '</span><b style="color:var(--cyan)">' + r[1] + '</b></div>').join('');
  box.innerHTML = sec('⚔️ CÓMO SE ARMA TU DAÑO', dmgRows) +
    sec('🌍 MUNDO', worldRows) +
    sec('✨ HABILIDADES', skillRows) +
    sec('📈 OTROS', otherRows) +
    sec('🏅 TU HISTORIA', lifeRows);
}
