'use strict';
// ===== UI base: toasts (tope 4) + wire + caché EL + gestor de modales =====

// L27: los toasts se clasifican solos por su emoji inicial. Así los ~120 `toast()`
// repartidos por todo el proyecto ganan color sin tocar una sola llamada.
const TOAST_KIND = [
  { k: 'bad',  re: /^(❌|💀|⚠️|🔒|⏳)/ },
  { k: 'epic', re: /^(🌟|👑|🎫|⚗️|🧬|🏆|🌠|✨)/ },
  { k: 'good', re: /^(✅|⬆️|🪙|💎|🎒|🛡️|💚|🥾|🧗|🏔️)/ }
];
function toastKind(t) {
  for (const c of TOAST_KIND) if (c.re.test(t)) return c.k;
  return '';
}
function toast(t, kind) {
  const wrap = $('toasts'); if (!wrap) return;
  const d = document.createElement('div');
  d.className = 'toast ' + (kind || toastKind(String(t)));
  d.textContent = t;
  wrap.appendChild(d);
  while (wrap.children.length > 4) wrap.firstChild.remove(); // POLISH: no apilar infinito
  setTimeout(() => d.remove(), 2400);
}
const wire = (id, ev, fn) => { const e = $(id); if (e) e.addEventListener(ev, fn); };

// OPTIMIZACIÓN: elementos del hot-path (uiTick 10Hz) cacheados 1 sola vez.
const EL = {};
['goldTxt', 'stageTxt', 'adnTxt', 'essTxt', 'bossTag', 'hpTxt', 'dpsTxt', 'realDps', 'goldRate',
  'chapterTxt', 'scRing', 'heroHpWrap', 'stageProgFill', 'stageProgTxt',
  'prDot', 'achDot', 'gearDot', 'skillDot', 'comboBox', 'comboX', 'comboN', 'comboBar',
  'skillBar', 'buffBar'
].forEach(id => { EL[id] = $(id); });
if (EL.comboBar) EL.comboBarFill = EL.comboBar.querySelector('i');

// HOOKS QoL: eventos explícitos (autoequip etc.)
const UI_HOOKS = { gearOpen: [] };
function onGearOpen(fn) { UI_HOOKS.gearOpen.push(fn); }
function fireGearOpen() { UI_HOOKS.gearOpen.forEach(fn => { try { fn(); } catch (e) {} }); }

// ===== L26: GESTOR DE MODALES =====
// Había 20 modales y ninguno se cerraba con Escape ni tocando fuera de la tarjeta:
// la única salida era encontrar el botón CERRAR. Esto lo resuelve para todos de una
// vez, sin tocar ni uno solo de los paneles.
const MODAL_LOCKED = ['mAuth']; // el login no se puede descartar
const openModals = () => Array.prototype.filter.call(
  document.querySelectorAll('.modal'),
  m => m.style.display === 'flex' && MODAL_LOCKED.indexOf(m.id) < 0);
const anyModalOpen = () => document.querySelectorAll('.modal').length
  ? Array.prototype.some.call(document.querySelectorAll('.modal'), m => m.style.display === 'flex')
  : false;
function openModal(id) {
  const m = $(id); if (!m) return;
  m.style.display = 'flex';
  if (typeof Audio !== 'undefined' && Audio.SFX) Audio.SFX.click();
}
function closeModal(id) { const m = $(id); if (m) m.style.display = 'none'; }
function closeTopModal() {
  const list = openModals();
  if (!list.length) return false;
  list[list.length - 1].style.display = 'none';
  if (typeof Audio !== 'undefined' && Audio.SFX) Audio.SFX.click();
  return true;
}
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  const tag = (e.target && e.target.tagName) || '';
  if (tag === 'INPUT' || tag === 'TEXTAREA') { e.target.blur(); return; }
  if (closeTopModal()) e.preventDefault();
});
// Click en el fondo (no en la tarjeta) = cerrar
document.addEventListener('click', e => {
  if (!e.target.classList || !e.target.classList.contains('modal')) return;
  if (MODAL_LOCKED.indexOf(e.target.id) >= 0) return;
  e.target.style.display = 'none';
  if (typeof Audio !== 'undefined' && Audio.SFX) Audio.SFX.click();
});

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
