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
function loadSprite(src) {
    const o = { ready:false, cv:null, tint:null };
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
        o.cv = c; o.tint = t; o.ready = true;
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
    heroWalk: loadSprite('img/hero_walk.png'),
    heroIdle: loadSprite('img/hero.png'),
    beetle:   loadSprite('img/enemy_beetle.png'),
    spider:   loadSprite('img/enemy_spider.png'),
    boss:     loadSprite('img/enemy_boss.png')
};
const BG = loadRaw('img/bg.png');