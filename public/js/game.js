// Lógica local, cámara y loop (con modo AUTO idle)
let meTargets = null;

function setAuto(v) {
    G.auto = !!v;
    meTargets = null;
    socket.emit('setAuto', G.auto);
    toast(G.auto ? '🤖 Modo AUTO activado' : '🎮 Control manual');
}

function useAbility(k) {
    if (G.state !== 'playing' || !me.alive || G.auto) return;
    const a = me.abilities[k];
    const st = stats();
    if (a.cd === 0) {
        a.active = AB_DEF[k].dur + (k === 'magnet' ? 30 * st.magnetLvl : 0);
        a.cd = AB_DEF[k].cd * st.cdMult;
        socket.emit('useAbility', k);
        toast(`${AB_DEF[k].icon} ¡${AB_DEF[k].name}!`);
    }
}

function die(reason) {
    if (!me.alive) return;
    me.alive = false;
    G.deathTime = performance.now();
    G.shake = 25;
    burst(me.segments[0].x, me.segments[0].y, `hsl(${me.hue},85%,60%)`, 50);
    const g = bankRun(me.score);
    socket.emit('playerDied', {});
    toast(`🪙 +${g} por tu partida`);
    document.getElementById('deathReason').textContent = reason;
    document.getElementById('deathScore').textContent = `Longitud final: ${me.score}`;
    document.getElementById('death').style.display = 'flex';
    G.state = 'dead';
}

function updateMe() {
    if (!me.alive || G.auto) return;   // en AUTO manda el servidor
    if (G.frame % 2 === 0) {
        Object.keys(me.abilities).forEach(k => {
            const a = me.abilities[k];
            if (a.cd > 0) a.cd--;
            if (a.active > 0) a.active--;
        });
    }

    let ta = null;
    if (isMobile) { if (G.joyActive && G.joyUsed) ta = Math.atan2(G.joyVec.y, G.joyVec.x); }
    else ta = Math.atan2(mouseY - H/2, mouseX - W/2);

    const canMove = !isMobile || G.joyUsed;
    if (ta !== null) {
        let d = ta - me.angle;
        while (d > Math.PI) d -= TAU;
        while (d < -Math.PI) d += TAU;
        me.angle += d * 0.12;
    }

    const head = me.segments[0];
    if (canMove) {
        const speed = (me.abilities.dash.active > 0 ? 2 : 1) * stats().spd;
        head.x = Math.max(0, Math.min(G.worldSize, head.x + Math.cos(me.angle)*speed));
        head.y = Math.max(0, Math.min(G.worldSize, head.y + Math.sin(me.angle)*speed));
    }
    for (let i = 1; i < me.segments.length; i++) {
        const p = me.segments[i-1], s = me.segments[i];
        const dx = p.x-s.x, dy = p.y-s.y, dist = Math.hypot(dx,dy);
        if (dist > 10) { const a = Math.atan2(dy,dx); s.x = p.x-Math.cos(a)*10; s.y = p.y-Math.sin(a)*10; }
    }
    while (me.segments.length > me.maxSegments) me.segments.pop();
    while (me.segments.length < me.maxSegments) {
        const l = me.segments[me.segments.length-1];
        me.segments.push({ x:l.x, y:l.y });
    }

    G.foods = G.foods.filter(f => {
        const dx = f.x-head.x, dy = f.y-head.y, dist = Math.hypot(dx,dy);
        if (dist < 28) {
            const v = f.type === 'big' ? 5 : f.type === 'special' ? 3 : 1;
            me.maxSegments = Math.min(400, me.maxSegments + v);
            me.score += v;
            burst(f.x, f.y, foodColor(f), 8);
            socket.emit('eatFood', f.id);
            return false;
        }
        return true;
    });

    G.remotes.forEach(r => {
        if (!r.alive) return;
        for (let i = 1; i < r.segments.length; i++) {
            const s = r.segments[i];
            if (Math.hypot(s.x-head.x, s.y-head.y) < 24) {
                if (me.abilities.shield.active <= 0) { die(`💀 ${r.name} te eliminó`); return; }
            }
        }
    });
    for (let i = 14; i < me.segments.length; i++) {
        const s = me.segments[i];
        if (Math.hypot(s.x - head.x, s.y - head.y) < 20) {
            die('🌀 ¡Te mordiste tu propio cuerpo!');
            break;
        }
    }
    if (me.alive && canMove &&
        (head.x <= 2 || head.x >= G.worldSize-2 || head.y <= 2 || head.y >= G.worldSize-2)) {
        die('💥 Te estrellaste contra el borde');
    }

    socket.emit('updatePlayer', {
        x: head.x, y: head.y, angle: me.angle, segments: me.segments,
        maxSegments: me.maxSegments, score: me.score, abilities: me.abilities
    });
}

function camera() {
    const h = me.segments[0] || { x: G.worldSize/2, y: G.worldSize/2 };
    let cx = h.x - W/2, cy = h.y - H/2;
    if (G.worldSize > W) cx = Math.max(0, Math.min(G.worldSize - W, cx));
    else cx = (G.worldSize - W) / 2;
    if (G.worldSize > H) cy = Math.max(0, Math.min(G.worldSize - H, cy));
    else cy = (G.worldSize - H) / 2;
    if (G.shake > 0) {
        G.shake--;
        cx += (Math.random()-0.5) * G.shake;
        cy += (Math.random()-0.5) * G.shake;
    }
    return { x: cx, y: cy };
}

function loop() {
    requestAnimationFrame(loop);
    G.frame++;
    const t = performance.now() / 1000;

    ctx.fillStyle = '#0b1020';
    ctx.fillRect(0, 0, W, H);

    if (G.state === 'menu') {
        updateDemo();
        const camX = G.worldSize/2 + Math.cos(t*0.07)*900 - W/2;
        const camY = G.worldSize/2 + Math.sin(t*0.07)*900 - H/2;
        drawGrid(camX, camY);
        demoFoods.forEach(f => drawFood(f, camX, camY, t));
        demoCents.forEach(c => drawCentipede(c, camX, camY, t));
        drawLogo(t);
        return;
    }

    if (G.state === 'playing') updateMe();

    // En AUTO: interpolar mi cuerpo desde el servidor
    if (G.auto && meTargets) {
        while (me.segments.length < meTargets.length) {
            const l = me.segments[me.segments.length-1] || {x:meTargets[0].x,y:meTargets[0].y};
            me.segments.push({ x:l.x, y:l.y });
        }
        if (me.segments.length > meTargets.length) me.segments.length = meTargets.length;
        for (let i = 0; i < me.segments.length; i++) {
            const tg = meTargets[i];
            if (tg) {
                me.segments[i].x += (tg.x - me.segments[i].x) * 0.3;
                me.segments[i].y += (tg.y - me.segments[i].y) * 0.3;
            }
        }
    }

    G.remotes.forEach(r => r.update());

    const cam = camera();
    drawGrid(cam.x, cam.y);
    G.foods.forEach(f => drawFood(f, cam.x, cam.y, t));
    G.remotes.forEach(r => drawCentipede(r, cam.x, cam.y, t));
    if (me.alive) drawCentipede(me, cam.x, cam.y, t);
    drawParticles(cam.x, cam.y);

    if (G.state === 'playing' && me.alive && !isMobile && !G.auto) drawCursorRing();

    // 💰 goteo idle: +monedas cada 10s vivo
    if (G.state === 'playing' && me.alive && G.frame % 600 === 0) {
        addCoins(Math.max(1, Math.floor(1 * stats().coinMult)));
    }

    if (G.state === 'dead') {
        const left = Math.max(0, 5 - (performance.now()-G.deathTime)/1000);
        document.getElementById('respawnTxt').textContent = `Renaciendo en ${Math.ceil(left)}...`;
    }

    updateHUD();
    drawMinimap(cam.x, cam.y);
}
loop();

// ===== Arranque =====
document.getElementById('playBtn').addEventListener('click', () => {
    me.name = document.getElementById('nameInput').value.trim() || 'Jugador';
    me.hue = SKINS[selSkin].hue;
    document.getElementById('menu').style.display = 'none';
    if (!isMobile) document.body.classList.add('playing');
    resetMe(G.worldSize/2, G.worldSize/2);
    socket.emit('joinGame', { name: me.name, color: me.hue, up: SAVE.up });
    G.state = 'playing';
    toast(`🎮 ¡Bienvenido, ${me.name}!`);
    if (isMobile && window.innerHeight > window.innerWidth) {
        setTimeout(() => toast('📱 Girá el celular para jugar mejor'), 1200);
    }
});