const express = require('express');
const http = require('http');
const crypto = require('crypto');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
app.use(express.static(path.join(__dirname, 'public')));

/* ========== ALMACENAMIENTO (Mongo si hay MONGO_URI, si no memoria) ========== */
const DEF_SAVE = { gold:0, adn:0, stage:1, best:1, kills:0, prestiges:0, prBase:1,
    ups:{ dmg:0, vit:0, regen:0, venom:0, fortune:0 }, ach:{}, last:Date.now() };
let col = null;
const mem = new Map();

async function initDB() {
    const uri = process.env.MONGO_URI;
    if (!uri) { console.warn('⚠️ Sin MONGO_URI: cuentas en memoria (se pierden en deploy)'); return; }
    try {
        const { MongoClient } = require('mongodb');
        const client = new MongoClient(uri);
        await client.connect();
        col = client.db('le100').collection('users');
        console.log('🗄️ MongoDB conectado');
    } catch (e) { console.error('❌ Mongo falló, usando memoria:', e.message); }
}
async function dbGet(key) { return col ? await col.findOne({ _id: key }) : mem.get(key) || null; }
async function dbCreate(key, doc) { col ? await col.insertOne(Object.assign({ _id: key }, doc)) : mem.set(key, doc); }
async function dbSave(key, save) { col ? await col.updateOne({ _id: key }, { $set: { save } }) : (u => { if (u) u.save = save; })(mem.get(key)); }

function sanitizeSave(s) {
    const o = JSON.parse(JSON.stringify(DEF_SAVE));
    if (!s || typeof s !== 'object') return o;
    const num = (v, max) => Math.max(0, Math.min(max, Number(v) || 0));
    o.gold = num(s.gold, 1e12);
    o.adn = num(s.adn, 5000);                       // tope anti-bug
    o.stage = Math.max(1, num(s.stage, 9999));
    o.best = Math.max(1, num(s.best, 9999));
    o.prBase = Math.max(1, num(s.prBase, 9999));    // ✅ persiste el progreso ya prestigiado
    o.kills = num(s.kills, 1e9);
    o.prestiges = num(s.prestiges, 1e6);
    if (s.ups) Object.keys(o.ups).forEach(k => o.ups[k] = num(s.ups[k], 999));
    if (s.ach) o.ach = Object.fromEntries(Object.entries(s.ach).filter(([, v]) => v).map(([k]) => [k, 1]));
    o.last = Number(s.last) || Date.now();
        // ===== Equipo (Fase 3) con validación =====
    if (s.gear && typeof s.gear === 'object') {
        const cleanItem = it => {
            if (!it || typeof it !== 'object') return null;
            return {
                id: String(it.id || '').slice(0, 24),
                slot: ['fang','shell','antenna','charm'].includes(it.slot) ? it.slot : 'fang',
                rarity: Math.max(0, Math.min(4, +it.rarity || 0)),
                lvl: Math.max(0, Math.min(99, +it.lvl || 0)),
                stat: String(it.stat || 'atk').slice(0, 8),
                val: Math.max(0, Math.min(999, +it.val || 0)),
                subs: Array.isArray(it.subs) ? it.subs.slice(0, 2).map(x => ({ stat: String(x.stat || 'atk').slice(0, 8), val: Math.max(0, Math.min(999, +x.val || 0)) })) : []
            };
        };
        const g = { equipped: { fang: null, shell: null, antenna: null, charm: null }, inv: [] };
        Object.keys(g.equipped).forEach(k => { g.equipped[k] = cleanItem((s.gear.equipped || {})[k]); });
        g.inv = Array.isArray(s.gear.inv) ? s.gear.inv.slice(0, 30).map(cleanItem).filter(Boolean) : [];
        o.gear = g;
    }
    o.tickets = Number.isFinite(+s.tickets) ? Math.max(0, Math.min(3, +s.tickets)) : 3;
    o.ticketDate = String(s.ticketDate || '').slice(0, 10);
    o.tower = Math.max(1, num(s.tower, 9999));
    o.towerBest = Math.max(1, num(s.towerBest, 9999));
    o.rlTickets = Number.isFinite(+s.rlTickets) ? Math.max(0, Math.min(2, +s.rlTickets)) : 2;
    o.rlDate = String(s.rlDate || '').slice(0, 10);
    return o;
}
const hash = (pass, salt) => crypto.scryptSync(pass, salt, 32).toString('hex');

/* ========== RANKING ========== */
const scores = new Map();
const top = () => [...scores.entries()].map(([name, stage]) => ({ name, stage }))
    .sort((a, b) => b.stage - a.stage).slice(0, 10);
const pushScore = (name, stage) => {
    scores.set(name, Math.max(stage, scores.get(name) || 0));
    io.emit('top', top());
};

/* ========== SOCKET ========== */
io.on('connection', (s) => {
    s.user = null; s.lastSaveAt = 0;

    s.on('register', async (d, cb) => {
        try {
            const name = String(d.name || '').trim();
            const pass = String(d.pass || '');
            if (name.length < 3 || name.length > 14) return cb({ ok:false, err:'Nombre de 3 a 14 caracteres' });
            if (!/^[a-zA-Z0-9 _ñÑáéíóú]+$/.test(name)) return cb({ ok:false, err:'Nombre con caracteres válidos' });
            if (pass.length < 4) return cb({ ok:false, err:'Contraseña de 4+ caracteres' });
            const key = name.toLowerCase();
            if (await dbGet(key)) return cb({ ok:false, err:'Ese nombre ya existe' });
            const salt = crypto.randomBytes(8).toString('hex');
            const save = sanitizeSave(null); save.last = Date.now();
            await dbCreate(key, { name, salt, hash: hash(pass, salt), save });
            s.user = key;
            pushScore(name, save.best);
            cb({ ok:true, name, save });
        } catch (e) { cb({ ok:false, err:'Error del servidor' }); }
    });

    s.on('login', async (d, cb) => {
        try {
            const key = String(d.name || '').trim().toLowerCase();
            const doc = await dbGet(key);
            if (!doc) return cb({ ok:false, err:'La cuenta no existe' });
            if (hash(String(d.pass || ''), doc.salt) !== doc.hash) return cb({ ok:false, err:'Contraseña incorrecta' });
            s.user = key;
            pushScore(doc.name, doc.save.best);
            cb({ ok:true, name: doc.name, save: doc.save });
        } catch (e) { cb({ ok:false, err:'Error del servidor' }); }
    });

    s.on('saveGame', (d) => {
        if (!s.user) return;
        const now = Date.now();
        if (now - s.lastSaveAt < 2000) return;   // rate-limit
        s.lastSaveAt = now;
        const save = sanitizeSave(d);
        dbSave(s.user, save);
        const docName = s.userName || null;
    });

    s.on('score', (d) => { if (d && d.name) pushScore(String(d.name).slice(0, 14), Math.min(9999, +d.stage || 1)); });
    s.on('disconnect', () => {});
});

initDB();
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 le100.io corriendo en ${PORT}`));