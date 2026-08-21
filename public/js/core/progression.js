'use strict';
// ===== PROGRESSION: rangos, mapa, milestones, viaje =====
function getStageRank(timeSeconds, hadDeaths, isBoss) {
  if (isBoss) return timeSeconds < 20 ? 'S' : 'R';
  if (timeSeconds < 15 && !hadDeaths) return 'S';
  if (timeSeconds < 30) return 'A';
  if (timeSeconds < 60) return 'B';
  return 'C';
}
function travelToStage(targetStage) {
  if (targetStage < 1 || targetStage > S.best) return toast('❌ Etapa no disponible');
  if (targetStage === S.stage) return toast('Ya estás en esa etapa');
  S.stage = targetStage; S.ks = 0;
  resetSquad(); reEnter(); enemies = [];
  persist();
  toast('🗺️ Viajaste a la Etapa ' + targetStage); Audio.SFX.click();
}
function getChapterStats(chapterIndex) {
  const startStage = chapterIndex * 10 + 1;
  const endStage = chapterIndex * 10 + 10;
  const ranks = { S: 0, A: 0, B: 0, C: 0, R: 0, locked: 0 };
  for (let st = startStage; st <= endStage; st++) {
    if (st > S.best) { ranks.locked++; continue; }
    const rank = S.stageRanks[st] || 'C';
    ranks[rank] = (ranks[rank] || 0) + 1;
  }
  return { ranks, total: endStage - startStage + 1 };
}
function getTotalRankBonus() {
  let sCount = 0, aCount = 0;
  Object.values(S.stageRanks).forEach(r => {
    if (r === 'S') sCount++;
    else if (r === 'A') aCount++;
  });
  return { damage: (sCount * 0.5 + aCount * 0.2) / 100, sCount, aCount };
}
function skipToRecord() {
  if (S.stage >= S.best) return toast('Ya estás en tu récord');
  S.stage = S.best; S.ks = 0;
  resetSquad(); reEnter(); enemies = [];
  persist();
  toast('⚡ Saltaste a tu récord: Etapa ' + S.best); Audio.SFX.levelup();
}
function checkMilestones() {
  TOWER_MILESTONES.forEach(m => {
    if (S.towerBest >= m.f && !S.milestones[m.id]) {
      S.milestones[m.id] = 1;
      if (m.g) S.gold += m.g;
      if (m.a) S.adn += m.a;
      toast('🏆 HITO: ' + m.t); Audio.SFX.levelup(); persist();
    }
  });
}