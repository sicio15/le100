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
    // luciérnagas ambientales
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
    ctx.fillStyle = 'rgba(0,0,0,.35)';
    ctx.beginPath(); ctx.ellipse(hx, gy + 6, 52 * scale, 10 * scale, 0, 0, TAU); ctx.fill();
    ctx.save();
    ctx.translate(hx, gy);
    if (hero.dead > 0) {
        const p = Math.min(1, (4 - hero.dead) * 2);
        ctx.rotate(-p * 1.4);
        ctx.globalAlpha = 0.45 + 0.55 * (1 - p);
    } else ctx.translate(hero.lunge * 22, 0);
    const breath = 1 + Math.sin(time * 3) * 0.015;
    ctx.scale(scale, scale * breath);
    const sheet = SPR.heroWalk;
    if (sheet.ready) {
        const fw = sheet.cv.width / 4, fh = sheet.cv.height;
        let f = 0, hop = 0, tilt = 0;
        if (hero.dead <= 0) {
            if (hero.lunge > 0.4) { f = 2; tilt = 0.07; }
            else {
                const ph = time * 5;
                f = Math.floor(ph) % 4;
                hop = -Math.abs(Math.sin(ph)) * 2;
                tilt = Math.sin(ph) * 0.02;
            }
        }
        ctx.rotate(tilt);
        ctx.drawImage(sheet.cv, f * fw, 0, fw, fh, -70, -100 + hop, 140, 100);
        if (hero.flash > 0) {
            ctx.globalAlpha = Math.min(1, hero.flash * 8);
            ctx.drawImage(sheet.tint, f * fw, 0, fw, fh, -70, -100 + hop, 140, 100);
            ctx.globalAlpha = 1;
        }
        if (hero.venFlash > 0) {
            ctx.fillStyle = '#a855f7';
            ctx.beginPath(); ctx.ellipse(72, -52, 12, 8, 0, 0, TAU); ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,.7)';
            ctx.beginPath(); ctx.arc(70, -55, 3, 0, TAU); ctx.fill();
        }
    } else if (SPR.heroIdle.ready) {
        ctx.drawImage(SPR.heroIdle.cv, -70, -95, 140, 100);
    } else {
        for (let i = 0; i < 7; i++) {
            ctx.fillStyle = i % 2 ? '#2ecc71' : '#27ae60';
            ctx.beginPath(); ctx.arc(-i * 16 + 20, -30 + Math.sin(time*6 + i) * 3, 16 - i, 0, TAU); ctx.fill();
        }
    }
    ctx.restore();
}

function drawEnemy(e, gy) {
    const s = e.size * (1 + Math.min(0.5, S.stage * 0.004)) * (0.6 + 0.4 * e.pop);
    const ex = e.x + e.lungeX;
    ctx.fillStyle = 'rgba(0,0,0,.35)';
    ctx.beginPath(); ctx.ellipse(ex, gy + 6, 34 * s, 8 * s, 0, 0, TAU); ctx.fill();
    const sp = e.boss ? SPR.boss : (e.kind === 'spider' ? SPR.spider : SPR.beetle);
    ctx.save();
    ctx.translate(ex, gy);
    if (e.dying !== null) {
        const p = 1 - Math.max(0, e.dying) / 0.45;
        ctx.rotate(p * 1.3); ctx.globalAlpha = 1 - p; ctx.translate(0, p * 10);
    } else {
        let hop = 0, tilt = 0;
        if (e.state === 'walk') {
            const ph = time * (e.kind === 'spider' ? 9 : 7);
            hop = -Math.abs(Math.sin(ph)) * 2.5;
            tilt = Math.sin(ph) * 0.03;
        } else if (e.state === 'windup') tilt = -0.08;
        else if (e.state === 'strike') tilt = 0.1;
        else tilt = Math.sin(time * 2.5 + e.slot) * 0.015;
        ctx.rotate(tilt); ctx.translate(0, hop);
    }
    ctx.scale(s, s);
    if (sp.ready) {
        const w = e.boss ? 160 : 100, h = e.boss ? 115 : 78;
        ctx.drawImage(sp.cv, -w / 2, -h + 8, w, h);
        if (e.flash > 0 && e.dying === null) {
            ctx.globalAlpha = Math.min(1, e.flash * 8);
            ctx.drawImage(sp.tint, -w / 2, -h + 8, w, h);
            ctx.globalAlpha = 1;
        }
    } else {
        ctx.fillStyle = 'hsl(' + e.hue + ',75%,50%)';
        ctx.beginPath(); ctx.ellipse(0, -22, 26, 16, 0, 0, TAU); ctx.fill();
    }
    ctx.restore();
    const bw = 56 * s;
    ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(ex - bw/2, gy - 78 * s, bw, 6);
    ctx.fillStyle = e.boss ? '#ff4757' : '#7bed9f';
    ctx.fillRect(ex - bw/2, gy - 78 * s, bw * Math.max(0, e.hp / e.max), 6);
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