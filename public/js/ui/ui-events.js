'use strict';
// ===== EVENTOS: calendario semanal + relámpago con countdown (LOTE 17) =====
wire('btnEvent', 'click', () => { renderEvents(); $('mEvents').style.display = 'flex'; Audio.SFX.click(); });
wire('evClose', 'click', () => { $('mEvents').style.display = 'none'; });
const fmtMMSS = ms => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
};
function renderEvents() {
  const m = $('mEvents'); if (!m) return;
  let box = $('evBody');
  if (!box) {
    const card = m.querySelector('.mcard');
    if (!card) return;
    box = document.createElement('div'); box.id = 'evBody';
    card.appendChild(box);
  }
  const ev = weekEvent(), next = weekEventAt(weekNow() + 1);
  let html = '<h3 style="color:#ffd700;font-size:12px;margin:8px 0">📅 EVENTO SEMANAL</h3>' +
    '<div class="mrow"><span><b>' + ev.n + '</b><br><small style="color:#8fa3c8">' + ev.d + ' · termina en ' +
    Math.ceil((weekNow() + 1) * 604800000 - Date.now()) / 86400000 | 0 + 'd</small></span><span>✅</span></div>' +
    '<div class="mrow"><span>Próxima semana: <b>' + next.n + '</b><br><small style="color:#8fa3c8">' + next.d + '</small></span><span>⏳</span></div>';
  const f = flashInfo();
  if (flashActive() && f) {
    html += '<h3 style="color:#7efcff;font-size:12px;margin:8px 0">🌠 EVENTO RELÁMPAGO ACTIVO</h3>' +
      '<div class="mrow" style="border:1px solid #7efcff"><span><b>' + f.n + '</b> · ' + f.d +
      '</span><b style="color:#7efcff" id="evFlashCd">' + fmtMMSS(S.flashEnd - Date.now()) + '</b></div>';
  } else {
    html += '<h3 style="color:#8fa3c8;font-size:12px;margin:8px 0">🌠 RELÁMPAGO</h3>' +
      '<div class="mrow"><span>Algo brillante se acerca…<br><small style="color:#8fa3c8">Aparece cada 45-90 min y dura 5 min</small></span><span>❓</span></div>';
  }
  box.innerHTML = html;
}
// Badge flotante con countdown + dot + tick de spawn
let flashBadge = null;
function getBadge() {
  if (flashBadge) return flashBadge;
  flashBadge = document.createElement('div');
  flashBadge.style.cssText = 'position:fixed;top:110px;left:50%;transform:translateX(-50%);z-index:90;' +
    'background:linear-gradient(90deg,rgba(126,252,252,.15),rgba(10,12,26,.85));border:1px solid #7efcff;' +
    'border-radius:999px;padding:5px 14px;font-size:10px;color:#7efcff;cursor:pointer;display:none;' +
    'backdrop-filter:blur(6px);box-shadow:0 0 14px rgba(126,252,252,.35);white-space:nowrap;';
  flashBadge.onclick = () => { renderEvents(); $('mEvents').style.display = 'flex'; };
  document.body.appendChild(flashBadge);
  return flashBadge;
}
setInterval(() => {
  checkFlash();
  const b = getBadge();
  const f = flashInfo();
  if (flashActive() && f) {
    b.style.display = 'block';
    b.innerHTML = f.n + ' · ' + f.d + ' · ⏱ ' + fmtMMSS(S.flashEnd - Date.now());
  } else b.style.display = 'none';
  const dot = $('evDot');
  if (dot) dot.style.display = flashActive() ? 'block' : 'none';
  const cd = $('evFlashCd');
  if (cd && flashActive()) cd.textContent = fmtMMSS(S.flashEnd - Date.now());
}, 1000);