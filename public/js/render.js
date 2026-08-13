'use strict';
const cv = $('cv'), ctx = cv.getContext('2d');
let W = 0, H = 0;
function fit() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    W = cv.clientWidth; H = cv.clientHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;   // 🕹️ pixel perfecto
}
window.addEventListener('resize', fit);
const easeOutBack = p => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); };
const pingpong = (i, n) => { if (n <= 1) return 0; const m = 2 * (n - 1); const k = ((i % m) + m) % m; return k < n ? k : m - k; };

// Fondo por capítulo (con fallback al bosque)
const bgCache = {};
function getBG() {
    const src = chapterOf(S.stage).bg;
    if (bgCache[src]) return bgCache[src];
    const o = { ready:false, img:null };
    const i = new Image();
    i.onload = () => { o.img = i; o.ready = true; };
    i.onerror = () => { bgCache[src] = BG; };   // fallback
    i.src = src;
    bgCache[src] = o;
    return o;
}

function drawFrame(sp, f, targetH, flash) {
    const fr = sp.frames[f];
    if (!fr) return;
    const sc = targetH / sp.maxH;
    const dw = Math.round(fr.sw * sc), dh = Math.round(fr.sh * sc);
    ctx.drawImage(sp.cv, fr.sx, fr.sy, fr.sw, fr.sh, -dw / 2, -dh, dw, dh);
    if (flash > 0) {
        ctx.globalAlpha = Math.min(1, flash * 8);
        ctx.drawImage(sp.tint, fr.sx, fr.sy, fr.sw, fr.sh, -dw / 2, -dh, dw, dh);
        ctx.globalAlpha = 1;
    }
}

function drawBG() {
    const bg = getBG();
    if (bg.ready) {
        const iw = bg.img.width, ih = bg.img.height;
        const sc = Math.max(W / iw, H / ih);
        const dw = iw * sc, dh = ih * sc;
        ctx.drawImage(bg.img, (W - dw) / 2, H - dh, dw, dh);
        ctx.fillStyle = 'rgba(8,5,18,.25)';
        ctx.fillRect(0, 0, W, H);
    } else {
        const sky = ctx.createLinearGradient(0, 0, 0, H);
        sky.addColorStop(0, '#151030'); sky.addColorStop(1, '#241640');
        ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#1b2b1e'; ctx.fillRect(0, groundY() + 26, W, H);
    }
    if (!SETTINGS.reduceFx) {
        flies.forEach(f => {
            const x = (f.x + Math.sin(time * .12 * f.s + f.p) * .06) * W;
            const y = (f.y + Math.sin(time * .2 * f.s + f.p * 2) * .05) * H;
            const a = .35 + Math.sin(time * 2.4 * f.s + f.p) * .3;
            ctx.fillStyle = 'rgba(255,220,110,' + Math.max(0, a) + ')';
            ctx.fillRect(Math.round(x), Math.round(y), 2, 2);
        });
    }
}

/* ===== HÉROE: máquina de estados de clips ===== */
const CLIPS = {
    idle:   { sp: () => SPR.heroIdle,   fps: 2,  loop: true  },
    walk:   { sp: () => SPR.heroWalk,   fps: 8,  loop: true  },
    strike: { sp: () => SPR.heroAttack, fps: 10, loop: false },
    venom:  { sp: () => SPR.heroCast,   fps: 7,  loop: false },
    hurt:   { sp: () => SPR.heroHurt,   fps: 8,  loop: false },
    dead:   { sp: () => SPR.heroHurt,   fps: 4,  loop: false }
};
const HA = { st: '', t: 0, last: 0 };

function drawHero(hx, gy, scale) {
    const dt = Math.max(0, time - HA.last); HA.last = time;
    const st = hero.dead > 0 ? 'dead'
        : hero.flash > 0 ? 'hurt'
        : hero.lunge > 0.35 ? 'strike'
        : hero.venFlash > 0 ? 'venom'
        : enemies.length ? 'walk' : 'idle';
    if (st !== HA.st) { HA.st = st; HA.t = 0; }
    HA.t += dt * SETTINGS.speed;

    const clip = CLIPS[st];
    const sp = clip.sp();
    const n = sp.ready ? sp.frames.length : 0;
    let f = 0;
    if (n) { f = Math.floor(HA.t * clip.fps); f = clip.loop ? f % n : Math.min(f, n - 1); }

    const phW = time * 7;
    ctx.fillStyle = 'rgba(0,0,0,.35)';
    ctx.beginPath(); ctx.ellipse(hx, gy + 6, (50 - (st === 'walk' ? Math.abs(Math.sin(phW)) * 4 : 0)) * scale, 9 * scale, 0, 0, TAU); ctx.fill();

    ctx.save();
    ctx.translate(Math.round(hx), Math.round(gy));
    if (st === 'dead') {
        const p = Math.min(1, (4 - hero.dead) * 2.5);
        ctx.rotate(-(1 - Math.pow(1 - p, 3)) * 1.5);
        ctx.globalAlpha = 1 - p * .6;
    } else {
        ctx.translate(Math.round(hero.lunge * 22 - hero.recoil * 7), st === 'walk' ? Math.round(-Math.abs(Math.sin(phW)) * 2.2) : 0);
    }
    const sy = 1 + Math.cos(phW * 2) * (st === 'walk' ? 0.02 : 0.008);
    ctx.scale(scale * (2 - sy), scale * sy);
    if (st === 'walk') ctx.rotate(0.02);
    if (st === 'strike') ctx.rotate(0.06);

    if (sp.ready) drawFrame(sp, f, 105, hero.flash);
    else {
        for (let i = 0; i < 7; i++) {
            ctx.fillStyle = i % 2 ? '#2ecc71' : '#27ae60';
            ctx.fillRect(-i * 16 + 20, -30, 16 - i, 16 - i);
        }
    }
    ctx.restore();

    if (hero.venFlash > 0) {
        ctx.fillStyle = '#a855f7';
        ctx.fillRect(Math.round(hx + 50 * scale), Math.round(gy - 32 * scale), 12, 8);
    }
}

function drawEnemy(e, gy) {
    const grow = 1 + Math.min(0.5, S.stage * 0.004);
    const pop = e.pop < 1 ? Math.max(0.01, easeOutBack(e.pop)) : 1;
    const s = e.size * grow * pop;
    const ex = e.x + e.lungeX + e.kb;

    ctx.fillStyle = 'rgba(0,0,0,.35)';
    ctx.beginPath(); ctx.ellipse(ex, gy + 6, 34 * s, 8 * s, 0, 0, TAU); ctx.fill();

    const sp = e.boss ? SPR.boss : (e.kind === 'spider' ? SPR.spider : SPR.beetle);
    const fps = e.boss ? 3 : (e.kind === 'spider' ? 10 : 7);
    const n = sp.ready ? sp.frames.length : 0;
    const ti = Math.floor(time * fps * SETTINGS.speed + e.slot * 1.7);
    const moving = e.state === 'walk';
    const f = n ? ((e.boss || n <= 2) ? pingpong(ti, n) : (moving ? ti % n : Math.floor(time * 2) % n)) : 0;

    ctx.save();
    ctx.translate(Math.round(ex), Math.round(gy));
    if (e.dying !== null) {
        const p = 1 - Math.max(0, e.dying) / 0.45;
        ctx.rotate(p * 1.35); ctx.globalAlpha = 1 - p; ctx.translate(0, p * 12);
    } else {
        let hop = 0, tilt = 0, sx = 1, sy = 1;
        if (moving) {
            const pw = time * (e.kind === 'spider' ? 10 : 8);
            hop = -Math.abs(Math.sin(pw)) * 2.5;
            tilt = Math.sin(pw) * 0.035;
        } else if (e.state === 'windup') { tilt = -0.1; sy = .93; sx = 1.05; }
        else if (e.state === 'strike') { tilt = 0.12; sx = 1.1; sy = .94; }
        else { sy = 1 + Math.sin(time * 3 + e.slot) * .015; sx = 2 - sy; }
        ctx.rotate(tilt); ctx.scale(sx, sy); ctx.translate(0, Math.round(hop));
    }
    ctx.scale(s, s);
    if (sp.ready) drawFrame(sp, f, e.boss ? 115 : 80, e.flash);
    else { ctx.fillStyle = 'hsl(' + e.hue + ',75%,50%)'; ctx.fillRect(-26, -38, 52, 32); }
    ctx.restore();

    const bw = 56 * s;
    ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(Math.round(ex - bw/2), Math.round(gy - 82 * s), Math.round(bw), 6);
    ctx.fillStyle = e.boss ? '#ff4757' : '#7bed9f';
    ctx.fillRect(Math.round(ex - bw/2), Math.round(gy - 82 * s), Math.round(bw * Math.max(0, e.hp / e.max)), 6);
}

function draw() {
    ctx.clearRect(0, 0, W, H);
    drawBG();
    let ox = 0, oy = 0;
    if (shake > 0) { ox = (Math.random()-.5)*shake; oy = (Math.random()-.5)*shake; }
    ctx.save(); ctx.translate(Math.round(ox), Math.round(oy));
    const hx = heroX(), gy = groundY();

    if (S.adn > 0) {
        ctx.fillStyle = 'rgba(126,252,252,.12)';
        ctx.beginPath(); ctx.arc(hx, gy - 40, 70, 0, TAU); ctx.fill();
    }
    dust.forEach(d => {
        ctx.globalAlpha = d.life * .5; ctx.fillStyle = '#cbb';
        ctx.fillRect(Math.round(d.x), Math.round(d.y - (0.5 - d.life) * 14), 4, 4);
        ctx.globalAlpha = 1;
    });

    const scale = 1 + Math.min(0.6, (S.ups.dmg + S.ups.vit) * 0.012);
    drawHero(hx, gy, scale);
    enemies.forEach(e => drawEnemy(e, gy));

    coins.forEach(c => {
        const t = c.t, x = c.x + c.ox * (1 - t) * t * 4 + (20 - c.x) * t * t, y = c.y + c.oy * (1 - t) + (-30 - c.y) * t * t;
        ctx.fillStyle = '#ffd700'; ctx.fillRect(Math.round(x)-3, Math.round(y)-3, 6, 6);
        ctx.fillStyle = '#fff2b0'; ctx.fillRect(Math.round(x)-1, Math.round(y)-1, 2, 2);
    });
    parts.forEach(p => {
        ctx.globalAlpha = Math.max(0, p.life / .7); ctx.fillStyle = p.color;
        ctx.fillRect(Math.round(p.x)-1, Math.round(p.y)-1, 3, 3);
        ctx.globalAlpha = 1;
    });
    floats.forEach(f => {
        ctx.globalAlpha = Math.min(1, f.life);
        ctx.font = (f.big ? '900 22px ' : '800 15px ') + 'Orbitron, Rubik';
        ctx.textAlign = 'center';
        ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.8)';
        ctx.strokeText(f.txt, Math.round(f.x), Math.round(f.y));
        ctx.fillStyle = f.color; ctx.fillText(f.txt, Math.round(f.x), Math.round(f.y));
        ctx.globalAlpha = 1;
    });
    ctx.restore();

    if (stageFlash > 0) { ctx.fillStyle = 'rgba(255,215,0,' + (stageFlash * .5) + ')'; ctx.fillRect(0, 0, W, H); }
}