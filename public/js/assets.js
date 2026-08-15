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

/* FIX CLAVE: detecta frames por ALPHA (funciona con fondo transparente O blanco) */
function analyze(c) {
    const w = c.width, h = c.height;
    const d = c.getContext('2d').getImageData(0, 0, w, h).data;
    const vis = new Uint8Array(w * h);
    const stack = [];
    const blobs = [];
    // un píxel "existe" si es OPACO (alpha alto) -> ignora fondo transparente y blanco-recortado
    const exists = i => d[i*4+3] > 40;
    function tryPush(j) { if (!vis[j] && exists(j)) { vis[j] = 1; stack.push(j); } }
    for (let y = 0; y < h; y += 2) {
        for (let x = 0; x < w; x += 2) {
            const i = y * w + x;
            if (vis[i] || !exists(i)) continue;
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
            if (maxX - minX > 20 && maxY - minY > 20) {
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

const STRIP_H = 160;
const SHEETS = ['hero_walk','hero_idle','hero_attack','hero_cast','hero_hurt',
                'enemy_beetle','enemy_spider','enemy_boss','enemy_wasp','enemy_scorpion'];
const PREP = {};
function loadImg(src) {
    return new Promise(res => {
        const i = new Image();
        i.onload = () => res(i);
        i.onerror = () => res(null);
        i.src = src;
    });
}
async function prepareAll() {
    for (const k of SHEETS) {
        const img = await loadImg('img/' + k + '.png');
        if (!img) { console.warn('⚠️ falta img/' + k + '.png'); continue; }
        const c = document.createElement('canvas');
        c.width = img.width; c.height = img.height;
        const g = c.getContext('2d');
        g.drawImage(img, 0, 0);
        try { chroma(g, c); } catch (e) {}   // quita blanco si lo hay; si es transparente, da igual
        const a = analyze(c);
        if (!a.frames.length) { console.warn('⚠️ ' + k + ': 0 frames detectados'); continue; }
        const sc = STRIP_H / a.maxH;
        const fw = Math.max(1, Math.ceil(a.frames.reduce((m, f) => Math.max(m, f.sw), 1) * sc));
        const strip = document.createElement('canvas');
        strip.width = fw * a.frames.length; strip.height = STRIP_H;
        const sg = strip.getContext('2d');
        a.frames.forEach((f, i) => {
            const dw = f.sw * sc, dh = f.sh * sc;
            sg.drawImage(c, f.sx, f.sy, f.sw, f.sh, i * fw + Math.floor((fw - dw) / 2), STRIP_H - dh, dw, dh);
        });
        PREP[k] = { strip, fw, fh: STRIP_H, count: a.frames.length };
        console.log('✅ ' + k + ': ' + a.frames.length + ' frames');
    }
}