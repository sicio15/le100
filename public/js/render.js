'use strict';
const cv = $('cv'), ctx = cv.getContext('2d');
let W = 0, H = 0;
function fit() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    W = cv.clientWidth; H = cv.clientHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', fit);
const easeOutBack = p => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); };
const pingpong = (i, n) => { if (n <= 1) return 0; const m = 2 * (n - 1); const k = i % m; return k < n ? k : m - k; };

function drawFrame(sp, f, targetH, flash) {
    const fr = sp.frames[f];
    if (!fr) return;
    const sc = targetH / sp.maxH;
    const dw = fr.sw * sc, dh = fr.sh * sc;
    ctx.drawImage(sp.cv, fr.sx, fr.sy, fr.sw, fr.sh, -dw / 2, -dh, dw, dh);
    if (flash > 0) {
        ctx.globalAlpha = Math.min(1, flash * 8);
        ctx.drawImage(sp.tint, fr.sx, fr.sy, fr.sw, fr.sh, -dw / 2, -dh, dw, dh);
        ctx.globalAlpha = 1;
    }
}

function drawBG() {
    if (BG.ready) {
        const iw = BG.img.width, ih = BG.img.height;
        const sc = Math.max(W / iw, H / ih);
        const dw = iw * sc, dh = ih * sc;
        ctx.drawImage(BG.img, (W - dw) / 2, H - dh, dw, dh);
        ctx.fillStyle = 'rgba(8,5,18,.28)';
        ctx.fillRect(0, 0, W, H);
    } else {
        const sky = ctx.createLinearGradient(0, 0, 0, H);
        sky.addColorStop(0, '#151030'); sky.addColorStop(1, '#241640');
        ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#1b2b1e'; ctx.fillRect(0, groundY() + 26, W, H);
    }
    flies.forEach(f => {
        const x = (f.x + Math.sin(time * .12 * f.s + f.p) * .06) * W;
        const y = (f.y + Math.sin(time * .2 * f.s + f.p * 2) * .05) * H;
        const a = .35 + Math.sin(time * 2.4 * f.s + f.p) * .3;
        ctx.fillStyle = 'rgba(255,220,110,' + Math.max(0, a) + ')';
        ctx.beginPath(); ctx.arc(x, y, 2.2, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(255,220,110,' + Math.max(0, a * .3) + ')';
        ctx.beginPath(); ctx.arc(x, y, 5, 0, TAU); ctx.fill();
    });
}

/* ===== HÉROE: máquina de estados de clips ===== */
const CLIPS = {
    idle:   { sp: () => SPR.heroIdle,   fps: 2,  loop: true  },
    walk:   { sp: () => SPR.heroWalk,   fps: 8,  loop: true  },
    strike: { sp: () => SPR.heroAttack, fps: 10, loop: false },
    venom:  { sp: () => SPR.heroCast,   fps: 7,  loop: false },
    hurt:   { sp: () => SPR.heroHurt,   fps: 8,  loop: false },
    dead:   { sp: () => SPR.heroDeath,  fps: 4,  loop: false }
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
    HA.t += dt;

    const clip = CLIPS[st];
    const sp = clip.sp();
    const n = sp.ready ? sp.frames.length : 0;
    let f = 0;
    if (n) {
        f = Math.floor(HA.t * clip.fps);
        f = clip.loop ? f % n : Math.min(f, n - 1);
    }

    // sombra
    const phW = time * 7;
    ctx.fillStyle = 'rgba(0,0,0,.35)';
    ctx.beginPath(); ctx.ellipse(hx, gy + 6, (50 - (st === 'walk' ? Math.abs(Math.sin(phW)) * 4 : 0)) * scale, 9 * scale, 0, 0, TAU); ctx.fill();

    ctx.save();
    ctx.translate(hx, gy);
    if (st === 'dead') {
        const p = Math.min(1, (4 - hero.dead) * 2.5);
        ctx.rotate(-(1 - Math.pow(1 - p, 3)) * 1.5);
        ctx.globalAlpha = 1 - p * .6;
    } else {
        ctx.translate(hero.lunge * 22 - hero.recoil * 7, st === 'walk' ? -Math.abs(Math.sin(phW)) * 2.2 : 0);
    }
    const sy = 1 + Math.cos(phW * 2) * (st === 'walk' ? 0.02 : 0.008);
    ctx.scale(scale * (2 - sy), scale * sy);
    if (st === 'walk') ctx.rotate(0.02);
    if (st === 'strike') ctx.rotate(0.06);
    if (st === 'windup') ctx.rotate(-0.05);

    if (sp.ready) drawFrame(sp, f, 105, hero.flash);
    else {
        for (let i = 0; i < 7; i++) {
            ctx.fillStyle = i % 2 ? '#2ecc71' : '#27ae60';
            ctx.beginPath(); ctx.arc(-i * 16 + 20, -30, 16 - i, 0, TAU); ctx.fill();
        }
    }
    ctx.restore();
}

/* ===== ENEMIGOS: walk cycle + estados ===== */
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
    const ti = Math.floor(time * fps + e.slot * 1.7);
    const moving = e.state === 'walk';
    const f = n ? ((e.boss || n <= 2) ? pingpong(ti, n) : (moving ? ti % n : Math.floor(time * 2) % n)) : 0;

    ctx.save();
    ctx.translate(ex, gy);
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
        ctx.rotate(tilt); ctx.scale(sx, sy); ctx.translate(0, hop);
    }
    ctx.scale(s, s);
    if (sp.ready) drawFrame(sp, f, e.boss ? 115 : 80, e.flash);
    else {
        ctx.fillStyle = 'hsl(' + e.hue + ',75%,50%)';
        ctx.beginPath(); ctx.ellipse(0, -22, 26, 16, 0, 0, TAU); ctx.fill();
    }
    ctx.restore();

    const bw = 56 * s;
    ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(ex - bw/2, gy - 82 * s, bw, 6);
    ctx.fillStyle = e.boss ? '#ff4757' : '#7bed9f';
    ctx.fillRect(ex - bw/2, gy - 82 * s, bw * Math.max(0, e.hp / e.max), 6);
}

function draw() {
    ctx.clearRect(0, 0, W, H);
    drawBG();
    let ox = 0, oy = 0;
    if (shake > 0) { ox = (Math.random()-.5)*shake; oy = (Math.random()-.5)*shake; }
    ctx.save(); ctx.translate(ox, oy);
    const hx = heroX(), gy = groundY();

    if (S.adn > 0) {
        ctx.fillStyle = 'rgba(126,252,252,.12)';
        ctx.beginPath(); ctx.arc(hx, gy - 40, 70, 0, TAU); ctx.fill();
    }

    dust.forEach(d => {
        ctx.globalAlpha = d.life * .5;
        ctx.fillStyle = '#cbb';
        ctx.beginPath(); ctx.arc(d.x, d.y - (0.5 - d.life) * 14, 3.5, 0, TAU); ctx.fill();
        ctx.globalAlpha = 1;
    });

    const scale = 1 + Math.min(0.6, (S.ups.dmg + S.ups.vit) * 0.012);
    drawHero(hx, gy, scale);
    enemies.forEach(e => drawEnemy(e, gy));

    coins.forEach(c => {
        const t = c.t, x = c.x + c.ox * (1 - t) * t * 4 + (20 - c.x) * t * t, y = c.y + c.oy * (1 - t) + (-30 - c.y) * t * t;
        ctx.fillStyle = '#ffd700';
        ctx.beginPath(); ctx.arc(x, y, 5, 0, TAU); ctx.fill();
        ctx.fillStyle = '#fff2b0';
        ctx.beginPath(); ctx.arc(x - 1.5, y - 1.5, 2, 0, TAU); ctx.fill();
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

    if (stageFlash > 0) {
        ctx.fillStyle = 'rgba(255,215,0,' + (stageFlash * .5) + ')';
        ctx.fillRect(0, 0, W, H);
    }
}