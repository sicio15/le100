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
const players = new Map();   // humanos
const bots = new Map();      // IA
let foods = [];
let foodId = 0;

const AB = {
    dash:   { cd: 180, dur: 60  },
    shield: { cd: 300, dur: 180 },
    magnet: { cd: 420, dur: 300 },
    poison: { cd: 600, dur: 300 }
};

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
    p.abilities[k].active = AB[k].dur;
    p.abilities[k].cd = AB[k].cd;
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
        tx: 0, ty: 0, aiTimer: 0, segments: []
    };
    fillSegments(b, 15 + (Math.random() * 60 | 0));
    b.tx = b.x; b.ty = b.y;
    return b;
}
BOT_NAMES.forEach(n => bots.set('bot_' + n, makeBot(n)));

function killBot(b) {
    if (!b.alive) return;
    b.alive = false;
    for (let i = 0; i < b.segments.length; i += 3) {
        foods.push({ id: foodId++, x: b.segments[i].x, y: b.segments[i].y, type: Math.random() < 0.2 ? 'big' : 'normal' });
    }
    io.emit('playerDied', { id: b.id, killedBy: 'world', segments: b.segments });
    setTimeout(() => {
        b.x = 300 + Math.random() * (WORLD_SIZE - 600);
        b.y = 300 + Math.random() * (WORLD_SIZE - 600);
        b.abilities = freshAbilities();
        fillSegments(b, 10);
        b.alive = true;
    }, 4000);
}

function bodyHit(b, other) {
    const segs = other.segments;
    if (!segs) return false;
    for (let i = 1; i < segs.length; i += 2) {
        const dx = segs[i].x - b.x, dy = segs[i].y - b.y;
        if (dx * dx + dy * dy < 576) return true; // 24^2
    }
    return false;
}

function tickBots() {
    const all = [...players.values(), ...bots.values()];
    bots.forEach(b => {
        if (!b.alive) return;

        // Usa habilidades al azar
        if (b.abilities.dash.cd === 0   && Math.random() < 0.004) trigger(b, 'dash');
        if (b.abilities.shield.cd === 0 && Math.random() < 0.002) trigger(b, 'shield');
        if (b.abilities.magnet.cd === 0 && Math.random() < 0.003) trigger(b, 'magnet');
        if (b.abilities.poison.cd === 0 && Math.random() < 0.002) trigger(b, 'poison');

        // IA: buscar comida / evitar bordes
        if (--b.aiTimer <= 0) {
            b.aiTimer = 30 + Math.random() * 60;
            let best = null, bd = 700 * 700;
            for (const f of foods) {
                const dx = f.x - b.x, dy = f.y - b.y, d = dx * dx + dy * dy;
                if (d < bd) { bd = d; best = f; }
            }
            if (best) { b.tx = best.x; b.ty = best.y; }
            else { b.tx = 300 + Math.random() * (WORLD_SIZE - 600); b.ty = 300 + Math.random() * (WORLD_SIZE - 600); }
            if (b.x < 400 || b.x > WORLD_SIZE - 400 || b.y < 400 || b.y > WORLD_SIZE - 400) {
                b.tx = WORLD_SIZE / 2 + (Math.random() - 0.5) * 1500;
                b.ty = WORLD_SIZE / 2 + (Math.random() - 0.5) * 1500;
            }
        }
        const ta = Math.atan2(b.ty - b.y, b.tx - b.x);
        let d = ta - b.angle;
        while (d > Math.PI) d -= Math.PI * 2;
        while (d < -Math.PI) d += Math.PI * 2;
        b.angle += d * 0.06;

        const sp = b.abilities.dash.active > 0 ? 4.4 : 2.2;
        b.x = Math.max(10, Math.min(WORLD_SIZE - 10, b.x + Math.cos(b.angle) * sp));
        b.y = Math.max(10, Math.min(WORLD_SIZE - 10, b.y + Math.sin(b.angle) * sp));

        // Seguir segmentos
        b.segments[0].x = b.x; b.segments[0].y = b.y;
        for (let i = 1; i < b.segments.length; i++) {
            const p = b.segments[i - 1], s = b.segments[i];
            const dx = p.x - s.x, dy = p.y - s.y, dist = Math.hypot(dx, dy);
            if (dist > 10) { const a = Math.atan2(dy, dx); s.x = p.x - Math.cos(a) * 10; s.y = p.y - Math.sin(a) * 10; }
        }
        while (b.segments.length > b.maxSegments) b.segments.pop();

        // Comer
        for (let i = foods.length - 1; i >= 0; i--) {
            const f = foods[i];
            const dx = f.x - b.x, dy = f.y - b.y, d2 = dx * dx + dy * dy;
            if (b.abilities.magnet.active > 0 && d2 < 40000 && d2 > 900) { f.x -= dx * 0.05; f.y -= dy * 0.05; }
            if (d2 < 625) {
                const v = f.type === 'big' ? 5 : f.type === 'special' ? 3 : 1;
                b.maxSegments = Math.min(160, b.maxSegments + v);
                b.score += v;
                foods.splice(i, 1);
                io.emit('foodEaten', { foodId: f.id, playerId: b.id });
            }
        }

        // Chocar contra cuerpos (humanos u otros bots)
        if (b.abilities.shield.active <= 0) {
            for (const other of all) {
                if (other === b || !other.alive) continue;
                if (bodyHit(b, other)) { killBot(b); break; }
            }
        }
    });
}

/* ============ JUGADORES HUMANOS ============ */
io.on('connection', (socket) => {
    socket.on('joinGame', (data) => {
        const p = {
            id: socket.id,
            name: (data.name || 'Anónimo').slice(0, 14),
            color: data.color ?? (Math.random() * 360 | 0),
            x: Math.random() * WORLD_SIZE, y: Math.random() * WORLD_SIZE,
            angle: 0, segments: [{ x: 0, y: 0 }],
            maxSegments: 10, score: 10, alive: true,
            abilities: freshAbilities()
        };
        players.set(socket.id, p);
        socket.emit('init', { playerId: socket.id, foods, worldSize: WORLD_SIZE });
        socket.broadcast.emit('playerJoined', p);
    });

    socket.on('updatePlayer', (d) => {
        const p = players.get(socket.id);
        if (!p || !p.alive) return;
        p.x = d.x; p.y = d.y; p.angle = d.angle;
        p.segments = d.segments; p.maxSegments = d.maxSegments;
        p.score = d.score; p.abilities = d.abilities;
    });

    socket.on('useAbility', (k) => {
        const p = players.get(socket.id);
        if (!p || !p.alive || !AB[k]) return;
        if (p.abilities[k].cd === 0) trigger(p, k);
    });

    socket.on('eatFood', (fid) => {
        const i = foods.findIndex(f => f.id === fid);
        if (i !== -1) { foods.splice(i, 1); io.emit('foodEaten', { foodId: fid, playerId: socket.id }); }
    });

    socket.on('playerDied', () => {
        const p = players.get(socket.id);
        if (!p) return;
        p.alive = false;
        io.emit('playerDied', { id: socket.id, killedBy: 'world', segments: p.segments });
        setTimeout(() => {
            if (!players.has(socket.id)) return;
            p.x = 300 + Math.random() * (WORLD_SIZE - 600);
            p.y = 300 + Math.random() * (WORLD_SIZE - 600);
            p.abilities = freshAbilities();
            p.segments = [];
            for (let i = 0; i < 10; i++) p.segments.push({ x: p.x, y: p.y });
            p.maxSegments = 10; p.score = 10; p.alive = true;
            socket.emit('respawned', { x: p.x, y: p.y });
        }, 5000);
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

/* ============ GAME LOOP DEL SERVIDOR ============ */
setInterval(() => {
    const all = [...players.values(), ...bots.values()];
    all.forEach(p => Object.keys(p.abilities).forEach(k => {
        if (p.abilities[k].cd > 0) p.abilities[k].cd--;
        if (p.abilities[k].active > 0) p.abilities[k].active--;
    }));
    tickBots();
    io.emit('gameState', {
        players: all,
        foods,
        humans: players.size
    });
}, 1000 / TICK);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 le100.io corriendo en puerto ${PORT}`));