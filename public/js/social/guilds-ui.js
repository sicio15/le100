'use strict';
// ===== GREMIO UI (LOTE 24+25) =====
// L25: sincroniza S.colonyLevel con el nivel de gremio (bonus pasivo sin tocar fórmulas)
//      y retira la UI de colonias del HUB (quedan deprecadas).
let GUILD = null;
wire('btnGuild', 'click', openGuild);
wire('guildClose', 'click', () => { $('mGuild').style.display = 'none'; });
// Inyectar al HUB + retirar colonias (deprecadas L25)
if (typeof HUB_SECTIONS !== 'undefined') {
  HUB_SECTIONS.forEach(sec => { sec.items = sec.items.filter(i => i.id !== 'btnColony'); });
  const sec = HUB_SECTIONS.find(x => /SISTEMA/.test(x.t)) || HUB_SECTIONS[HUB_SECTIONS.length - 1];
  if (sec && !sec.items.some(i => i.id === 'btnGuild')) sec.items.push({ id: 'btnGuild', ico: '🛡️', n: 'Gremio' });
}
function syncColonyLevel(lvl) {
  const l = Math.max(1, Math.min(50, Math.floor(lvl) || 1));
  if ((S.colonyLevel || 1) < l) { S.colonyLevel = l; persist(); }
}
if (typeof socket !== 'undefined' && socket) {
  socket.on('guildUpdate', g => {
    GUILD = g;
    if (g) { syncColonyLevel(g.level); S.colony = g.name; }
    if ($('mGuild') && $('mGuild').style.display === 'flex') { g ? renderGuild() : renderNoGuild(); }
  });
  socket.on('guildChat', m => appendChat(m));
}
function silentGuildSync() {
  if (!authed || typeof socket === 'undefined' || !socket || !socket.connected || !S.name) return;
  socket.emit('guildInfo', { user: S.name }, res => {
    if (res && res.ok) { GUILD = res.guild; syncColonyLevel(res.guild.level); S.colony = res.guild.name; }
  });
}
function openGuild() {
  Audio.SFX.click();
  $('mGuild').style.display = 'flex';
  if (!authed || typeof socket === 'undefined' || !socket) {
    $('guildBody').innerHTML = '<p style="color:#8fa3c8;font-size:12px">🔒 Necesitás una cuenta conectada para usar gremios.</p>';
    return;
  }
  socket.emit('guildInfo', { user: S.name }, res => {
    if (res && res.ok) { GUILD = res.guild; syncColonyLevel(res.guild.level); S.colony = res.guild.name; renderGuild(); }
    else { GUILD = null; renderNoGuild(); }
  });
}
function renderNoGuild() {
  const box = $('guildBody'); if (!box) return;
  box.innerHTML = '<h3 style="color:#ffd700;font-size:12px">🛡️ FUNDAR GREMIO (100K 🪙)</h3>' +
    '<p style="color:#8fa3c8;font-size:10px">Tu nivel de colonia actual migra como piso del gremio.</p>' +
    '<input class="minput" id="gName" placeholder="Nombre del gremio" maxlength="16">' +
    '<input class="minput" id="gTag" placeholder="TAG (2-4 letras)" maxlength="4">' +
    '<button class="mbtn" id="gCreate">CREAR</button>' +
    '<h3 style="color:#ffd700;font-size:12px;margin-top:14px">🏆 GREMIOS EXISTENTES</h3>' +
    '<div id="gTop"></div>';
  $('gCreate').onclick = () => {
    socket.emit('guildCreate', { user: S.name, name: $('gName').value, tag: $('gTag').value }, res => {
      if (res.ok) {
        S.gold = Math.max(0, S.gold - 100000); persist();
        GUILD = res.guild; syncColonyLevel(res.guild.level); S.colony = res.guild.name;
        Audio.SFX.levelup();
        toast('🛡️ ¡Gremio fundado!' + (res.migrated ? ' (migró tu colonia Nv ' + res.migrated + ')' : ''));
        renderGuild();
      } else toast('❌ ' + (res.err || 'Error'));
    });
  };
  socket.emit('guildTop', {}, res => {
    const t = $('gTop'); if (!t) return;
    t.innerHTML = (res && res.top && res.top.length)
      ? res.top.map(g => '<div class="mrow"><span>[' + g.tag + '] <b>' + g.name + '</b><br><small style="color:#8fa3c8">Nv ' + g.level + ' · ' + g.members + '/30 · +' + (2 * (g.level - 1)) + '% daño</small></span><button class="claim gJoin" data-n="' + g.name + '">UNIRSE</button></div>').join('')
      : '<p style="color:#8fa3c8;font-size:11px">Todavía no hay gremios. ¡Sé el primero!</p>';
    t.querySelectorAll('.gJoin').forEach(b => b.onclick = () => {
      socket.emit('guildJoin', { user: S.name, name: b.dataset.n }, res => {
        if (res.ok) { GUILD = res.guild; syncColonyLevel(res.guild.level); S.colony = res.guild.name; Audio.SFX.levelup(); toast('🛡️ ¡Bienvenido a ' + GUILD.name + '!'); renderGuild(); }
        else toast('❌ ' + (res.err || 'Error'));
      });
    });
  });
}
function renderGuild() {
  const box = $('guildBody'); if (!box || !GUILD) return;
  const g = GUILD;
  const pct = Math.min(100, (g.xp / g.next) * 100);
  let html = '<div style="text-align:left">' +
    '<h3 style="color:#ffd700;font-size:13px">[' + g.tag + '] ' + g.name + ' · Nv ' + g.level + '</h3>' +
    '<small style="color:#7bed9f">🛡️ Bono de gremio: +' + (g.bonusPct != null ? g.bonusPct : 2 * (g.level - 1)) + '% daño</small>' +
    '<div style="background:rgba(0,0,0,.5);border-radius:6px;height:10px;margin:6px 0"><div style="height:100%;width:' + pct + '%;background:linear-gradient(90deg,#7efcff,#4fc3f7);border-radius:6px"></div></div>' +
    '<small style="color:#8fa3c8">XP ' + fmt(g.xp) + '/' + fmt(g.next) + ' · 🏦 Banco: ' + fmt(g.bank) + ' 🪙 · 👥 ' + g.members.length + '/30</small>' +
    '<div style="display:flex;gap:6px;flex-wrap:wrap;margin:10px 0">' +
    (g.chestClaimed ? '<button class="claim" disabled>🎁 Cofre hoy ✔</button>' : '<button class="claim" id="gChest">🎁 COFRE DIARIO</button>') +
    '<button class="claim" id="gD10">🏦 +10K</button><button class="claim" id="gD100">🏦 +100K</button>' +
    '<button class="mbtn gray" id="gLeave" style="margin:0;padding:6px 10px;font-size:8px">SALIR</button></div>' +
    '<h3 style="color:#ff4757;font-size:11px;margin-top:10px">👹 RAID DIARIA</h3>' +
    '<div style="background:rgba(0,0,0,.5);border-radius:6px;height:12px;margin:4px 0"><div style="height:100%;width:' + (g.raid.hp / g.raid.max * 100) + '%;background:linear-gradient(90deg,#ff4757,#ffa502);border-radius:6px"></div></div>' +
    '<small style="color:#8fa3c8">❤️ ' + fmt(g.raid.hp) + '/' + fmt(g.raid.max) + ' · Tu aporte: ' + fmt(g.raid.myContrib) + '</small><br>' +
    '<button class="mbtn" id="gRaid" style="margin-top:6px">⚔️ ATACAR RAID</button>' +
    '<h3 style="color:#7bed9f;font-size:11px;margin-top:12px">👥 MIEMBROS</h3><div id="gMembers"></div>' +
    '<h3 style="color:#7efcff;font-size:11px;margin-top:12px">💬 CHAT</h3><div id="gChat" style="max-height:140px;overflow-y:auto;text-align:left"></div>' +
    '<div style="display:flex;gap:6px;margin-top:6px"><input class="minput" id="gMsg" style="width:100%;margin:0" placeholder="Mensaje..." maxlength="120"><button class="claim" id="gSend">➤</button></div>' +
    '</div>';
  box.innerHTML = html;
  $('gMembers').innerHTML = g.members.map(m =>
    '<div class="mrow" style="padding:4px 8px"><span>' + (m === g.leader ? '👑' : g.officers.includes(m) ? '🛡️' : '•') + ' ' + m + (m === S.name ? ' (vos)' : '') + '</span>' +
    (g.role >= 2 && m !== g.leader && m !== S.name ? '<button class="claim gKick" data-u="' + m + '" style="background:linear-gradient(45deg,#ff4757,#ff6b81)">✖</button>' : '') + '</div>').join('');
  box.querySelectorAll('.gKick').forEach(b => b.onclick = () => socket.emit('guildKick', { user: S.name, target: b.dataset.u }, () => {}));
  const ch = $('gChest');
  if (ch) ch.onclick = () => socket.emit('guildChest', { user: S.name }, res => {
    if (res.ok) { S.gold += res.gold; S.adn += res.adn || 0; persist(); Audio.SFX.coin(); toast('🎁 +' + fmt(res.gold) + ' 🪙' + (res.adn ? ' +' + res.adn + ' 🧬' : '')); openGuild(); }
    else toast('❌ ' + (res.err || 'Error'));
  });
  const donate = n => socket.emit('guildDonate', { user: S.name, amount: n }, res => {
    if (res.ok) { S.gold = Math.max(0, S.gold - res.donated); persist(); Audio.SFX.coin(); toast('🏦 Donaste ' + fmt(res.donated) + ' 🪙'); GUILD = res.guild; syncColonyLevel(res.guild.level); renderGuild(); }
    else toast('❌ ' + (res.err || 'Error'));
  });
  $('gD10').onclick = () => donate(10000);
  $('gD100').onclick = () => donate(100000);
  $('gRaid').onclick = () => socket.emit('guildRaidHit', { user: S.name }, res => {
    if (res.ok) {
      Audio.SFX.crit();
      toast('⚔️ −' + fmt(res.dmg) + ' al jefe' + (res.reward ? ' · 🎉 +' + fmt(res.reward.gold) + '🪙 +' + res.reward.adn + '🧬' : ''));
      if (res.reward) { S.gold += res.reward.gold; S.adn += res.reward.adn; persist(); }
      GUILD = res.guild; syncColonyLevel(res.guild.level); renderGuild();
    } else toast('⏳ ' + (res.err || ''));
  });
  $('gLeave').onclick = () => { if (confirm('¿Salir del gremio? (conservás el bonus actual)')) socket.emit('guildLeave', { user: S.name }, () => { GUILD = null; renderNoGuild(); }); };
  const send = () => { const v = $('gMsg').value.trim(); if (v) { socket.emit('guildChat', { user: S.name, msg: v }); $('gMsg').value = ''; } };
  $('gSend').onclick = send;
  $('gMsg').onkeydown = e => { if (e.key === 'Enter') send(); };
  const c = $('gChat');
  c.innerHTML = g.chat.map(m => '<div style="font-size:10px;margin:2px 0"><b style="color:#7efcff">' + m.u + ':</b> ' + m.m + '</div>').join('');
  c.scrollTop = c.scrollHeight;
}
function appendChat(m) {
  const c = $('gChat'); if (!c) return;
  const d = document.createElement('div');
  d.style.cssText = 'font-size:10px;margin:2px 0;';
  d.innerHTML = '<b style="color:#7efcff">' + m.u + ':</b> ' + m.m;
  c.appendChild(d);
  c.scrollTop = c.scrollHeight;
}
// Sync silencioso + dot de cofre (cada 30s)
setInterval(() => {
  const dot = $('guildDot');
  if (!authed || typeof socket === 'undefined' || !socket || !socket.connected || !S.name) { if (dot) dot.style.display = 'none'; return; }
  socket.emit('guildInfo', { user: S.name }, res => {
    if (res && res.ok) {
      GUILD = res.guild;
      syncColonyLevel(res.guild.level);
      S.colony = res.guild.name;
      if (dot) dot.style.display = res.guild.chestClaimed ? 'none' : 'block';
    } else if (dot) dot.style.display = 'none';
  });
}, 30000);