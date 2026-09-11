'use strict';
// ===== VFX: efectos visuales + HOOKS de cámara + banners DOM =====
// LOTE 27: ondas de choque, haces, novas, cortes con color de rol, chispas,
// monedas que vuelan al contador, hit-stop por niveles y banners con subtítulo.
const easeOutBack = p => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); };
function toColor(str) {
  if (typeof str === 'number') return str;
  if (!str) return 0xffffff;
  if (str[0] === '#') return parseInt(str.slice(1), 16);
  const m = /hsl\((\d+)/.exec(str);
  if (m) { const c = Phaser.Display.Color.HSLToColor(+m[1] / 360, 0.8, 0.6); return ((c.red || 0) << 16) | ((c.green || 0) << 8) | (c.blue || 0); }
  return 0xffffff;
}
const fxOn = () => !SETTINGS.reduceFx;

// ----- Banner central con subtítulo opcional -----
function showBanner(txt, sub, cls) {
  const d = document.createElement('div');
  d.className = 'banner' + (cls ? ' ' + cls : '');
  d.innerHTML = '<span class="bnMain"></span>' + (sub ? '<span class="bnSub"></span>' : '');
  d.querySelector('.bnMain').textContent = txt;
  if (sub) d.querySelector('.bnSub').textContent = sub;
  document.body.appendChild(d);
  setTimeout(() => d.remove(), 1600);
}

// ----- Primitivas de escena -----
function vfxRing(scene, x, y, color, r0, r1, ms) {
  const o = { r: r0 || 8, a: 1 };
  const g = scene.add.graphics();
  scene.tweens.add({ targets: o, r: r1 || 42, a: 0, duration: ms || 320, ease: 'Cubic.easeOut',
    onUpdate: () => { g.clear(); g.lineStyle(3, color, o.a); g.strokeCircle(x, y, o.r); },
    onComplete: () => g.destroy() });
}
// Onda de choque: anillo grueso achatado que se abre por el suelo
function vfxShockwave(scene, x, y, color, radius) {
  const o = { p: 0 };
  const g = scene.add.graphics();
  scene.tweens.add({ targets: o, p: 1, duration: 460, ease: 'Cubic.easeOut',
    onUpdate: () => {
      g.clear();
      const r = (radius || 140) * o.p, a = 1 - o.p;
      g.lineStyle(Math.max(1, 9 * a), color, a);
      g.strokeEllipse(x, y, r * 2, r * 0.62);
      g.lineStyle(Math.max(1, 4 * a), 0xffffff, a * 0.7);
      g.strokeEllipse(x, y, r * 1.5, r * 0.46);
    },
    onComplete: () => g.destroy() });
}
function vfxSlash(scene, x, y, color) {
  const o = { p: 0 };
  const c = toColor(color || '#ffffff');
  const g = scene.add.graphics();
  scene.tweens.add({ targets: o, p: 1, duration: 200, ease: 'Quad.easeOut',
    onUpdate: () => {
      g.clear();
      g.lineStyle(6, c, (1 - o.p) * 0.9);
      g.beginPath(); g.arc(x, y, 28 + o.p * 22, -1.1 + o.p * 1.4, 0.7 + o.p * 1.4); g.strokePath();
      g.lineStyle(2, 0xffffff, 1 - o.p);
      g.beginPath(); g.arc(x, y, 28 + o.p * 22, -1.0 + o.p * 1.4, 0.6 + o.p * 1.4); g.strokePath();
    },
    onComplete: () => g.destroy() });
}
// Haz vertical (Lluvia de Flechas): cae desde fuera de pantalla al objetivo
function vfxBeam(scene, x, y, color) {
  const c = toColor(color || '#7efcff');
  const o = { p: 0 };
  const g = scene.add.graphics();
  scene.tweens.add({ targets: o, p: 1, duration: 260, ease: 'Quad.easeIn',
    onUpdate: () => {
      g.clear();
      const yy = -40 + (y + 40) * Math.min(1, o.p * 1.4);
      g.lineStyle(3, c, 1 - o.p * 0.5);
      g.lineBetween(x, yy - 46, x, yy);
      g.fillStyle(0xffffff, 1 - o.p);
      g.fillCircle(x, yy, 3);
    },
    onComplete: () => { g.destroy(); vfxRing(scene, x, y, c, 4, 26, 220); } });
}
// Nova arcana: anillo + pétalos radiales
function vfxNova(scene, x, y, color) {
  const o = { p: 0 };
  const g = scene.add.graphics();
  scene.tweens.add({ targets: o, p: 1, duration: 520, ease: 'Cubic.easeOut',
    onUpdate: () => {
      g.clear();
      const a = 1 - o.p, r = 20 + o.p * 220;
      g.lineStyle(5 * a + 1, color, a);
      g.strokeCircle(x, y, r);
      g.lineStyle(2, 0xffffff, a * 0.8);
      for (let i = 0; i < 10; i++) {
        const ang = TAU * i / 10 + o.p * 0.8;
        g.lineBetween(x + Math.cos(ang) * r * 0.6, y + Math.sin(ang) * r * 0.42,
                      x + Math.cos(ang) * r, y + Math.sin(ang) * r * 0.7);
      }
    },
    onComplete: () => g.destroy() });
}
// L28 · Proyectil: viaja de (x0,y0) a (x1,y1) dejando estela
function vfxProjectile(scene, x0, y0, x1, y1, color, delay) {
  const c = toColor(color || '#ff6b81');
  const dot = scene.add.circle(x0, y0, 5, c).setDepth(19);
  const glow = scene.add.circle(x0, y0, 10, c, 0.28).setDepth(18);
  scene.tweens.add({ targets: [dot, glow], x: x1, y: y1, duration: 260, delay: delay || 0,
    ease: 'Quad.easeIn',
    onUpdate: () => { if (!SETTINGS.reduceFx && Math.random() < 0.55) VFX.puff(dot.x, dot.y); },
    onComplete: () => { dot.destroy(); glow.destroy(); vfxRing(scene, x1, y1, c, 4, 30, 240); } });
}
// L28 · Portal de aparición: los bichos ya no se materializan en el aire
function vfxPortal(scene, x, y, color) {
  if (SETTINGS.reduceFx) return;
  const c = toColor(color || '#c86bfa');
  const o = { p: 0 };
  const g = scene.add.graphics().setDepth(-1);
  scene.tweens.add({ targets: o, p: 1, duration: 620, ease: 'Cubic.easeOut',
    onUpdate: () => {
      g.clear();
      const a = Math.sin(o.p * Math.PI);           // abre y cierra
      const rw = 34 * a, rh = 12 * a;
      g.fillStyle(c, a * 0.5); g.fillEllipse(x, y, rw * 2, rh * 2);
      g.lineStyle(3, 0xffffff, a * 0.8); g.strokeEllipse(x, y, rw * 2.2, rh * 2.2);
    },
    onComplete: () => g.destroy() });
}
// L28 · Telegrafía: el círculo rojo que avisa el embate del jefe
function vfxTelegraph(scene, x, y, rx, ms) {
  const o = { p: 0 };
  const g = scene.add.graphics().setDepth(-1);
  scene.tweens.add({ targets: o, p: 1, duration: ms || 1300, ease: 'Linear',
    onUpdate: () => {
      g.clear();
      g.fillStyle(0xff4757, 0.15 + o.p * 0.3);
      g.fillEllipse(x, y, rx * 2, rx * 0.5);
      g.lineStyle(3, 0xff4757, 0.5 + o.p * 0.5);
      g.strokeEllipse(x, y, rx * 2 * o.p, rx * 0.5 * o.p);
    },
    onComplete: () => g.destroy() });
}
// Hit-stop por niveles: 'light' para críticos, 'heavy' para jefes/ultimates
function vfxHitStop(scene, sc, ms) {
  if (!fxOn()) return;
  scene.time.timeScale = sc;
  scene.time.delayedCall(ms, () => { scene.time.timeScale = 1; });
}
function vfxZoomPulse(scene, to, ms) { const c = scene.cameras.main; c.zoomTo(to || 1.05, ms || 100); c.zoomTo(1, (ms || 100) + 160); }

// ===== Conecta VFX.* y HOOKS.* a una escena (llamar en create) =====
function attachVFX(scene) {
  // Punto de destino de las monedas = el contador de oro del topbar, en
  // coordenadas del canvas (el canvas empieza debajo de la topbar → y negativa).
  const goldTarget = () => {
    const el = $('goldTxt'), cv = scene.game.canvas;
    if (!el || !cv) return { x: 40, y: -20 };
    const a = el.getBoundingClientRect(), b = cv.getBoundingClientRect();
    return { x: a.left + a.width / 2 - b.left, y: a.top + a.height / 2 - b.top };
  };

  VFX.float = (x, y, txt, color, big) => {
    const t = scene.add.text(x, y, txt, {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: (big ? 20 : 13) + 'px',
      color: typeof color === 'number' ? '#ffffff' : color,
      stroke: '#000000', strokeThickness: big ? 5 : 4
    }).setOrigin(0.5).setDepth(20);
    // "punch": entra grande y se asienta — lee mucho mejor en medio del caos
    t.setScale(big ? 0.4 : 0.7);
    scene.tweens.add({ targets: t, scale: 1, duration: big ? 220 : 140, ease: 'Back.easeOut' });
    const dx = (Math.random() - 0.5) * (big ? 26 : 40);
    scene.tweens.add({ targets: t, x: x + dx, y: y - (big ? 60 : 46), alpha: 0,
      duration: big ? 1300 : 1000, ease: 'Quad.easeOut', onComplete: () => t.destroy() });
  };

  VFX.burst = (x, y, color, n) => {
    const k = fxOn() ? 1 : 0.4;
    n = Math.max(2, Math.round(n * k));
    const col = toColor(color);
    for (let i = 0; i < n; i++) {
      const a = TAU * i / n + Math.random() * 0.4, s = 2 + Math.random() * 3;
      const c = scene.add.circle(x, y, 2 + Math.random() * 2, col);
      c.setDepth(15);
      scene.tweens.add({ targets: c, x: x + Math.cos(a) * s * 14, y: y + Math.sin(a) * s * 14 + 26,
        alpha: 0, scale: 0.2, duration: 520 + Math.random() * 240, ease: 'Quad.easeOut',
        onComplete: () => c.destroy() });
    }
  };

  // Chispas rápidas y dirigidas: el impacto se siente, no sólo se ve
  VFX.spark = (x, y, color, dir) => {
    if (!fxOn()) return;
    const col = toColor(color);
    for (let i = 0; i < 5; i++) {
      const a = (dir || -0.6) + (Math.random() - 0.5) * 1.4;
      const len = 16 + Math.random() * 22;
      const c = scene.add.rectangle(x, y, 3, 3, col).setDepth(16);
      scene.tweens.add({ targets: c, x: x + Math.cos(a) * len * 2.2, y: y + Math.sin(a) * len,
        alpha: 0, duration: 260, ease: 'Cubic.easeOut', onComplete: () => c.destroy() });
    }
  };

  VFX.coin = (x, y) => {
    const tgt = goldTarget();
    const c = scene.add.circle(x, y, 4, 0xffd700).setDepth(18);
    const mid = { x: x + (Math.random() - 0.5) * 120, y: y - 70 - Math.random() * 50 };
    // arco en dos tramos: salta hacia arriba y luego se lanza al contador
    scene.tweens.add({ targets: c, x: mid.x, y: mid.y, duration: 260, ease: 'Quad.easeOut',
      onComplete: () => scene.tweens.add({ targets: c, x: tgt.x, y: tgt.y, scale: 0.4,
        duration: 420 + Math.random() * 160, ease: 'Cubic.easeIn',
        onComplete: () => { c.destroy(); if (typeof bumpGold === 'function') bumpGold(); } }) });
  };

  VFX.puff = (x, y) => {
    const c = scene.add.circle(x, y, 4, 0xccbbbb, 0.5);
    scene.tweens.add({ targets: c, y: y - 16, scale: 1.8, alpha: 0, duration: 500, onComplete: () => c.destroy() });
  };

  VFX.shockwave = (x, y, color, r) => vfxShockwave(scene, x, y, toColor(color), r);
  VFX.beam = (x, y, color) => vfxBeam(scene, x, y, color);
  VFX.nova = (x, y, color) => vfxNova(scene, x, y, toColor(color));
  VFX.slash = (x, y, color) => vfxSlash(scene, x, y, color);
  VFX.projectile = (x0, y0, x1, y1, color, delay) => vfxProjectile(scene, x0, y0, x1, y1, color, delay);
  VFX.portal = (x, y, color) => vfxPortal(scene, x, y, color);
  VFX.telegraph = (x, y, r, ms) => vfxTelegraph(scene, x, y, r, ms);

  // ----- HOOKS de cámara / pantalla -----
  HOOKS.crit = (x, y) => {
    vfxRing(scene, x, y, 0xffeb3b);
    VFX.spark(x, y, '#ffeb3b');
    vfxHitStop(scene, 0.25, 60);
  };
  HOOKS.tap = (x, y) => { vfxRing(scene, x, y, 0x7efcff, 6, 46, 300); vfxSlash(scene, x, y, '#7efcff'); };
  HOOKS.ult = m => {
    const col = (m && m.def && m.def.color) || '#7efcff';
    scene.cameras.main.flash(220, ...hexRgb(col));
    vfxHitStop(scene, 0.2, 90);
    vfxZoomPulse(scene, 1.06, 110);
  };
  HOOKS.kill = e => {
    vfxRing(scene, e.x, groundY() - 30, e.elite ? 0xffd700 : 0xffffff);
    if (e.elite || e.boss) VFX.shockwave(e.x, groundY() - 10, e.boss ? 0xff4757 : 0xffd700, e.boss ? 240 : 120);
  };
  HOOKS.bossRoar = () => {
    scene.cameras.main.flash(320, 255, 40, 40);
    scene.cameras.main.shake(500, 0.03);
    vfxHitStop(scene, 0.25, 350);
  };
  HOOKS.bossPhase = (ph, e) => {
    showBanner((e ? bossIco(e) : '👑') + ' FASE ' + (ph + 1),
      e ? bossName(e) + ' cambia de forma' : '', 'bnRed');
    vfxZoomPulse(scene, 1.12, 180);
    ambienceFlash(0x4a0d16, 0.45, 420);
    // línea suelta del jefe encima de la pelea (no congela el combate)
    if (typeof playBossEnrage === 'function') playBossEnrage(e);
  };
  // L28: portal de aparición de cada enemigo, con el color de su zona
  HOOKS.portal = e => VFX.portal(e.x - 10, groundY() - 4, zoneOf(S.stage).color);
  HOOKS.comboTier = tier => {
    const box = $('comboBox');
    if (box) { box.classList.remove('flash'); void box.offsetWidth; box.classList.add('flash'); }
    if (tier.at >= 16) vfxZoomPulse(scene, 1.04, 90);
  };
  HOOKS.skill = d => {
    showBanner(d.ico + ' ' + d.n.toUpperCase(), null, 'bnSkill');
    scene.cameras.main.flash(180, ...hexRgb(d.color));
    vfxHitStop(scene, 0.3, 70);
  };
  HOOKS.cutin = m => {
    const box = $('cutin'); if (!box) return;
    const c = document.createElement('div');
    c.className = 'cutin'; c.style.borderColor = m.def.color;
    c.style.setProperty('--ci', m.def.color);
    c.innerHTML = '<div class="ciIco">' + m.def.icon + '</div>' +
      '<div><div class="ciName" style="color:' + m.def.color + '">' + m.def.name + '</div>' +
      '<div class="ciUlt">¡' + m.def.ult + '!</div></div>';
    box.appendChild(c);
    setTimeout(() => c.remove(), 1200);
  };

  // ----- Marco del jefe (DOM) -----
  const bb = $('bossFrame'), bf = $('bossFill'), bhp = $('bossHpTxt'),
        bt = $('bossTime'), btf = $('bossTimeFill'), brg = $('bossRage'), bph = $('bossPhases'),
        bnm = $('bossName'), bti = $('bossTitle'), bch = $('bossChips'),
        bsh = $('bossShieldWrap'), bsf = $('bossShieldFill');
  if (bb && bf) {
    HOOKS.bossShow = e => {
      bb.classList.remove('hidden'); bb.classList.remove('in'); void bb.offsetWidth; bb.classList.add('in');
      if (e && e.def) {
        bb.style.setProperty('--bc', e.def.color);
        bb.classList.toggle('mini', !!e.mini);
      }
      // Entrada del Jefe de Zona: barras de cine + zoom + rugido
      if (e && !e.mini) {
        document.body.classList.add('cineBars');
        setTimeout(() => document.body.classList.remove('cineBars'), 2600);
        vfxZoomPulse(scene, 1.18, 420);
      }
    };
    HOOKS.bossHide = () => {
      bb.classList.add('hidden'); bb.classList.remove('in');
      document.body.classList.remove('cineBars');
    };
    HOOKS.bossTick = d => {
      if (bnm) bnm.textContent = d.ico + ' ' + pixelUpper(d.name);
      if (bti) bti.textContent = d.title || '';
      if (bch) bch.textContent = d.chips || '';
      bf.style.width = d.hp + '%';
      bf.classList.toggle('low', d.hp < 30);
      if (bhp) bhp.textContent = d.hpTxt;
      if (bsh) bsh.classList.toggle('hidden', !d.hasShield || d.shield <= 0);
      if (bsf) bsf.style.width = d.shield + '%';
      if (btf) btf.style.width = d.time + '%';
      if (bt) bt.textContent = d.secs + 's';
      if (brg) {
        brg.classList.toggle('hidden', d.rage <= 0);
        brg.textContent = '🔥 x' + d.rage;
      }
      if (bph && bph.childElementCount !== d.phases + 1) {
        bph.innerHTML = '';
        for (let i = 0; i <= d.phases; i++) bph.appendChild(document.createElement('i'));
      }
      if (bph) Array.prototype.forEach.call(bph.children, (el, i) => el.classList.toggle('on', i <= d.phase));
    };
  }
}

// ===== L28: barrido de pantalla al cambiar de zona =====
// DOM puro: la escena de Phaser sigue corriendo por debajo mientras tapa.
function screenWipe(color) {
  if (SETTINGS.reduceFx) return;
  const d = document.createElement('div');
  d.className = 'wipe';
  if (color) d.style.setProperty('--wc', color);
  document.body.appendChild(d);
  setTimeout(() => d.remove(), 1200);
}
// '#rrggbb' → [r,g,b] para cameras.flash
function hexRgb(c) {
  const n = toColor(c);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
