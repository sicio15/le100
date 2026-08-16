'use strict';
// ===== Arena PvP + Colonias =====
// netEmit = evento CON dato + ack · netCall = evento SIN dato + ack
// LOTE 2A (deuda #4): checkArenaTickets eliminado → store.checkDailyResets().
const netEmit = (ev, data, cb) => { if (typeof socket !== 'undefined' && socket) socket.emit(ev, data, cb); };
const netCall = (ev, cb) => { if (typeof socket !== 'undefined' && socket) socket.emit(ev, cb); };
// ================= ARENA =================
wire('btnArena', 'click', openArena);
wire('arenaClose', 'click', () => { $('mArena').style.display = 'none'; });
function openArena() {
  Audio.SFX.click();
  if (!authed) { toast('🔒 Entrá con tu cuenta para usar la Arena'); return; }
  checkDailyResets(); persist();
  netCall('arenaInfo', info => { renderArena(info || {}); $('mArena').style.display = 'flex'; });
}
function renderArena(info) {
  $('arenaMe').innerHTML = '🏟️ <b>' + S.arenaPts + '</b> pts · 🎟️ ' + S.arenaTickets + '/5';
  const list = $('arenaOps'); list.innerHTML = '';
  (info.ops || []).forEach(op => {
    const row = document.createElement('div'); row.className = 'mrow';
    row.innerHTML = '<span>🐛 <b>' + op.name + '</b><br><small>Etapa ' + op.best + ' · ' + op.pts + ' pts</small></span>';
    const b = document.createElement('button'); b.className = 'claim'; b.textContent = '⚔️ ATACAR';
    b.disabled = S.arenaTickets <= 0;
    b.onclick = () => {
      netEmit('arenaFight', op.name, res => {
        if (!res) return;
        toast(res.msg);
        if (res.win) Audio.SFX.levelup(); else Audio.SFX.death();
        persist(); openArena();
      });
    };
    row.appendChild(b); list.appendChild(row);
  });
  if (!(info.ops || []).length) list.innerHTML = '<p style="color:#8fa3c8">Todavía no hay rivales… ¡sé el primero!</p>';
  $('arenaTop').innerHTML = (info.top || []).map((p, i) =>
    '<div class="mrow"><span>' + (i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : (i + 1) + '.') +
    ' <b style="color:' + (p.name === S.name ? '#7CFC7C' : '#fff') + '">' + p.name + '</b></span><span>' + p.pts + ' pts</span></div>').join('') ||
    '<p style="color:#8fa3c8">Sin luchadores aún</p>';
}
// ================= COLONIAS =================
wire('btnColony', 'click', openColony);
wire('colonyClose', 'click', () => { $('mColony').style.display = 'none'; });
function openColony() {
  Audio.SFX.click();
  if (!authed) { toast('🔒 Entrá con tu cuenta para usar Colonias'); return; }
  netCall('colonyInfo', info => { renderColony(info || {}); $('mColony').style.display = 'flex'; });
}
const bossMaxClient = c => Math.round(1e6 * (c.level || 1) * Math.max(1, (c.members || []).length));
function renderColony(info) {
  const box = $('colonyBody'); if (!box) return;
  box.innerHTML = '';
  if (!info.in) {
    box.innerHTML = '<h3 style="color:#ffd700">CREAR COLONIA (10.000 🪙)</h3>' +
      '<input id="colName" class="minput" placeholder="Nombre" maxlength="14">' +
      '<button class="mbtn" id="colCreate">🐜 CREAR</button>' +
      '<h3 style="color:#ffd700;margin-top:16px">UNIRSE A UNA COLONIA</h3>';
    wire('colCreate', 'click', () => {
      netEmit('colonyCreate', $('colName').value, res => {
        if (res && res.ok) { toast('🐜 ¡Colonia fundada!'); Audio.SFX.levelup(); persist(); openColony(); }
        else toast('❌ ' + ((res && res.err) || 'Error'));
      });
    });
    (info.list || []).forEach(c => {
      const row = document.createElement('div'); row.className = 'mrow';
      row.innerHTML = '<span>🐜 <b>' + c.name + '</b> · Nv ' + c.level + '<br><small>' + c.members + '/20 miembros</small></span>';
      const b = document.createElement('button'); b.className = 'claim'; b.textContent = 'UNIRSE';
      b.onclick = () => netEmit('colonyJoin', c.key, res => {
        if (res && res.ok) { toast('🐜 ¡Bienvenido a ' + c.name + '!'); Audio.SFX.buy(); persist(); openColony(); }
        else toast('❌ No se pudo unir');
      });
      row.appendChild(b); box.appendChild(row);
    });
    if (!(info.list || []).length) {
      const p = document.createElement('p');
      p.style.color = '#8fa3c8';
      p.textContent = 'No hay colonias aún. ¡Fundá la primera!';
      box.appendChild(p);
    }
    return;
  }
  const c = info.in;
  box.innerHTML = '<h3 style="color:#ffd700">🐜 ' + c.name + ' · Nv ' + (c.level || 1) + '</h3>' +
    '<small style="color:#8fa3c8">Buff: +' + (2 * ((c.level || 1) - 1)) + '% daño · ' + (c.members || []).length + '/20 miembros</small>' +
    '<h3 style="color:#ff5252;margin-top:14px">🐲 JEFE DE COLONIA</h3>' +
    '<div class="sqHp" style="width:100%;height:12px;margin:8px 0"><i style="width:' + Math.max(0, 100 - (c.bossHp || 0) / bossMaxClient(c) * 100) + '%;background:linear-gradient(90deg,#ff5252,#ff9800)"></i></div>' +
    '<small style="color:#8fa3c8">' + fmt(c.bossHp || 0) + ' / ' + fmt(bossMaxClient(c)) + ' HP · 1 intento/día por miembro</small>' +
    '<div style="margin-top:10px"><button class="mbtn" id="colBoss">⚔️ LUCHAR</button>' +
    '<button class="mbtn" id="colClaim">🎁 RECLAMAR</button>' +
    '<button class="mbtn" id="colDonate">💰 DONAR</button>' +
    '<button class="mbtn gray" id="colLeave">🚪 SALIR</button></div>' +
    '<h3 style="color:#ffd700;margin-top:14px">MIEMBROS</h3><div id="colMembers"></div>';
  wire('colBoss', 'click', () => {
    netCall('colonyBoss', res => {
      if (!res || !res.ok) { toast('❌ ' + ((res && res.err) || 'Sin intento hoy')); return; }
      toast('💥 ' + fmt(res.dmg) + ' de daño' + (res.killed ? ' · ¡🐲 JEFE DERROTADO!' : ''));
      if (res.killed) Audio.SFX.levelup(); else Audio.SFX.hit();
      openColony();
    });
  });
  wire('colClaim', 'click', () => {
    netCall('colonyClaim', res => {
      if (res && res.ok) { toast('🎁 +' + fmt(res.g) + ' 🪙'); Audio.SFX.coin(); persist(); openColony(); }
      else toast('❌ Nada para reclamar');
    });
  });
  wire('colDonate', 'click', () => {
    netCall('colonyDonate', res => {
      if (res && res.ok) { toast('💰 Colonia Nv ' + res.level); S.colonyLevel = res.level; persist(); Audio.SFX.buy(); openColony(); }
      else toast('❌ Oro insuficiente');
    });
  });
  wire('colLeave', 'click', () => {
    if (!confirm('¿Salir de la colonia?')) return;
    netCall('colonyLeave', res => { if (res && res.ok) { toast('🚪 Saliste de la colonia'); persist(); openColony(); } });
  });
  const mw = $('colMembers');
  if (mw) (info.members || []).forEach(m => {
    const row = document.createElement('div'); row.className = 'mrow';
    row.innerHTML = '<span>🐛 <b style="color:' + (m.name === S.name ? '#7CFC7C' : '#fff') + '">' + m.name + '</b></span><span>Etapa ' + m.best + '</span>';
    mw.appendChild(row);
  });
}