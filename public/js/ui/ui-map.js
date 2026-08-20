'use strict';
// ===== MAPA: Selección de etapa, rangos y estadísticas por capítulo =====
wire('btnMap', 'click', () => { renderMap(); $('mMap').style.display = 'flex'; Audio.SFX.click(); });
wire('mapClose', 'click', () => { $('mMap').style.display = 'none'; });

function renderMap() {
  const box = $('mapBody'); if (!box) return;
  box.innerHTML = '';
  
  // Bonus total de rangos
  const bonus = getTotalRankBonus();
  const bonusDiv = document.createElement('div');
  bonusDiv.style.cssText = 'background:rgba(255,215,0,.1);border:2px solid #ffd700;border-radius:12px;padding:12px;margin-bottom:15px;';
  bonusDiv.innerHTML = `
    <h3 style="color:#ffd700;margin-bottom:8px;">🏆 BONUS POR RANGOS</h3>
    <div style="display:flex;justify-content:space-around;font-size:12px;">
      <div>🌟 <b style="color:#ffd700">${bonus.sCount}</b> rangos S</div>
      <div>⭐ <b style="color:#7bed9f">${bonus.aCount}</b> rangos A</div>
      <div>⚔️ <b style="color:#7efcff">+${(bonus.damage * 100).toFixed(1)}%</b> daño</div>
    </div>
  `;
  box.appendChild(bonusDiv);
  
  // Botón para volver al récord si estás en una etapa anterior
  if (S.stage < S.best) {
    const backBtn = document.createElement('button');
    backBtn.className = 'mbtn';
    backBtn.style.width = '100%';
    backBtn.style.marginBottom = '15px';
    backBtn.innerHTML = '⚡ SALTAR AL RÉCORD (Etapa ' + S.best + ')';
    backBtn.onclick = () => {
      skipToRecord();
      $('mMap').style.display = 'none';
    };
    box.appendChild(backBtn);
  }
  
  // Agrupamos por capítulos de 10 etapas
  const currentChapter = Math.floor((S.stage - 1) / 10);
  
  for (let c = currentChapter; c >= 0; c--) {
    const startStage = c * 10 + 1;
    const endStage = c * 10 + 10;
    const chapterName = chapterOf(startStage).name;
    const stats = getChapterStats(c);
    
    const chapDiv = document.createElement('div');
    chapDiv.className = 'mapChapter';
    
    // Header del capítulo con estadísticas
    const header = document.createElement('div');
    header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;';
    header.innerHTML = `
      <h3>🌄 ${chapterName} (${startStage}-${endStage})</h3>
      <div style="font-size:10px;color:#8fa3c8;">
        🌟${stats.ranks.S || 0} ⭐${stats.ranks.A || 0} 🔒${stats.ranks.locked}
      </div>
    `;
    chapDiv.appendChild(header);
    
    const grid = document.createElement('div');
    grid.className = 'mapGrid';
    
    // Renderizamos del 10 al 1 para que lo más nuevo esté arriba/izquierda
    for (let st = endStage; st >= startStage; st--) {
      const isUnlocked = st <= S.best;
      const isCurrent = st === S.stage;
      const rank = S.stageRanks[st] || (isCurrent ? '⚔️' : '🔒');
      const rankColor = RANK_COLORS[rank] || '#fff';
      
      const btn = document.createElement('button');
      btn.className = 'mapNode ' + (isCurrent ? 'current' : isUnlocked ? 'unlocked' : 'locked');
      btn.disabled = !isUnlocked;
      
      btn.innerHTML = `
        <span class="nodeStage">${st}</span>
        <span class="nodeRank" style="color:${rankColor}">${rank}</span>
      `;
      
      if (isUnlocked) {
        btn.onclick = () => {
          travelToStage(st);
          $('mMap').style.display = 'none';
        };
      }
      
      grid.appendChild(btn);
    }
    
    chapDiv.appendChild(grid);
    box.appendChild(chapDiv);
  }
}