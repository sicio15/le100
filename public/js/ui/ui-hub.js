'use strict';
// ===== HUB MOBILE: menú categorizado en grilla (sin deslizar) =====
// Reutiliza los handlers existentes: cada item dispara .click() del botón original.
const HUB_SECTIONS = [
  { t: '🎮 MODOS', items: [
    { id: 'btnDaily', ico: '🎯', n: 'Diario', dot: 'dailyDot' },
    { id: 'btnTower', ico: '🗼', n: 'Torre' },
    { id: 'btnRogue', ico: '🌀', n: 'Sotobosque' },
    { id: 'btnArena', ico: '⚔️', n: 'Arena' },
    { id: 'btnColony', ico: '🐜', n: 'Colonia' }
  ]},
  { t: '📋 PROGRESO', items: [
    { id: 'btnMap', ico: '🗺️', n: 'Mapa' },
    { id: 'btnMissions', ico: '📜', n: 'Misiones', dot: 'misDot' },
    { id: 'btnAch', ico: '🏅', n: 'Logros', dot: 'achDot' },
    { id: 'btnLb', ico: '🏆', n: 'Ranking' },
    { id: 'btnStats', ico: '📊', n: 'Stats' }
  ]},
  { t: '🛒 TIENDA', items: [
    { id: 'btnShop', ico: '🛒', n: 'ADN' },
    { id: 'btnLook', ico: '🎩', n: 'Vestidor' },
    { id: 'btnGear', ico: '🎒', n: 'Equipo', dot: 'gearDot' },
    { id: 'btnWeekly', ico: '🎁', n: 'Semanal', dot: 'weekDot' }
  ]},
  { t: '⚙️ SISTEMA', items: [
    { id: 'btnEvent', ico: '✨', n: 'Evento' },
    { id: 'btnPrestige', ico: '🧬', n: 'Prestigio', dot: 'prDot' },
    { id: 'speedBtn', ico: '⏩', n: 'Velocidad', dyn: true },
    { id: 'btnSettings', ico: '⚙️', n: 'Ajustes' }
  ]}
];
const dotOn = id => { const d = $(id); return !!(d && d.style.display !== 'none' && getComputedStyle(d).display !== 'none'); };
wire('btnHub', 'click', openHub);
wire('hubClose', 'click', () => { $('mHub').style.display = 'none'; });
function openHub() {
  Audio.SFX.click();
  renderHub();
  $('mHub').style.display = 'flex';
}
function renderHub() {
  const box = $('hubBody'); if (!box) return;
  box.innerHTML = '';
  HUB_SECTIONS.forEach(sec => {
    const h = document.createElement('h3');
    h.style.cssText = 'font-size:10px;color:#ffd700;margin:12px 0 6px;';
    h.textContent = sec.t;
    box.appendChild(h);
    const grid = document.createElement('div');
    grid.className = 'hubGrid';
    sec.items.forEach(it => {
      const b = document.createElement('button');
      b.className = 'hubItem';
      const label = it.dyn ? ('x' + SETTINGS.speed) : it.n;
      b.innerHTML = '<span class="hi">' + it.ico + '</span><span class="hn">' + label + '</span>' +
        (it.dot && dotOn(it.dot) ? '<span class="hd"></span>' : '');
      b.onclick = () => {
        $('mHub').style.display = 'none';
        const orig = $(it.id);
        if (orig) orig.click();
        if (it.dyn) setTimeout(renderHub, 50); // actualiza label de velocidad si reabrís
      };
      grid.appendChild(b);
    });
    box.appendChild(grid);
  });
}
// Dot agregado del HUB: avisa si hay ALGO pendiente
setInterval(() => {
  const d = $('hubDot'); if (!d) return;
  const any = ['dailyDot', 'misDot', 'achDot', 'gearDot', 'weekDot', 'prDot'].some(dotOn);
  d.style.display = any ? 'block' : 'none';
}, 2000);