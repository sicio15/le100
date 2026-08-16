'use strict';
// ===== BattleScene: render del combate + paperdoll + parallax =====
// LOTE 4: cada miembro renderiza SU sheet (lookOf) — antes todos usaban S.look (bug de "3 iguales").
const easeOutBack = p => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); };
function toColor(str) {
  if (!str) return 0xffffff;
  if (str[0] === '#') return parseInt(str.slice(1), 16);
  const m = /hsl\((\d+)/.exec(str);
  if (m) { const c = Phaser.Display.Color.HSLToColor(+m[1] / 360, 0.8, 0.6); return ((c.red || 0) << 16) | ((c.green || 0) << 8) | (c.blue || 0); }
  return 0xffffff;
}
const TARGET_H = { hero: 105, human_a: 105, human_b: 105, human_c: 105, beetle: 80, spider: 80, wasp: 70, scorpion: 85, boss: 115 };
const ROLE_SCALE = { dps: 1.05, archer: 1, mage: 0.95 };
const baseScale = kind => (TARGET_H[kind] || 100) / (typeof STRIP_H !== 'undefined' ? STRIP_H : 160);
// PAPERDOLL por miembro: el principal sigue el vestidor; compañeros con sheet fijo
const lookOf = m => (m.def.look === 'main')
  ? ((S.look && S.look.form === 'humano') ? 'human_a' : 'hero')
  : (m.def.look || 'hero');
function showBanner(txt) {
  const d = document.createElement('div');
  d.className = 'banner'; d.textContent = txt;
  document.body.appendChild(d);
  setTimeout(() => d.remove(), 1500);
}
class BattleScene extends Phaser.Scene {
  constructor() { super('battle'); }
  create() {
    this.bg = this.add.image(0, 0, 'bg'); this.bg.setOrigin(0.5, 1);
    this.fliesG = this.add.graphics();
    this.bars = this.add.graphics();
    this.seen = new Map();
    this.curBg = 'bg';
    this.prevShake = 0; this.prevFlash = 0; this.lastStage = S.stage;
    this.uiAcc = 0;
    this.ff = [];
    for (let i = 0; i < 12; i++) this.ff.push({ x: Math.random(), y: .5 + Math.random() * .5, p: Math.random() * TAU, s: .5 + Math.random() });
    VFX.float = (x, y, txt, color, big) => {
      const t = this.add.text(x, y, txt, {
        fontFamily: '"Press Start 2P", monospace', fontSize: (big ? 20 : 13) + 'px',
        color: color, stroke: '#000000', strokeThickness: 4
      }).setOrigin(0.5);
      this.tweens.add({ targets: t, y: y - 46, alpha: 0, duration: 1100, onComplete: () => t.destroy() });
    };
    VFX.burst = (x, y, color, n) => {
      const k = SETTINGS.reduceFx ? 0.4 : 1;
      n = Math.max(2, Math.round(n * k));
      const col = toColor(color);
      for (let i = 0; i < n; i++) {
        const a = TAU * i / n, s = 2 + Math.random() * 3;
        const c = this.add.circle(x, y, 3, col);
        this.tweens.add({ targets: c, x: x + Math.cos(a) * s * 14, y: y + Math.sin(a) * s * 14 + 26,
          alpha: 0, duration: 600, onComplete: () => c.destroy() });
      }
    };
    VFX.coin = (x, y) => {
      const c = this.add.circle(x, y, 4, 0xffd700);
      this.tweens.add({ targets: c, x: 30, y: -20, duration: 700, ease: 'Cubic.easeIn', onComplete: () => c.destroy() });
    };
    VFX.puff = (x, y) => {
      const c = this.add.circle(x, y, 4, 0xccbbbb, 0.5);
      this.tweens.add({ targets: c, y: y - 16, alpha: 0, duration: 500, onComplete: () => c.destroy() });
    };
    if (typeof HOOKS !== 'undefined') {
      HOOKS.crit = (x, y) => { this.ring(x, y, 0xffeb3b); this.hitStop(0.25, 60); };
      HOOKS.ult = () => { this.cameras.main.flash(220, 126, 252, 252); this.hitStop(0.2, 80); this.zoomPulse(); };
      HOOKS.kill = (e) => { this.ring(e.x, groundY() - 30, 0xffffff); };
      // cut-in de ultimates (DOM en capa de render)
      HOOKS.cutin = m => {
        const box = $('cutin'); if (!box) return;
        const c = document.createElement('div');
        c.className = 'cutin'; c.style.borderColor = m.def.color;
        c.innerHTML = '<div class="ciName" style="color:' + m.def.color + '">' + m.def.name + '</div><div class="ciUlt">¡' + m.def.ult + '!</div>';
        box.appendChild(c);
        setTimeout(() => c.remove(), 1100);
      };
      // barra de jefe con refs DOM cacheadas 1 sola vez
      const bb = $('bossBar'), bf = $('bossFill'), bt = $('bossTime');
      if (bb && bf && bt) {
        HOOKS.bossShow = () => bb.classList.remove('hidden');
        HOOKS.bossHide = () => bb.classList.add('hidden');
        HOOKS.bossTick = (pct, txt) => { bf.style.width = pct + '%'; bt.textContent = txt; };
      }
    }
    if (typeof uiTick === 'function') { try { uiTick(); } catch (e) {} }
  }
  safePlay(sprite, key) {
    if (!sprite || !this.anims.exists(key)) return;
    if (sprite.anims.currentAnim && sprite.anims.currentAnim.key === key) return;
    try { sprite.play(key); } catch (e) {}
  }
  hitStop(sc, ms) {
    this.time.timeScale = sc;
    this.time.delayedCall(ms, () => { this.time.timeScale = 1; });
  }
  zoomPulse() { const c = this.cameras.main; c.zoomTo(1.05, 100); c.zoomTo(1, 260); }
  ring(x, y, color) {
    const o = { r: 8, a: 1 };
    const g = this.add.graphics();
    this.tweens.add({ targets: o, r: 42, a: 0, duration: 320, ease: 'Cubic.easeOut',
      onUpdate: () => { g.clear(); g.lineStyle(3, color, o.a); g.strokeCircle(x, y, o.r); },
      onComplete: () => g.destroy() });
  }
  slash(x, y) {
    const o = { p: 0 };
    const g = this.add.graphics();
    this.tweens.add({ targets: o, p: 1, duration: 180, ease: 'Quad.easeOut',
      onUpdate: () => {
        g.clear(); g.lineStyle(4, 0xffffff, 1 - o.p);
        g.beginPath(); g.arc(x, y, 28 + o.p * 18, -1.1 + o.p * 1.4, 0.7 + o.p * 1.4); g.strokePath();
      },
      onComplete: () => g.destroy() });
  }
  update(tMs, dtMs) {
    const dt = Math.min(0.1, dtMs / 1000);
    W = this.scale.width; H = this.scale.height;
    try { update(dt); } catch (e) { console.error('⚔️ battle update:', e); }
    // OPTIMIZACIÓN: uiTick a 10Hz en vez de cada frame
    this.uiAcc += dtMs;
    if (this.uiAcc >= 100) {
      this.uiAcc = 0;
      if (typeof uiTick === 'function') { try { uiTick(); } catch (e) { console.error('🖥️ uiTick:', e); } }
    }
    this.sync();
  }
  sync() {
    const gy = groundY();
    const t = time;
    const sq = typeof squad !== 'undefined' ? squad : [];
    const want = (chapterOf(S.stage).bg || 'img/bg.png').split('/').pop().replace('.png', '');
    if (want !== this.curBg && this.textures.exists(want)) { this.bg.setTexture(want); this.curBg = want; }
    const iw = this.bg.width || 1, ih = this.bg.height || 1;
    // PARALLAX: margen extra de escala + desplazamiento acotado al avanzar
    const ps = Math.max(W / iw, H / ih) * 1.12;
    this.bg.setScale(ps);
    const maxShift = Math.max(0, (iw * ps - W) / 2);
    const off = Math.min(maxShift, (typeof advance !== 'undefined' ? advance : 0) * 0.35);
    this.bg.setPosition(W / 2 - off, H);
    this.fliesG.clear();
    if (!SETTINGS.reduceFx) this.ff.forEach(f => {
      const x = (f.x + Math.sin(t * .12 * f.s + f.p) * .06) * W;
      const y = (f.y + Math.sin(t * .2 * f.s + f.p * 2) * .05) * H;
      const a = .35 + Math.sin(t * 2.4 * f.s + f.p) * .3;
      if (a > 0) { this.fliesG.fillStyle(0xffdc6e, a); this.fliesG.fillCircle(x, y, 2); }
    });
    if (S.stage !== this.lastStage) { this.lastStage = S.stage; showBanner('⚔️ ETAPA ' + S.stage); }
    const wantCrown = !!(S.look && S.look.crown);
    this.bars.clear();
    sq.forEach(m => {
      const px = (typeof m.px === 'number') ? m.px : heroX();
      const lb = lookOf(m); // ← sheet PROPIO por miembro (fix bug "3 iguales")
      this.bars.fillStyle(0x000000, 0.35);
      this.bars.fillEllipse(px, gy + 6, 60 * (ROLE_SCALE[m.def.role] || 1), 12);
      // PAPERDOLL: si cambió el look del miembro, recreá el sprite
      if (m.sprite && m.lookKey !== lb) {
        m.sprite.destroy(); m.sprite = null;
        if (m.crown) { m.crown.destroy(); m.crown = null; }
      }
      if (!m.sprite && this.anims.exists(lb + '_idle')) {
        m.sprite = this.add.sprite(px, gy, lb + '_idle');
        m.sprite.setOrigin(0.5, 1);
        m.lookKey = lb;
        this.safePlay(m.sprite, lb + '_idle');
        if (m.def.tint) m.sprite.setTint(m.def.tint);
        this.ring(px, gy - 30, 0x7bed9f);
      }
      if (!m.sprite) return;
      if (m.lunge > 0.8 && !m.slashDone) { m.slashDone = true; this.slash(px + 62, gy - 50); }
      if (m.lunge < 0.3) m.slashDone = false;
      const desired = !m.alive ? lb + '_death'
        : m.entering ? lb + '_walk'
        : m.flash > 0 ? lb + '_hurt'
        : m.castT > 0 ? lb + '_attack'
        : m.lunge > 0.35 ? lb + '_attack'
        : enemies.length ? lb + '_walk' : lb + '_idle';
      this.safePlay(m.sprite, desired);
      const phW = t * 7 + (m.def.role === 'archer' ? 2 : m.def.role === 'mage' ? 4 : 0);
      const walking = desired === lb + '_walk';
      m.sprite.setPosition(px + m.lunge * 20, gy + (walking ? -Math.abs(Math.sin(phW)) * 2.2 : 0));
      // POLVO al caminar, respeta reduceFx
      if (walking && m.alive && !SETTINGS.reduceFx && Math.random() < 0.09) VFX.puff(px - 14, gy + 2);
      const sy = 1 + Math.cos(phW * 2) * (walking ? 0.02 : 0.008);
      const rs = ROLE_SCALE[m.def.role] || 1;
      const hb = baseScale(lb);
      if (!m.alive) { m.sprite.setRotation(-1.2); m.sprite.setAlpha(0.5); }
      else {
        m.sprite.setRotation(walking ? 0.02 : (desired === lb + '_attack' ? 0.1 : 0));
        m.sprite.setAlpha(1);
      }
      m.sprite.setScale(hb * rs * (2 - sy), hb * rs * sy);
      if (m.flash > 0) m.sprite.setTint(0xffffff);
      else if (m.def.tint) m.sprite.setTint(m.def.tint);
      else m.sprite.clearTint();
      // CORONA: overlay anclado a la cabeza de cada miembro
      if (wantCrown) {
        if (!m.crown && this.textures.exists('acc_crown')) {
          m.crown = this.add.sprite(0, 0, 'acc_crown');
          m.crown.setOrigin(0.5, 1);
          m.crown.setDepth(2);
        }
        if (m.crown) {
          m.crown.setVisible(m.alive);
          m.crown.setPosition(m.sprite.x, m.sprite.y - m.sprite.displayHeight + 6 * m.sprite.scaleY);
          m.crown.setScale(m.sprite.scaleX * 0.45, m.sprite.scaleY * 0.45);
        }
      } else if (m.crown) { m.crown.destroy(); m.crown = null; }
    });
    const alive = new Set();
    enemies.forEach(e => {
      alive.add(e);
      const kind = e.boss ? 'boss' : e.kind;
      if (!e.sprite && this.anims.exists(kind + '_walk')) {
        e.sprite = this.add.sprite(e.x, gy, kind + '_walk');
        e.sprite.setOrigin(0.5, 1);
        this.safePlay(e.sprite, kind + '_walk');
        this.seen.set(e, true);
        if (e.boss) { showBanner('👑 JEFE · ETAPA ' + S.stage); this.cameras.main.shake(400, 0.02); }
        else this.ring(e.x, gy - 20, 0x7bed9f);
      }
      if (!e.sprite) return;
      const su = e.size * (1 + Math.min(0.5, S.stage * 0.004)) * (e.pop < 1 ? Math.max(0.01, easeOutBack(e.pop)) : 1);
      const bs = baseScale(kind);
      e.sprite.setPosition(e.x + e.lungeX + e.kb, gy);
      if (e.state === 'windup' && e.dying === null) {
        if (!e.warn) e.warn = this.add.text(e.x, gy - 95 * e.size, '!', {
          fontFamily: '"Press Start 2P", monospace', fontSize: '18px', color: '#ff5252',
          stroke: '#000000', strokeThickness: 4 }).setOrigin(0.5);
        e.warn.setPosition(e.x, gy - 95 * e.size + Math.sin(t * 20) * 2);
      } else if (e.warn) { e.warn.destroy(); e.warn = null; }
      if (e.dying !== null) {
        if (e.warn) { e.warn.destroy(); e.warn = null; }
        if (!e.fx) {
          e.fx = true;
          this.tweens.add({ targets: e.sprite, rotation: 1.35, alpha: 0, y: gy + 12, duration: 450,
            onComplete: () => { if (e.sprite) { e.sprite.destroy(); e.sprite = null; } } });
        }
      } else {
        let tilt = 0, sx = 1, sy2 = 1, hop = 0;
        if (e.state === 'walk') { const pw = t * (e.kind === 'spider' || e.kind === 'wasp' ? 10 : 8); hop = -Math.abs(Math.sin(pw)) * 2.5; tilt = Math.sin(pw) * 0.035; }
        else if (e.state === 'windup') { tilt = -0.1; sy2 = .93; sx = 1.05; }
        else if (e.state === 'strike') { tilt = 0.12; sx = 1.1; sy2 = .94; }
        else { sy2 = 1 + Math.sin(t * 3 + e.slot) * .015; sx = 2 - sy2; }
        e.sprite.setRotation(tilt);
        e.sprite.setScale(bs * su * sx, bs * su * sy2);
        e.sprite.y = gy + hop;
        if (e.flash > 0) e.sprite.setTint(0xffffff); else e.sprite.clearTint();
      }
      e.su = su;
    });
    for (const e of this.seen.keys()) {
      if (!alive.has(e) && e.sprite && !e.fx) {
        if (e.warn) { e.warn.destroy(); e.warn = null; }
        e.sprite.destroy(); e.sprite = null; this.seen.delete(e);
      }
    }
    enemies.forEach(e => {
      if (e.dying !== null || !e.sprite) return;
      const su = e.su || 1;
      const bw = 56 * su, bx = e.x + e.lungeX + e.kb, by = gy - 82 * su;
      this.bars.fillStyle(0x000000, 0.6); this.bars.fillRect(bx - bw / 2, by, bw, 6);
      this.bars.fillStyle(e.boss ? 0xff4757 : 0x7bed9f, 1);
      this.bars.fillRect(bx - bw / 2, by, bw * Math.max(0, e.hp / e.max), 6);
    });
    if (shake > this.prevShake + 1) this.cameras.main.shake(120, Math.min(0.03, 0.004 * shake));
    this.prevShake = shake;
    if (stageFlash > this.prevFlash + 0.2) this.cameras.main.flash(300, 255, 215, 0);
    this.prevFlash = stageFlash;
  }
}