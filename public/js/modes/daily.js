'use strict';
// ===== JEFE DIARIO (modo con tickets) =====
wire('btnDaily', 'click', () => { checkTickets(); renderDaily(); $('mDaily').style.display = 'flex'; Audio.SFX.click(); });
wire('dailyClose', 'click', () => { $('mDaily').style.display = 'none'; });
function renderDaily() {
  const st = S.best + 5;
  $('dailyInfo').innerHTML = '👑 Jefe Diario (Etapa ' + st + ')<br><small>❤️ ' + fmt(eHP(st) * 12) + ' · ⚔️ ' + fmt(eDmg(st) * 2.5) + '/s</small><br><small style="color:#8fa3c8">Ganar = equipo garantizado de buena rareza + mucho oro</small>';
  $('dailyBtn').textContent = '🎟️ USAR TICKET (' + S.tickets + '/3)';
  $('dailyBtn').disabled = S.tickets <= 0;
}
wire('dailyBtn', 'click', () => {
  if (S.tickets <= 0) return;
  S.tickets--; persist();
  const st = S.best + 5;
  const bhp = eHP(st) * 12, bAtk = eDmg(st) * 2.5;
  const our = dps() * 30 * 1.4;
  const aguante = maxHP() / (bAtk * 0.5);
  const ratio = our / bhp;
  const win = Math.random() < Math.max(0.1, Math.min(0.95, ratio * (aguante >= 20 ? 1 : 0.5)));
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
  checkTickets();
  const d = $('dailyDot');
  if (d) d.style.display = S.tickets > 0 ? 'block' : 'none';
}, 2000);