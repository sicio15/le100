'use strict';
// ===== DRAWER DE NAVEGACIÓN (LOTE 27) =====
// Antes: 18 botones-emoji sin etiqueta apretados en la topbar de escritorio, y un
// HUB distinto sólo para mobile. Ahora hay UN menú categorizado y con nombres para
// las dos plataformas. Sigue reusando los handlers existentes: cada ítem dispara
// el .click() del botón original (que vive oculto en #navStash).

const HUB_SECTIONS = [
  { t: 'COMBATE', items: [
    { id: 'btnSkills', ico: '✨', n: 'Habilidades', dot: 'skillDot', key: 'H',
      hint: () => SKILLS.filter(s => skillUnlocked(s.id)).length + '/' + SKILLS.length + ' desbloqueadas' },
    { id: 'btnGear', ico: '🎒', n: 'Equipo', dot: 'gearDot', key: 'E',
      hint: () => S.gear.inv.length + '/' + bagMax() + ' en mochila' },
    { id: 'btnPrestige', ico: '🧬', n: 'Prestigio', dot: 'prDot', key: 'P',
      hint: () => prGain() > 0 ? '+' + prGain() + ' ADN listo' : 'Etapa 10+' },
    { id: 'speedBtn', ico: '⏩', n: 'Velocidad', key: 'ESP', hint: () => 'x' + SETTINGS.speed }
  ]},
  { t: 'MODOS', items: [
    { id: 'btnDaily', ico: '🎯', n: 'Jefe Diario', dot: 'dailyDot', key: 'D', hint: () => S.tickets + ' tickets' },
    { id: 'btnTower', ico: '🗼', n: 'Torre', key: 'T', hint: () => 'Piso ' + S.tower },
    { id: 'btnRogue', ico: '🌀', n: 'Sotobosque', key: 'R', hint: () => S.rlTickets + ' entradas' },
    { id: 'btnArena', ico: '⚔️', n: 'Arena PvP', key: 'A', hint: () => S.arenaPts + ' pts' }
  ]},
  { t: 'PROGRESO', items: [
    { id: 'btnMap', ico: '🗺️', n: 'Mapa', key: 'M', hint: () => 'Récord: etapa ' + S.best },
    { id: 'btnMissions', ico: '📜', n: 'Misiones', dot: 'misDot', key: 'C', hint: () => 'Diarias' },
    { id: 'btnAch', ico: '🏅', n: 'Logros', dot: 'achDot', hint: () => Object.keys(S.ach).length + '/' + ACH.length },
    { id: 'btnStats', ico: '📊', n: 'Estadísticas', key: 'V', hint: () => fmt(S.kills) + ' kills' },
    { id: 'btnLb', ico: '🏆', n: 'Ranking', key: 'L', hint: () => LB.length + ' en línea' },
    { id: 'btnGuild', ico: '🛡️', n: 'Gremio', dot: 'guildDot', key: 'G', hint: () => S.colony || 'Sin gremio' }
  ]},
  { t: 'TIENDA Y PREMIOS', items: [
    { id: 'btnShop', ico: '🛒', n: 'Tienda ADN', key: 'S', hint: () => S.adn + ' 🧬' },
    { id: 'btnLook', ico: '🎩', n: 'Vestidor', hint: () => (S.shop.skins || []).length + ' skins' },
    { id: 'btnWeekly', ico: '🎁', n: 'Semanal', dot: 'weekDot', hint: () => 'Recompensas' },
    { id: 'btnBattlePass', ico: '🎫', n: 'Battle Pass', dot: 'bpDot', key: 'B', hint: () => 'Nv ' + S.seasonLevel },
    { id: 'btnEvent', ico: '✨', n: 'Eventos', dot: 'evDot', hint: () => (weekEvent() || {}).n || 'Activos' },
    { id: 'btnSettings', ico: '⚙️', n: 'Ajustes', key: 'O', hint: () => 'Audio y efectos' }
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

function safeHint(fn) { try { return fn ? String(fn()) : ''; } catch (e) { return ''; } }

function renderHub() {
  const box = $('hubBody'); if (!box) return;
  const nm = $('drawerName'), sb = $('drawerSub');
  if (nm) nm.textContent = S.name || 'Invitado';
  if (sb) sb.textContent = 'Etapa ' + S.stage + ' · récord ' + S.best + ' · ' + S.prestiges + ' 🧬 prestigios';
  box.innerHTML = '';
  HUB_SECTIONS.forEach(sec => {
    const h = document.createElement('div');
    h.className = 'dSec';
    h.innerHTML = '<span>' + sec.t + '</span>';
    box.appendChild(h);
    const grid = document.createElement('div');
    grid.className = 'dGrid';
    sec.items.forEach(it => {
      if (!$(it.id)) return;                       // el botón no existe → no dibujamos el ítem
      const b = document.createElement('button');
      b.className = 'dItem';
      b.innerHTML = '<span class="di">' + it.ico + '</span>' +
        '<span class="dTxt"><span class="dn">' + it.n + '</span><span class="dh">' + safeHint(it.hint) + '</span></span>' +
        (it.key ? '<span class="dk">' + it.key + '</span>' : '') +
        (it.dot && dotOn(it.dot) ? '<span class="hd"></span>' : '');
      b.onclick = () => {
        const orig = $(it.id);
        // La velocidad se cambia sin cerrar el menú: se ve el cambio al instante
        if (it.id === 'speedBtn') { if (orig) orig.click(); renderHub(); return; }
        $('mHub').style.display = 'none';
        if (orig) orig.click();
      };
      grid.appendChild(b);
    });
    box.appendChild(grid);
  });
}

// Dot agregado: avisa si hay ALGO pendiente en cualquier sección
setInterval(() => {
  const d = $('hubDot'); if (!d) return;
  const any = ['dailyDot', 'misDot', 'achDot', 'gearDot', 'weekDot', 'prDot', 'bpDot', 'skillDot'].some(dotOn);
  d.style.display = any ? 'block' : 'none';
}, 2000);
