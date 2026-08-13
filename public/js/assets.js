'use strict';
function chroma(g, c) {
    const w = c.width, h = c.height;
    const d = g.getImageData(0, 0, w, h), px = d.data;
    const seen = new Uint8Array(w * h);
    const st = [0, w - 1, (h - 1) * w, (h - 1) * w + w - 1];
    const isW = i => { const j = i * 4; return px[j] > 230 && px[j+1] > 230 && px[j+2] > 228; };
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
/* Recorta cada frame por su bounding box real y mide el frame más alto,
   así todos se dibujan alineados por los pies y a la misma escala (adiós vibración) */
function analyze(c, n) {
    const w = c.width, h = c.height, fw = w / n;
    const d = c.getContext('2d').getImageData(0, 0, w, h).data;
    const frames = [];
    let maxH = 1;
    for (let f = 0; f < n; f++) {
        let minX = w, maxX = 0, minY = h, maxY = 0;
        const x0 = Math.floor(fw * f), x1 = Math.floor(fw * (f + 1));
        for (let y = 0; y < h; y++) {
            for (let x = x0; x < x1; x++) {
                if (d[(y * w + x) * 4 + 3] > 20) {
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                    if (y < minY) minY = y;
                    if (y > maxY) maxY = y;
                }
            }
        }
        if (maxX <= minX) { minX = x0; maxX = x1 - 1; minY = 0; maxY = h - 1; }
        const fr = { sx: minX, sy: minY, sw: maxX - minX + 1, sh: maxY - minY + 1 };
        frames.push(fr);
        if (fr.sh > maxH) maxH = fr.sh;
    }
    return { frames, maxH };
}
function loadSprite(src, n) {
    n = n || 1;
    const o = { ready:false, cv:null, tint:null, frames:null, maxH:1, n };
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
        const a = analyze(c, n);
        o.cv = c; o.tint = t; o.frames = a.frames; o.maxH = a.maxH; o.ready = true;
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
    heroWalk: loadSprite('img/hero_walk.png', 4),   // sheet de 4 frames
    heroIdle: loadSprite('img/hero.png'),
    beetle:   loadSprite('img/enemy_beetle.png'),
    spider:   loadSprite('img/enemy_spider.png'),
    boss:     loadSprite('img/enemy_boss.png')
};
const BG = loadRaw('img/bg.png');