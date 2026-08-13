// Estado global del juego
const G = {
    state: 'menu',        // menu | playing | dead
    myId: null,
    frame: 0,
    shake: 0,
    worldSize: 5000,
    foods: [],
    remotes: new Map(),
    deathTime: 0,
    joyActive: false,
    joyUsed: false,       // en móvil, quieto hasta primer toque
    joyVec: { x: 0, y: 0 },
    auto: false
};
let selSkin = 0;

const me = {
    name: 'Jugador', hue: 120, segments: [], angle: 0,
    score: 10, maxSegments: 10, alive: false,
    abilities: { dash:{cd:0,active:0}, shield:{cd:0,active:0}, magnet:{cd:0,active:0}, poison:{cd:0,active:0} }
};

function resetMe(x, y) {
    me.segments = [];
    me.maxSegments = stats().startLen;
    for (let i = 0; i < me.maxSegments; i++) me.segments.push({ x, y });
    me.score = me.maxSegments; me.alive = true; me.angle = 0;
    Object.keys(me.abilities).forEach(k => { me.abilities[k].cd = 0; me.abilities[k].active = 0; });
}

// ===== Cienpiés remoto (interpolado) =====
class Remote {
    constructor(p) {
        this.id = p.id; this.hue = hueOf(p.color);
        this.segments = (p.segments && p.segments.length ? p.segments : [{x:p.x,y:p.y}]).map(s => ({...s}));
        this.targets = this.segments.map(s => ({...s}));
        this.name = p.name; this.angle = p.angle || 0; this.score = p.score || 10;
        this.alive = p.alive !== false; this.abilities = p.abilities || {};
    }
    sync(p) {
        this.name = p.name; this.score = p.score; this.alive = p.alive !== false;
        this.angle = p.angle; this.abilities = p.abilities || this.abilities;
        if (p.segments && p.segments.length) this.targets = p.segments;
        while (this.segments.length < this.targets.length) {
            const l = this.segments[this.segments.length-1];
            this.segments.push({ x:l.x, y:l.y });
        }
        if (this.segments.length > this.targets.length) this.segments.length = this.targets.length;
    }
    update() {
        for (let i = 0; i < this.segments.length; i++) {
            const t = this.targets[i]; if (!t) continue;
            this.segments[i].x += (t.x - this.segments[i].x) * 0.3;
            this.segments[i].y += (t.y - this.segments[i].y) * 0.3;
        }
    }
}

// ===== Modo demo (fondo del menú) =====
const demoCents = [], demoFoods = [];
for (let i = 0; i < 220; i++) {
    demoFoods.push({ id:i, x:Math.random()*5000, y:Math.random()*5000, type:Math.random()<.08?'big':'normal' });
}
for (let i = 0; i < 7; i++) {
    const c = { hue:Math.random()*360|0, segments:[], angle:Math.random()*TAU, alive:true,
        abilities:{}, tx:Math.random()*5000, ty:Math.random()*5000, score:20+i*9, name:'' };
    const x = Math.random()*5000, y = Math.random()*5000;
    for (let j = 0; j < 15+i*8; j++) c.segments.push({ x, y });
    demoCents.push(c);
}
function updateDemo() {
    demoCents.forEach(c => {
        const h = c.segments[0];
        if (Math.random() < 0.005) { c.tx = Math.random()*5000; c.ty = Math.random()*5000; }
        const ta = Math.atan2(c.ty-h.y, c.tx-h.x);
        let d = ta - c.angle;
        while (d > Math.PI) d -= TAU;
        while (d < -Math.PI) d += TAU;
        c.angle += d * 0.03;
        h.x = Math.max(50, Math.min(5000-50, h.x + Math.cos(c.angle)*2));
        h.y = Math.max(50, Math.min(5000-50, h.y + Math.sin(c.angle)*2));
        for (let i = 1; i < c.segments.length; i++) {
            const p = c.segments[i-1], s = c.segments[i];
            const dx = p.x-s.x, dy = p.y-s.y, dist = Math.hypot(dx,dy);
            if (dist > 10) { const a = Math.atan2(dy,dx); s.x = p.x-Math.cos(a)*10; s.y = p.y-Math.sin(a)*10; }
        }
    });
}