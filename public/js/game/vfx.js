'use strict';
// ===== VFX: efectos visuales + HOOKS de cámara + banner DOM =====
const easeOutBack = p => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); };
function toColor(str) {
  if (!str) return 0xffffff;
  if (str[0] === '#') return parseInt(str.slice(1), 16);
  const m = /hsl\((\d+)/.exec(str);
  if (m) { const c = Phaser.Display.Color.HSLToColor(+m[1] / 360, 0.8, 0.6); return ((c.red || 0) << 16) | ((c.green || 0) << 8) | (c.blue || 0); }
  return 0xffffff;
}
function showBanner(txt) {
  const d = document.createElement('div');
  d.className = 'banner'; d.textContent = txt;
  document.body.appendChild(d);
  setTimeout(() => d.remove(), 1500);
}
function vfxRing(scene, x, y, color) {
  const o = { r: 8, a: 1 };
  const g = scene.add.graphics();
  scene.tweens.add({ targets: o, r: 42, a: 0, duration: 320, ease: 'Cubic.easeOut',
    onUpdate: () => { g.clear(); g.lineStyle(3, color, o.a); g.strokeCircle(x, y, o.r); },
    onComplete: () => g.destroy() });
}
function vfxSlash(scene, x, y) {
  const o = { p: 0 };
  const g = scene.add.graphics();
  scene.tweens.add({ targets: o, p: 1, duration: 180, ease: 'Quad.easeOut',
    onUpdate: () => {
      g.clear(); g.lineStyle(4, 0xffffff, 1 - o.p);
      g.beginPath(); g.arc(x, y, 28 + o.p * 18, -1.1 + o.p * 1.4, 0.7 + o.p * 1.4); g.strokePath();
    },
    onComplete: () => g.destroy() });
}
function vfxHitStop(scene, sc, ms) {
  scene.time.timeScale = sc;
  scene.time.delayedCall(ms, () => { scene.time.timeScale = 1; });
}
function vfxZoomPulse(scene) { const c = scene.cameras.main; c.zoomTo(1.05, 100); c.zoomTo(1, 260); }
// Conecta VFX.* y HOOKS.* a una escena (llamar en create)
function attachVFX(scene) {
  VFX.float = (x, y, txt, color, big) => {
    const t = scene.add.text(x, y, txt, { fontFamily: '"Press Start 2P", monospace', fontSize: (big ? 20 : 13) + 'px', color: color, stroke: '#000000', strokeThickness: 4 }).setOrigin(0.5);
    scene.tweens.add({ targets: t, y: y - 46, alpha: 0, duration: 1100, onComplete: () => t.destroy() });
  };
  VFX.burst = (x, y, color, n) => {
    const k = SETTINGS.reduceFx ? 0.4 : 1;
    n = Math.max(2, Math.round(n * k));
    const col = toColor(color);
    for (let i = 0; i < n; i++) {
      const a = TAU * i / n, s = 2 + Math.random() * 3;
      const c = scene.add.circle(x, y, 3, col);
      scene.tweens.add({ targets: c, x: x + Math.cos(a) * s * 14, y: y + Math.sin(a) * s * 14 + 26, alpha: 0, duration: 600, onComplete: () => c.destroy() });
    }
  };
  VFX.coin = (x, y) => {
    const c = scene.add.circle(x, y, 4, 0xffd700);
    scene.tweens.add({ targets: c, x: 30, y: -20, duration: 700, ease: 'Cubic.easeIn', onComplete: () => c.destroy() });
  };
  VFX.puff = (x, y) => {
    const c = scene.add.circle(x, y, 4, 0xccbbbb, 0.5);
    scene.tweens.add({ targets: c, y: y - 16, alpha: 0, duration: 500, onComplete: () => c.destroy() });
  };
  HOOKS.crit = (x, y) => { vfxRing(scene, x, y, 0xffeb3b); vfxHitStop(scene, 0.25, 60); };
  HOOKS.ult = () => { scene.cameras.main.flash(220, 126, 252, 252); vfxHitStop(scene, 0.2, 80); vfxZoomPulse(scene); };
  HOOKS.kill = e => vfxRing(scene, e.x, groundY() - 30, 0xffffff);
  HOOKS.bossRoar = () => { scene.cameras.main.flash(320, 255, 40, 40); scene.cameras.main.shake(500, 0.03); vfxHitStop(scene, 0.25, 350); };
  HOOKS.cutin = m => {
    const box = $('cutin'); if (!box) return;
    const c = document.createElement('div');
    c.className = 'cutin'; c.style.borderColor = m.def.color;
    c.innerHTML = '<div class="ciName" style="color:' + m.def.color + '">' + m.def.name + '</div><div class="ciUlt">¡' + m.def.ult + '!</div>';
    box.appendChild(c);
    setTimeout(() => c.remove(), 1100);
  };
  const bb = $('bossBar'), bf = $('bossFill'), bt = $('bossTime');
  if (bb && bf && bt) {
    HOOKS.bossShow = () => bb.classList.remove('hidden');
    HOOKS.bossHide = () => bb.classList.add('hidden');
    HOOKS.bossTick = (pct, txt) => { bf.style.width = pct + '%'; bt.textContent = txt; };
  }
}