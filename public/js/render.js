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

/* Dibuja un frame recortado, centrado y apoyado en el suelo (pies fijos) */
function drawFrame(sp, f, targetH, flash) {
    const fr = sp.frames[f], sc = targetH / sp.maxH;
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

function drawHero(hx, gy, scale) {
    // sombra que respira con el paso
    const ph = time * (enemies.length ? 6 : 3);
    ctx.fillStyle = 'rgba(0,0,0,.35)';
    ctx.beginPath(); ctx.ellipse(hx, gy + 6, (50 - Math.abs(Math.sin(ph)) * 4) * scale, 9 * scale, 0, 0, TAU); ctx.fill();

    ctx.save();
    ctx.translate(hx, gy);

    if (hero.dead > 0) {
        const p = Math.min(1, (4 - hero.dead) * 2.5);
        const e = 1 - Math.pow(1 - p, 3);
        ctx.rotate(-e * 1.5);
        ctx.globalAlpha = 1 - p * .6;
    } else {
        ctx.translate(hero.lunge * 24 - hero.recoil * 7, 0);
    }

    // squash & stretch sutil anclado a los pies
    const sy = 1 + Math.cos(ph * 2) * 0.02;
    ctx.scale(scale * (2 - sy), scale * sy);

    let tilt = 0, f = 0, hop = 0;
    if (hero.dead <= 0) {
        if (hero.lunge > 0.4)      { f = 3; tilt = 0.09; }              // golpe
        else if (hero.atkT <= 0.12){ f = 1; tilt = -0.07; }             // windup
        else {
            f = Math.floor(ph) % 4;
            hop = -Math.abs(Math.sin(ph)) * 2.2;
            tilt = Math.sin(ph) * 0.02 + 0.03;
        }
    }
    ctx.rotate(tilt);
    ctx.translate(0, hop);

    if (SPR.heroWalk.ready) {
        drawFrame(SPR.heroWalk, f, 105, hero.flash);
        if (hero.venFlash > 0) {
            ctx.fillStyle = '#a855f7';
            ctx.beginPath(); ctx.ellipse(66, -52, 12, 8, 0, 0, TAU); ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,.7)';
            ctx.beginPath(); ctx.arc(64, -55, 3, 0, TAU); ctx.fill();
        }
    } else if (SPR.heroIdle.ready) {
        drawFrame(SPR.heroIdle, 0, 100, hero.flash);
    } else {
        for (let i = 0; i < 7; i++) {
            ctx.fillStyle = i % 2 ? '#2ecc71' : '#27ae60';
            ctx.beginPath(); ctx.arc(-i * 16 + 20, -30 + Math.sin(time*6 + i) * 3, 16 - i, 0, TAU); ctx.fill();
        }
    }
    ctx.restore();
}

function drawEnemy(e, gy) {
    const grow = 1 + Math.min(0.5, S.stage * 0.004);
    const pop = e.pop < 1 ? Math.max(0.01, easeOutBack(e.pop)) : 1;
    const s = e.size * grow * pop;
    const ex = e.x + e.lungeX + e.kb;

    ctx.fillStyle = 'rgba(0,0,0,.35)';
    ctx.beginPath(); ctx.ellipse(ex, gy + 6, 34 * s, 8 * s, 0, 0, TAU); ctx.fill();

    const sp = e.boss ? SPR.boss : (e.kind === 'spider' ? SPR.spider : SPR.beetle);
    ctx.save();
    ctx.translate(ex, gy);
    if (e.dying !== null) {
        const p = 1 - Math.max(0, e.dying) / 0.45;
        ctx.rotate(p * 1.35);
        ctx.globalAlpha = 1 - p;
        ctx.translate(0, p * 12);
    } else {
        let hop = 0, tilt = 0, sx = 1, sy = 1;
        if (e.state === 'walk') {
            const pw = time * (e.kind === 'spider' ? 10 : 8);
            hop = -Math.abs(Math.sin(pw)) * 2.5;
            tilt = Math.sin(pw) * 0.035;
        } else if (e.state === 'windup') { tilt = -0.1;  sy = .93; sx = 1.05; }  // se agacha
        else if (e.state === 'strike') { tilt = 0.12;  sx = 1.1; sy = .94; }     // embestida
        else { sy = 1 + Math.sin(time * 3 + e.slot) * .015; sx = 2 - sy; }       // respira
        ctx.rotate(tilt);
        ctx.scale(sx, sy);
        ctx.translate(0, hop);
    }
    ctx.scale(s, s);
    if (sp.ready) drawFrame(sp, 0, e.boss ? 115 : 80, e.flash);
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