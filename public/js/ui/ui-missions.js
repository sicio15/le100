'use strict';
// ===== MISIONES DIARIAS: progreso derivado de stats existentes (cero hooks en otros archivos) =====
const MISSIONS = [
  { id: 'mKills', n: '🗡️ Cazador',    d: 'Eliminá 250 enemigos',         g: 250, goal: 250, p: () => S.kills - (S.mBase.kills || 0) },
  { id: 'mTower', n: '🗼 Escalador',  d: 'Subí 3 pisos de la Torre',     g: 3,   goal: 3,   p: () => S.tower - (S.mBase.tower || 1) },
  { id: 'mRogue', n: '🌀 Explorador', d: 'Entrá al Sotobosque 1 vez',    g: 1,   goal: 1,   p: () => 2 - S.rlTickets },
  { id: 'mArena', n: '⚔️ Gladiador',  d: 'Peleá 3 veces en la Arena',    g: 3,   goal: 3,   p: () => 5 - S.arenaTickets },
  { id: 'mDaily', n: '🎯 Retador',    d: 'Usá 1 ticket del Jefe Diario', g: 1,   goal: 1,   p: () => 3 - S.tickets },
  { id: 'mPrest', n: '🧬 Renacido',   d: 'Hacé 1 prestigio',             g: 1,   goal: 1,   p: () => S.prestiges - (S.mBase.prestiges || 0) }
];
// FIX: reset diario de TODOS los tickets acá también (arena/rogue antes solo reseteaban al abrir su modal)
function checkMissions() {
  const d = new Date().toISOString().slice(0, 10);
  if (S.ticketDate !== d) { S.ticketDate = d; S.tickets = 3; }
  if (S.arenaDate !== d) { S.arenaDate = d; S.arenaTickets = 5; }
  if (S.rlDate !== d) { S.rlDate = d; S.rlTickets = 2; }
  if (S.mDate !== d) {
    S.mDate = d;
    S.mBase = { kills: S.kills, tower: S.tower, prestiges: S.prestiges };
    S.mClaimed = {};
  }
}
const mDone = m => m.p() >= m.goal;
const mReward = m => goldKill(S.best) * m.g;
const mAllDone = () => MISSIONS.every(mDone);
const mPending = () => MISSIONS.some(m => mDone(m) && !S.mClaimed[m.id]) || (mAllDone() && !S.mClaimed._perfect);
wire('btnMissions', 'click', () => { checkMissions(); renderMissions(); $('mMissions').style.display = 'flex'; Audio.SFX.click(); });
wire('misClose', 'click', () => { $('mMissions').style.display = 'none'; });
wire('misAll', 'click', () => {
  let got = 0;
  MISSIONS.forEach(m => {
    if (mDone(m) && !S.mClaimed[m.id]) { S.mClaimed[m.id] = 1; S.gold += mReward(m); got++; }
  });
  if (mAllDone() && !S.mClaimed._perfect) { S.mClaimed._perfect = 1; S.adn++; got++; toast('🧬 ¡Todas las misiones! +1 ADN'); }
  if (got) { persist(); Audio.SFX.levelup(); }
  renderMissions();
});
function renderMissions() {
  checkMissions();
  const box = $('misList'); if (!box) return;
  box.innerHTML = '';
  MISSIONS.forEach(m => {
    const cur = Math.max(0, Math.min(m.p(), m.goal));
    const done = mDone(m), claimed = !!S.mClaimed[m.id];
    const row = document.createElement('div'); row.className = 'mrow';
    row.innerHTML = '<span>' + m.n + ' ' + m.d + '<br><small style="color:#8fa3c8">' + cur + '/' + m.goal + ' · 🪙 ' + fmt(mReward(m)) + '</small></span>';
    const b = document.createElement('button'); b.className = 'claim';
    b.textContent = claimed ? 'OK' : 'RECLAMAR';
    b.disabled = claimed || !done;
    b.onclick = () => {
      if (!done || claimed) return;
      S.mClaimed[m.id] = 1; S.gold += mReward(m);
      persist(); Audio.SFX.coin(); toast('📜 +' + fmt(mReward(m)) + ' 🪙');
      renderMissions();
    };
    row.appendChild(b); box.appendChild(row);
  });
  const all = $('misAll');
  if (all) all.disabled = !mPending();
}
setInterval(() => {
  checkMissions();
  const d = $('misDot');
  if (d) d.style.display = mPending() ? 'block' : 'none';
}, 2000);