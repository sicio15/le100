'use strict';
// ===== COLONIAS: handlers socket =====
const { U, C } = require('./storage');
const { powerOf, bossMax } = require('./power');

function registerColonies(s) {
  s.on('colonyInfo', async cb => {
    const me = await U.get(s.user); if (!me) return cb({ in: null, list: [] });
    if (me.save.colony) {
      const c = await C.get(me.save.colony);
      if (c) {
        const members = [];
        for (const mk of (c.members || [])) {
          const mu = await U.get(mk);
          if (mu) members.push({ name: mu.name, best: mu.save.best || 1, pts: mu.save.arenaPts || 0 });
        }
        const d = new Date().toISOString().slice(0, 10);
        if (c.bossDay !== d) await C.update(c._id, { bossDay: d, bossHp: bossMax(c), claimed: [] });
        const c2 = await C.get(me.save.colony);
        return cb({ in: c2, members, me: me.save });
      }
    }
    const list = (await C.all()).map(c => ({ key: c._id, name: c.name, members: (c.members || []).length, level: c.level || 1 })).slice(0, 10);
    cb({ in: null, list });
  });

  s.on('colonyCreate', async (name, cb) => {
    const me = await U.get(s.user); if (!me) return cb({ ok: false, err: '?' });
    const nm = String(name || '').trim();
    if (nm.length < 3 || nm.length > 14) return cb({ ok: false, err: 'Nombre de 3-14 caracteres' });
    const key = nm.toLowerCase();
    if (me.save.colony) return cb({ ok: false, err: 'Ya estás en una colonia' });
    if (await C.get(key)) return cb({ ok: false, err: 'Esa colonia ya existe' });
    if ((me.save.gold || 0) < 10000) return cb({ ok: false, err: 'Necesitás 10.000 🪙' });
    me.save.gold -= 10000; me.save.colony = key; me.save.colonyLevel = 1;
    await U.save(s.user, me.save);
    await C.create(key, { name: nm, leader: s.user, members: [s.user], level: 1, xp: 0, bossDay: '', bossHp: 0, claimed: [] });
    cb({ ok: true });
  });

  s.on('colonyJoin', async (key, cb) => {
    const me = await U.get(s.user); if (!me) return cb({ ok: false });
    if (me.save.colony) return cb({ ok: false });
    const c = await C.get(key); if (!c) return cb({ ok: false });
    c.members = c.members || [];
    if (c.members.length >= 20) return cb({ ok: false });
    c.members.push(s.user);
    me.save.colony = key; me.save.colonyLevel = c.level || 1;
    await U.save(s.user, me.save); await C.update(key, { members: c.members });
    cb({ ok: true });
  });

  s.on('colonyLeave', async cb => {
    const me = await U.get(s.user); if (!me || !me.save.colony) return cb({ ok: false });
    const key = me.save.colony; const c = await C.get(key);
    if (c) {
      c.members = (c.members || []).filter(m => m !== s.user);
      if (!c.members.length) await C.del(key);
      else { await C.update(key, { members: c.members }); if (c.leader === s.user) await C.update(key, { leader: c.members[0] }); }
    }
    me.save.colony = ''; me.save.colonyLevel = 1;
    await U.save(s.user, me.save);
    cb({ ok: true });
  });

  s.on('colonyDonate', async cb => {
    const me = await U.get(s.user); if (!me || !me.save.colony) return cb({ ok: false });
    const c = await C.get(me.save.colony); if (!c) return cb({ ok: false });
    const cost = 1000 * (c.level || 1);
    if ((me.save.gold || 0) < cost) return cb({ ok: false });
    me.save.gold -= cost; c.xp = (c.xp || 0) + 10; c.level = 1 + Math.floor(c.xp / 100);
    await U.save(s.user, me.save); await C.update(c._id, { xp: c.xp, level: c.level });
    for (const mk of (c.members || [])) { const mu = await U.get(mk); if (mu) { mu.save.colonyLevel = c.level; await U.save(mk, mu.save); } }
    cb({ ok: true, level: c.level });
  });

  s.on('colonyBoss', async cb => {
    const me = await U.get(s.user); if (!me || !me.save.colony) return cb({ ok: false });
    const c = await C.get(me.save.colony); if (!c) return cb({ ok: false });
    const d = new Date().toISOString().slice(0, 10);
    if (c.bossDay !== d) await C.update(c._id, { bossDay: d, bossHp: bossMax(c), claimed: [] });
    const c2 = await C.get(me.save.colony);
    if (me.save.bossTicketDate === d) return cb({ ok: false, err: 'Ya luchaste hoy contra el jefe' });
    me.save.bossTicketDate = d;
    const dmg = Math.round(powerOf(me.save).dps * 30);
    c2.bossHp = Math.max(0, (c2.bossHp || bossMax(c2)) - dmg);
    const killed = c2.bossHp <= 0;
    await U.save(s.user, me.save); await C.update(c2._id, { bossHp: c2.bossHp });
    cb({ ok: true, dmg, killed, hp: c2.bossHp, max: bossMax(c2) });
  });

  s.on('colonyClaim', async cb => {
    const me = await U.get(s.user); if (!me || !me.save.colony) return cb({ ok: false });
    const c = await C.get(me.save.colony); if (!c) return cb({ ok: false });
    if ((c.bossHp || 1) > 0 || (c.claimed || []).includes(s.user)) return cb({ ok: false });
    c.claimed = (c.claimed || []).concat([s.user]);
    const g = Math.ceil(3 * Math.pow(1.18, me.save.best || 1)) * 50 * (c.level || 1);
    me.save.gold += g;
    await U.save(s.user, me.save); await C.update(c._id, { claimed: c.claimed });
    cb({ ok: true, g });
  });
}

module.exports = { registerColonies };