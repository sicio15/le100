// Canvas, tamaño, input base y partículas
const canvas = document.getElementById('gameCanvas');
let ctx = canvas.getContext('2d');
const mm = document.getElementById('minimap').getContext('2d');
let W = 0, H = 0, DPR = 1;

// visualViewport = tamaño real en móviles (arregla descentrado en iOS/Android)
function fit() {
    const vv = window.visualViewport;
    W = Math.round(vv ? vv.width : window.innerWidth);
    H = Math.round(vv ? vv.height : window.innerHeight);
    // En pantallas grandes/4K limitamos el DPR: menos píxeles = más FPS
    DPR = Math.min(window.devicePixelRatio || 1, (W * H > 1900000 ? 1.25 : 2));
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}
fit();
window.addEventListener('resize', fit);
window.addEventListener('orientationchange', fit);
if (window.visualViewport) window.visualViewport.addEventListener('resize', fit);

const isMobile = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
if (isMobile) document.body.classList.add('mobile');

let mouseX = W / 2, mouseY = H / 2;
window.addEventListener('mousemove', e => { mouseX = e.clientX; mouseY = e.clientY; });

// Bloqueos táctiles
document.addEventListener('gesturestart', e => e.preventDefault());
document.addEventListener('dblclick', e => e.preventDefault());
window.addEventListener('contextmenu', e => { if (isMobile) e.preventDefault(); });

// ===== Partículas =====
const particles = [];
function burst(x, y, color, n) {
    for (let i = 0; i < n; i++) {
        const a = TAU * i / n, s = 2 + Math.random() * 3;
        particles.push({ x, y, vx:Math.cos(a)*s, vy:Math.sin(a)*s, life:50, max:50, color, size:2+Math.random()*3 });
    }
}

// ===== Helpers =====
function hueOf(c) {
    if (typeof c === 'number') return c;
    const m = /hsl\(\s*(\d+)/.exec(c || '');
    return m ? +m[1] : (Math.random() * 360 | 0);
}
function foodColor(f) {
    return f.type === 'big' ? '#ffd700' : f.type === 'special' ? '#4ecdc4' : FOOD_PAL[f.id % FOOD_PAL.length];
}