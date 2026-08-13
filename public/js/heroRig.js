'use strict';
/* ============================================================
   RIG DE CIENTOPIÉS — animación procedural a 60fps
   Patas con onda metacronal, ojos con tracking, parpadeo,
   antenas con lag, boca por estados, squash & stretch.
   ============================================================ */
function mixCol(h1, h2, t) {
    if (t <= 0) return h1;
    const p = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
    const a = p(h1), b = p(h2);
    return 'rgb(' + Math.round(a[0]+(b[0]-a[0])*t) + ',' + Math.round(a[1]+(b[1]-a[1])*t) + ',' + Math.round(a[2]+(b[2]-a[2])*t) + ')';
}

function legStep(hx, hy, phase, color, o) {
    const swing = Math.sin(phase);
    const lift = Math.max(0, Math.cos(phase));
    const curl = o.deadP > 0 ? -6 : 0;
    const fx = hx + swing * 7;
    const fy = -2 - lift * 6 + curl;
    ctx.strokeStyle = color; ctx.lineWidth = 3.5;
    ctx.beginPath(); ctx.moveTo(hx, hy);
    ctx.quadraticCurveTo(hx + 4, hy + 7, fx, fy);
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(fx, fy, 2, 0, TAU); ctx.fill();
}

function drawHeroRig(o) {
    const P = {
        body:  mixCol('#3ecf70', '#fff', o.flash),
        body2: mixCol('#2fae62', '#fff', o.flash),
        light: mixCol('#a5f7b4', '#fff', o.flash),
        belly: mixCol('#d3f8c0', '#fff', o.flash),
        line:  mixCol('#14351f', '#fff', o.flash * .7),
        leg:   mixCol('#279a55', '#fff', o.flash),
        legD:  mixCol('#1d7a43', '#fff', o.flash),
        ant:   mixCol('#2fae62', '#fff', o.flash),
        mouth: mixCol('#7a2734', '#fff', o.flash * .5),
        tongue:mixCol('#ff8fa3', '#fff', o.flash * .5),
        blush: 'rgba(255,150,160,.35)'
    };
    ctx.save();
    ctx.translate(o.x, o.y);
    if (o.deadP > 0) {
        const e = 1 - Math.pow(1 - o.deadP, 3);
        ctx.rotate(-e * 1.5);
        ctx.globalAlpha = 1 - o.deadP * .6;
    }
    const sy = 1 + Math.cos(o.ph * 2) * 0.02 * (o.state === 'walk' ? 1 : .4);
    ctx.scale(o.scale * (2 - sy), o.scale * sy);
    ctx.translate(o.lunge * 20 - o.recoil * 6, o.hop);
    if (o.state === 'walk') ctx.rotate(0.03);
    if (o.state === 'windup') ctx.rotate(-0.07);
    if (o.state === 'strike') ctx.rotate(0.09);

    const wave = i => Math.sin(o.ph - i * 0.75) * o.amp;
    const SEG = 6;
    const headExt = o.state === 'strike' ? 10 : o.state === 'windup' ? -7 : o.state === 'venom' ? 5 : 0;
    const headX = 30 + headExt, headY = -36 + wave(0) * .6 + (o.state === 'windup' ? 3 : 0);
    ctx.lineCap = 'round';

    // ---- patas LEJANAS (detrás del cuerpo)
    for (let i = SEG - 1; i >= 0; i--) {
        legStep(headX - 8 - i * 14, -16 + wave(i) * .5, o.ph + i * 0.9 + Math.PI, P.legD, o);
    }

    // ---- cuerpo (cola → cuello)
    for (let i = SEG - 1; i >= 0; i--) {
        const bx = headX - 8 - i * 14, by = -16 + wave(i);
        const r = [13, 13.5, 13.5, 13, 12, 10.5][i];
        const g = ctx.createRadialGradient(bx - r*.3, by - r*.4, 1, bx, by, r);
        g.addColorStop(0, P.light); g.addColorStop(.55, P.body); g.addColorStop(1, P.body2);
        ctx.fillStyle = g; ctx.strokeStyle = P.line; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(bx, by, r, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.fillStyle = P.belly;
        ctx.beginPath(); ctx.ellipse(bx, by + r*.45, r*.62, r*.34, 0, 0, TAU); ctx.fill();
    }

    // ---- patas CERCANAS
    for (let i = SEG - 1; i >= 0; i--) {
        legStep(headX - 8 - i * 14, -14 + wave(i) * .5, o.ph + i * 0.9, P.leg, o);
    }

    // ---- cabeza
    const g2 = ctx.createRadialGradient(headX - 5, headY - 7, 2, headX, headY, 18);
    g2.addColorStop(0, P.light); g2.addColorStop(.6, P.body); g2.addColorStop(1, P.body2);
    ctx.fillStyle = g2; ctx.strokeStyle = P.line; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(headX, headY, 17, 0, TAU); ctx.fill(); ctx.stroke();

    // ---- antenas con lag
    for (let k = 0; k < 2; k++) {
        const bx = headX - 4 + k * 10, by = headY - 14;
        const sway = Math.sin(o.t * 2.7 + k * 1.7) * .18 + o.lunge * .3 - o.recoil * .5;
        const a = -1.35 + k * .5 + sway;
        const mx = bx + Math.cos(a) * 10, my = by + Math.sin(a) * 10;
        const ex = bx + Math.cos(a + .5 + sway) * 18, ey = by + Math.sin(a + .5 + sway) * 18;
        ctx.strokeStyle = P.ant; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(bx, by); ctx.quadraticCurveTo(mx, my, ex, ey); ctx.stroke();
        ctx.fillStyle = P.light;
        ctx.beginPath(); ctx.arc(ex, ey, 3.5, 0, TAU); ctx.fill();
    }

    // ---- ojos: parpadeo + pupilas que siguen al enemigo
    for (let k = 0; k < 2; k++) {
        const ex = headX + 1 + k * 10, ey = headY - 4 + k, r = k === 0 ? 6.5 : 6;
        ctx.save();
        ctx.translate(ex, ey);
        ctx.scale(1, Math.max(0.08, 1 - o.blink * .92));
        ctx.fillStyle = '#fff'; ctx.strokeStyle = P.line; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill(); ctx.stroke();
        if (o.deadP > 0) {
            ctx.strokeStyle = '#111'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(-3,-3); ctx.lineTo(3,3); ctx.moveTo(3,-3); ctx.lineTo(-3,3); ctx.stroke();
        } else {
            ctx.fillStyle = '#111';
            ctx.beginPath(); ctx.arc(o.lookX * 2.6, o.lookY * 2.6, 2.9, 0, TAU); ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.arc(o.lookX * 2.6 + 1, o.lookY * 2.6 - 1, 1, 0, TAU); ctx.fill();
        }
        ctx.restore();
        if (o.state === 'windup') {
            ctx.fillStyle = P.body2;
            ctx.beginPath(); ctx.rect(ex - r, ey - r, r * 2, r * .9); ctx.fill();
        }
    }

    // rubor
    ctx.fillStyle = P.blush;
    ctx.beginPath(); ctx.arc(headX - 2, headY + 6, 3.5, 0, TAU); ctx.fill();

    // ---- boca por estado
    const mx = headX + 9, my = headY + 8;
    if (o.state === 'strike' || o.state === 'venom') {
        ctx.fillStyle = P.mouth;
        ctx.beginPath(); ctx.ellipse(mx, my, 6, 7, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = P.tongue;
        ctx.beginPath(); ctx.ellipse(mx, my + 3, 3.5, 2.5, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.moveTo(mx - 4, my - 6); ctx.lineTo(mx - 1.5, my - 2); ctx.lineTo(mx - 6, my - 2); ctx.closePath(); ctx.fill();
    } else if (o.state === 'windup') {
        ctx.fillStyle = P.mouth;
        ctx.beginPath(); ctx.arc(mx, my, 2.5, 0, TAU); ctx.fill();
    } else {
        ctx.strokeStyle = P.line; ctx.lineWidth = 2.2;
        ctx.beginPath(); ctx.arc(mx - 2, my - 2, 6, .2 * Math.PI, .8 * Math.PI); ctx.stroke();
    }

    ctx.restore();
}