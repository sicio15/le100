'use strict';
function chroma(g, c) {
    const w = c.width, h = c.height;
    const d = g.getImageData(0, 0, w, h), px = d.data;
    const seen = new Uint8Array(w * h);
    const st = [0, w - 1, (h - 1) * w, (h - 1) * w + w - 1];
    const isW = i => { const j = i * 4; return px[j] > 205 && px[j+1] > 205 && px[j+2] > 200; };
    while (st.length) {
        const i = st.pop();
        if (i < 0 || i >= w * h || seen[i]) continue;
        seen[i] = 1;
        if (!isW(i)) continue;
        px[i*4+3] = 0;
        const x = i % w;
        if (x > 0) st.push(i - 1);
        if (x < w - 1) st.push(i + 1);
        st.push(i - w, i + w);
    }
    g.putImageData(d, 0, 0);
}
/* Detecta los frames automáticamente (cualquier grilla) por connected
   components y los ordena en orden de lectura (filas de arriba a abajo) */
function analyze(c) {
    const w = c.width, h = c.height;
    const d = c.getContext('2d').getImageData(0, 0, w, h).data;
    const vis = new Uint8Array(w * h);
    const stack = [];
    const blobs = [];
    function tryPush(j) { if (!vis[j] && d[j*4+3] >= 25) { vis[j] = 1; stack.push(j); } }
    for (let y = 0; y < h; y += 2) {
        for (let x = 0; x < w; x += 2) {
            const i = y * w + x;
            if (vis[i] || d[i*4+3] < 25) continue;
            let minX = x, maxX = x, minY = y, maxY = y;
            stack.length = 0; stack.push(i); vis[i] = 1;
            while (stack.length) {
                const j = stack.pop();
                const jx = j % w, jy = (j / w) | 0;
                if (jx < minX) minX = jx; if (jx > maxX) maxX = jx;
                if (jy < minY) minY = jy; if (jy > maxY) maxY = jy;
                if (jx > 0) tryPush(j - 1);
                if (jx < w - 1) tryPush(j + 1);
                if (jy > 0) tryPush(j - w);
                if (jy < h - 1) tryPush(j + w);
            }
            if (maxX - minX > 40 && maxY - minY > 40) {
                blobs.push({ sx: minX, sy: minY, sw: maxX - minX + 1, sh: maxY - minY + 1,
                             cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 });
            }
        }
    }
    blobs.sort((a, b) => a.cy - b.cy || a.cx - b.cx);
    const rows = [];
    blobs.forEach(f => {
        const r = rows[rows.length - 1];
        if (r && Math.abs(r.cy - f.cy) < Math.min(r.sh, f.sh) * 0.5) { r.items.push(f); r.sh = Math.max(r.sh, f.sh); }
        else rows.push({ cy: f.cy, sh: f.sh, items: [f] });
    });
    const frames = [];
    rows.forEach(r => { r.items.sort((a, b) => a.cx - b.cx); frames.push(...r.items); });
    const maxH = frames.reduce((m, f) => Math.max(m, f.sh), 1);
    return { frames, maxH };
}
function loadSprite(src) {
    const o = { ready:false, cv:null, tint:null, frames:[], maxH:1 };
    const img = new Image();
    img.onload = () => {
        const c = document.createElement('canvas');
        c.width = img.width; c.height = img.height;
        const g = c.getContext('2d');
        g.drawImage(img, 0, 0);
        try { chroma(g, c); } catch (e) {}
        const t = document.createElement('canvas');
        t.width = c.width; t.height = c.height;
        const tg = t.getContext('2d');
        tg.drawImage(c, 0, 0);
        tg.globalCompositeOperation = 'source-atop';
        tg.fillStyle = '#fff';
        tg.fillRect(0, 0, t.width, t.height);
        const a = analyze(c);
        o.cv = c; o.tint = t; o.frames = a.frames; o.maxH = a.maxH; o.ready = o.frames.length > 0;
    };
    img.src = src;
    return o;
}
function loadRaw(src) {
    const o = { ready:false, img:null };
    const i = new Image();
    i.onload = () => { o.img = i; o.ready = true; };
    i.src = src;
    return o;
}
const SPR = {
    heroWalk:   loadSprite('img/hero_walk.png'),
    heroIdle:   loadSprite('img/hero_idle.png'),
    heroAttack: loadSprite('img/hero_attack.png'),
    heroCast:   loadSprite('img/hero_cast.png'),
    heroHurt:   loadSprite('img/hero_hurt.png'),
    heroDeath:  loadSprite('img/hero_death.png'),
    beetle:     loadSprite('img/enemy_beetle.png'),
    spider:     loadSprite('img/enemy_spider.png'),
    boss:       loadSprite('img/enemy_boss.png')
};
const BG = loadRaw('img/bg.png');