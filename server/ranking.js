'use strict';
// ===== RANKING de etapas en memoria + broadcast =====
function makeRanking(io) {
  const scores = new Map();
  const top = () => [...scores.entries()].map(([name, stage]) => ({ name, stage }))
    .sort((a, b) => b.stage - a.stage).slice(0, 10);
  const pushScore = (name, stage) => {
    scores.set(name, Math.max(stage, scores.get(name) || 0));
    io.emit('top', top());
  };
  return { top, pushScore };
}
module.exports = { makeRanking };