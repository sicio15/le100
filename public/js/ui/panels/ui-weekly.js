'use strict';
// ===== RECOMPENSAS SEMANALES: modal + reclamo =====
wire('btnWeekly', 'click', openWeekly);
wire('weeklyClose', 'click', () => { $('mWeekly').style.display = 'none'; });
function openWeekly() {
  Audio.SFX.click();
  checkWeekReset();
  renderWeekly();
  $('mWeekly').style.display = 'flex';
  if (authed) netCall('weeklyInfo', info => { if (info && info.ok) renderWeeklyNet(info); });
}
function renderWeekly() {
  const box = $('weeklyBody'); if (!box) return;
  box.innerHTML = '<h3 style="color:#ffd700">🗼 TORRE SEMANAL</h3>' +
    '<p style="color:#8fa3c8;font-size:12px">Mejor piso esta semana: <b style="color:#fff">' + (S.weekTower || 1) + '</b></p>' +
    '<div id="weeklyTowerList"></div>' +
    '<h3 style="color:#ffd700;margin-top:12px">⚔️ ARENA (Top 10)</h3>' +
    '<div id="weeklyArenaInfo"><p style="color:#8fa3c8;font-size:12px">Conectá con tu cuenta para ver tu posición.</p></div>' +
    '<button class="mbtn" id="weeklyClaim" style="width:100%;margin-top:14px">🎁 RECLAMAR RECOMPENSAS</button>' +
    '<div id="weeklyResult" style="min-height:20px;margin-top:8px;color:#7bed9f;font-size:12px"></div>';
  const tl = $('weeklyTowerList');
  [{ f: 10, g: 1000, a: 0 }, { f: 25, g: 2500, a: 1 }, { f: 50, g: 5000, a: 2 }, { f: 100, g: 10000, a: 5 }].forEach(t => {
    const done = (S.weekTower || 1) >= t.f;
    tl.innerHTML += '<div class="mrow"><span>' + (done ? '✅' : '🔒') + ' Piso ' + t.f + '</span><span>+' + fmt(t.g) + '🪙' + (t.a ? ' +' + t.a + '🧬' : '') + '</span></div>';
  });
  wire('weeklyClaim', 'click', () => {
    if (!authed) return toast('🔒 Necesitás cuenta para reclamar');
    netCall('weeklyClaim', res => {
      if (res && res.ok) {
        S.gold += res.gold; S.adn += res.adn; S.weekClaimedKey = res.week;
        persist();
        Audio.SFX.levelup();
        $('weeklyResult').innerHTML = res.rewards.map(r => '✔ ' + r).join('<br>');
        toast('🎁 +' + fmt(res.gold) + '🪙 +' + res.adn + '🧬');
        renderWeekly();
      } else toast('❌ ' + ((res && res.err) || 'Sin recompensas'));
    });
  });
}
function renderWeeklyNet(info) {
  const el = $('weeklyArenaInfo'); if (!el) return;
  el.innerHTML = '<p style="color:#8fa3c8;font-size:12px">Tu posición: <b style="color:#7efcff">' + (info.pos ? '#' + info.pos : 'fuera del top') + '</b> · ' +
    (info.claimed ? '✅ Ya reclamaste esta semana' : '🎁 Reclamo disponible') + '</p>' +
    (info.top || []).slice(0, 5).map((p, i) => '<div class="mrow"><span>' + (i + 1) + '. ' + p.name + '</span><span>' + p.pts + ' pts</span></div>').join('');
  const btn = $('weeklyClaim');
  if (btn) btn.disabled = !!info.claimed;
}
// Dot de notificación: recompensas pendientes
setInterval(() => {
  const dot = $('weekDot'); if (!dot) return;
  const pending = (S.weekTower || 1) >= 10 && S.weekClaimedKey !== weekNow();
  dot.style.display = (authed && pending) ? 'block' : 'none';
}, 2000);