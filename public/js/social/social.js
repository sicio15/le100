'use strict';
// ===== ARENA PvP =====
// netEmit = evento CON dato + ack · netCall = evento SIN dato + ack
// LOTE 2A (deuda #4): checkArenaTickets eliminado → store.checkDailyResets().
//
// FIX LOTE 26 — la Arena estaba MUERTA: renderArena() escribía en #arenaMe, #arenaOps
// y #arenaTop, tres ids que no existen en index.html (el modal sólo tiene #arenaBody).
// La primera línea lanzaba TypeError, así que el modal ni siquiera llegaba a abrirse:
// el botón ⚔️ no hacía nada. Ahora todo se construye dentro de #arenaBody.
//
// También se retiró la UI de Colonias (deprecada en L25): el botón #btnColony y el
// modal #mColony ya no existen en el HTML, así que openColony/renderColony eran código
// inalcanzable que apuntaba a un DOM inexistente. El servidor conserva colonies.js y
// los campos colony/colonyLevel para compatibilidad de saves.
const netEmit = (ev, data, cb) => { if (typeof socket !== 'undefined' && socket) socket.emit(ev, data, cb); };
const netCall = (ev, cb) => { if (typeof socket !== 'undefined' && socket) socket.emit(ev, cb); };

wire('btnArena', 'click', openArena);
wire('arenaClose', 'click', () => { $('mArena').style.display = 'none'; });

function openArena() {
  Audio.SFX.click();
  const box = $('arenaBody'); if (!box) return;
  if (!authed) {
    box.innerHTML = '<p style="color:#8fa3c8;font-size:12px">🔒 Entrá con tu cuenta para competir en la Arena.</p>';
    $('mArena').style.display = 'flex';
    return;
  }
  checkDailyResets(); persist();
  box.innerHTML = '<p style="color:#8fa3c8;font-size:12px">⏳ Buscando rivales…</p>';
  $('mArena').style.display = 'flex';
  netCall('arenaInfo', info => renderArena(info || {}));
}

function renderArena(info) {
  const box = $('arenaBody'); if (!box) return;
  box.innerHTML =
    '<div class="mrow" style="border:1px solid #ffd700">' +
      '<span>🏟️ <b style="color:#ffd700">' + S.arenaPts + '</b> pts</span>' +
      '<span>🎟️ <b>' + S.arenaTickets + '</b>/5</span>' +
    '</div>' +
    '<h3 style="color:#ffd700;font-size:11px;margin:12px 0 6px">⚔️ RIVALES</h3><div id="arenaOps"></div>' +
    '<h3 style="color:#ffd700;font-size:11px;margin:12px 0 6px">🏆 TOP 10</h3><div id="arenaTop"></div>';

  const list = $('arenaOps');
  (info.ops || []).forEach(op => {
    const row = document.createElement('div'); row.className = 'mrow';
    row.innerHTML = '<span>🐛 <b>' + op.name + '</b><br><small style="color:#8fa3c8">Etapa ' + op.best + ' · ' + op.pts + ' pts</small></span>';
    const b = document.createElement('button'); b.className = 'claim'; b.textContent = '⚔️ ATACAR';
    b.disabled = S.arenaTickets <= 0;
    b.onclick = () => {
      b.disabled = true;
      netEmit('arenaFight', op.name, res => {
        if (!res) { b.disabled = false; return; }
        toast(res.msg);
        if (res.win) Audio.SFX.levelup(); else Audio.SFX.death();
        // El servidor es la autoridad: usamos SUS números, no los recalculamos.
        if (res.tickets != null) S.arenaTickets = res.tickets;
        if (res.pts != null) S.arenaPts = res.pts;
        if (res.gold) S.gold += res.gold;
        persist();
        openArena();
      });
    };
    row.appendChild(b); list.appendChild(row);
  });
  if (!(info.ops || []).length) list.innerHTML = '<p style="color:#8fa3c8;font-size:12px">Todavía no hay rivales… ¡sé el primero!</p>';

  $('arenaTop').innerHTML = (info.top || []).map((p, i) =>
    '<div class="mrow"><span>' + (i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : (i + 1) + '.') +
    ' <b style="color:' + (p.name === S.name ? '#7CFC7C' : '#fff') + '">' + p.name + '</b></span><span>' + p.pts + ' pts</span></div>').join('') ||
    '<p style="color:#8fa3c8;font-size:12px">Sin luchadores aún</p>';
}
