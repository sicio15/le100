'use strict';
// ===== JEFE DIARIO =====
wire('btnDaily', 'click', () => {
  checkDailyResets();
  renderDaily();
  const m = $('mDaily'); if (m) m.style.display = 'flex';
  Audio.SFX.click();
});
wire('dailyClose', 'click', () => { const m = $('mDaily'); if (m) m.style.display = 'none'; });

// L26: antes la chance era `0.6 + best/1000`, o sea RNG puro: tu daño, tu equipo y
// tus mejoras no cambiaban NADA. Ahora usa fightChance() (el mismo simulador que
// Torre y Sotobosque) con un piso del 50% para que siga siendo un modo amable.
const dailyOdds = () => Math.max(0.5, fightChance(S.best, 9, 2.2));

function renderDaily() {
  const body = $('dailyBody');
  if (!body) return; // GUARDIÁN: evita el crash si el DOM no está listo
  const today = new Date().toISOString().slice(0, 10);
  const isBonus = (typeof dayHas === 'function' && dayHas('daily'));
  const ch = dailyOdds();
  const col = ch >= 0.8 ? '#7bed9f' : ch >= 0.6 ? '#ffd700' : '#ff5252';
  body.innerHTML = '<p style="color:#8fa3c8;font-size:11px">📅 ' + today + (isBonus ? ' · 🎯 HOY +1 ticket' : '') + '</p>' +
    '<p>🎟️ Tickets: <b style="color:#ffd700">' + S.tickets + ' / ' + (3 + (isBonus ? 1 : 0)) + '</b></p>' +
    '<p style="font-size:12px;margin:12px 0">Derrotá al jefe de tu etapa actual para ganar 🧬 ADN y 🪙 Oro.<br>' +
    'Probabilidad de éxito: <b style="color:' + col + '">' + Math.round(ch * 100) + '%</b></p>' +
    '<button class="mbtn" id="dailyFight">PELEAR (1 🎟️)</button>';
  const b = $('dailyFight');
  if (b) b.onclick = dailyFight;
}

function dailyFight() {
  if (S.tickets < 1) return toast('❌ Sin tickets');
  S.tickets--;
  const win = rollFight(dailyOdds());
  const g = goldKill(S.best) * 15;
  S.gold += g;
  let msg;
  if (win) {
    const a = 2 + Math.floor(S.best / 50);
    S.adn += a;
    dropItem(3);
    msg = '✅ ¡Jefe derrotado! +' + fmt(g) + ' 🪙 +' + a + ' 🧬 + 🎒';
    Audio.SFX.levelup();
  } else {
    msg = '💀 El jefe te frenó. +' + fmt(g) + ' 🪙 de consolación.';
    Audio.SFX.death();
  }
  toast(msg);
  persist();
  renderDaily();
}

setInterval(() => {
  const dot = $('dailyDot');
  if (!dot) return;
  checkDailyResets();
  dot.style.display = S.tickets > 0 ? 'block' : 'none';
}, 2000);