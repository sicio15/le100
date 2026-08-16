'use strict';
// ===== JEFE DIARIO (modo con tickets) =====
// LOTE 2A: reset diario centralizado en store.checkDailyResets() (deuda #4).
// LOTE 3: simulación vía modes/sim.js (deuda #5).
wire('btnDaily', 'click', () => { checkDailyResets(); renderDaily(); $('mDaily').style.display = 'flex'; Audio.SFX.click(); });
wire('dailyClose', 'click', () => { $('mDaily').style.display = 'none'; });
function renderDaily() {
  const st = S.best + 5;
  $('dailyInfo').innerHTML = '👑 Jefe Diario (Etapa ' + st + ') <br><small>❤️ ' + fmt(eHP(st) * 12) + ' · ⚔️ ' + fmt(eDmg(st) * 2.5) + '/s</small><br><small style="color:#8fa3c8">Ganar = equipo garantizado de buena rareza + mucho oro</small>';
  $('dailyBtn').textContent = '🎟️ USAR TICKET (' + S.tickets + '/3)';
  $('dailyBtn').disabled = S.tickets <= 0;
}
wire('dailyBtn', 'click', () => {
  if (S.tickets <= 0) return;
  S.tickets--; persist();
  const st = S.best + 5;
  const win = rollFight(fightChance(st, 12, 2.5, { min: 0.1 }));
  const g = goldKill(st) * (win ? 40 : 8);
  S.gold += g;
  const msg = win ? '🏆 ¡VICTORIA! +' + fmt(g) + ' 🪙' : '💀 Derrota... +' + fmt(g) + ' 🪙 de consuelo';
  if (win) dropItem(3); else if (Math.random() < 0.25) dropItem(1);
  if (win) Audio.SFX.levelup(); else Audio.SFX.death();
  toast(msg);
  $('dailyResult').textContent = msg;
  renderDaily();
});
setInterval(() => {
  checkDailyResets();
  const d = $('dailyDot');
  if (d) d.style.display = S.tickets > 0 ? 'block' : 'none';
}, 2000);