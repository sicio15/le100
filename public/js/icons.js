'use strict';
/* ===== FASE 6: íconos pixel desde img/icons.png (opcional) =====
   Orden del sheet (filas de arriba a abajo, izq a der):
   0 coin · 1 leaf · 2 potion · 3 venom · 4 sword · 5 shell · 6 crown · 7 heart · 8 bolt · 9 gem */
const ICON_NAMES = ['coin', 'leaf', 'potion', 'venom', 'sword', 'shell', 'crown', 'heart', 'bolt', 'gem'];
const ICON_URL = {};
function iconTag(name, px) {
    const u = ICON_URL[name];
    if (!u) return '';
    px = px || 14;
    return '<img class="pxicon" style="width:' + px + 'px;height:' + px + 'px" src="' + u + '" alt="">';
}
/* ícono pixel si existe, emoji de fallback si no */
function picOr(name, emoji, px) {
    return (typeof iconTag === 'function' && iconTag(name, px)) || emoji;
}
function prepareIcons() {
    return loadImg('img/icons.png').then(img => {
        if (!img) { console.warn('⚠️ sin img/icons.png: sigo con emojis'); return; }
        const c = document.createElement('canvas');
        c.width = img.width; c.height = img.height;
        const g = c.getContext('2d');
        g.drawImage(img, 0, 0);
        try { chroma(g, c); } catch (e) {}
        const a = analyze(c);
        a.frames.forEach((f, i) => {
            if (i >= ICON_NAMES.length) return;
            const cc = document.createElement('canvas');
            cc.width = f.sw; cc.height = f.sh;
            cc.getContext('2d').drawImage(c, f.sx, f.sy, f.sw, f.sh, 0, 0, f.sw, f.sh);
            ICON_URL[ICON_NAMES[i]] = cc.toDataURL();
        });
        console.log('✅ íconos: ' + Object.keys(ICON_URL).length + '/' + ICON_NAMES.length);
    });
}