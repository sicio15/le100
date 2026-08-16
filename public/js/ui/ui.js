'use strict';
// ===== UI base: toasts + wire + caché de elementos =====
function toast(t) {
  const d = document.createElement('div');
  d.className = 'toast'; d.textContent = t;
  $('toasts').appendChild(d);
  setTimeout(() => d.remove(), 2400);
}
const wire = (id, ev, fn) => { const e = $(id); if (e) e.addEventListener(ev, fn); };

// OPTIMIZACIÓN: elementos del hot-path (uiTick 10Hz) cacheados 1 sola vez.
// 0 getElementById por tick (antes ~270/s).
const EL = {};
['goldTxt', 'stageTxt', 'adnTxt', 'bossTag', 'hpTxt', 'dpsTxt', 'heroHpWrap',
 'stageProgFill', 'stageProgTxt', 'prDot', 'achDot', 'gearDot'
].forEach(id => { EL[id] = $(id); });

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