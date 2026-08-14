'use strict';
/* Chroma-key + detección de frames por componentes conexos.
   Phaser usa esto en BootScene para convertir sheets irregulares
   en spritesheets uniformes. */
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