'use strict';
// ===== BATTLE SCENE: solo render (sprites, paperdoll, parallax, HUD) =====
const TARGET_H = { hero: 105, human_a: 105, human_b: 105, human_c: 105, beetle: 80, spider: 80, wasp: 70, scorpion: 85, boss: 130 };
const ROLE_SCALE = { dps: 1.05, archer: 1, mage: 0.95 };
const baseScale = kind => (TARGET_H[kind] || 100) / (typeof STRIP_H !== 'undefined' ? STRIP_H : 160);
const lookOf = m => m.def.look || 'human_a';
// MEJORA: fondos por capítulo (antes nunca cambiaban)
const CHAPTER_BG = ['bg', 'bg_cave', 'bg_swamp', 'bg_tower', 'bg_tower'];
const chapterBg = () => CHAPTER_BG[Math.min(CHAPTER_BG.length - 1, Math.floor((S.stage - 1) / 10))];
class BattleScene extends Phaser.Scene {
  constructor() { super('battle'); }
  create() {
    this.bg = this.add.image(0, 0, 'bg'); this.bg.setOrigin(0.5, 1);
    this.fliesG = this.add.graphics();
    this.bars = this.add.graphics();
    this.seen = new Map();
    this.curBg = 'bg';
    this.petSprite = null; this.petCrown = null;
    this.prevShake = 0; this.prevFlash = 0; this.lastStage = S.stage;
    this.uiAcc = 0;
    this.ff = [];
    for (let i = 0; i < 12; i++) this.ff.push({ x: Math.random(), y: .5 + Math.random() * .5, p: Math.random() * TAU, s: .5 + Math.random() });
    attachVFX(this);
    if (typeof uiTick === 'function') { try { uiTick(); } catch (e) {} }
  }
  safePlay(sprite, key) {
    if (!sprite || !this.anims.exists(key)) return;
    if (sprite.anims.currentAnim && sprite.anims.currentAnim.key === key) return;
    try { sprite.play(key); } catch (e) {}
  }
  update(tMs, dtMs) {
    const dt = Math.min(0.1, dtMs / 1000);
    W = this.scale.width; H = this.scale.height;
    try { update(dt); } catch (e) { console.error('⚔️ battle update:', e); }
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
    const want = chapterBg();
    if (want !== this.curBg && this.textures.exists(want)) { this.bg.setTexture(want); this.curBg = want; }
    const iw = this.bg.width || 1, ih = this.bg.height || 1;
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
      const lb = lookOf(m);
      this.bars.fillStyle(0x000000, 0.35);
      this.bars.fillEllipse(px, gy + 6, 60 * (ROLE_SCALE[m.def.role] || 1), 12);
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
        vfxRing(this, px, gy - 30, 0x7bed9f);
      }
      if (!m.sprite) return;
      if (m.lunge > 0.8 && !m.slashDone) { m.slashDone = true; vfxSlash(this, px + 62, gy - 50); }
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
    // ===== MASCOTA =====
    const wantPet = !!(S.look && S.look.pet);
    if (!wantPet) {
      if (this.petSprite) { this.petSprite.destroy(); this.petSprite = null; }
      if (this.petCrown) { this.petCrown.destroy(); this.petCrown = null; }
    } else {
      if (!this.petSprite && this.anims.exists('hero_idle')) {
        this.petSprite = this.add.sprite(0, gy, 'hero_idle');
        this.petSprite.setOrigin(0.5, 1);
        this.safePlay(this.petSprite, 'hero_idle');
      }
      if (this.petSprite) {
        const main = sq.find(m => m.def.role === 'dps');
        const bx = (main ? main.px : heroX()) - 52;
        const casting = (typeof petCastT !== 'undefined' && petCastT > 0);
        const desired = casting ? 'hero_cast' : (main && main.entering) ? 'hero_walk' : enemies.length ? 'hero_walk' : 'hero_idle';
        this.safePlay(this.petSprite, desired);
        const pb = baseScale('hero') * 0.62;
        const bob = Math.sin(t * 5) * 2;
        this.petSprite.setPosition(bx, gy - 4 + bob);
        this.petSprite.setScale(pb, pb);
        if (wantCrown) {
          if (!this.petCrown && this.textures.exists('acc_crown')) {
            this.petCrown = this.add.sprite(0, 0, 'acc_crown');
            this.petCrown.setOrigin(0.5, 1);
            this.petCrown.setDepth(2);
          }
          if (this.petCrown) {
            this.petCrown.setPosition(this.petSprite.x, this.petSprite.y - this.petSprite.displayHeight + 4 * this.petSprite.scaleY);
            this.petCrown.setScale(this.petSprite.scaleX * 0.5, this.petSprite.scaleY * 0.5);
          }
        } else if (this.petCrown) { this.petCrown.destroy(); this.petCrown = null; }
      }
    }
    // ===== ENEMIGOS =====
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
        else vfxRing(this, e.x, gy - 20, 0x7bed9f);
      }
      if (!e.sprite) return;
      const su = e.size * (1 + Math.min(0.5, S.stage * 0.004)) * (e.pop < 1 ? Math.max(0.01, easeOutBack(e.pop)) : 1);
      const bs = baseScale(kind);
      e.sprite.setPosition(e.x + e.lungeX + e.kb, gy);
      if (e.state === 'windup' && e.dying === null) {
        if (!e.warn) e.warn = this.add.text(e.x, gy - 95 * e.size, '!', { fontFamily: '"Press Start 2P", monospace', fontSize: '18px', color: '#ff5252', stroke: '#000000', strokeThickness: 4 }).setOrigin(0.5);
        e.warn.setPosition(e.x, gy - 95 * e.size + Math.sin(t * 20) * 2);
      } else if (e.warn) { e.warn.destroy(); e.warn = null; }
      if (e.dying !== null) {
        if (e.warn) { e.warn.destroy(); e.warn = null; }
        if (!e.fx) {
          e.fx = true;
          this.tweens.add({ targets: e.sprite, rotation: 1.35, alpha: 0, y: gy + 12, duration: 450, onComplete: () => { if (e.sprite) { e.sprite.destroy(); e.sprite = null; } } });
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
        // LOTE 8: boss con anims propios (attack con restart, idle, walk)
        if (e.boss) {
          const des = (e.state === 'windup' || e.state === 'strike') ? 'boss_attack' : e.state === 'idle' ? 'boss_idle' : 'boss_walk';
          const cur = e.sprite.anims.currentAnim && e.sprite.anims.currentAnim.key;
          if (cur !== des || (des === 'boss_attack' && !e.sprite.anims.isPlaying)) {
            if (this.anims.exists(des)) { try { e.sprite.play(des); } catch (err) {} }
          }
        }
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