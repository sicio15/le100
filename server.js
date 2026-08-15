const express = require('express');
const http = require('http');
const crypto = require('crypto');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
app.use(express.static(path.join(__dirname, 'public')));

/* ========== STORAGE (Mongo + fallback memoria) ========== */
let col = null, colonies = null;
const memUsers = new Map(), memColonies = new Map();
(async () => {
    const uri = process.env.MONGO_URI;
    if (!uri) { console.warn('⚠️ Sin MONGO_URI: modo memoria'); return; }
    try {
        const { MongoClient } = require('mongodb');
        const client = new MongoClient(uri);
        await client.connect();
        const db = client.db('le100');
        col = db.collection('users'); colonies = db.collection('colonies');
        console.log('🗄️ MongoDB conectado');
    } catch (e) { console.error('❌ Mongo:', e.message); }
})();
const U = {
    get: async k => col ? await col.findOne({ _id: k }) : memUsers.get(k) || null,
    create: async (k, d) => col ? await col.insertOne(Object.assign({ _id: k }, d)) : memUsers.set(k, Object.assign({ _id: k }, d)),
    save: async (k, s) => col ? await col.updateOne({ _id: k }, { $set: { save: s } }) : (u => { if (u) u.save = s; })(memUsers.get(k)),
    all: async () => col ? await col.find({}).toArray() : [...memUsers.values()]
};
const C = {
    get: async k => colonies ? await colonies.findOne({ _id: k }) : memColonies.get(k) || null,
    create: async (k, d) => colonies ? await colonies.insertOne(Object.assign({ _id: k }, d)) : memColonies.set(k, Object.assign({ _id: k }, d)),
    update: async (k, o) => colonies ? await colonies.updateOne({ _id: k }, { $set: o }) : (c => { if (c) Object.assign(c, o); })(memColonies.get(k)),
    del: async k => colonies ? await colonies.deleteOne({ _id: k }) : memColonies.delete(k),
    all: async () => colonies ? await colonies.find({}).toArray() : [...memColonies.values()]
};

/* ========== SAVE SANITIZER ========== */
const DEF_SAVE = { gold:0, adn:0, stage:1, best:1, kills:0, prestiges:0, prBase:1,
    ups:{ dmg:0, vit:0, regen:0, venom:0, fortune:0 }, ach:{}, last:Date.now(),
    gear:{ equipped:{ fang:null, shell:null, antenna:null, charm:null }, inv:[] },
    tickets:3, ticketDate:'', tower:1, towerBest:1, rlTickets:2, rlDate:'',
    arenaPts:0, arenaTickets:5, arenaDate:'', colony:'', colonyLevel:1, bossTicketDate:'' };
function sanitizeSave(s) {
    const o = JSON.parse(JSON.stringify(DEF_SAVE));
    if (!s || typeof s !== 'object') return o;
    const num = (v, max) => Math.max(0, Math.min(max, Number(v) || 0));
    o.gold = num(s.gold, 1e12); o.adn = num(s.adn, 5000);
    o.stage = Math.max(1, num(s.stage, 9999)); o.best = Math.max(1, num(s.best, 9999));
    o.prBase = Math.max(1, num(s.prBase, 9999));
    o.kills = num(s.kills, 1e9); o.prestiges = num(s.prestiges, 1e6);
    if (s.ups) Object.keys(o.ups).forEach(k => o.ups[k] = num(s.ups[k], 999));
    if (s.ach) o.ach = Object.fromEntries(Object.entries(s.ach).filter(([, v]) => v).map(([k]) => [k, 1]));
    if (s.gear && typeof s.gear === 'object') {
        const cleanItem = it => {
            if (!it || typeof it !== 'object') return null;
            return { id: String(it.id || '').slice(0, 24),
                slot: ['fang','shell','antenna','charm'].includes(it.slot) ? it.slot : 'fang',
                rarity: Math.max(0, Math.min(4, +it.rarity || 0)), lvl: Math.max(0, Math.min(99, +it.lvl || 0)),
                stat: String(it.stat || 'atk').slice(0, 8), val: Math.max(0, Math.min(999, +it.val || 0)),
                subs: Array.isArray(it.subs) ? it.subs.slice(0, 2).map(x => ({ stat: String(x.stat || 'atk').slice(0, 8), val: Math.max(0, Math.min(999, +x.val || 0)) })) : [] };
        };
        const g = { equipped: { fang:null, shell:null, antenna:null, charm:null }, inv: [] };
        Object.keys(g.equipped).forEach(k => { g.equipped[k] = cleanItem((s.gear.equipped || {})[k]); });
        g.inv = Array.isArray(s.gear.inv) ? s.gear.inv.slice(0, 30).map(cleanItem).filter(Boolean) : [];
        o.gear = g;
    }
    o.tickets = Number.isFinite(+s.tickets) ? Math.max(0, Math.min(3, +s.tickets)) : 3;
    o.ticketDate = String(s.ticketDate || '').slice(0, 10);
    o.tower = Math.max(1, num(s.tower, 9999)); o.towerBest = Math.max(1, num(s.towerBest, 9999));
    o.rlTickets = Number.isFinite(+s.rlTickets) ? Math.max(0, Math.min(2, +s.rlTickets)) : 2;
    o.rlDate = String(s.rlDate || '').slice(0, 10);
    o.arenaPts = num(s.arenaPts, 1e9);
    o.arenaTickets = Number.isFinite(+s.arenaTickets) ? Math.max(0, Math.min(5, +s.arenaTickets)) : 5;
    o.arenaDate = String(s.arenaDate || '').slice(0, 10);
    o.colony = String(s.colony || '').slice(0, 20);
    o.colonyLevel = Math.max(1, num(s.colonyLevel, 999));
    o.bossTicketDate = String(s.bossTicketDate || '').slice(0, 10);
    o.last = Number(s.last) || Date.now();
    return o;
}

/* ========== POWER (simulaciones server-side) ========== */
function gearB(gear) {
    const b = { atk:0, hp:0, crit:0, critd:0, regen:0 };
    if (!gear || !gear.equipped) return b;
    Object.values(gear.equipped).forEach(it => {
        if (!it) return;
        const m = 1 + 0.1 * (it.lvl || 0);
        b[it.stat] = (b[it.stat] || 0) + it.val * m;
        (it.subs || []).forEach(s => { b[s.stat] = (b[s.stat] || 0) + s.val; });
    });
    return b;
}
function powerOf(s) {
    const ups = s.ups || {}, b = gearB(s.gear);
    const adn = 1 + 0.1 * (s.adn || 0);
    const colB = 1 + 0.02 * ((s.colonyLevel || 1) - 1);
    return {
        dps: 5 * Math.pow(1.3, ups.dmg || 0) * adn * (1 + b.atk / 100) * colB,
        hp: 100 * Math.pow(1.22, ups.vit || 0) * (1 + b.hp / 100)
    };
}
const bossMax = c => Math.round(1e6 * (c.level || 1) * Math.max(1, (c.members || []).length));

/* ========== RANKING DE ETAPAS ========== */
const scores = new Map();
const top = () => [...scores.entries()].map(([name, stage]) => ({ name, stage }))
    .sort((a, b) => b.stage - a.stage).slice(0, 10);
const pushScore = (name, stage) => { scores.set(name, Math.max(stage, scores.get(name) || 0)); io.emit('top', top()); };

/* ========== SOCKET ========== */
io.on('connection', (s) => {
    s.user = null;

    s.on('register', async (d, cb) => {
        try {
            const name = String(d.name || '').trim();
            const pass = String(d.pass || '');
            if (name.length < 3 || name.length > 14) return cb({ ok:false, err:'Nombre de 3 a 14 caracteres' });
            if (pass.length < 4) return cb({ ok:false, err:'Contraseña de 4+ caracteres' });
            const key = name.toLowerCase();
            if (await U.get(key)) return cb({ ok:false, err:'Ese nombre ya existe' });
            const salt = crypto.randomBytes(8).toString('hex');
            const save = sanitizeSave(null); save.last = Date.now();
            await U.create(key, { name, salt, hash: crypto.scryptSync(pass, salt, 32).toString('hex'), save });
            s.user = key; pushScore(name, save.best);
            cb({ ok:true, name, save });
        } catch (e) { cb({ ok:false, err:'Error del servidor' }); }
    });

    s.on('login', async (d, cb) => {
        try {
            const key = String(d.name || '').trim().toLowerCase();
            const doc = await U.get(key);
            if (!doc) return cb({ ok:false, err:'La cuenta no existe' });
            if (crypto.scryptSync(String(d.pass || ''), doc.salt, 32).toString('hex') !== doc.hash) return cb({ ok:false, err:'Contraseña incorrecta' });
            s.user = key; pushScore(doc.name, doc.save.best);
            cb({ ok:true, name: doc.name, save: doc.save });
        } catch (e) { cb({ ok:false, err:'Error del servidor' }); }
    });

    s.on('saveGame', (d) => {
        if (!s.user) return;
        const now = Date.now();
        if (now - (s.lastSaveAt || 0) < 2000) return;
        s.lastSaveAt = now;
        U.save(s.user, sanitizeSave(d));
    });

    s.on('score', (d) => { if (d && d.name) pushScore(String(d.name).slice(0, 14), Math.min(9999, +d.stage || 1)); });

    /* ===== ARENA PvP ===== */
    s.on('arenaInfo', async (cb) => {
        const me = await U.get(s.user); if (!me) return cb({ ops: [], top: [] });
        const all = (await U.all()).filter(u => u._id !== s.user && u.save);
        const myPts = me.save.arenaPts || 0;
        all.sort((a, b) => Math.abs((a.save.arenaPts || 0) - myPts) - Math.abs((b.save.arenaPts || 0) - myPts));
        const ops = all.slice(0, 3).map(u => ({ name: u.name, best: u.save.best || 1, pts: u.save.arenaPts || 0 }));
        const topA = (await U.all()).filter(u => u.save).map(u => ({ name: u.name, pts: u.save.arenaPts || 0 }))
            .sort((a, b) => b.pts - a.pts).slice(0, 10);
        cb({ ops, top: topA });
    });

    s.on('arenaFight', async (opName, cb) => {
        const me = await U.get(s.user); if (!me) return cb({ win:false, msg:'?' });
        const d = new Date().toISOString().slice(0, 10);
        if (me.save.arenaDate !== d) { me.save.arenaDate = d; me.save.arenaTickets = 5; }
        if ((me.save.arenaTickets || 0) <= 0) return cb({ win:false, msg:'🎟️ Sin tickets hoy' });
        const op = (await U.all()).find(u => u.name === opName && u.save);
        if (!op) return cb({ win:false, msg:'Rival no encontrado' });
        me.save.arenaTickets--;
        const pa = powerOf(me.save), pb = powerOf(op.save);
        const tA = pa.hp / (pb.dps * 0.6), tB = pb.hp / (pa.dps * 0.6);
        const win = (tB * (0.9 + Math.random() * 0.2)) < (tA * (0.9 + Math.random() * 0.2));
        me.save.arenaPts = Math.max(0, (me.save.arenaPts || 0) + (win ? 30 : -10));
        op.save.arenaPts = Math.max(0, (op.save.arenaPts || 0) + (win ? -10 : 15));
        const g = Math.ceil(3 * Math.pow(1.18, me.save.best || 1)) * (win ? 15 : 4);
        me.save.gold += g;
        await U.save(s.user, me.save); await U.save(op._id, op.save);
        cb({ win, msg: (win ? '🏆 ¡Victoria! +' : '💀 Derrota... +') + g + ' 🪙 · ' + (win ? '+30' : '-10') + ' pts' });
    });

    /* ===== COLONIAS ===== */
    s.on('colonyInfo', async (cb) => {
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
        const me = await U.get(s.user); if (!me) return cb({ ok:false, err:'?' });
        const nm = String(name || '').trim();
        if (nm.length < 3 || nm.length > 14) return cb({ ok:false, err:'Nombre de 3-14 caracteres' });
        const key = nm.toLowerCase();
        if (me.save.colony) return cb({ ok:false, err:'Ya estás en una colonia' });
        if (await C.get(key)) return cb({ ok:false, err:'Esa colonia ya existe' });
        if ((me.save.gold || 0) < 10000) return cb({ ok:false, err:'Necesitás 10.000 🪙' });
        me.save.gold -= 10000; me.save.colony = key; me.save.colonyLevel = 1;
        await U.save(s.user, me.save);
        await C.create(key, { name: nm, leader: s.user, members: [s.user], level: 1, xp: 0, bossDay: '', bossHp: 0, claimed: [] });
        cb({ ok:true });
    });

    s.on('colonyJoin', async (key, cb) => {
        const me = await U.get(s.user); if (!me) return cb({ ok:false });
        if (me.save.colony) return cb({ ok:false });
        const c = await C.get(key); if (!c) return cb({ ok:false });
        c.members = c.members || [];
        if (c.members.length >= 20) return cb({ ok:false });
        c.members.push(s.user);
        me.save.colony = key; me.save.colonyLevel = c.level || 1;
        await U.save(s.user, me.save); await C.update(key, { members: c.members });
        cb({ ok:true });
    });

    s.on('colonyLeave', async (cb) => {
        const me = await U.get(s.user); if (!me || !me.save.colony) return cb({ ok:false });
        const key = me.save.colony; const c = await C.get(key);
        if (c) {
            c.members = (c.members || []).filter(m => m !== s.user);
            if (!c.members.length) await C.del(key);
            else { await C.update(key, { members: c.members }); if (c.leader === s.user) await C.update(key, { leader: c.members[0] }); }
        }
        me.save.colony = ''; me.save.colonyLevel = 1;
        await U.save(s.user, me.save);
        cb({ ok:true });
    });

    s.on('colonyDonate', async (cb) => {
        const me = await U.get(s.user); if (!me || !me.save.colony) return cb({ ok:false });
        const c = await C.get(me.save.colony); if (!c) return cb({ ok:false });
        const cost = 1000 * (c.level || 1);
        if ((me.save.gold || 0) < cost) return cb({ ok:false });
        me.save.gold -= cost; c.xp = (c.xp || 0) + 10; c.level = 1 + Math.floor(c.xp / 100);
        await U.save(s.user, me.save); await C.update(c._id, { xp: c.xp, level: c.level });
        for (const mk of (c.members || [])) { const mu = await U.get(mk); if (mu) { mu.save.colonyLevel = c.level; await U.save(mk, mu.save); } }
        cb({ ok:true, level: c.level });
    });

    s.on('colonyBoss', async (cb) => {
        const me = await U.get(s.user); if (!me || !me.save.colony) return cb({ ok:false });
        const c = await C.get(me.save.colony); if (!c) return cb({ ok:false });
        const d = new Date().toISOString().slice(0, 10);
        if (c.bossDay !== d) await C.update(c._id, { bossDay: d, bossHp: bossMax(c), claimed: [] });
        const c2 = await C.get(me.save.colony);
        if (me.save.bossTicketDate === d) return cb({ ok:false, err:'Ya luchaste hoy contra el jefe' });
        me.save.bossTicketDate = d;
        const dmg = Math.round(powerOf(me.save).dps * 30);
        c2.bossHp = Math.max(0, (c2.bossHp || bossMax(c2)) - dmg);
        const killed = c2.bossHp <= 0;
        await U.save(s.user, me.save); await C.update(c2._id, { bossHp: c2.bossHp });
        cb({ ok:true, dmg, killed, hp: c2.bossHp, max: bossMax(c2) });
    });

    s.on('colonyClaim', async (cb) => {
        const me = await U.get(s.user); if (!me || !me.save.colony) return cb({ ok:false });
        const c = await C.get(me.save.colony); if (!c) return cb({ ok:false });
        if ((c.bossHp || 1) > 0 || (c.claimed || []).includes(s.user)) return cb({ ok:false });
        c.claimed = (c.claimed || []).concat([s.user]);
        const g = Math.ceil(3 * Math.pow(1.18, me.save.best || 1)) * 50 * (c.level || 1);
        me.save.gold += g;
        await U.save(s.user, me.save); await C.update(c._id, { claimed: c.claimed });
        cb({ ok:true, g });
    });

    s.on('disconnect', () => {});
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 le100.io corriendo en ${PORT}`));