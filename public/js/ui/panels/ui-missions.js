'use strict';
// ===== MISIONES DIARIAS =====
wire('btnMissions', 'click', () => {
  checkDailyResets();
  renderMissions();
  $('mMissions').style.display = 'flex';
  Audio.SFX.click();
});
wire('missionsClose', 'click', () => { $('mMissions').style.display = 'none'; });

// L28: misiones nuevas atadas a los sistemas de este lote (jefes, habilidades,
// bestiario). `mBase` guarda el valor del contador al empezar el día.
const MISSIONS = [
  { id:'kills50',    d:'50 kills',    check:()=>(S.kills - (S.mBase?.kills||0)) >= 50,      r:{g:500},  xp:20 },
  { id:'kills200',   d:'200 kills',   check:()=>(S.kills - (S.mBase?.kills||0)) >= 200,     r:{g:2000}, xp:50 },
  { id:'boss1',      d:'Derrotar 1 jefe',  check:()=>(bStat('bossKills') - (S.mBase?.bossKills||0)) >= 1, r:{g:3000}, xp:40 },
  { id:'skills5',    d:'Usar 5 habilidades', check:()=>(bStat('skillCasts') - (S.mBase?.skillCasts||0)) >= 5, r:{g:1200}, xp:25 },
  { id:'affix3',     d:'Matar 3 enemigos con afijo', check:()=>(bStat('affixKills') - (S.mBase?.affixKills||0)) >= 3, r:{g:2500}, xp:35 },
  { id:'tower3',     d:'Subir 3 pisos de Torre', check:()=>(S.tower - (S.mBase?.tower||1)) >= 3, r:{a:2}, xp:30 },
  { id:'prestige',   d:'Hacer 1 prestigio', check:()=>(S.prestiges - (S.mBase?.prestiges||0)) >= 1, r:{a:10}, xp:100 }
];
const bStat = k => (S.stats && S.stats[k]) || 0;

function renderMissions() {
  const box = $('missionsBody');
  if (!box) return;
  box.innerHTML = '<p style="color:#8fa3c8;font-size:11px;margin-bottom:10px">📅 ' + S.mDate + ' · Se resetean mañana</p>';
  MISSIONS.forEach(m => {
    const done = !!S.mClaimed[m.id];
    const can = !done && m.check();
    const rew = m.r.g ? '🪙 '+m.r.g : '🧬 '+m.r.a;
    const row = document.createElement('div');
    row.className = 'mrow';
    row.innerHTML = '<span>' + (done?'✅':can?'🔔':'🔒') + ' ' + m.d +
      '<br><small style="color:#8fa3c8">Recompensa: ' + rew + ' + ' + m.xp + ' XP 🎫</small></span>';
    const b = document.createElement('button');
    b.className = 'claim';
    b.textContent = done ? 'OK' : 'RECLAMAR';
    b.disabled = !can;
    b.onclick = () => {
      S.mClaimed[m.id] = 1;
      if (m.r.g) S.gold += m.r.g;
      if (m.r.a) S.adn += m.r.a;
      addSeasonXp(m.xp); // usa la constante global SEASON_XP_PER_MISSION
      persist();
      Audio.SFX.levelup();
      toast('📜 ¡Misión completada!');
      renderMissions();
    };
    row.appendChild(b);
    box.appendChild(row);
  });
}

setInterval(() => {
  const dot = $('misDot');
  if (!dot) return;
  checkDailyResets();
  const has = MISSIONS.some(m => !S.mClaimed[m.id] && m.check());
  dot.style.display = has ? 'block' : 'none';
}, 2000);