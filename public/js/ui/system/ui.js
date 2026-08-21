'use strict';
// ===== UI base: toasts (tope 4) + wire + caché EL + hooks QoL =====
function toast(t) {
  const wrap = $('toasts');
  const d = document.createElement('div');
  d.className = 'toast'; d.textContent = t;
  wrap.appendChild(d);
  while (wrap.children.length > 4) wrap.firstChild.remove(); // POLISH: no apilar infinito
  setTimeout(() => d.remove(), 2400);
}
const wire = (id, ev, fn) => { const e = $(id); if (e) e.addEventListener(ev, fn); };
// OPTIMIZACIÓN: elementos del hot-path (uiTick 10Hz) cacheados 1 sola vez.
const EL = {};
['goldTxt', 'stageTxt', 'adnTxt', 'bossTag', 'hpTxt', 'dpsTxt', 'heroHpWrap',
  'stageProgFill', 'stageProgTxt', 'prDot', 'achDot', 'gearDot'
].forEach(id => { EL[id] = $(id); });
// HOOKS QoL: eventos explícitos (autoequip etc.)
const UI_HOOKS = { gearOpen: [] };
function onGearOpen(fn) { UI_HOOKS.gearOpen.push(fn); }
function fireGearOpen() { UI_HOOKS.gearOpen.forEach(fn => { try { fn(); } catch (e) {} }); }
// ===== Logo con chroma =====
(function loadLogo() {
  const img = new Image();
  img.onload = () => {
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const g = c.getContext('2d');
    g.drawImage(img, 0, 0);
    try { chroma(g, c); } catch (e) {}
    const el = $('logoImg');
    if (el) el.src = c.toDataURL();
  };
  img.src = 'img/logo.png';
})();