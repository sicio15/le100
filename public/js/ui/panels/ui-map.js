'use strict';
// ===== MAPA: zonas, rangos, jefes y viaje rápido =====
// L28: el mapa dejó de ser una grilla de números. Cada bloque de 10 etapas es una
// ZONA con nombre, color, clima y Jefe de Zona; las etapas %5 y %10 se marcan
// para que se vea de un vistazo dónde está la pelea grande.
wire('btnMap', 'click', () => { renderMap(); $('mMap').style.display = 'flex'; Audio.SFX.click(); });
wire('mapClose', 'click', () => { $('mMap').style.display = 'none'; });

function renderMap() {
  const box = $('mapBody'); if (!box) return;
  box.innerHTML = '';

  // Bonus total de rangos
  const bonus = getTotalRankBonus();
  const cx = codexStars();
  const bonusDiv = document.createElement('div');
  bonusDiv.className = 'mapBonus';
  bonusDiv.innerHTML =
    '<h3>🏆 BONUS PERMANENTES</h3>' +
    '<div class="mbGrid">' +
      '<div>🌟 <b style="color:var(--gold)">' + bonus.sCount + '</b> rangos S</div>' +
      '<div>⭐ <b style="color:var(--green2)">' + bonus.aCount + '</b> rangos A</div>' +
      '<div>⚔️ <b style="color:var(--cyan)">+' + (bonus.damage * 100).toFixed(1) + '%</b> por rangos</div>' +
      '<div>📖 <b style="color:var(--cyan)">+' + (cx.damage * 100).toFixed(1) + '%</b> por códice</div>' +
      '<div>🏺 <b style="color:var(--violet)">' + countRelics() + '/' + BOSSES.length + '</b> reliquias</div>' +
    '</div>';
  box.appendChild(bonusDiv);

  // Botón para volver al récord si estás en una etapa anterior
  if (S.stage < S.best) {
    const backBtn = document.createElement('button');
    backBtn.className = 'mbtn';
    backBtn.style.cssText = 'width:100%;margin-bottom:14px;';
    backBtn.innerHTML = '⚡ SALTAR AL RÉCORD (Etapa ' + S.best + ')';
    backBtn.onclick = () => { skipToRecord(); $('mMap').style.display = 'none'; };
    box.appendChild(backBtn);
  }

  // Una sección por zona, de la más avanzada a la primera
  const curZone = zoneIndex(S.stage);
  const maxZone = Math.max(curZone, zoneIndex(S.best));
  for (let c = maxZone; c >= 0; c--) {
    const z = ZONES[Math.min(ZONES.length - 1, c)];
    const b = zoneBoss(c);
    const startStage = c * 10 + 1, endStage = c * 10 + 10;
    const stats = getChapterStats(c);
    const beaten = (codex().bosses[b.id] || 0) > 0;

    const chapDiv = document.createElement('div');
    chapDiv.className = 'mapChapter';
    chapDiv.style.setProperty('--zc', z.color);
    chapDiv.innerHTML =
      '<div class="mapZoneHead">' +
        '<div class="mzTitle">' +
          '<h3>' + b.ico + ' ' + z.name + '</h3>' +
          '<small>' + z.sub + ' · etapas ' + startStage + '–' + endStage + '</small>' +
        '</div>' +
        '<div class="mzStats">🌟' + (stats.ranks.S || 0) + ' ⭐' + (stats.ranks.A || 0) + ' 🔒' + stats.ranks.locked + '</div>' +
      '</div>' +
      '<div class="mzBoss' + (beaten ? ' done' : '') + '">' +
        (beaten ? '✅' : '⚔️') + ' Jefe de zona: <b>' + b.name + '</b> · <i>' + b.title + '</i>' +
        (beaten ? ' · 🏺 ' + b.relic.ico + ' ' + b.relic.n : ' · etapa ' + endStage) +
      '</div>';

    const grid = document.createElement('div');
    grid.className = 'mapGrid';
    // Del 10 al 1 para que lo más nuevo quede arriba a la izquierda
    for (let st = endStage; st >= startStage; st--) {
      const isUnlocked = st <= S.best;
      const isCurrent = st === S.stage;
      const rank = S.stageRanks[st] || (isCurrent ? '⚔️' : '🔒');
      const rankColor = RANK_COLORS[rank] || '#fff';
      const zoneB = isZoneBossStage(st), miniB = isMiniBossStage(st);

      const btn = document.createElement('button');
      btn.className = 'mapNode ' + (isCurrent ? 'current' : isUnlocked ? 'unlocked' : 'locked') +
        (zoneB ? ' zoneBoss' : miniB ? ' miniBoss' : '');
      btn.disabled = !isUnlocked;
      btn.setAttribute('data-tip', 'Etapa ' + st + (zoneB ? '<br><b>' + b.ico + ' ' + b.name + '</b>' : miniB ? '<br>🛡️ Guardián' : ''));
      btn.innerHTML =
        (zoneB ? '<span class="nodeTag">' + b.ico + '</span>' : miniB ? '<span class="nodeTag">🛡️</span>' : '') +
        '<span class="nodeStage">' + st + '</span>' +
        '<span class="nodeRank" style="color:' + rankColor + '">' + rank + '</span>';
      if (isUnlocked) btn.onclick = () => { travelToStage(st); $('mMap').style.display = 'none'; };
      grid.appendChild(btn);
    }
    chapDiv.appendChild(grid);
    box.appendChild(chapDiv);
  }
}
