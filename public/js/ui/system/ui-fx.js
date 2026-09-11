'use strict';
// ===== UI-FX (LOTE 27): animaciones de interfaz, tooltips y feedback =====
// Nada de esto toca la lógica del juego: son adornos que hacen legible lo que
// ya pasaba (un número que sube, un botón que se puede pagar, qué hace un icono).

// ----- Contadores que "corren" hasta el valor nuevo en vez de saltar -----
// Guardamos el valor mostrado por elemento y lo acercamos al objetivo en cada
// tick del HUD (10 Hz). Para saltos enormes se corta por lo sano.
const _cnt = new WeakMap();
function setCount(el, value, formatter) {
  if (!el) return;
  const fmtFn = formatter || fmt;
  const target = Math.max(0, value);
  let cur = _cnt.get(el);
  if (cur === undefined || Math.abs(target - cur) > Math.max(1000, target * 0.5)) cur = target;
  else cur += (target - cur) * 0.34;
  if (Math.abs(target - cur) < 1) cur = target;
  _cnt.set(el, cur);
  const txt = fmtFn(cur);
  if (el.textContent !== txt) el.textContent = txt;
}

// ----- Golpecito visual al contador de oro (lo llama cada moneda que llega) -----
let _bumpT = 0;
function bumpGold() {
  const el = EL && EL.goldTxt; if (!el) return;
  const now = Date.now();
  if (now - _bumpT < 220) return;   // sin esto, 8 monedas de un jefe reinician la animación 8 veces
  _bumpT = now;
  el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump');
  const res = el.closest('.res');
  if (res) { res.classList.remove('gain'); void res.offsetWidth; res.classList.add('gain'); }
}

// ----- "+N" flotante sobre un contador del topbar -----
function flyGain(el, txt, color) {
  if (!el || SETTINGS.reduceFx) return;
  const r = el.getBoundingClientRect();
  const d = document.createElement('div');
  d.className = 'resFly';
  d.textContent = txt;
  if (color) d.style.color = color;
  d.style.left = (r.left + r.width / 2) + 'px';
  d.style.top = (r.top - 6) + 'px';
  document.body.appendChild(d);
  setTimeout(() => d.remove(), 1000);
}

// ===== TOOLTIPS (atributo data-tip) =====
// Delegación en document: sirve también para el HTML que los paneles crean después.
(function tooltips() {
  const layer = $('tipLayer');
  if (!layer) return;
  let tip = null, cur = null;
  const hide = () => { if (tip) { tip.remove(); tip = null; } cur = null; };
  function show(host) {
    const txt = host.getAttribute('data-tip');
    if (!txt) return;
    hide();
    cur = host;
    tip = document.createElement('div');
    tip.className = 'tip';
    tip.innerHTML = txt;
    layer.appendChild(tip);
    const r = host.getBoundingClientRect(), t = tip.getBoundingClientRect();
    let x = r.left + r.width / 2 - t.width / 2;
    let y = r.bottom + 8;
    if (y + t.height > window.innerHeight - 8) y = r.top - t.height - 8;   // se da vuelta si no entra
    x = Math.max(8, Math.min(window.innerWidth - t.width - 8, x));
    tip.style.left = x + 'px';
    tip.style.top = Math.max(8, y) + 'px';
  }
  document.addEventListener('pointerover', e => {
    const host = e.target && e.target.closest && e.target.closest('[data-tip]');
    if (!host || host === cur) return;
    show(host);
  });
  document.addEventListener('pointerout', e => {
    const host = e.target && e.target.closest && e.target.closest('[data-tip]');
    if (host && host === cur) hide();
  });
  // en táctil el hover no existe: cualquier toque limpia el tooltip colgado
  document.addEventListener('pointerdown', hide, true);
  window.addEventListener('scroll', hide, true);
})();

// ===== Sonido de click en todo lo que sea un botón del juego =====
// (antes cada panel tenía que acordarse de llamar a Audio.SFX.click)
document.addEventListener('pointerdown', e => {
  const b = e.target && e.target.closest && e.target.closest('.mbtn,.claim,.tab,.dItem,.tbtn,.skMore');
  if (b && !b.disabled && typeof Audio !== 'undefined' && Audio.SFX) Audio.SFX.click();
}, true);
