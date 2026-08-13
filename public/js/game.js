'use strict';
/* ================= HELPERS ================= */
const $ = id => document.getElementById(id);
const TAU = Math.PI * 2;
const fmt = n => { n = Math.floor(n); if (n < 1e3) return '' + n; if (n < 1e6) return (n/1e3).toFixed(1)+'K'; if (n < 1e9) return (n/1e6).toFixed(1)+'M'; return (n/1e9).toFixed(1)+'B'; };
function toast(t) {
    const d = document.createElement('div');
    d.className = 'toast'; d.textContent = t;
    $('toasts').appendChild(d);
    setTimeout(() => d.remove(), 2400);
}

/* ================= GUARDADO ================= */
const KEY = 'le100_idle_v2';
const DEF = { name:'', gold:0, adn:0, stage:1, best:1, kills:0, ks:0, prestiges:0,
    ups:{ dmg:0, vit:0, regen:0, venom:0, fortune:0 }, ach:{}, last:Date.now() };
let S = loadSave();
function loadSave() {
    try { const s = JSON.parse(localStorage.getItem(KEY)); if (s) return Object.assign({}, DEF, s, { ups: Object.assign({}, DEF.ups, s.ups) }); } catch (e) {}
    return JSON.parse(JSON.stringify(DEF));
}
function save() { S.last = Date.now(); localStorage.setItem(KEY, JSON.stringify(S)); }
setInterval(save, 5000);
window.addEventListener('visibilitychange', save);

/* ================= STATS ================= */
const adnMult = () => 1 + 0.1 * S.adn;
const dps     = () => 5 * Math.pow(1.3, S.ups.dmg) * adnMult();
const maxHP   = () => 100 * Math.pow(1.22, S.ups.vit);
const regenPs = () => maxHP() * (0.02 + 0.01 * S.ups.regen);
const venomCd = () => Math.max(3, 7 - 0.3 * S.ups.venom);
const venomDm = () => dps() * (2 + 0.5 * S.ups.venom);
const goldKill= st => Math.ceil(3 * Math.pow(1.18, st) * (1 + 0.25 * S.ups.fortune) * adnMult());
const eHP     = st => 10 * Math.pow(1.27, st);
const eDmg    = st => 4 * Math.pow(1.22, st);
const COSTS = { dmg:[15,1.5], vit:[12,1.5], regen:[20,1.6], venom:[30,1.6], fortune:[25,1.6] };
const cost = k => Math.floor(COSTS[k][0] * Math.pow(COSTS[k][1], S.ups[k]));
const isBossStage = () => S.stage % 5 === 0;
const killsNeed = () => isBossStage() ? 1 : 8;
const prGain = () => Math.floor(3 * Math.sqrt(Math.max(0, S.best - 8)));

/* ================= CANVAS + SPRITE ================= */
const cv = $('cv'), ctx = cv.getContext('2d');
let W = 0, H = 0;
function fit() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    W = cv.clientWidth; H = cv.clientHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', fit);

// Usa tu sprite img/hero.png; si falla, SVG de respaldo
const HERO_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 150">' +
'<g stroke="#1c5a33" stroke-width="5" stroke-linecap="round" fill="none">' +
'<path d="M30 116 q-5 14 -12 18"/><path d="M48 120 q-2 14 -8 20"/><path d="M70 122 q0 14 -5 20"/>' +
'<path d="M95 124 q2 14 -2 20"/><path d="M120 124 q4 14 0 20"/><path d="M145 122 q6 12 3 19"/>' +
'<path d="M165 116 q10 10 9 17"/><path d="M180 108 q12 8 13 15"/></g>' +
'<g stroke="#14351f" stroke-width="4">' +
'<ellipse cx="32" cy="100" rx="20" ry="19" fill="#2fae62"/><ellipse cx="58" cy="92" rx="23" ry="24" fill="#37c06d"/>' +
'<ellipse cx="90" cy="88" rx="26" ry="27" fill="#3fca74"/><ellipse cx="122" cy="88" rx="26" ry="27" fill="#48d67e"/>' +
'<ellipse cx="150" cy="93" rx="24" ry="25" fill="#52e088"/></g>' +
'<g fill="rgba(255,255,255,.35)"><ellipse cx="84" cy="76" rx="9" ry="5"/><ellipse cx="116" cy="76" rx="9" ry="5"/><ellipse cx="52" cy="80" rx="7" ry="4"/></g>' +
'<g stroke="#2fae62" stroke-width="6" stroke-linecap="round" fill="#57e58d">' +
'<path d="M163 32 q-8 -18 2 -26" fill="none"/><circle cx="166" cy="6" r="7"/>' +
'<path d="M188 32 q8 -16 22 -18" fill="none"/><circle cx="212" cy="13" r="7"/></g>' +
'<circle cx="174" cy="62" r="34" fill="#57e58d" stroke="#14351f" stroke-width="4"/>' +
'<circle cx="163" cy="56" r="12" fill="#fff" stroke="#14351f" stroke-width="3"/>' +
'<circle cx="187" cy="56" r="12" fill="#fff" stroke="#14351f" stroke-width="3"/>' +
'<circle cx="165" cy="58" r="5.5" fill="#111"/><circle cx="189" cy="58" r="5.5" fill="#111"/>' +
'<circle cx="167" cy="56" r="2" fill="#fff"/><circle cx="191" cy="56" r="2" fill="#fff"/>' +
'<path d="M168 78 q11 8 23 2" stroke="#14351f" stroke-width="4" fill="none" stroke-linecap="round"/></svg>';
const heroImg = new Image();
let heroReady = false;
heroImg.onload = () => { heroReady = true; };
heroImg.onerror = () => { heroImg.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(HERO_SVG); };
heroImg.src = 'img/hero.png';

/* ================= BATALLA ================= */
let hero = { hp: maxHP(), atkT: 0, venT: 3, lunge: 0, dead: 0 };
let enemies = [], floats = [], parts = [];
let spawnT = 1, bossT = 0, shake = 0, time = 0;

const heroX = () => Math.min(230, W * 0.22);
const groundY = () => H - 78;

function spawnEnemy() {
    const slots = [0,1,2,3,4];
    enemies.forEach(e => { const i = slots.indexOf(e.slot); if (i >= 0) slots.splice(i, 1); });
    if (!slots.length) return;
    const slot = slots[Math.random() * slots.length | 0];
    const hp = eHP(S.stage);
    enemies.push({ hp, max: hp, slot, x: W + 60, atkT: 1, boss: false, hue: (S.stage * 25) % 360, size: 1 });
}
function spawnBoss() {
    const hp = eHP(S.stage) * 10;
    enemies.push({ hp, max: hp, slot: 1, x: W + 80, atkT: 1, boss: true, hue: (S.stage * 25) % 360, size: 2.2 });
    bossT = 30;
    $('bossBar').classList.remove('hidden');
    toast('👑 ¡JEFE en la etapa ' + S.stage + '!');
}
function killEnemy(e) {
    const g = goldKill(S.stage) * (e.boss ? 8 : 1);
    S.gold += g; S.kills++; S.ks++;
    float(e.x, groundY() - 60, '+' + fmt(g) + ' 🪙', '#ffd700');
    burst(e.x, groundY() - 30, 'hsl(' + e.hue + ',80%,60%)', e.boss ? 40 : 14);
    if (e.boss) { shake = 14; $('bossBar').classList.add('hidden'); nextStage(); }
    else if (S.ks >= killsNeed()) nextStage();
}
function nextStage() {
    S.stage++; S.best = Math.max(S.best, S.stage); S.ks = 0;
    hero.hp = maxHP(); enemies = []; spawnT = 0.6;
    save(); submitScore();
    toast('⚔️ Etapa ' + S.stage + (isBossStage() ? ' 👑' : ''));
}
function float(x, y, txt, color) { floats.push({ x, y, txt, color, life: 1.2 }); }
function burst(x, y, color, n) {
    for (let i = 0; i < n; i++) {
        const a = TAU * i / n, s = 2 + Math.random() * 3;
        parts.push({ x, y, vx: Math.cos(a)*s, vy: Math.sin(a)*s - 2, life: .7, color });
    }
}

/* ================= UPDATE ================= */
function update(dt) {
    time += dt;
    const hx = heroX(), gy = groundY();
    if (hero.dead > 0) {
        hero.dead -= dt;
        if (hero.dead <= 0) { hero.hp = maxHP(); toast('✨ ¡Revivió!'); }
    } else {
        hero.hp = Math.min(maxHP(), hero.hp + regenPs() * dt);
        hero.atkT -= dt;
        if (hero.atkT <= 0) {
            hero.atkT = 0.5;
            const t = enemies.filter(e => e.x < hx + 330).sort((a,b) => a.x - b.x)[0];
            if (t) {
                hero.lunge = 1;
                const d = dps() * 0.5;
                t.hp -= d;
                float(t.x, gy - 70 * t.size, fmt(d), '#fff');
                if (t.hp <= 0) { enemies.splice(enemies.indexOf(t), 1); killEnemy(t); }
            }
        }
        hero.venT -= dt;
        if (hero.venT <= 0) {
            hero.venT = venomCd();
            if (enemies.length) {
                const d = venomDm();
                float(hx + 140, gy - 90, '☠️ ' + fmt(d), '#a020f0');
                for (let i = enemies.length - 1; i >= 0; i--) {
                    const e = enemies[i];
                    e.hp -= d;
                    burst(e.x, gy - 30, '#a020f0', 8);
                    if (e.hp <= 0) { enemies.splice(i, 1); killEnemy(e); }
                }
            }
        }
    }
    hero.lunge = Math.max(0, hero.lunge - dt * 4);

    if (!isBossStage()) {
        spawnT -= dt;
        if (spawnT <= 0 && enemies.length < 4) { spawnT = 1.6; spawnEnemy(); }
    } else if (!enemies.length && S.ks === 0) spawnBoss();

    enemies.forEach(e => {
        const slotX = hx + 150 + e.slot * 46;
        if (e.x > slotX) e.x -= (e.boss ? 40 : 70) * dt;
        else if (hero.dead <= 0) {
            e.atkT -= dt;
            if (e.atkT <= 0) {
                e.atkT = 1;
                const d = eDmg(S.stage) * (e.boss ? 3 : 1);
                hero.hp -= d;
                float(hx, gy - 80, '-' + fmt(d), '#ff4757');
                shake = Math.max(shake, 4);
                if (hero.hp <= 0) {
                    hero.dead = 4;
                    toast('💀 Tu cienpiés cayó...');
                    enemies.forEach(x => { x.x += 260; x.atkT = 1.5; });
                }
            }
        }
    });

    if (isBossStage() && enemies.length) {
        bossT -= dt;
        $('bossFill').style.width = Math.max(0, bossT / 30 * 100) + '%';
        $('bossTime').textContent = Math.max(0, Math.ceil(bossT)) + 's';
        if (bossT <= 0) { bossT = 30; toast('⏰ El jefe se recuperó... ¡otra vez!'); }
    }

    floats.forEach(f => { f.y -= 40 * dt; f.life -= dt; });
    floats = floats.filter(f => f.life > 0);
    parts.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += 9 * dt; p.life -= dt; });
    parts = parts.filter(p => p.life > 0);
    if (shake > 0) shake -= dt * 20;
}

/* ================= DRAW ================= */
function draw() {
    ctx.clearRect(0, 0, W, H);
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#151030'); sky.addColorStop(1, '#241640');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#1b2b1e'; ctx.fillRect(0, groundY() + 26, W, H);
    ctx.fillStyle = '#28402c'; ctx.fillRect(0, groundY() + 22, W, 8);

    let ox = 0, oy = 0;
    if (shake > 0) { ox = (Math.random()-.5)*shake; oy = (Math.random()-.5)*shake; }
    ctx.save(); ctx.translate(ox, oy);
    const hx = heroX(), gy = groundY();

    if (S.adn > 0) {
        ctx.fillStyle = 'rgba(126,252,252,.12)';
        ctx.beginPath(); ctx.arc(hx, gy - 40, 70, 0, TAU); ctx.fill();
    }

    const scale = 1 + Math.min(0.6, (S.ups.dmg + S.ups.vit) * 0.012);
    const bob = Math.sin(time * 4) * 4;
    ctx.save();
    ctx.translate(hx + hero.lunge * 22, gy + bob * 0.4);
    if (hero.dead > 0) ctx.globalAlpha = 0.4;
    ctx.scale(scale, scale);
    if (heroReady) {
        ctx.drawImage(heroImg, -70, -95, 140, 100);
    } else {
        for (let i = 0; i < 7; i++) {
            ctx.fillStyle = i % 2 ? '#2ecc71' : '#27ae60';
            ctx.beginPath(); ctx.arc(-i * 16 + 20, -30 + Math.sin(time*6 + i) * 3, 16 - i, 0, TAU); ctx.fill();
        }
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(28, -40, 6, 0, TAU); ctx.fill();
        ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(30, -40, 3, 0, TAU); ctx.fill();
    }
    ctx.restore();

    enemies.forEach(e => {
        const s = e.size, ex = e.x, ey = gy;
        ctx.save();
        ctx.translate(ex, ey); ctx.scale(s, s);
        ctx.strokeStyle = 'hsl(' + e.hue + ',60%,35%)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
        ctx.beginPath();
        for (let i = 0; i < 4; i++) {
            const sw = Math.sin(time * 10 + i) * 6;
            ctx.moveTo(-15 + i * 10, -12); ctx.lineTo(-19 + i * 10 + sw, 2);
        }
        ctx.stroke();
        ctx.fillStyle = 'hsl(' + e.hue + ',75%,50%)';
        ctx.beginPath(); ctx.ellipse(0, -22, 26, 16, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = 'hsl(' + e.hue + ',75%,38%)';
        ctx.beginPath(); ctx.arc(-22, -24, 11, 0, TAU); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-24, -27, 5, 0, TAU); ctx.fill();
        ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(-25, -27, 2.5, 0, TAU); ctx.fill();
        ctx.restore();
        const bw = 50 * s;
        ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(ex - bw/2, ey - 60 * s, bw, 6);
        ctx.fillStyle = e.boss ? '#ff4757' : '#7bed9f';
        ctx.fillRect(ex - bw/2, ey - 60 * s, bw * Math.max(0, e.hp / e.max), 6);
        if (e.boss) { ctx.font = '20px serif'; ctx.textAlign = 'center'; ctx.fillText('👑', ex, ey - 70 * s); }
    });

    parts.forEach(p => {
        ctx.globalAlpha = Math.max(0, p.life / .7);
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, TAU); ctx.fill();
        ctx.globalAlpha = 1;
    });
    floats.forEach(f => {
        ctx.globalAlpha = Math.min(1, f.life);
        ctx.font = '800 15px Rubik'; ctx.textAlign = 'center';
        ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.7)';
        ctx.strokeText(f.txt, f.x, f.y);
        ctx.fillStyle = f.color; ctx.fillText(f.txt, f.x, f.y);
        ctx.globalAlpha = 1;
    });
    ctx.restore();
}

/* ================= MEJORAS ================= */
const UPDEF = {
    dmg:     { icon:'⚔️', name:'Daño' },
    vit:     { icon:'❤️', name:'Vitalidad' },
    regen:   { icon:'💚', name:'Regeneración' },
    venom:   { icon:'☠️', name:'Veneno' },
    fortune: { icon:'🪙', name:'Fortuna' }
};
const upBtns = {};
Object.keys(UPDEF).forEach(k => {
    const c = document.createElement('div');
    c.className = 'ucard';
    c.innerHTML = '<div class="un">' + UPDEF[k].icon + ' ' + UPDEF[k].name + ' <span class="ul" id="lv_' + k + '">Nv 0</span></div><button class="ubuy" id="buy_' + k + '"></button>';
    $('ups').appendChild(c);
    upBtns[k] = c.querySelector('button');
    upBtns[k].onclick = () => {
        const co = cost(k);
        if (S.gold >= co) {
            S.gold -= co; S.ups[k]++;
            if (k === 'vit') hero.hp = Math.min(maxHP(), hero.hp + maxHP() * 0.3);
            save(); toast(UPDEF[k].icon + ' ' + UPDEF[k].name + ' Nv ' + S.ups[k]);
        }
    };
});

/* ================= LOGROS ================= */
const ACH = [
    { id:'k100',  d:'Eliminá 100 enemigos',     r:{g:300},  c:()=>S.kills>=100 },
    { id:'k1000', d:'Eliminá 1.000 enemigos',   r:{g:3000}, c:()=>S.kills>=1000 },
    { id:'s10',   d:'Llegá a etapa 10',         r:{a:1},    c:()=>S.best>=10 },
    { id:'s25',   d:'Llegá a etapa 25',         r:{a:2},    c:()=>S.best>=25 },
    { id:'s50',   d:'Llegá a etapa 50',         r:{a:3},    c:()=>S.best>=50 },
    { id:'p1',    d:'Hacé tu primer prestigio', r:{a:3},    c:()=>S.prestiges>=1 },
    { id:'d10',   d:'Daño nivel 10',            r:{g:2000}, c:()=>S.ups.dmg>=10 },
    { id:'v5',    d:'Veneno nivel 5',           r:{g:2500}, c:()=>S.ups.venom>=5 }
];
function renderAch() {
    $('achList').innerHTML = '';
    ACH.forEach(a => {
        const done = !!S.ach[a.id], can = !done && a.c();
        const row = document.createElement('div');
        row.className = 'mrow';
        const rew = a.r.g ? '🪙 ' + a.r.g : '🧬 ' + a.r.a;
        row.innerHTML = '<span>' + (done ? '✅' : can ? '🔔' : '🔒') + ' ' + a.d + '<br><small style="color:#8fa3c8">Recompensa: ' + rew + '</small></span>';
        const b = document.createElement('button');
        b.className = 'claim'; b.textContent = done ? 'OK' : 'RECLAMAR';
        b.disabled = !can;
        b.onclick = () => {
            S.ach[a.id] = 1;
            if (a.r.g) S.gold += a.r.g;
            if (a.r.a) S.adn += a.r.a;
            save(); toast('🏅 ¡Logro reclamado!');
            renderAch();
        };
        row.appendChild(b);
        $('achList').appendChild(row);
    });
}

/* ================= PRESTIGIO ================= */
$('btnPrestige').onclick = () => {
    $('prGain').textContent = '+' + prGain() + ' 🧬';
    $('prBtn').disabled = !(S.best >= 10 && prGain() > 0);
    $('mPrestige').style.display = 'flex';
};
$('prClose').onclick = () => $('mPrestige').style.display = 'none';
$('prBtn').onclick = () => {
    const g = prGain();
    if (g <= 0) return;
    S.adn += g; S.prestiges++;
    S.gold = 0; S.stage = 1; S.ks = 0;
    S.ups = { dmg:0, vit:0, regen:0, venom:0, fortune:0 };
    hero = { hp: maxHP(), atkT: 0, venT: 3, lunge: 0, dead: 0 };
    enemies = [];
    save(); submitScore();
    $('mPrestige').style.display = 'none';
    toast('🧬 ¡Prestigio! +' + g + ' ADN');
};

/* ================= MODALES ================= */
$('btnAch').onclick = () => { renderAch(); $('mAch').style.display = 'flex'; };
$('achClose').onclick = () => $('mAch').style.display = 'none';
let LB = [];
$('btnLb').onclick = () => {
    $('lbList').innerHTML = LB.length
        ? LB.map((p, i) => '<div class="mrow"><span>' + (i===0?'🥇':i===1?'🥈':i===2?'🥉':(i+1)+'.') + ' <b style="color:' + (p.name===S.name?'#7CFC7C':'#fff') + '">' + p.name + '</b></span><span>Etapa ' + p.stage + '</span></div>').join('')
        : '<p style="color:#8fa3c8">Todavía no hay nadie en línea...</p>';
    $('mLb').style.display = 'flex';
};
$('lbClose').onclick = () => $('mLb').style.display = 'none';

/* ================= RANKING ONLINE ================= */
let socket = null;
try { socket = io(); } catch (e) {}
if (socket) socket.on('top', list => { LB = list; });
function submitScore() { if (socket && S.name) socket.emit('score', { name: S.name, stage: S.best }); }

/* ================= UI TICK ================= */
function uiTick() {
    $('goldTxt').textContent = fmt(S.gold);
    $('stageTxt').textContent = S.stage;
    $('adnTxt').textContent = S.adn;
    $('bossTag').classList.toggle('hidden', !isBossStage());
    $('hpTxt').textContent = fmt(Math.max(0, hero.hp)) + '/' + fmt(maxHP());
    $('dpsTxt').textContent = fmt(dps());
    $('heroHp').style.width = Math.max(0, hero.hp / maxHP() * 100) + '%';
    Object.keys(UPDEF).forEach(k => {
        $('lv_' + k).textContent = 'Nv ' + S.ups[k];
        const b = upBtns[k];
        b.textContent = '🪙 ' + fmt(cost(k));
        b.disabled = S.gold < cost(k);
    });
    $('prDot').style.display = (S.best >= 10 && prGain() > 0) ? 'block' : 'none';
    $('achDot').style.display = ACH.some(a => !S.ach[a.id] && a.c()) ? 'block' : 'none';
}

/* ================= OFFLINE ================= */
(function offline() {
    const sec = Math.min(Date.now() - S.last, 8 * 3600 * 1000) / 1000;
    const pending = Math.floor(sec * goldKill(S.best) * 0.4);
    if (pending >= 10) {
        $('offlineAmt').textContent = '🪙 ' + fmt(pending);
        $('mOffline').style.display = 'flex';
        $('offlineBtn').onclick = () => {
            S.gold += pending; save();
            $('mOffline').style.display = 'none';
            toast('🪙 +' + fmt(pending) + ' de tu AFK');
        };
    }
})();

/* ================= ARRANQUE ================= */
if (!S.name) {
    $('mStart').style.display = 'flex';
    $('startBtn').onclick = () => {
        S.name = $('nameInput').value.trim() || 'Jugador' + (Math.random()*99|0);
        save();
        $('mStart').style.display = 'none';
        submitScore();
    };
} else submitScore();

/* ================= LOOP ================= */
let lastT = performance.now();
function loop(now) {
    requestAnimationFrame(loop);
    const dt = Math.min(0.1, (now - lastT) / 1000);
    lastT = now;
    if (W === 0) fit();
    update(dt);
    draw();
    uiTick();
}
requestAnimationFrame(loop);