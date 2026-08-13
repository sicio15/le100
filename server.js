const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(express.static(path.join(__dirname, 'public')));

const WORLD_SIZE = 5000;
const TICK = 30;
const players = new Map();
const bots = new Map();
let foods = [];
let hotspots = [];
let foodId = 0;
let tickCount = 0;

const AB = {
    dash:   { cd: 180, dur: 60  },
    shield: { cd: 720, dur: 90  },
    magnet: { cd: 420, dur: 300 },
    poison: { cd: 600, dur: 300 }
};
const UPG_MAX = { len:10, speed:8, cd:10, magnet:10, coin:15 };

const HUNT_TAUNTS = ['🎯 {n} sos mi comida', 'acá te espero 😈', 'corré corré 🏃‍♂️', 'no te escapes {n} 🐛️'];
const KILL_TAUNTS = ['jajaja 😂', 'gg', 'F en el chat', 'acá mando yo 😎', 'qué rico snack 🐛️'];
const AMBIENT = ['alguien vio una ⭐ dorada?', 'me encanta este mapa', '🐛️️🐛️', 'quién quiere pelea?'];
const pick = a => a[Math.random() * a.length | 0];
const norm = a => { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; };
const clampW = v => Math.max(300, Math.min(WORLD_SIZE - 300, v));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// ===== stats derivadas de mejoras (espejo del cliente) =====
function sanitizeUp(u) {
    const out = {};
    Object.keys(UPG_MAX).forEach(k => out[k] = clamp(parseInt((u || {})[k]) || 0, 0, UPG_MAX[k]));
    return out;
}
function startLen(up) { return 10 + 5 * up.len; }
function spdFor(e)   { return 3 + 0.15 * (e.up ? e.up.speed : 0); }
function cdFor(e, k) { return AB[k].cd * Math.max(0.5, 1 - 0.05 * (e.up ? e.up.cd : 0)); }
function durFor(e, k){ return AB[k].dur + (k === 'magnet' ? 30 * (e.up ? e.up.magnet : 0) : 0); }
function magnetR(e)  { return 200 + 20 * (e.up ? e.up.magnet : 0); }

function newFood(type) {
    return {
        id: foodId++,
        x: Math.random() * WORLD_SIZE,
        y: Math.random() * WORLD_SIZE,
        type: type || (Math.random() < 0.08 ? 'big' : Math.random() < 0.25 ? 'special' : 'normal')
    };
}
for (let i = 0; i < 500; i++) foods.push(newFood());
setInterval(() => {
    while (foods.length < 600) foods.push(newFood());
    io.emit('foodUpdate', foods);
}, 3000);

function freshAbilities() {
    return { dash:{cd:0,active:0}, shield:{cd:0,active:0}, magnet:{cd:0,active:0}, poison:{cd:0,active:0} };
}
function trigger(p, k) {
    p.abilities[k].active = durFor(p, k);
    p.abilities[k].cd = cdFor(p, k);
}
function pullFoods(e, radius, k) {
    const r2 = radius * radius;
    for (const f of foods) {
        const dx = e.x - f.x, dy = e.y - f.y, d2 = dx * dx + dy * dy;
        if (d2 < r2 && d2 > 400) { f.x += dx * k; f.y += dy * k; }
    }
}

/* ============ BOTS ============ */
const BOT_NAMES = ['Cientron', 'Paticas', 'Nervio', 'Doña Pies', 'Turbo', 'Venena', 'La Mole', 'Cien Pies Jr.'];

function fillSegments(b, n) {
    b.segments = [];
    for (let i = 0; i < n; i++) b.segments.push({ x: b.x, y: b.y });
    b.maxSegments = n; b.score = n;
}
function makeBot(name) {
    const b = {
        id: 'bot_' + name, name, isBot: true,
        color: Math.random() * 360 | 0,
        x: Math.random() * WORLD_SIZE, y: Math.random() * WORLD_SIZE,
        angle: Math.random() * Math.PI * 2,
        alive: true, abilities: freshAbilities(),
        tx: 0, ty: 0, aiTimer: 0, segments: [],
        aggro: Math.random(),
        speed: 2 + Math.random() * 0.4,
        mode: 'forage', huntTimer: 0, prey: null, rank: 99
    };
    fillSegments(b, 15 + (Math.random() * 60 | 0));
    b.tx = b.x; b.ty = b.y;
    return b;
}
BOT_NAMES.forEach(n => bots.set('bot_' + n, makeBot(n)));

function dropCorpse(e) {
    hotspots.push({ x: e.x, y: e.y, ttl: 600 });
    for (let i = 0; i < e.segments.length; i += 3) {
        foods.push({ id: foodId++, x: e.segments[i].x, y: e.segments[i].y, type: Math.random() < 0.2 ? 'big' : 'normal' });
    }
}
function killBot(b) {
    if (!b.alive) return;
    b.alive = false;
    dropCorpse(b);
    io.emit('playerDied', { id: b.id, killedBy: 'world', segments: b.segments });
    setTimeout(() => {
        b.x = 300 + Math.random() * (WORLD_SIZE - 600);
        b.y = 300 + Math.random() * (WORLD_SIZE - 600);
        b.abilities = freshAbilities();
        b.mode = 'forage'; b.prey = null;
        fillSegments(b, 10);
        b.alive = true;
    }, 4000);
}
function killHumanServer(p) {
    if (!p.alive) return;
    p.alive = false;
    dropCorpse(p);
    io.emit('playerDied', { id: p.id, killedBy: 'world', segments: p.segments });
    if (Math.random() < 0.7) {
        const bs = [...bots.values()];
        const b = bs[Math.random() * bs.length | 0];
        if (b) io.emit('chatMessage', { name: b.name, message: pick(KILL_TAUNTS) });
    }
    setTimeout(() => {
        if (!players.has(p.id)) return;
        p.x = 300 + Math.random() * (WORLD_SIZE - 600);
        p.y = 300 + Math.random() * (WORLD_SIZE - 600);
        p.abilities = freshAbilities();
        fillSegments(p, startLen(p.up));
        p.alive = true;
        if (p.socket) p.socket.emit('respawned', { x: p.x, y: p.y });
    }, 5000);
}

function bodyHit(b, other) {
    const segs = other.segments;
    if (!segs) return false;
    for (let i = 1; i < segs.length; i += 2) {
        const dx = segs[i].x - b.x, dy = segs[i].y - b.y;
        if (dx * dx + dy * dy < 576) return true;
    }
    return false;
}
function pointDanger(b, fx, fy, ignore) {
    const all = [...players.values(), ...bots.values()];
    for (const e of all) {
        if (!e.alive || e === b || e === ignore) continue;
        const segs = e.segments || [];
        for (let i = 1; i < segs.length; i += 2) {
            const dx = segs[i].x - fx, dy = segs[i].y - fy;
            if (dx * dx + dy * dy < 900) {
                const rel = norm(Math.atan2(segs[i].y - b.y, segs[i].x - b.x) - b.angle);
                return { human: !e.isBot, rel };
            }
        }
    }
    return null;
}
function selfDanger(b, fx, fy) {
    for (let i = 10; i < b.segments.length; i += 2) {
        const dx = b.segments[i].x - fx, dy = b.segments[i].y - fy;
        if (dx * dx + dy * dy < 900) return true;
    }
    return false;
}

/* ============ CEREBRO IA (bots + humanos en AUTO) ============ */
function tickAI() {
    const everyone = [...players.values(), ...bots.values()];
    const thinkers = [...bots.values(), ...[...players.values()].filter(p => p.auto && p.alive)];

    thinkers.forEach(b => {
        if (!b.alive) return;

        if (b.abilities.poison.cd === 0 && Math.random() < 0.002) trigger(b, 'poison');

        let prey = null, preyD = 1e9, threat = null, threatD = 1e9;
        for (const e of everyone) {
            if (e === b || !e.alive) continue;
            const d = Math.hypot(e.x - b.x, e.y - b.y);
            if (d < preyD && d < 900 && e.score < b.score * 0.85 && e.abilities.shield.active <= 0) { prey = e; preyD = d; }
            if (d < threatD && d < 600 && e.score > b.score * 1.25) { threat = e; threatD = d; }
        }

        const isLeader = (b.rank || 99) <= 1;
        const isBaby = b.maxSegments < 18;

        if (threat && threatD < 500) {
            b.mode = 'flee'; b.prey = null;
            b.tx = clampW(b.x + (b.x - threat.x) * 3);
            b.ty = clampW(b.y + (b.y - threat.y) * 3);
            if (threatD < 260 && b.abilities.dash.cd === 0 && Math.random() < 0.12) trigger(b, 'dash');
            if (threatD < (isLeader ? 300 : 160) && b.abilities.shield.cd === 0 && Math.random() < (isLeader ? 0.4 : 0.25)) trigger(b, 'shield');
        } else if (!isBaby && prey && b.aggro > 0.35 && (isLeader ? preyD < 500 && b.aggro > 0.6 : true) &&
                   (b.mode === 'hunt' ? preyD < 1000 : (preyD < 700 && Math.random() < 0.03))) {
            if (b.mode !== 'hunt') {
                b.mode = 'hunt'; b.huntTimer = 400;
                if (b.isBot && Math.random() < 0.6 && prey.name) {
                    io.emit('chatMessage', { name: b.name, message: pick(HUNT_TAUNTS).replace('{n}', prey.name) });
                }
            }
            b.prey = prey;
            const nearWall = prey.x < 500 || prey.x > WORLD_SIZE-500 || prey.y < 500 || prey.y > WORLD_SIZE-500;
            if (nearWall) {
                const dxp = prey.x - b.x, dyp = prey.y - b.y, dl = Math.hypot(dxp, dyp) || 1;
                b.tx = clamp(prey.x + dxp/dl * 180, 60, WORLD_SIZE-60);
                b.ty = clamp(prey.y + dyp/dl * 180, 60, WORLD_SIZE-60);
            } else {
                const lead = Math.min(260, preyD * 0.7);
                b.tx = prey.x + Math.cos(prey.angle) * lead;
                b.ty = prey.y + Math.sin(prey.angle) * lead;
            }
            if (preyD < 320 && b.abilities.dash.cd === 0 && Math.random() < 0.06) trigger(b, 'dash');
            if (--b.huntTimer <= 0) b.mode = 'forage';
        } else {
            b.mode = 'forage'; b.prey = null;
            if (b.abilities.magnet.cd === 0 && Math.random() < 0.004) trigger(b, 'magnet');
            if (--b.aiTimer <= 0) {
                b.aiTimer = 20 + Math.random() * 40;
                let hs = null, hd = 1200 * 1200;
                for (const h of hotspots) {
                    const dx = h.x - b.x, dy = h.y - b.y, d = dx * dx + dy * dy;
                    if (d < hd) { hd = d; hs = h; }
                }
                if (hs) { b.tx = hs.x; b.ty = hs.y; }
                else {
                    let best = null, bs = -1;
                    for (let s = 0; s < 50; s++) {
                        const f = foods[Math.random() * foods.length | 0];
                        if (!f) continue;
                        const v = f.type === 'big' ? 5 : f.type === 'special' ? 3 : 1;
                        const score = v / (Math.hypot(f.x - b.x, f.y - b.y) + 120);
                        if (score > bs) { bs = score; best = f; }
                    }
                    if (best) { b.tx = best.x; b.ty = best.y; }
                    else { b.tx = 300 + Math.random() * (WORLD_SIZE-600); b.ty = 300 + Math.random() * (WORLD_SIZE-600); }
                }
            }
        }

        if (b.x < 400 || b.x > WORLD_SIZE-400 || b.y < 400 || b.y > WORLD_SIZE-400) {
            b.tx = WORLD_SIZE/2 + (Math.random()-0.5) * 1500;
            b.ty = WORLD_SIZE/2 + (Math.random()-0.5) * 1500;
        }

        const ta = Math.atan2(b.ty - b.y, b.tx - b.x);
        b.angle += norm(ta - b.angle) * 0.08;

        const fx = b.x + Math.cos(b.angle) * 70, fy = b.y + Math.sin(b.angle) * 70;
        if (selfDanger(b, fx, fy)) {
            b.angle += 0.35;
        } else {
            const dng = pointDanger(b, fx, fy, b.mode === 'hunt' ? b.prey : null);
            if (dng) {
                b.angle += dng.rel > 0 ? -0.3 : 0.3;
                if (dng.human && b.abilities.shield.cd === 0 && Math.random() < 0.25) trigger(b, 'shield');
            }
        }

        let sp = b.isBot ? b.speed : spdFor(b);
        if (b.mode === 'hunt') sp *= 1.2;
        if (b.abilities.dash.active > 0) sp *= 2;
        b.x = Math.max(10, Math.min(WORLD_SIZE-10, b.x + Math.cos(b.angle) * sp));
        b.y = Math.max(10, Math.min(WORLD_SIZE-10, b.y + Math.sin(b.angle) * sp));

        b.segments[0].x = b.x; b.segments[0].y = b.y;
        for (let i = 1; i < b.segments.length; i++) {
            const p = b.segments[i-1], s = b.segments[i];
            const dx = p.x - s.x, dy = p.y - s.y, dist = Math.hypot(dx, dy);
            if (dist > 10) { const a = Math.atan2(dy, dx); s.x = p.x - Math.cos(a)*10; s.y = p.y - Math.sin(a)*10; }
        }
        while (b.segments.length > b.maxSegments) b.segments.pop();

        if (b.abilities.magnet.active > 0) pullFoods(b, magnetR(b), 0.08);
        for (let i = foods.length-1; i >= 0; i--) {
            const f = foods[i];
            const dx = f.x - b.x, dy = f.y - b.y, d2 = dx * dx + dy * dy;
            if (d2 < 625) {
                const v = f.type === 'big' ? 5 : f.type === 'special' ? 3 : 1;
                b.maxSegments = Math.min(400, b.maxSegments + v);
                b.score += v;
                foods.splice(i, 1);
                io.emit('foodEaten', { foodId: f.id, playerId: b.id });
            }
        }

        if (b.abilities.shield.active <= 0) {
            for (let i = 14; i < b.segments.length; i += 2) {
                const dx = b.segments[i].x - b.x, dy = b.segments[i].y - b.y;
                if (dx * dx + dy * dy < 400) { b.isBot ? killBot(b) : killHumanServer(b); return; }
            }
            for (const other of everyone) {
                if (other === b || !other.alive) continue;
                if (bodyHit(b, other)) { b.isBot ? killBot(b) : killHumanServer(b); return; }
            }
        }

        if (b.isBot && Math.random() < 0.0004) io.emit('chatMessage', { name: b.name, message: pick(AMBIENT) });
    });
}

/* ============ HUMANOS ============ */
io.on('connection', (socket) => {
    socket.on('joinGame', (data) => {
        const up = sanitizeUp(data.up);
        const x = 300 + Math.random() * (WORLD_SIZE - 600);
        const y = 300 + Math.random() * (WORLD_SIZE - 600);
        const p = {
            id: socket.id, socket,
            name: (data.name || 'Anónimo').slice(0, 14),
            color: data.color ?? (Math.random() * 360 | 0),
            x, y, angle: 0,
            segments: [], maxSegments: startLen(up), score: startLen(up),
            alive: true, abilities: freshAbilities(), rank: 99,
            up, auto: false
        };
        fillSegments(p, startLen(up));
        players.set(socket.id, p);
        socket.emit('init', { playerId: socket.id, foods, worldSize: WORLD_SIZE });
        socket.broadcast.emit('playerJoined', p);
    });

    socket.on('setAuto', (v) => {
        const p = players.get(socket.id);
        if (p) p.auto = !!v;
    });

    socket.on('updatePlayer', (d) => {
        const p = players.get(socket.id);
        if (!p || !p.alive || p.auto) return;
        p.x = d.x; p.y = d.y; p.angle = d.angle;
        p.segments = d.segments; p.maxSegments = d.maxSegments;
        p.score = d.score; p.abilities = d.abilities;
    });

    socket.on('useAbility', (k) => {
        const p = players.get(socket.id);
        if (!p || !p.alive || p.auto || !AB[k]) return;
        if (p.abilities[k].cd === 0) trigger(p, k);
    });

    socket.on('eatFood', (fid) => {
        const i = foods.findIndex(f => f.id === fid);
        if (i !== -1) { foods.splice(i, 1); io.emit('foodEaten', { foodId: fid, playerId: socket.id }); }
    });

    socket.on('playerDied', () => {
        const p = players.get(socket.id);
        if (p) killHumanServer(p);
    });

    socket.on('chatMessage', (msg) => {
        const p = players.get(socket.id);
        io.emit('chatMessage', { name: p ? p.name : '???', message: String(msg).slice(0, 80) });
    });

    socket.on('disconnect', () => {
        players.delete(socket.id);
        io.emit('playerLeft', socket.id);
    });
});

/* ============ LOOP ============ */
setInterval(() => {
    tickCount++;
    const all = [...players.values(), ...bots.values()];

    all.forEach(p => Object.keys(p.abilities).forEach(k => {
        if (p.abilities[k].cd > 0) p.abilities[k].cd--;
        if (p.abilities[k].active > 0) p.abilities[k].active--;
    }));

    if (tickCount % 15 === 0) {
        all.filter(e => e.alive).sort((a, b) => b.score - a.score)
           .forEach((e, i) => { e.rank = i; });
    }

    players.forEach(p => {
        if (p.alive && !p.auto && p.abilities.magnet.active > 0) pullFoods(p, magnetR(p), 0.1);
    });

    hotspots = hotspots.filter(h => --h.ttl > 0);

    tickAI();
    io.emit('gameState', { players: all, foods, humans: players.size });
}, 1000 / TICK);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 le100.io corriendo en puerto ${PORT}`));