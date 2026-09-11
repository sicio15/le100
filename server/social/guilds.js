'use strict';
// ===== GREMIOS (LOTE 24+25): clanes grandes — server-authoritative =====
// L25: migración colonia→gremio (el colonyLevel del fundador es el piso del gremio)
//      y bonusPct expuesto para el cliente (sincroniza colonyLevel sin tocar fórmulas).
const MAX_MEMBERS = 30;
const MAX_LEVEL = 50;
const CHAT_CAP = 50;
const RAID_CD = 20000;
const guilds = new Map();
const keyOf = n => String(n || '').trim().toLowerCase();
const xpNeed = l => 500 * l * l;
const raidMax = g => Math.floor(100000 * g.level * (1 + g.members.length * 0.05));
function getGuild(name) { return guilds.get(keyOf(name)) || null; }
function guildOfUser(user) {
  for (const g of guilds.values()) if (g.leader === user || g.members.includes(user)) return g;
  return null;
}
function ensureRaid(g) {
  const d = new Date().toISOString().slice(0, 10);
  if (!g.raid || g.raid.day !== d) g.raid = { day: d, hp: raidMax(g), max: raidMax(g), contrib: {}, last: {} };
}
function ensureChest(g) {
  const d = new Date().toISOString().slice(0, 10);
  if (!g.chest || g.chest.day !== d) g.chest = { day: d, claimed: {} };
}
const role = (g, u) => g.leader === u ? 3 : (g.officers.includes(u) ? 2 : 1);
function addXp(g, n) { g.xp += n; while (g.level < MAX_LEVEL && g.xp >= xpNeed(g.level)) g.level++; }
function info(g, user) {
  ensureRaid(g); ensureChest(g);
  return {
    name: g.name, tag: g.tag, level: g.level, xp: g.xp, next: xpNeed(g.level),
    bonusPct: 2 * (g.level - 1), // L25: bonus pasivo de daño del gremio
    bank: g.bank, leader: g.leader, officers: g.officers.slice(), members: g.members.slice(),
    raid: { hp: g.raid.hp, max: g.raid.max, myContrib: g.raid.contrib[user] || 0 },
    chestClaimed: !!g.chest.claimed[user],
    chat: g.chat.slice(-30), role: role(g, user)
  };
}
function broadcast(io, g, type, payload) { io.to('guild:' + keyOf(g.name)).emit(type, payload); }

function registerGuilds(s, U, io) {
  s.on('guildInfo', (d, cb) => {
    const user = String((d && d.user) || '');
    const g = guildOfUser(user);
    cb(g ? { ok: true, guild: info(g, user) } : { ok: false });
  });

  s.on('guildTop', (d, cb) => {
    const top = [...guilds.values()].sort((a, b) => b.xp - a.xp).slice(0, 20)
      .map(g => ({ name: g.name, tag: g.tag, level: g.level, members: g.members.length, xp: g.xp }));
    cb({ ok: true, top });
  });

  s.on('guildCreate', async (d, cb) => {
    const user = String((d && d.user) || '').trim();
    const name = String((d && d.name) || '').trim();
    const tag = String((d && d.tag) || '').trim().toUpperCase().slice(0, 4);
    if (!user || !s.user) return cb({ ok: false, err: 'Necesitás cuenta' });
    if (name.length < 3 || name.length > 16) return cb({ ok: false, err: 'Nombre de 3-16 caracteres' });
    if (tag.length < 2) return cb({ ok: false, err: 'Tag de 2-4 caracteres' });
    if (guildOfUser(user)) return cb({ ok: false, err: 'Ya estás en un gremio' });
    if (getGuild(name)) return cb({ ok: false, err: 'Ese gremio ya existe' });
    const me = await U.get(s.user); if (!me || !me.save) return cb({ ok: false, err: 'Sin cuenta' });
    if ((me.save.gold || 0) < 100000) return cb({ ok: false, err: 'Fundar cuesta 100K 🪙' });
    me.save.gold -= 100000; await U.save(s.user, me.save);
    // L25 MIGRACIÓN: el nivel de colonia del fundador es el piso del gremio
    const startLvl = Math.max(1, Math.min(MAX_LEVEL, Math.floor(+me.save.colonyLevel || 1)));
    const g = { name, tag, leader: user, officers: [], members: [user], level: startLvl, xp: 0, bank: 0, raid: null, chest: null, chat: [], created: Date.now() };
    guilds.set(keyOf(name), g);
    s.join('guild:' + keyOf(name));
    cb({ ok: true, guild: info(g, user), migrated: startLvl > 1 ? startLvl : 0 });
  });

  s.on('guildJoin', (d, cb) => {
    const user = String((d && d.user) || '').trim();
    const g = getGuild(d && d.name);
    if (!user) return cb({ ok: false });
    if (!g) return cb({ ok: false, err: 'Gremio no existe' });
    if (guildOfUser(user)) return cb({ ok: false, err: 'Ya estás en un gremio' });
    if (g.members.length >= MAX_MEMBERS) return cb({ ok: false, err: 'Gremio lleno (30)' });
    g.members.push(user);
    s.join('guild:' + keyOf(g.name));
    g.chat.push({ u: '📢', m: user + ' se unió al gremio', t: Date.now() });
    broadcast(io, g, 'guildUpdate', info(g, user));
    cb({ ok: true, guild: info(g, user) });
  });

  s.on('guildLeave', (d, cb) => {
    const user = String((d && d.user) || '').trim();
    const g = guildOfUser(user);
    if (!g) return cb({ ok: false });
    if (g.leader === user && g.members.length > 1) return cb({ ok: false, err: 'El líder debe expulsar a todos antes de irse' });
    const k = keyOf(g.name);
    g.members = g.members.filter(m => m !== user);
    g.officers = g.officers.filter(m => m !== user);
    s.leave('guild:' + k);
    if (g.leader === user) guilds.delete(k);
    else { g.chat.push({ u: '📢', m: user + ' dejó el gremio', t: Date.now() }); broadcast(io, g, 'guildUpdate', info(g, user)); }
    cb({ ok: true });
  });

  s.on('guildKick', (d, cb) => {
    const user = String((d && d.user) || '').trim();
    const target = String((d && d.target) || '').trim();
    const g = guildOfUser(user);
    if (!g || role(g, user) < 2) return cb({ ok: false, err: 'Sin permiso' });
    if (target === g.leader || role(g, target) >= role(g, user)) return cb({ ok: false, err: 'Sin permiso' });
    g.members = g.members.filter(m => m !== target);
    g.officers = g.officers.filter(m => m !== target);
    g.chat.push({ u: '📢', m: target + ' fue expulsado', t: Date.now() });
    broadcast(io, g, 'guildUpdate', info(g, user));
    cb({ ok: true });
  });

  s.on('guildDonate', async (d, cb) => {
    const user = String((d && d.user) || '').trim();
    const amt = Math.max(0, Math.floor(+((d && d.amount) || 0)));
    const g = guildOfUser(user);
    if (!g || amt <= 0 || !s.user) return cb({ ok: false });
    const me = await U.get(s.user); if (!me || !me.save) return cb({ ok: false });
    const real = Math.min(amt, me.save.gold || 0);
    if (real <= 0) return cb({ ok: false, err: 'Sin oro suficiente' });
    me.save.gold -= real; await U.save(s.user, me.save);
    g.bank += real;
    addXp(g, Math.floor(real / 100));
    broadcast(io, g, 'guildUpdate', info(g, user));
    cb({ ok: true, donated: real, guild: info(g, user) });
  });

  s.on('guildRaidHit', async (d, cb) => {
    const user = String((d && d.user) || '').trim();
    const g = guildOfUser(user);
    if (!g) return cb({ ok: false });
    ensureRaid(g);
    if (g.raid.hp <= 0) return cb({ ok: false, err: '¡Raid completada! Volvé mañana' });
    const now = Date.now();
    const left = (g.raid.last[user] || 0) + RAID_CD - now;
    if (left > 0) return cb({ ok: false, err: 'Cooldown ' + Math.ceil(left / 1000) + 's' });
    g.raid.last[user] = now;
    const me = await U.get(s.user);
    const best = (me && me.save && me.save.best) || 1;
    const dmg = Math.floor(100 * Math.pow(1.15, best / 5));
    g.raid.hp = Math.max(0, g.raid.hp - dmg);
    g.raid.contrib[user] = (g.raid.contrib[user] || 0) + dmg;
    addXp(g, Math.floor(dmg / 50));
    let reward = null;
    if (g.raid.hp <= 0 && me && me.save) {
      reward = { gold: 5000 * g.level + g.raid.contrib[user], adn: Math.max(1, Math.floor(g.level / 5)) };
      me.save.gold = (me.save.gold || 0) + reward.gold;
      me.save.adn = Math.min(5000, (me.save.adn || 0) + reward.adn);
      await U.save(s.user, me.save);
      g.chat.push({ u: '📢', m: '¡RAID COMPLETADA! Recompensas enviadas 🎉', t: now });
    }
    broadcast(io, g, 'guildUpdate', info(g, user));
    cb({ ok: true, dmg, reward, guild: info(g, user) });
  });

  s.on('guildChest', async (d, cb) => {
    const user = String((d && d.user) || '').trim();
    const g = guildOfUser(user);
    if (!g || !s.user) return cb({ ok: false });
    ensureChest(g);
    if (g.chest.claimed[user]) return cb({ ok: false, err: 'Ya reclamaste hoy' });
    g.chest.claimed[user] = 1;
    const gold = 2000 * g.level;
    const adn = g.level >= 10 ? 1 : 0;
    const me = await U.get(s.user);
    if (me && me.save) {
      me.save.gold = (me.save.gold || 0) + gold;
      if (adn) me.save.adn = Math.min(5000, (me.save.adn || 0) + adn);
      await U.save(s.user, me.save);
    }
    cb({ ok: true, gold, adn });
  });

  s.on('guildChat', (d, cb) => {
    const user = String((d && d.user) || '').trim();
    const msg = String((d && d.msg) || '').slice(0, 120);
    const g = guildOfUser(user);
    if (!g || !msg) return cb && cb({ ok: false });
    g.chat.push({ u: user, m: msg, t: Date.now() });
    if (g.chat.length > CHAT_CAP) g.chat = g.chat.slice(-CHAT_CAP);
    broadcast(io, g, 'guildChat', { u: user, m: msg, t: Date.now() });
    if (cb) cb({ ok: true });
  });
}
module.exports = { registerGuilds };