// Todo el dibujo del juego
function segSize(i) { return i === 0 ? 16 : Math.max(9, 13 - i * 0.05); }

function drawCentipede(c, camX, camY, t) {
    const segs = c.segments;
    if (!segs || !segs.length || !c.alive) return;
    const head = segs[0];
    const sx = head.x - camX, sy = head.y - camY;
    const margin = segs.length * 10 + 160;
    if (sx < -margin || sx > W+margin || sy < -margin || sy > H+margin) return;

    const hue = c.hue;
    const ab = c.abilities || {};

    if (ab.poison && ab.poison.active > 0) {
        const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, 55);
        g.addColorStop(0, 'rgba(160,32,240,.35)'); g.addColorStop(1, 'rgba(160,32,240,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sx, sy, 55, 0, TAU); ctx.fill();
    }
    if (ab.magnet && ab.magnet.active > 0) {
        ctx.save();
        ctx.strokeStyle = 'rgba(78,205,196,.5)'; ctx.lineWidth = 2;
        ctx.setLineDash([10, 12]); ctx.lineDashOffset = -t * 60;
        ctx.beginPath(); ctx.arc(sx, sy, 90, 0, TAU); ctx.stroke();
        ctx.restore();
    }
    if (ab.dash && ab.dash.active > 0) {
        for (let i = 2; i < Math.min(segs.length, 10); i += 2) {
            const s = segs[i];
            ctx.globalAlpha = 0.15;
            ctx.fillStyle = `hsl(${hue},85%,60%)`;
            ctx.beginPath(); ctx.arc(s.x-camX, s.y-camY, segSize(i)+4, 0, TAU); ctx.fill();
            ctx.globalAlpha = 1;
        }
    }

    // Patas animadas
    ctx.lineCap = 'round';
    for (let i = segs.length-1; i >= 1; i--) {
        const p = segs[i], prev = segs[i-1];
        const bx = p.x-camX, by = p.y-camY;
        if (bx < -60 || bx > W+60 || by < -60 || by > H+60) continue;
        const ang = Math.atan2(p.y-prev.y, p.x-prev.x);
        const sz = segSize(i);
        ctx.strokeStyle = `hsl(${hue},70%,38%)`; ctx.lineWidth = 3;
        for (const side of [-1, 1]) {
            const la = ang + side * (Math.PI/2 + Math.sin(t*12 + i*0.9) * 0.45);
            ctx.beginPath(); ctx.moveTo(bx, by);
            ctx.lineTo(bx + Math.cos(la)*(sz+7), by + Math.sin(la)*(sz+7));
            ctx.stroke();
        }
    }

    // Cuerpo con franjas
    for (let i = segs.length-1; i >= 0; i--) {
        const s = segs[i];
        const bx = s.x-camX, by = s.y-camY;
        if (bx < -60 || bx > W+60 || by < -60 || by > H+60) continue;
        const sz = segSize(i);
        const light = i % 2 === 0 ? 55 : 45;
        const h2 = i % 6 === 0 ? (hue+35) % 360 : hue;
        const g = ctx.createRadialGradient(bx-sz*0.3, by-sz*0.3, 1, bx, by, sz);
        g.addColorStop(0, `hsl(${h2},90%,${light+18}%)`);
        g.addColorStop(1, `hsl(${h2},85%,${light-12}%)`);
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(bx, by, sz, 0, TAU); ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 1.5; ctx.stroke();
    }

    // Antenas y ojos
    const ha = c.angle;
    ctx.strokeStyle = `hsl(${hue},90%,70%)`; ctx.lineWidth = 2.5;
    for (const side of [-1, 1]) {
        const a1 = ha + side*0.5, a2 = ha + side*0.9;
        const ex = sx + Math.cos(a2)*26, ey = sy + Math.sin(a2)*26;
        ctx.beginPath(); ctx.moveTo(sx, sy);
        ctx.quadraticCurveTo(sx+Math.cos(a1)*14, sy+Math.sin(a1)*14, ex, ey);
        ctx.stroke();
        ctx.fillStyle = `hsl(${(hue+40)%360},95%,70%)`;
        ctx.beginPath(); ctx.arc(ex, ey, 3, 0, TAU); ctx.fill();
    }
    for (const side of [-1, 1]) {
        const ea = ha + side*0.42;
        const ex = sx + Math.cos(ea)*8, ey = sy + Math.sin(ea)*8;
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(ex, ey, 5, 0, TAU); ctx.fill();
        ctx.fillStyle = '#111';
        ctx.beginPath(); ctx.arc(ex+Math.cos(ha)*2.2, ey+Math.sin(ha)*2.2, 2.5, 0, TAU); ctx.fill();
    }

    if (ab.shield && ab.shield.active > 0) {
        ctx.save();
        ctx.strokeStyle = 'rgba(0,255,255,.85)'; ctx.lineWidth = 3;
        ctx.fillStyle = 'rgba(0,255,255,.1)';
        ctx.setLineDash([14, 8]); ctx.lineDashOffset = t * 80;
        ctx.beginPath(); ctx.arc(sx, sy, 26, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.restore();
    }

    if (c.name) {
        ctx.font = '800 13px Rubik'; ctx.textAlign = 'center';
        ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,.7)';
        ctx.strokeText(c.name, sx, sy-26);
        ctx.fillStyle = '#fff'; ctx.fillText(c.name, sx, sy-26);
    }
}

function drawFood(f, camX, camY, t) {
    const x = f.x-camX, y = f.y-camY;
    if (x < -40 || x > W+40 || y < -40 || y > H+40) return;
    const col = foodColor(f);
    const pulse = Math.sin(t*4 + f.id) * 1.5;
    if (f.type === 'big') {
        ctx.save(); ctx.shadowColor = col; ctx.shadowBlur = 18;
        ctx.fillStyle = col;
        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
            const r = i % 2 === 0 ? 11+pulse : 5;
            const a = (Math.PI/5)*i - Math.PI/2 + t;
            ctx.lineTo(x+Math.cos(a)*r, y+Math.sin(a)*r);
        }
        ctx.closePath(); ctx.fill(); ctx.restore();
    } else if (f.type === 'special') {
        ctx.save(); ctx.translate(x, y); ctx.rotate(t*2);
        ctx.fillStyle = col; ctx.shadowColor = col; ctx.shadowBlur = 8;
        const s = 7+pulse*0.5;
        ctx.fillRect(-s/1.4, -s/1.4, s*1.4, s*1.4);
        ctx.restore();
    } else {
        ctx.fillStyle = col + '44';
        ctx.beginPath(); ctx.arc(x, y, 8+pulse, 0, TAU); ctx.fill();
        ctx.fillStyle = col;
        ctx.beginPath(); ctx.arc(x, y, 4.5+pulse*0.5, 0, TAU); ctx.fill();
    }
}

function drawGrid(camX, camY) {
    ctx.strokeStyle = 'rgba(120,150,255,.06)'; ctx.lineWidth = 1;
    const gs = 100;
    const x0 = Math.floor(camX/gs)*gs, y0 = Math.floor(camY/gs)*gs;
    ctx.beginPath();
    for (let x = x0; x < camX+W+gs; x += gs) { ctx.moveTo(x-camX, 0); ctx.lineTo(x-camX, H); }
    for (let y = y0; y < camY+H+gs; y += gs) { ctx.moveTo(0, y-camY); ctx.lineTo(W, y-camY); }
    ctx.stroke();
    ctx.save();
    ctx.strokeStyle = 'rgba(255,60,60,.8)'; ctx.lineWidth = 6;
    ctx.shadowColor = '#f00'; ctx.shadowBlur = 20;
    ctx.strokeRect(-camX, -camY, G.worldSize, G.worldSize);
    ctx.restore();
}

function drawParticles(camX, camY) {
    for (let i = particles.length-1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx; p.y += p.vy; p.vx *= 0.96; p.vy *= 0.96; p.life--;
        if (p.life <= 0) { particles.splice(i, 1); continue; }
        ctx.globalAlpha = p.life / p.max;
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x-camX, p.y-camY, p.size, 0, TAU); ctx.fill();
        ctx.globalAlpha = 1;
    }
}

function drawMinimap(camX, camY) {
    const S = 170, sc = S / G.worldSize;
    mm.clearRect(0, 0, S, S);
    mm.fillStyle = 'rgba(5,10,20,.9)'; mm.fillRect(0, 0, S, S);
    for (let i = 0; i < G.foods.length; i += 4) {
        const f = G.foods[i];
        mm.fillStyle = f.type === 'big' ? '#ffd700' : 'rgba(255,255,255,.25)';
        mm.fillRect(f.x*sc, f.y*sc, f.type === 'big' ? 2 : 1, f.type === 'big' ? 2 : 1);
    }
    // Otros cienpies (humanos + bots), bien visibles
    G.remotes.forEach(r => {
        if (!r.alive || !r.segments[0]) return;
        mm.fillStyle = `hsl(${r.hue},90%,60%)`;
        mm.strokeStyle = '#fff'; mm.lineWidth = 1;
        mm.beginPath(); mm.arc(r.segments[0].x*sc, r.segments[0].y*sc, 3, 0, TAU); mm.fill(); mm.stroke();
    });
    if (me.alive && me.segments[0]) {
        mm.fillStyle = '#7CFC7C';
        mm.strokeStyle = '#fff'; mm.lineWidth = 1.5;
        mm.beginPath(); mm.arc(me.segments[0].x*sc, me.segments[0].y*sc, 4, 0, TAU); mm.fill(); mm.stroke();
    }
    if (!isMobile) {
        mm.strokeStyle = 'rgba(255,255,255,.35)'; mm.lineWidth = 1;
        mm.strokeRect(camX*sc, camY*sc, W*sc, H*sc);
    }
    mm.strokeStyle = 'rgba(255,60,60,.6)'; mm.lineWidth = 1;
    mm.strokeRect(0.5, 0.5, S-1, S-1);
}

// Logo animado del menú
const logoCtx = document.getElementById('logoCanvas').getContext('2d');
function drawLogo(t) {
    logoCtx.clearRect(0, 0, 190, 150);
    const pts = [];
    for (let i = 0; i < 14; i++) {
        const a = t*1.2 - i*0.28;
        const r = 34 + Math.sin(t*2 + i*0.5)*6;
        pts.push({ x: 95 + Math.cos(a)*r*1.25, y: 78 + Math.sin(a)*r*0.75 });
    }
    const fake = { segments: pts, angle: Math.atan2(pts[0].y-pts[1].y, pts[0].x-pts[1].x),
        hue: 120, name: '', alive: true, abilities: {} };
    const prev = ctx; ctx = logoCtx;
    const ow = W, oh = H; W = 190; H = 150;
    drawCentipede(fake, 0, 0, t);
    ctx = prev; W = ow; H = oh;
}

function drawCursorRing() {
    ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(mouseX, mouseY, 9, 0, TAU); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.25)';
    ctx.beginPath(); ctx.arc(mouseX, mouseY, 15, 0, TAU); ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(mouseX, mouseY, 2, 0, TAU); ctx.fill();
}