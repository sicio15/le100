'use strict';
// ===== Cuentas + invitado + offline (con tiempo fuera) + tutorial + auto-login =====
let authMode = 'login';
wire('tabLogin', 'click', () => { authMode = 'login'; $('tabLogin').classList.add('sel'); $('tabReg').classList.remove('sel'); Audio.SFX.click(); });
wire('tabReg', 'click', () => { authMode = 'register'; $('tabReg').classList.add('sel'); $('tabLogin').classList.remove('sel'); Audio.SFX.click(); });
wire('authBtn', 'click', () => {
  $('authErr').textContent = '';
  netAuth(authMode, $('authName').value, $('authPass').value, res => {
    if (!res.ok) { $('authErr').textContent = res.err || 'Error'; return; }
    authed = true; S.name = res.name; applyServerSave(res.save);
    if (res.token && typeof netSetToken === 'function') netSetToken(res.token);
    $('mAuth').style.display = 'none';
    afterLogin();
  });
});
if (!authed) { const m = $('mAuth'); if (m) m.style.display = 'flex'; }
// auto-login silencioso con token (si el build lo soporta)
let autoTried = false;
function tryAutoLogin() {
  if (autoTried || authed || typeof netGetToken !== 'function' || typeof netLoginToken !== 'function') return;
  const t = netGetToken();
  if (!t) return;
  autoTried = true;
  netLoginToken(t, res => {
    if (res && res.ok) {
      authed = true; S.name = res.name; applyServerSave(res.save);
      const m = $('mAuth'); if (m) m.style.display = 'none';
      afterLogin();
    } else if (typeof netClearToken === 'function') netClearToken();
  });
}
if (typeof socket !== 'undefined' && socket) {
  if (socket.connected) tryAutoLogin();
  socket.on('connect', tryAutoLogin);
}
// MODO LOCAL: invitado sin servidor/cuenta
(function addGuestBtn() {
  const m = $('mAuth'); if (!m) return;
  if ($('guestBtn')) return;
  const b = document.createElement('button');
  b.id = 'guestBtn'; b.className = 'mbtn gray';
  b.textContent = '🎮 JUGAR EN LOCAL (sin cuenta)';
  b.onclick = () => {
    if (!S.name) S.name = 'Invitado';
    $('mAuth').style.display = 'none';
    afterLogin();
  };
  const hint = m.querySelector('.hintTxt');
  if (hint) hint.before(b);
  else (m.querySelector('.mcard') || m).appendChild(b);
})();
let offlinePending = 0, offlineWired = false;
function afterLogin() {
  Audio.init(); Audio.startMusic();
  Audio.setChapter(Math.floor((S.stage - 1) / 10));
  initSquad();
  if (typeof checkDailyResets === 'function') checkDailyResets();
  else if (typeof checkTickets === 'function') checkTickets();
  const sec = Math.min(Date.now() - (S.last || Date.now()), 8 * 3600 * 1000) / 1000;
  const pending = Math.floor(sec * goldKill(S.best) * 0.4);
  offlinePending = pending;
  if (pending >= 10) {
    $('offlineAmt').textContent = '🪙 ' + fmt(pending);
    // POLISH: tiempo fuera legible
    let tEl = $('offlineTime');
    if (!tEl) {
      tEl = document.createElement('p'); tEl.id = 'offlineTime';
      tEl.style.cssText = 'color:#8fa3c8;font-size:11px;margin:4px 0;';
      $('offlineAmt').after(tEl);
    }
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60);
    tEl.textContent = '⏰ Estuviste fuera ' + (h > 0 ? h + 'h ' : '') + m + 'min (tope 8h)';
    $('mOffline').style.display = 'flex';
    if (!offlineWired) {
      offlineWired = true;
      wire('offlineBtn', 'click', () => {
        if (offlinePending > 0) {
          S.gold += offlinePending; persist();
          Audio.SFX.coin();
          toast('🪙 +' + fmt(offlinePending) + ' de tu AFK');
          offlinePending = 0;
        }
        $('mOffline').style.display = 'none';
      });
    }
  }
  if (authed) netScore(S.name, S.best);
  persist();
  toast('¡Hola, ' + S.name + '!');
  if (!SETTINGS.tutorialDone) startTutorial();
}
// ===== Tutorial =====
const TUT_STEPS = [
  { t: 'Tu escuadrón pelea solo. ¡Miralo combatir! 🐛', s: 'battleWrap' },
  { t: 'Ganá oro y comprá mejoras acá abajo ⬇️ (mantené pulsado para compra continua)', s: 'bottombar' },
  { t: 'Cada héroe carga ⚡ energía: al 100% lanza su ULTIMATE con cut-in.', s: 'heroHpWrap' },
  { t: 'Cada 5 etapas aparece un JEFE 👑. Si caés, bajás una etapa a farmear.', s: 'topbar' },
  { t: '⏩ Acelerá la batalla (o Espacio) y ⚙️ ajustes arriba. ¡A jugar!', s: 'speedBtn' }
];
function startTutorial() {
  let i = 0;
  const ov = document.createElement('div'); ov.id = 'tutOv';
  const box = document.createElement('div'); box.id = 'tutBox';
  ov.appendChild(box); document.body.appendChild(ov);
  function show() {
    if (i >= TUT_STEPS.length) {
      SETTINGS.tutorialDone = true; saveSettings();
      ov.remove(); return;
    }
    const step = TUT_STEPS[i];
    const target = $(step.s);
    const r = target ? target.getBoundingClientRect() : { left: W / 2 - 150, top: H / 2, width: 300, height: 0 };
    box.innerHTML = '<div class="tutTxt">' + step.t + '</div><div class="tutCtr">' + (i + 1) + '/' + TUT_STEPS.length +
      ' <button class="mbtn" id="tutNext">' + (i === TUT_STEPS.length - 1 ? '¡LISTO!' : 'SIGUIENTE ▶') + '</button></div>';
    box.style.left = Math.max(10, Math.min(W - 320, r.left)) + 'px';
    box.style.top = Math.min(H - 140, r.top + r.height + 14) + 'px';
    wire('tutNext', 'click', () => { Audio.SFX.click(); i++; show(); });
  }
  show();
}