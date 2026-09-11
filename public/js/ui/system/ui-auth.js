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
  Audio.setChapter(zoneOf(S.stage).music);   // L28: la música la elige la zona
  lastChapter = zoneIndex(S.stage);
  initSquad();
  if (typeof checkSkillUnlocks === 'function') checkSkillUnlocks(); // L27
  if (typeof checkDailyResets === 'function') checkDailyResets();
  else if (typeof checkTickets === 'function') checkTickets();
  if (typeof checkSeasonReset === 'function') checkSeasonReset(); // L26: rotar temporada al entrar
  if (typeof startStageClock === 'function') startStageClock();   // L26: el cronómetro de rango arranca acá
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
  // L28: la zona en la que arrancás queda registrada en el códice, y si nunca
  // leíste su presentación se reproduce ahora (incluye la apertura del juego).
  setTimeout(() => {
    const startTut = () => { if (!SETTINGS.tutorialDone) startTutorial(); };
    const zi = zoneIndex(S.stage), z = ZONES[zi];
    if (typeof playZoneIntro === 'function' && !loreSeen('zi_' + z.id)) {
      playZoneIntro(zi);
      queueScene(startTut);   // el tutorial espera a que termine la cinemática
    } else {
      if (typeof codexZone === 'function' && codexZone(zi)) persist();
      startTut();
    }
  }, 900);
}
// ===== Tutorial =====
const TUT_STEPS = [
  { t: 'Tu escuadrón pelea solo. ¡Tocá la pantalla para sumar tu propio golpe! 🐛', s: 'battleWrap' },
  { t: 'Ganá oro y comprá mejoras acá abajo ⬇️ (mantené pulsado para compra continua). La tarjeta marcada MEJOR es la que más rinde por moneda.', s: 'bottombar' },
  { t: 'Cada héroe carga ⚡ energía: al 100% lanza su ULTIMATE con cut-in.', s: 'heroHpWrap' },
  { t: '✨ Desde la etapa 3 desbloqueás HABILIDADES con teclas 1·2·3 (o tocando estos botones).', s: 'skillBar' },
  { t: 'Cada 5 etapas aparece un JEFE 👑 con fases: a 60% y 30% de vida enfurece e invoca esbirros.', s: 'topbar' },
  { t: '☰ El MENÚ tiene todo: modos, equipo, gremio y ajustes. ¡A jugar!', s: 'btnHub' }
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
    // FIX L27: se posicionaba con W/H (el viewport del canvas de Phaser), que valen
    // 0 hasta que la escena corre su primer frame → el tutorial salía fuera de pantalla.
    const vw = window.innerWidth, vh = window.innerHeight;
    const step = TUT_STEPS[i];
    const target = $(step.s);
    const r = (target && target.offsetParent !== null) ? target.getBoundingClientRect()
      : { left: vw / 2 - 150, top: vh / 2 - 60, width: 300, height: 0 };
    box.innerHTML = '<div class="tutTxt">' + step.t + '</div><div class="tutCtr">' + (i + 1) + '/' + TUT_STEPS.length +
      ' <button class="mbtn" id="tutNext">' + (i === TUT_STEPS.length - 1 ? '¡LISTO!' : 'SIGUIENTE ▶') + '</button></div>';
    const bw = box.offsetWidth || 320, bh = box.offsetHeight || 150;
    box.style.left = Math.max(10, Math.min(vw - bw - 10, r.left + r.width / 2 - bw / 2)) + 'px';
    // debajo del objetivo si entra; si no, encima
    const below = r.top + r.height + 14;
    box.style.top = (below + bh < vh - 10 ? below : Math.max(10, r.top - bh - 14)) + 'px';
    wire('tutNext', 'click', () => { Audio.SFX.click(); i++; show(); });
  }
  show();
}