'use strict';
// ===== Cuentas + invitado + offline + tutorial =====
let authMode = 'login';
wire('tabLogin', 'click', () => { authMode = 'login'; $('tabLogin').classList.add('sel'); $('tabReg').classList.remove('sel'); Audio.SFX.click(); });
wire('tabReg', 'click', () => { authMode = 'register'; $('tabReg').classList.add('sel'); $('tabLogin').classList.remove('sel'); Audio.SFX.click(); });
wire('authBtn', 'click', () => {
  $('authErr').textContent = '';
  netAuth(authMode, $('authName').value, $('authPass').value, res => {
    if (!res.ok) { $('authErr').textContent = res.err || 'Error'; return; }
    authed = true; S.name = res.name; applyServerSave(res.save);
    $('mAuth').style.display = 'none';
    afterLogin();
  });
});
if (!authed) { const m = $('mAuth'); if (m) m.style.display = 'flex'; }

// MODO LOCAL: invitado sin servidor/cuenta
(function addGuestBtn() {
  const m = $('mAuth'); if (!m) return;
  const b = document.createElement('button');
  b.className = 'mbtn gray';
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
  checkTickets();
  const sec = Math.min(Date.now() - (S.last || Date.now()), 8 * 3600 * 1000) / 1000;
  const pending = Math.floor(sec * goldKill(S.best) * 0.4);
  offlinePending = pending;
  if (pending >= 10) {
    $('offlineAmt').textContent = '🪙 ' + fmt(pending);
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
  { t: 'Ganá oro y comprá mejoras acá abajo ⬇️', s: 'bottombar' },
  { t: 'Cada héroe carga ⚡ energía: al 100% lanza su ULTIMATE con cut-in.', s: 'heroHpWrap' },
  { t: 'Cada 5 etapas aparece un JEFE 👑. Si caés, bajás una etapa a farmear.', s: 'topbar' },
  { t: '⏩ Acelerá la batalla y ⚙️ ajustes arriba. ¡A jugar!', s: 'speedBtn' }
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